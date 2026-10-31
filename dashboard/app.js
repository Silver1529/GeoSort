/* GeoSort - painel de desempenho
 * Le o CSV gerado por "./geosort --benchmark" e desenha os graficos em SVG.
 */
(function () {
  'use strict';

  /* mesma ordem do vetor NOMES em geosort.c */
  var ALGORITMOS = ['Bubble Sort', 'Insertion Sort', 'Shell Sort', 'Merge Sort', 'Quick Sort', 'Heap Sort'];
  var CENARIOS = [
    { id: 'aleatorio', nome: 'Aleatório' },
    { id: 'ordenado', nome: 'Ordenado' },
    { id: 'inverso', nome: 'Inverso' },
    { id: 'semi', nome: 'Semi-ordenado' }
  ];
  var SVG = 'http://www.w3.org/2000/svg';
  var MIN_LOG = 0.001; /* menor valor mostrado em escala log (ms) */

  var estado = {
    dados: null,      /* dados[cenario][algoritmo][n] = tempo_ms */
    algoritmos: [],
    cenarios: [],
    tamanhos: [],
    cenario: null,
    escala: 'log',
    n: null,
    ocultos: {},
    nomeArquivo: ''
  };

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Formatacao ---------- */
  function fmtMs(v) {
    if (v === 0) return '0 ms';
    if (v >= 1000) return (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' s';
    var casas = v < 1 ? 3 : (v < 100 ? 2 : 1);
    return v.toLocaleString('pt-BR', { maximumFractionDigits: casas }) + ' ms';
  }
  function fmtN(n) { return n.toLocaleString('pt-BR'); }
  function fmtCompacto(n) { return n >= 1000 ? (n / 1000).toLocaleString('pt-BR') + 'k' : String(n); }
  function cor(alg) {
    var i = ALGORITMOS.indexOf(alg);
    return i >= 0 ? 'var(--s' + (i + 1) + ')' : 'var(--texto-3)';
  }
  function nomeCenario(id) {
    for (var i = 0; i < CENARIOS.length; i++) if (CENARIOS[i].id === id) return CENARIOS[i].nome;
    return id;
  }
  function el(tag, attrs, pai) {
    var e = document.createElementNS(SVG, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (pai) pai.appendChild(e);
    return e;
  }

  /* ---------- Leitura do CSV ---------- */
  function lerCSV(texto) {
    var linhas = texto.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() !== ''; });
    if (!linhas.length || linhas[0].trim() !== 'cenario,n,algoritmo,tempo_ms')
      throw new Error('Cabeçalho inválido. Esperado: cenario,n,algoritmo,tempo_ms');

    var dados = {}, algs = {}, cens = {}, tams = {}, total = 0;
    for (var i = 1; i < linhas.length; i++) {
      var p = linhas[i].split(',');
      var n = parseInt(p[1], 10), t = parseFloat(p[3]);
      if (p.length !== 4 || isNaN(n) || isNaN(t)) throw new Error('Linha ' + (i + 1) + ' com formato inválido.');
      var c = p[0].trim(), a = p[2].trim();
      dados[c] = dados[c] || {};
      dados[c][a] = dados[c][a] || {};
      dados[c][a][n] = t;
      algs[a] = cens[c] = tams[n] = true;
      total++;
    }
    if (!total) throw new Error('O arquivo não tem medições.');

    /* algoritmos conhecidos primeiro, na ordem fixa */
    var listaAlgs = ALGORITMOS.filter(function (a) { return algs[a]; })
      .concat(Object.keys(algs).filter(function (a) { return ALGORITMOS.indexOf(a) < 0; }));
    var listaCens = CENARIOS.map(function (c) { return c.id; }).filter(function (c) { return cens[c]; })
      .concat(Object.keys(cens).filter(function (c) { return !CENARIOS.some(function (x) { return x.id === c; }); }));

    return {
      dados: dados,
      algoritmos: listaAlgs,
      cenarios: listaCens,
      tamanhos: Object.keys(tams).map(Number).sort(function (a, b) { return a - b; }),
      total: total
    };
  }

  /* manter = true preserva os filtros escolhidos (atualizacao ao vivo) */
  function carregarTexto(texto, nome, manter) {
    try {
      var r = lerCSV(texto);
      /* se estava no maior n, continua acompanhando o maior */
      var eraMaior = estado.n === estado.tamanhos[estado.tamanhos.length - 1];
      if (manter && eraMaior) estado.n = null;
      estado.dados = r.dados;
      estado.algoritmos = r.algoritmos;
      estado.cenarios = r.cenarios;
      estado.tamanhos = r.tamanhos;
      estado.total = r.total;
      if (!manter || r.cenarios.indexOf(estado.cenario) < 0) estado.cenario = r.cenarios[0];
      if (!manter || r.tamanhos.indexOf(estado.n) < 0) estado.n = r.tamanhos[r.tamanhos.length - 1];
      if (!manter) estado.ocultos = {};
      estado.nomeArquivo = nome;
      $('erro').hidden = true;
      $('vazio').hidden = true;
      $('painel').hidden = false;
      montarFiltros();
      desenhar();
    } catch (e) {
      $('erro').textContent = e.message;
      $('erro').hidden = false;
    }
  }

  function carregarArquivo(arq) {
    if (!arq) return;
    var leitor = new FileReader();
    leitor.onload = function () { carregarTexto(String(leitor.result), arq.name); };
    leitor.readAsText(arq);
  }

  function tempo(c, a, n) {
    var d = estado.dados[c] && estado.dados[c][a];
    return d && d[n] !== undefined ? d[n] : null;
  }

  /* ---------- Filtros ---------- */
  function montarGrupo(cont, itens, ativo, aoClicar) {
    cont.innerHTML = '';
    itens.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.rotulo;
      if (it.valor === ativo) b.className = 'ativo';
      b.onclick = function () { aoClicar(it.valor); };
      cont.appendChild(b);
    });
  }

  function montarFiltros() {
    montarGrupo($('cenarios'), estado.cenarios.map(function (c) { return { valor: c, rotulo: nomeCenario(c) }; }),
      estado.cenario, function (v) { estado.cenario = v; montarFiltros(); desenhar(); });
    montarGrupo($('tamanhos'), estado.tamanhos.map(function (n) { return { valor: n, rotulo: 'n = ' + fmtCompacto(n) }; }),
      estado.n, function (v) { estado.n = v; montarFiltros(); desenhar(); });
    Array.prototype.forEach.call($('escala').children, function (b) {
      b.className = b.getAttribute('data-escala') === estado.escala ? 'ativo' : '';
    });
    $('fonte').textContent = estado.nomeArquivo + ' · ' + estado.total + ' medições';
  }

  /* ---------- Desenho geral ---------- */
  function desenhar() {
    esconderDica();
    desenharCartoes();
    desenharLegenda();
    desenharLinhas();
    desenharBarras();
    desenharCalor();
    desenharTabela();
  }

  /* ---------- Cartoes de resumo ---------- */
  function desenharCartoes() {
    var c = estado.cenario, n = estado.tamanhos[estado.tamanhos.length - 1];
    var lista = estado.algoritmos
      .map(function (a) { return { a: a, t: tempo(c, a, n) }; })
      .filter(function (x) { return x.t !== null; })
      .sort(function (x, y) { return x.t - y.t; });
    if (!lista.length) { $('cartoes').innerHTML = ''; return; }
    var rap = lista[0], len = lista[lista.length - 1];
    var razao = rap.t > 0 ? len.t / rap.t : null;

    var cards = [
      { rotulo: 'Mais rápido · n = ' + fmtN(n), valor: rap.a, extra: fmtMs(rap.t), cor: cor(rap.a) },
      { rotulo: 'Mais lento · n = ' + fmtN(n), valor: len.a, extra: fmtMs(len.t), cor: cor(len.a) },
      { rotulo: 'Diferença entre extremos', valor: razao ? Math.round(razao).toLocaleString('pt-BR') + '×' : '—',
        extra: 'o mais lento em relação ao mais rápido' },
      { rotulo: 'Cenário', valor: nomeCenario(c), extra: estado.tamanhos.length + ' tamanhos · ' + estado.algoritmos.length + ' algoritmos' }
    ];
    $('cartoes').innerHTML = cards.map(function (k, i) {
      return '<div class="cartao" style="animation-delay:' + (i * 50) + 'ms">' +
        '<div class="rotulo">' + k.rotulo + '</div>' +
        '<div class="valor">' + k.valor + '</div>' +
        '<div class="extra">' + (k.cor ? '<span class="ponto" style="background:' + k.cor + '"></span>' : '') + k.extra + '</div>' +
        '</div>';
    }).join('');
  }

  /* ---------- Legenda (clicar oculta/mostra a serie) ---------- */
  function desenharLegenda() {
    var leg = $('legenda');
    leg.innerHTML = '';
    estado.algoritmos.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = estado.ocultos[a] ? 'off' : '';
      b.setAttribute('aria-pressed', estado.ocultos[a] ? 'false' : 'true');
      b.innerHTML = '<span class="chave" style="background:' + cor(a) + '"></span>' + a;
      b.onclick = function () {
        estado.ocultos[a] = !estado.ocultos[a];
        desenharLegenda();
        desenharLinhas();
      };
      leg.appendChild(b);
    });
  }

  /* ---------- Escalas ---------- */
  function escalaLog(d0, d1, r0, r1) {
    var l0 = Math.log10(d0), l1 = Math.log10(d1);
    return function (v) { return r0 + (Math.log10(v) - l0) / (l1 - l0 || 1) * (r1 - r0); };
  }
  function escalaLinear(d0, d1, r0, r1) {
    return function (v) { return r0 + (v - d0) / (d1 - d0 || 1) * (r1 - r0); };
  }
  function ticksLineares(max, qtd) {
    var passo = Math.pow(10, Math.floor(Math.log10(max / qtd)));
    var err = max / qtd / passo;
    if (err >= 7.5) passo *= 10; else if (err >= 3.5) passo *= 5; else if (err >= 1.5) passo *= 2;
    var t = [];
    for (var v = 0; v <= max * 1.0001 + passo; v += passo) { t.push(v); if (v >= max) break; }
    return t;
  }

  /* ---------- Grafico de linhas: tempo x n ---------- */
  function desenharLinhas() {
    var cont = $('g-linhas');
    cont.innerHTML = '';
    var c = estado.cenario, tams = estado.tamanhos;
    var visiveis = estado.algoritmos.filter(function (a) { return !estado.ocultos[a]; });
    $('sub-linhas').textContent = 'Cenário ' + nomeCenario(c).toLowerCase() + ' · média de 3 execuções · eixo Y em escala ' +
      (estado.escala === 'log' ? 'logarítmica' : 'linear');

    var L = cont.clientWidth || 800, A = 340;
    var m = { e: 68, d: 20, t: 12, b: 44 };
    var svg = el('svg', { width: L, height: A, viewBox: '0 0 ' + L + ' ' + A, role: 'img',
      'aria-label': 'Tempo de execução por tamanho da entrada, cenário ' + nomeCenario(c) }, cont);

    var vals = [];
    visiveis.forEach(function (a) { tams.forEach(function (n) { var t = tempo(c, a, n); if (t !== null) vals.push(t); }); });
    if (!vals.length) {
      el('text', { x: L / 2, y: A / 2, 'text-anchor': 'middle', 'class': 'eixo-texto' }, svg).textContent = 'Selecione ao menos um algoritmo na legenda';
      return;
    }

    var x = tams.length > 1 ? escalaLog(tams[0], tams[tams.length - 1], m.e, L - m.d) : function () { return (m.e + L - m.d) / 2; };
    var y, ticks, log = estado.escala === 'log';
    if (log) {
      var mn = Math.max(MIN_LOG, Math.min.apply(null, vals.map(function (v) { return Math.max(v, MIN_LOG); })));
      var mx = Math.max.apply(null, vals);
      var e0 = Math.floor(Math.log10(mn)), e1 = Math.ceil(Math.log10(Math.max(mx, mn * 10)));
      y = escalaLog(Math.pow(10, e0), Math.pow(10, e1), A - m.b, m.t);
      ticks = [];
      for (var e = e0; e <= e1; e++) ticks.push(Math.pow(10, e));
    } else {
      ticks = ticksLineares(Math.max.apply(null, vals), 5);
      y = escalaLinear(0, ticks[ticks.length - 1], A - m.b, m.t);
    }
    var yv = function (v) { return y(log ? Math.max(v, MIN_LOG) : v); };

    /* grade e eixos */
    ticks.forEach(function (t) {
      el('line', { x1: m.e, x2: L - m.d, y1: y(t), y2: y(t), 'class': 'linha-grade' }, svg);
      el('text', { x: m.e - 10, y: y(t) + 4, 'text-anchor': 'end', 'class': 'eixo-texto' }, svg).textContent = fmtMs(t);
    });
    el('line', { x1: m.e, x2: L - m.d, y1: A - m.b, y2: A - m.b, 'class': 'linha-base' }, svg);
    tams.forEach(function (n) {
      el('text', { x: x(n), y: A - m.b + 18, 'text-anchor': 'middle', 'class': 'eixo-texto' }, svg).textContent = fmtCompacto(n);
    });
    el('text', { x: (m.e + L - m.d) / 2, y: A - 4, 'text-anchor': 'middle', 'class': 'eixo-titulo' }, svg).textContent = 'Tamanho da entrada (n)';

    /* series */
    visiveis.forEach(function (a) {
      var pts = tams.filter(function (n) { return tempo(c, a, n) !== null; })
        .map(function (n) { return [x(n), yv(tempo(c, a, n))]; });
      if (!pts.length) return;
      el('path', { d: 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L'),
        'class': 'serie', style: 'stroke:' + cor(a) }, svg);
      pts.forEach(function (p) { el('circle', { cx: p[0], cy: p[1], r: 4, 'class': 'marcador', style: 'fill:' + cor(a) }, svg); });
    });

    /* mira + dica ao passar o mouse */
    var mira = el('line', { y1: m.t, y2: A - m.b, 'class': 'mira', visibility: 'hidden' }, svg);
    var alvo = el('rect', { x: m.e, y: m.t, width: L - m.e - m.d, height: A - m.t - m.b, fill: 'transparent' }, svg);
    alvo.addEventListener('mousemove', function (ev) {
      var r = svg.getBoundingClientRect(), px = ev.clientX - r.left;
      var n = tams.reduce(function (b, t) { return Math.abs(x(t) - px) < Math.abs(x(b) - px) ? t : b; }, tams[0]);
      mira.setAttribute('x1', x(n)); mira.setAttribute('x2', x(n)); mira.setAttribute('visibility', 'visible');
      var itens = visiveis.map(function (a) { return { a: a, t: tempo(c, a, n) }; })
        .filter(function (i) { return i.t !== null; })
        .sort(function (p, q) { return p.t - q.t; });
      mostrarDica(ev, 'n = ' + fmtN(n), itens.map(function (i) { return [i.a, fmtMs(i.t), cor(i.a)]; }));
    });
    alvo.addEventListener('mouseleave', function () { mira.setAttribute('visibility', 'hidden'); esconderDica(); });
  }

  /* ---------- Barras horizontais: ranking no n escolhido ---------- */
  function desenharBarras() {
    var cont = $('g-barras');
    cont.innerHTML = '';
    var c = estado.cenario, n = estado.n;
    $('sub-barras').textContent = 'n = ' + fmtN(n) + ' · ' + nomeCenario(c).toLowerCase();
    var lista = estado.algoritmos.map(function (a) { return { a: a, t: tempo(c, a, n) }; })
      .filter(function (i) { return i.t !== null; })
      .sort(function (p, q) { return p.t - q.t; });
    if (!lista.length) return;

    var L = cont.clientWidth || 400, linha = 38, esp = 20;
    var m = { e: 104, d: 76 }, A = lista.length * linha + 4;
    var svg = el('svg', { width: L, height: A, viewBox: '0 0 ' + L + ' ' + A, role: 'img',
      'aria-label': 'Ranking dos algoritmos para n = ' + fmtN(n) }, cont);
    var max = lista[lista.length - 1].t || 1;
    var x = escalaLinear(0, max, 0, L - m.e - m.d);
    var melhor = lista[0].t;

    el('line', { x1: m.e, x2: m.e, y1: 0, y2: A, 'class': 'linha-base' }, svg);
    lista.forEach(function (i, k) {
      var cy = k * linha + linha / 2, w = Math.max(x(i.t), 2), y0 = cy - esp / 2, r = Math.min(4, w);
      el('text', { x: m.e - 10, y: cy + 4, 'text-anchor': 'end', 'class': 'nome-barra' }, svg).textContent = i.a;
      /* ponta arredondada so no fim da barra */
      var d = 'M' + m.e + ',' + y0 + 'H' + (m.e + w - r) + 'Q' + (m.e + w) + ',' + y0 + ' ' + (m.e + w) + ',' + (y0 + r) +
        'V' + (y0 + esp - r) + 'Q' + (m.e + w) + ',' + (y0 + esp) + ' ' + (m.e + w - r) + ',' + (y0 + esp) + 'H' + m.e + 'Z';
      var b = el('path', { d: d, 'class': 'barra', style: 'fill:' + cor(i.a) }, svg);
      el('text', { x: m.e + w + 8, y: cy + 4, 'class': 'valor-barra' }, svg).textContent = fmtMs(i.t);
      var vezes = melhor > 0 ? (i.t / melhor) : null;
      b.addEventListener('mousemove', function (ev) {
        mostrarDica(ev, i.a, [['Tempo', fmtMs(i.t), cor(i.a)],
          ['Posição', (k + 1) + 'º de ' + lista.length],
          ['Relação ao 1º', vezes ? vezes.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '×' : '—']]);
      });
      b.addEventListener('mouseleave', esconderDica);
    });
  }

  /* ---------- Mapa de calor: algoritmo x cenario ---------- */
  function hexParaRgb(h) {
    h = h.trim().replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function luminancia(rgb) {
    var c = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function desenharCalor() {
    var cont = $('g-calor'), n = estado.n;
    $('sub-calor').textContent = 'n = ' + fmtN(n);
    var est = getComputedStyle(document.documentElement);
    var c0 = hexParaRgb(est.getPropertyValue('--calor-0')), c1 = hexParaRgb(est.getPropertyValue('--calor-1'));

    var vals = [];
    estado.cenarios.forEach(function (c) { estado.algoritmos.forEach(function (a) {
      var t = tempo(c, a, n); if (t !== null) vals.push(Math.max(t, MIN_LOG));
    }); });
    var l0 = Math.log10(Math.min.apply(null, vals)), l1 = Math.log10(Math.max.apply(null, vals));

    var html = '<div></div>' + estado.cenarios.map(function (c) { return '<div class="cab">' + nomeCenario(c) + '</div>'; }).join('');
    estado.algoritmos.forEach(function (a) {
      html += '<div class="alg"><span class="ponto" style="background:' + cor(a) + '"></span>' + a + '</div>';
      estado.cenarios.forEach(function (c) {
        var t = tempo(c, a, n);
        if (t === null) { html += '<div class="celula">—</div>'; return; }
        var f = l1 > l0 ? (Math.log10(Math.max(t, MIN_LOG)) - l0) / (l1 - l0) : 0;
        var rgb = c0.map(function (v, i) { return Math.round(v + (c1[i] - v) * f); });
        var txt = luminancia(rgb) > 0.35 ? '#0b0b0b' : '#ffffff';
        html += '<div class="celula" style="background:rgb(' + rgb.join(',') + ');color:' + txt + '" ' +
          'data-a="' + a + '" data-c="' + c + '" data-t="' + t + '">' + fmtMs(t) + '</div>';
      });
    });
    html += '<div class="escala-calor"><span>' + fmtMs(Math.pow(10, l0)) + '</span><span class="barra-escala"></span><span>' +
      fmtMs(Math.pow(10, l1)) + '</span></div>';
    cont.innerHTML = html;

    Array.prototype.forEach.call(cont.querySelectorAll('.celula[data-t]'), function (cel) {
      cel.addEventListener('mousemove', function (ev) {
        var a = cel.getAttribute('data-a');
        mostrarDica(ev, a, [['Cenário', nomeCenario(cel.getAttribute('data-c')), cor(a)],
          ['Tempo', fmtMs(parseFloat(cel.getAttribute('data-t')))]]);
      });
      cel.addEventListener('mouseleave', esconderDica);
    });
  }

  /* ---------- Tabela ---------- */
  function desenharTabela() {
    var c = estado.cenario, tams = estado.tamanhos;
    $('sub-tabela').textContent = 'Cenário ' + nomeCenario(c).toLowerCase() + ' · tempo médio por tamanho de entrada';
    var melhores = tams.map(function (n) {
      var m = null;
      estado.algoritmos.forEach(function (a) { var t = tempo(c, a, n); if (t !== null && (m === null || t < m)) m = t; });
      return m;
    });
    var h = '<thead><tr><th>Algoritmo</th>' + tams.map(function (n) { return '<th>n = ' + fmtN(n) + '</th>'; }).join('') + '</tr></thead><tbody>';
    estado.algoritmos.forEach(function (a) {
      h += '<tr><td><span class="nome"><span class="ponto" style="background:' + cor(a) + '"></span>' + a + '</span></td>';
      tams.forEach(function (n, i) {
        var t = tempo(c, a, n), melhor = t !== null && t === melhores[i];
        h += '<td' + (melhor ? ' class="melhor"' : '') + '>' + (t === null ? '—' : fmtMs(t)) + (melhor ? '<span class="selo">melhor</span>' : '') + '</td>';
      });
      h += '</tr>';
    });
    $('tabela').innerHTML = h + '</tbody>';
  }

  /* ---------- Dica (tooltip) ---------- */
  function mostrarDica(ev, titulo, itens) {
    var d = $('dica');
    d.innerHTML = '<div class="titulo">' + titulo + '</div>' + itens.map(function (i) {
      return '<div class="item">' + (i[2] ? '<span class="ponto" style="background:' + i[2] + '"></span>' : '') +
        '<span>' + i[0] + '</span><b>' + i[1] + '</b></div>';
    }).join('');
    d.hidden = false;
    var w = d.offsetWidth, h = d.offsetHeight, px = ev.clientX + 16, py = ev.clientY + 16;
    if (px + w > window.innerWidth - 8) px = ev.clientX - w - 16;
    if (py + h > window.innerHeight - 8) py = ev.clientY - h - 16;
    d.style.left = Math.max(8, px) + 'px';
    d.style.top = Math.max(8, py) + 'px';
  }
  function esconderDica() { $('dica').hidden = true; }

  /* ---------- Benchmark pelo servidor ---------- */
  var controle = null;

  function fmtDuracao(s) {
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  var timerDoca = null;

  function terminarBenchmark() {
    controle = null;
    document.body.classList.remove('ao-vivo');
    $('rodar').disabled = false;
  }

  /* painel flutuante: tipo null (rodando), 'ok' ou 'erro' */
  function estadoDoca(tipo, titulo, texto) {
    var d = $('progresso');
    d.classList.remove('ok', 'erro');
    if (tipo) d.classList.add(tipo);
    $('prog-titulo').textContent = titulo;
    $('prog-texto').textContent = texto;
    $('cancelar').textContent = tipo ? 'Fechar' : 'Cancelar';
  }

  function fecharDoca() {
    clearTimeout(timerDoca);
    $('progresso').hidden = true;
  }

  function tratarEvento(ev) {
    if (ev.tipo === 'progresso') {
      $('prog-barra').style.width = (100 * ev.feitas / ev.total) + '%';
      $('prog-texto').textContent = ev.feitas + ' de ' + ev.total + ' medições em ' + fmtDuracao(ev.segundos);
      if (ev.ultima) {
        var u = ev.ultima.split(',');
        $('prog-ultima').textContent = 'Última: ' + u[2] + ', ' + nomeCenario(u[0]).toLowerCase() + ', n = ' +
          fmtN(Number(u[1])) + ', ' + fmtMs(Number(u[3]));
      }
      if (ev.feitas > 0) carregarTexto(ev.csv, 'benchmark em andamento', true);
    } else if (ev.tipo === 'fim') {
      carregarTexto(ev.csv, 'resultados.csv', true);
      $('prog-barra').style.width = '100%';
      $('prog-ultima').textContent = '';
      estadoDoca('ok', 'Benchmark concluído', 'As 120 medições terminaram em ' + fmtDuracao(ev.segundos) +
        ' e os gráficos já mostram os novos resultados.');
      terminarBenchmark();
      timerDoca = setTimeout(fecharDoca, 12000);
    } else if (ev.tipo === 'erro') {
      estadoDoca('erro', 'Benchmark interrompido', ev.mensagem);
      terminarBenchmark();
    }
  }

  function abrirConfirmacao() {
    $('confirmar').hidden = false;
    $('sim-rodar').focus();
  }
  function fecharConfirmacao() {
    $('confirmar').hidden = true;
    $('rodar').focus();
  }

  function rodarBenchmark() {
    $('confirmar').hidden = true;
    clearTimeout(timerDoca);
    $('progresso').hidden = false;
    estadoDoca(null, 'Executando benchmark', 'Iniciando o programa em C…');
    $('prog-barra').style.width = '0';
    $('prog-ultima').textContent = '';
    $('rodar').disabled = true;
    document.body.classList.add('ao-vivo');
    $('benchmark').scrollIntoView({ behavior: 'smooth', block: 'start' });
    controle = new AbortController();

    /* resposta em NDJSON: um evento JSON por linha */
    fetch('api/benchmark', { method: 'POST', signal: controle.signal }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw new Error(j.erro || 'Falha ao iniciar.'); });
      var leitor = r.body.getReader(), dec = new TextDecoder(), resto = '';
      function ler() {
        return leitor.read().then(function (p) {
          if (p.done) return;
          resto += dec.decode(p.value, { stream: true });
          var partes = resto.split('\n');
          resto = partes.pop();
          partes.forEach(function (l) { if (l.trim()) tratarEvento(JSON.parse(l)); });
          return ler();
        });
      }
      return ler();
    }).catch(function (e) {
      if (e.name === 'AbortError') fecharDoca();
      else estadoDoca('erro', 'O benchmark não começou', e.message);
      terminarBenchmark();
    });
  }

  /* verifica se o painel foi aberto pelo server.js */
  function conectarServidor() {
    return fetch('api/status').then(function (r) {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(function (st) {
      if (st.benchmark !== false) {
        $('rodar').hidden = false;
        $('dica-comando').textContent = 'botão "Rodar benchmark" acima';
      }
      if (st.rodando) {
        $('rodar').disabled = true;
        $('rodar').title = 'Já existe um benchmark em execução';
      }
      if (st.resultados) {
        return fetch('resultados.csv').then(function (r) { return r.text(); })
          .then(function (t) { carregarTexto(t, 'resultados.csv'); });
      }
    });
  }

  /* ---------- Tema claro/escuro ---------- */
  function temaEscuro() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function aplicarTema(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('geosort-tema', t); } catch (e) { /* sem armazenamento */ }
    if (estado.dados) desenhar();
  }

  /* ---------- Eventos ---------- */
  function iniciar() {
    try {
      var salvo = localStorage.getItem('geosort-tema');
      if (salvo) document.documentElement.setAttribute('data-theme', salvo);
    } catch (e) { /* sem armazenamento */ }

    $('tema').onclick = function () { aplicarTema(temaEscuro() ? 'light' : 'dark'); };
    $('arquivo').onchange = function () { carregarArquivo(this.files[0]); this.value = ''; };

    Array.prototype.forEach.call($('escala').children, function (b) {
      b.onclick = function () { estado.escala = b.getAttribute('data-escala'); montarFiltros(); desenharLinhas(); };
    });

    /* arrastar e soltar em qualquer lugar da pagina */
    var zona = $('soltar');
    window.addEventListener('dragover', function (e) { e.preventDefault(); zona.classList.add('sobre'); });
    window.addEventListener('dragleave', function (e) { if (!e.relatedTarget) zona.classList.remove('sobre'); });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      zona.classList.remove('sobre');
      carregarArquivo(e.dataTransfer.files[0]);
    });

    var espera;
    window.addEventListener('resize', function () {
      clearTimeout(espera);
      espera = setTimeout(function () { if (estado.dados) desenhar(); }, 120);
    });

    $('rodar').onclick = abrirConfirmacao;
    $('nao-rodar').onclick = fecharConfirmacao;
    $('sim-rodar').onclick = rodarBenchmark;
    $('confirmar').addEventListener('click', function (e) { if (e.target === this) fecharConfirmacao(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('confirmar').hidden) fecharConfirmacao();
    });
    $('cancelar').onclick = function () {
      if (controle) controle.abort();
      else fecharDoca();
    };

    /* com o server.js: habilita o benchmark e carrega resultados.csv
     * com outro servidor estatico: tenta apenas carregar o CSV */
    if (location.protocol.indexOf('http') === 0) {
      conectarServidor().catch(function () {
        ['resultados.csv', '../resultados.csv'].reduce(function (p, url) {
          return p.catch(function () {
            return fetch(url).then(function (r) {
              if (!r.ok) throw new Error();
              return r.text().then(function (t) { carregarTexto(t, url.split('/').pop()); });
            });
          });
        }, Promise.reject()).catch(function () { /* sem arquivo padrao */ });
      });
    }
  }

  /* funcoes compartilhadas com laboratorio.js */
  window.GeoSort = {
    ALGORITMOS: ALGORITMOS,
    CENARIOS: CENARIOS,
    cor: cor,
    fmtMs: fmtMs,
    fmtN: fmtN,
    nomeCenario: nomeCenario,
    mostrarDica: mostrarDica,
    esconderDica: esconderDica
  };

  iniciar();
})();
