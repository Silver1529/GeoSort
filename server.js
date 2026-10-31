/* GeoSort - servidor local
 * Serve o painel (pasta dashboard), as imagens (pasta public) e executa o
 * programa em C: benchmark completo e geracao de cenarios pelo menu.
 * Sem dependencias externas: apenas modulos nativos do Node.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORTA = Number(process.env.PORT) || 3000;
const RAIZ = __dirname;
const PASTA_FRONT = path.join(RAIZ, 'dashboard');
const PASTA_PUBLIC = path.join(RAIZ, 'public');
const BINARIO = path.join(RAIZ, process.platform === 'win32' ? 'geosort.exe' : 'geosort');
const RESULTADOS = path.join(RAIZ, 'resultados.csv');
const TEMPORARIO = path.join(RAIZ, 'resultados.tmp.csv');
const TOTAL_MEDICOES = 4 * 5 * 6; /* cenarios x tamanhos x algoritmos */

/* opcao do menu de cada cenario (1 a 4 em geosort.c) */
const OPCAO_CENARIO = { aleatorio: 1, ordenado: 2, inverso: 3, semi: 4 };
/* acima disso o Bubble/Insertion levam minutos fora do cenario ordenado */
const LIMITE_N = 100000;
const LIMITE_N_ORDENADO = 1000000;
const MAX_PONTOS_MAPA = 2500;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

let execucao = null; /* processo em andamento (benchmark ou cenario) */

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function enviarArquivo(res, arquivo) {
  fs.readFile(arquivo, (err, conteudo) => {
    if (err) { res.writeHead(404); res.end('Nao encontrado'); return; }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(conteudo);
  });
}

/* arquivo estatico sem sair da pasta base */
function enviarEstatico(res, base, relativo) {
  const arquivo = path.join(base, relativo);
  if (!arquivo.startsWith(base + path.sep)) { res.writeHead(403); return res.end(); }
  enviarArquivo(res, arquivo);
}

function lerCorpo(req) {
  return new Promise((ok, falha) => {
    let corpo = '';
    req.on('data', (d) => {
      corpo += d;
      if (corpo.length > 10000) { falha(new Error('Corpo muito grande')); req.destroy(); }
    });
    req.on('end', () => ok(corpo));
    req.on('error', falha);
  });
}

/* GET /api/status */
function status(res) {
  json(res, 200, {
    binario: fs.existsSync(BINARIO),
    resultados: fs.existsSync(RESULTADOS),
    rodando: Boolean(execucao),
    tarefa: execucao ? execucao.tipo : null,
    total: TOTAL_MEDICOES,
    limites: { n: LIMITE_N, ordenado: LIMITE_N_ORDENADO }
  });
}

/* POST /api/benchmark
 * Responde em NDJSON (um JSON por linha) com o progresso e o CSV parcial.
 * Se o cliente cancelar a requisicao, o processo e encerrado.
 */
function benchmark(req, res) {
  if (execucao) return json(res, 409, { erro: 'O programa ja esta em execucao. Aguarde terminar.' });
  if (!fs.existsSync(BINARIO)) return json(res, 500, { erro: 'Binario nao encontrado. Rode "yarn build".' });

  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
  const enviar = (obj) => { if (!res.writableEnded) res.write(JSON.stringify(obj) + '\n'); };

  fs.rmSync(TEMPORARIO, { force: true });
  const inicio = Date.now();
  const proc = spawn(BINARIO, ['--benchmark', TEMPORARIO], { cwd: RAIZ, stdio: ['ignore', 'ignore', 'pipe'] });
  let erros = '';
  let ultimas = -1;
  proc.stderr.on('data', (d) => { erros += d; });

  /* o programa da fflush no CSV a cada medicao: basta acompanhar o arquivo */
  const lerProgresso = () => {
    let csv = '';
    try { csv = fs.readFileSync(TEMPORARIO, 'utf8'); } catch (e) { return; }
    const linhas = csv.split('\n').filter((l) => l.trim() !== '');
    const feitas = Math.max(0, linhas.length - 1);
    if (feitas === ultimas) return;
    ultimas = feitas;
    enviar({ tipo: 'progresso', feitas, total: TOTAL_MEDICOES, ultima: feitas ? linhas[linhas.length - 1] : '',
      segundos: (Date.now() - inicio) / 1000, csv });
  };
  const timer = setInterval(lerProgresso, 400);
  execucao = { proc, tipo: 'benchmark' };
  console.log('[benchmark] iniciado');

  proc.on('close', (codigo, sinal) => {
    clearInterval(timer);
    execucao = null;
    if (codigo === 0) {
      lerProgresso();
      fs.renameSync(TEMPORARIO, RESULTADOS);
      const segundos = (Date.now() - inicio) / 1000;
      console.log(`[benchmark] concluido em ${segundos.toFixed(1)} s -> resultados.csv`);
      enviar({ tipo: 'fim', segundos, csv: fs.readFileSync(RESULTADOS, 'utf8') });
    } else {
      fs.rmSync(TEMPORARIO, { force: true });
      console.log(`[benchmark] interrompido (${sinal || 'codigo ' + codigo})`);
      enviar({ tipo: 'erro', mensagem: erros.trim() || 'O benchmark foi interrompido.' });
    }
    res.end();
  });

  /* cliente fechou a conexao antes do fim: cancela */
  res.on('close', () => {
    if (!res.writableEnded && execucao && execucao.proc === proc) proc.kill('SIGTERM');
  });
}

/* ---------- Geracao de cenario pelo menu do programa ---------- */

/* le as linhas "ID TIMESTAMP LAT LON NUV%" de uma listagem do menu */
function lerListagem(saida, titulo) {
  const ini = saida.indexOf(titulo);
  if (ini < 0) return [];
  const linhas = saida.slice(ini).split('\n').slice(2);
  const regs = [];
  for (const l of linhas) {
    const m = l.match(/^(\d+)\s+(\d+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(\d+)/);
    if (!m) break;
    regs.push({ id: +m[1], timestamp: +m[2], latitude: +m[3], longitude: +m[4], nuvens: +m[5] });
  }
  return regs;
}

/* le a tabela "=== RESULTADOS COMPARATIVOS" impressa pela opcao 9 */
function lerResultados(saida) {
  const ini = saida.indexOf('=== RESULTADOS COMPARATIVOS');
  if (ini < 0) return [];
  const tempos = [];
  for (const l of saida.slice(ini).split('\n').slice(2)) {
    const m = l.match(/^(.+?)\s+(\d+\.\d+)\s*$/);
    if (!m) break;
    tempos.push({ algoritmo: m[1].trim(), tempo_ms: +m[2] });
  }
  return tempos;
}

/* resumo do arquivo salvo pela opcao 7: amostra para o mapa e estatisticas */
function lerConjunto(arquivo) {
  const linhas = fs.readFileSync(arquivo, 'utf8').split('\n').filter((l) => l && l[0] !== '#');
  const passo = Math.max(1, Math.floor(linhas.length / MAX_PONTOS_MAPA));
  const pontos = [];
  const faixas = new Array(10).fill(0); /* nuvens em faixas de 10% */
  let somaNuvens = 0, tMin = Infinity, tMax = -Infinity, limpas = 0;
  linhas.forEach((l, i) => {
    const p = l.split(';');
    const ts = +p[1], lat = +p[2], lon = +p[3], nuv = +p[4];
    somaNuvens += nuv;
    if (nuv <= 20) limpas++;
    faixas[Math.min(9, Math.floor(nuv / 10))]++;
    if (ts < tMin) tMin = ts;
    if (ts > tMax) tMax = ts;
    if (i % passo === 0 && pontos.length < MAX_PONTOS_MAPA) pontos.push([+p[0], ts, lat, lon, nuv]);
  });
  return {
    pontos,
    resumo: {
      total: linhas.length,
      nuvens_media: linhas.length ? somaNuvens / linhas.length : 0,
      limpas,
      inicio: tMin,
      fim: tMax,
      faixas_nuvens: faixas
    }
  };
}

/* POST /api/cenario  { cenario: "aleatorio", n: 10000 }
 * Usa o menu do geosort: gera (opcoes 1-4), salva (7), compara (9) e sai (0).
 */
async function cenario(req, res) {
  let pedido;
  try { pedido = JSON.parse(await lerCorpo(req) || '{}'); } catch (e) { return json(res, 400, { erro: 'JSON invalido.' }); }

  const op = OPCAO_CENARIO[pedido.cenario];
  const n = Number(pedido.n);
  const limite = pedido.cenario === 'ordenado' ? LIMITE_N_ORDENADO : LIMITE_N;
  if (!op) return json(res, 400, { erro: 'Cenario invalido.' });
  if (!Number.isInteger(n) || n < 1 || n > limite)
    return json(res, 400, { erro: `Quantidade invalida: use de 1 a ${limite.toLocaleString('pt-BR')} neste cenario.` });
  if (execucao) return json(res, 409, { erro: 'O programa ja esta em execucao. Aguarde terminar.' });
  if (!fs.existsSync(BINARIO)) return json(res, 500, { erro: 'Binario nao encontrado. Rode "yarn build".' });

  const arquivo = path.join(os.tmpdir(), `geosort-${process.pid}-${Date.now()}.txt`);
  const inicio = Date.now();
  const proc = spawn(BINARIO, [], { cwd: RAIZ, stdio: ['pipe', 'pipe', 'pipe'] });
  execucao = { proc, tipo: 'cenario' };
  let saida = '', erros = '';
  proc.stdout.on('data', (d) => { saida += d; });
  proc.stderr.on('data', (d) => { erros += d; });
  proc.stdin.end(`${op}\n${n}\n7\n${arquivo}\n9\n0\n`);

  const limiteTempo = setTimeout(() => proc.kill('SIGTERM'), 10 * 60 * 1000);
  res.on('close', () => {
    if (!res.writableEnded && execucao && execucao.proc === proc) proc.kill('SIGTERM');
  });

  proc.on('close', (codigo, sinal) => {
    clearTimeout(limiteTempo);
    execucao = null;
    try {
      if (codigo !== 0) throw new Error(erros.trim() || `Programa interrompido (${sinal || codigo}).`);
      const tempos = lerResultados(saida);
      if (!tempos.length) throw new Error('Nao foi possivel ler os resultados do programa.');
      const rapido = saida.match(/Mais rapido: (.+)/);
      const listado = saida.match(/DEPOIS DA ORDENACAO \((.+?)\)/);
      const conjunto = lerConjunto(arquivo);
      const segundos = (Date.now() - inicio) / 1000;
      console.log(`[cenario] ${pedido.cenario} n=${n} em ${segundos.toFixed(1)} s`);
      json(res, 200, {
        cenario: pedido.cenario,
        n,
        segundos,
        tempos,
        mais_rapido: rapido ? rapido[1].trim() : null,
        erros_ordenacao: (saida.match(/ERRO: .+/g) || []),
        antes: lerListagem(saida, '--- ANTES DA ORDENACAO'),
        depois: lerListagem(saida, '--- DEPOIS DA ORDENACAO'),
        algoritmo_listado: listado ? listado[1] : null,
        pontos: conjunto.pontos,
        resumo: conjunto.resumo
      });
    } catch (e) {
      if (!res.writableEnded) json(res, 500, { erro: e.message });
    } finally {
      fs.rmSync(arquivo, { force: true });
    }
  });
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let rota;
  try { rota = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end(); }

  if (rota === '/api/status' && req.method === 'GET') return status(res);
  if (rota === '/api/benchmark' && req.method === 'POST') return benchmark(req, res);
  if (rota === '/api/cenario' && req.method === 'POST') return cenario(req, res);
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
  if (rota === '/resultados.csv') return enviarArquivo(res, RESULTADOS);
  if (rota.startsWith('/public/')) return enviarEstatico(res, PASTA_PUBLIC, rota.slice('/public/'.length));
  if (rota === '/favicon.ico') return enviarArquivo(res, path.join(PASTA_PUBLIC, 'favicon.png'));
  enviarEstatico(res, PASTA_FRONT, rota === '/' ? 'index.html' : rota);
});

servidor.listen(PORTA, () => {
  console.log('');
  console.log('  GeoSort rodando em  http://localhost:' + PORTA);
  if (!fs.existsSync(BINARIO)) console.log('  Aviso: binario nao encontrado, rode "yarn build".');
  if (!fs.existsSync(RESULTADOS)) console.log('  Ainda sem resultados.csv: use o botao "Rodar benchmark" no painel.');
  console.log('  Ctrl+C para encerrar.');
  console.log('');
});

/* encerra o programa em C junto com o servidor */
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    if (execucao) execucao.proc.kill('SIGTERM');
    fs.rmSync(TEMPORARIO, { force: true });
    process.exit(0);
  });
}
