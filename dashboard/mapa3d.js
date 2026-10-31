/* GeoSort - mapa 3D das imagens de satelite
 * Canvas 2D com projecao em perspectiva propria, sem bibliotecas.
 * A regiao amazonica vira um bloco de terreno com rios e capitais. As
 * imagens aparecem como colunas hexagonais (quantidade por regiao) ou
 * como pontos (altura = nuvens). A linha do tempo reproduz as capturas
 * em ordem cronologica, a mesma ordem que os algoritmos produzem.
 */
(function () {
  'use strict';

  /* regiao dos dados gerados em geosort.c */
  var LAT = [4, -16], LON = [-74, -44];
  var CLON = (LON[0] + LON[1]) / 2, CLAT = (LAT[0] + LAT[1]) / 2;
  var X0 = LON[0] - CLON, X1 = LON[1] - CLON;   /* oeste .. leste */
  var Z0 = CLAT - LAT[0], Z1 = CLAT - LAT[1];   /* norte .. sul */

  var HEX = 0.95;           /* raio do hexagono, em graus */
  var ALT_COLUNA = 2.6;     /* altura da coluna mais cheia */
  var ALT_PONTO = 3.4;      /* altura de um ponto com 100% de nuvens */
  var ESPESSURA = 0.8;      /* espessura do bloco de terreno */
  var DURACAO = 14000;      /* duracao da linha do tempo, em ms */
  var VERDE = [95, 208, 143], VERDE_FORTE = [38, 178, 104], BRANCO = [238, 246, 241], LARANJA = [232, 149, 43], NEBLINA = [6, 20, 15];
  var LUZ = normalizar([-0.45, 0.85, 0.55]);
  var VISTA_INICIAL = { yaw: -0.25, pitch: 0.95, dist: 52 };
  var VISTA_TOPO = { yaw: 0, pitch: 1.5, dist: 50 };
  var SAT_A = [-19, 8, 10.5], SAT_B = [19, 8, -9.5];
  var CORES_FOLHA = ['#1f6b4a', '#2a7a57', '#0c3326'];
  var GRAU = Math.PI / 180;
  var REDUZIR = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var FONTE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  var CIDADES = [
    ['Manaus', -3.12, -60.02], ['Belém', -1.46, -48.50], ['Porto Velho', -8.76, -63.90],
    ['Rio Branco', -9.97, -67.81], ['Boa Vista', 2.82, -60.67], ['Macapá', 0.03, -51.07],
    ['Santarém', -2.44, -54.71], ['Palmas', -10.18, -48.33], ['Cuiabá', -15.60, -56.10]
  ];

  /* tracado aproximado dos principais rios (lon, lat) */
  var RIOS = [
    [[-73.9, -4.4], [-72.0, -4.1], [-70.0, -4.2], [-68.0, -3.3], [-66.0, -3.4], [-64.7, -3.4], [-62.5, -3.6],
      [-60.0, -3.15], [-58.5, -3.3], [-57.0, -2.7], [-55.5, -1.9], [-54.7, -2.3], [-53.0, -1.8], [-51.6, -1.3],
      [-50.6, -0.6], [-49.6, -0.2]],
    [[-60.0, -3.15], [-61.3, -2.4], [-62.8, -1.2], [-64.6, -0.4], [-66.6, 0.3], [-67.6, 1.4]],
    [[-58.8, -3.4], [-59.8, -4.5], [-61.4, -5.9], [-62.6, -7.4], [-63.9, -8.76], [-65.3, -10.0]],
    [[-61.4, -3.9], [-63.3, -5.0], [-64.8, -6.8], [-66.8, -8.4], [-68.4, -9.4]],
    [[-54.9, -2.5], [-55.6, -4.3], [-56.6, -6.2], [-57.6, -7.6], [-58.3, -9.3]],
    [[-52.3, -1.6], [-52.1, -3.3], [-52.9, -5.4], [-53.4, -7.6], [-53.0, -10.0], [-53.3, -12.0]],
    [[-49.4, -1.7], [-49.4, -3.8], [-48.6, -5.6], [-48.4, -7.5], [-48.3, -10.2], [-48.5, -12.5]]
  ];

  var ICONES = {
    girar: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>',
    topo: '<svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5"/></svg>',
    mais: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    menos: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
    tocar: '<svg viewBox="0 0 24 24"><path d="M7 4l12 8-12 8z"/></svg>',
    pausar: '<svg viewBox="0 0 24 24"><path d="M7 4h4v16H7zM13 4h4v16h-4z"/></svg>'
  };

  /* ---------- Utilitarios ---------- */
  function normalizar(v) {
    var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function misturar(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function limitar(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function suave(t) { return 1 - Math.pow(1 - t, 3); }
  function mundo(lon, lat) { return [lon - CLON, CLAT - lat]; }
  function corNuvem(nuv) { return misturar(VERDE, BRANCO, limitar(nuv / 100, 0, 1)); }
  function css(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }

  /* cor com sombreamento (fator) e neblina de distancia (0 a 1) */
  function tom(c, fator, neblina, alfa) {
    var r = misturar([c[0] * fator, c[1] * fator, c[2] * fator], NEBLINA, neblina);
    return 'rgba(' + Math.round(r[0]) + ',' + Math.round(r[1]) + ',' + Math.round(r[2]) + ',' + (alfa === undefined ? 1 : alfa) + ')';
  }

  /* area com sinal no espaco da tela: positiva = face voltada para a camera */
  function area(pts) {
    var s = 0;
    for (var i = 0, n = pts.length; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s;
  }

  function dentro(x, y, pts) {
    var ok = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ok = !ok;
    }
    return ok;
  }

  function poligono(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  /* gerador fixo: estrelas e textura iguais a cada visita */
  function sorteio(semente) {
    var s = semente;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  /* hexagono (pontudo em cima) que contem o ponto x, z */
  function hexDe(x, z) {
    var q = (Math.sqrt(3) / 3 * x - z / 3) / HEX, r = (2 / 3 * z) / HEX;
    var cx = q, cz = r, cy = -cx - cz;
    var rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
    var dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz) ry = -rx - rz;
    else rz = -rx - ry;
    return [rx, rz];
  }

  function fmtN(n) { return n.toLocaleString('pt-BR'); }
  function fmtData(ts, opcoes) {
    var o = { timeZone: 'UTC' };
    for (var k in opcoes) o[k] = opcoes[k];
    return new Date(ts * 1000).toLocaleString('pt-BR', o);
  }
  function fmtGrau(v, pos, neg) {
    return Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '° ' + (v < 0 ? neg : pos);
  }

  /* ---------- Mapa ---------- */
  function Mapa(cont, opcoes) {
    this.cont = cont;
    this.op = opcoes || {};
    this.cam = { yaw: VISTA_INICIAL.yaw, pitch: VISTA_INICIAL.pitch, dist: VISTA_INICIAL.dist };
    this.alvo = null;
    this.modo = 'colunas';
    this.girar = !REDUZIR;
    this.pontos = [];
    this.colunas = [];
    this.maxN = 1;
    this.resumo = null;
    this.faixa = [0, 100];
    this.linha = { ativa: false, tocando: false, prog: 1, inicio: 0 };
    this.t0 = 0;
    this.hover = null;
    this.mouseDentro = false;
    this.arrasto = null;
    this.naTela = true;
    this.visivel = true;
    this.quadro = 0;
    this.ultimo = 0;
    this.alvosCol = [];
    this.alvosPts = null;
    this.alvosCid = [];
    this.textos = {};

    var r = sorteio(7);
    this.estrelas = [];
    for (var i = 0; i < 130; i++) this.estrelas.push([r(), r() * 0.65, r() < 0.15 ? 2 : 1, 0.15 + r() * 0.5]);
    this.folhas = [[], [], []];
    for (i = 0; i < 720; i++) {
      this.folhas[i % 3].push([X0 + r() * (X1 - X0), Z0 + r() * (Z1 - Z0), 0.06 + r() * 0.16]);
    }
    this.montar();
  }

  Mapa.prototype.montar = function () {
    var self = this;
    var raiz = document.createElement('div');
    raiz.className = 'm3';
    raiz.innerHTML =
      '<canvas role="img" aria-label="Mapa 3D da região amazônica com as imagens de satélite geradas"></canvas>' +
      '<div class="m3-leitura" aria-live="off"><b class="m3-data"></b><span class="m3-conta"></span></div>' +
      '<div class="m3-ctrl">' +
        '<div class="m3-seg m3-vidro" role="group" aria-label="Forma de exibir as imagens">' +
          '<button type="button" data-modo="colunas" class="ativo" aria-pressed="true">Colunas</button>' +
          '<button type="button" data-modo="pontos" aria-pressed="false">Pontos</button>' +
        '</div>' +
        '<button type="button" class="m3-ico m3-vidro" data-acao="girar" aria-pressed="' + this.girar + '" aria-label="Girar automaticamente" title="Girar automaticamente">' + ICONES.girar + '</button>' +
        '<button type="button" class="m3-ico m3-vidro" data-acao="topo" aria-pressed="false" aria-label="Ver de cima" title="Ver de cima">' + ICONES.topo + '</button>' +
        '<button type="button" class="m3-ico m3-vidro" data-acao="mais" aria-label="Aproximar" title="Aproximar">' + ICONES.mais + '</button>' +
        '<button type="button" class="m3-ico m3-vidro" data-acao="menos" aria-label="Afastar" title="Afastar">' + ICONES.menos + '</button>' +
      '</div>' +
      '<div class="m3-base m3-vidro">' +
        '<button type="button" class="m3-play"></button>' +
        '<div class="m3-linha">' +
          '<input type="range" min="0" max="1000" value="1000" aria-label="Linha do tempo das capturas">' +
          '<div class="m3-datas"><span class="m3-ini"></span><span class="m3-fim"></span></div>' +
        '</div>' +
        '<div class="m3-legenda"><span class="m3-leg-txt"></span>' +
          '<span class="m3-escala"><i class="m3-min"></i><b></b><i class="m3-max"></i></span></div>' +
      '</div>';
    this.cont.innerHTML = '';
    this.cont.appendChild(raiz);
    this.raiz = raiz;
    this.cv = raiz.querySelector('canvas');
    this.ctx = this.cv.getContext('2d');
    this.el = {
      data: raiz.querySelector('.m3-data'),
      conta: raiz.querySelector('.m3-conta'),
      play: raiz.querySelector('.m3-play'),
      range: raiz.querySelector('input[type=range]'),
      ini: raiz.querySelector('.m3-ini'),
      fim: raiz.querySelector('.m3-fim'),
      leg: raiz.querySelector('.m3-leg-txt'),
      escMin: raiz.querySelector('.m3-min'),
      escMax: raiz.querySelector('.m3-max'),
      girar: raiz.querySelector('[data-acao=girar]'),
      topo: raiz.querySelector('[data-acao=topo]')
    };

    /* controles */
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-modo]'), function (b) {
      b.onclick = function () { self.definirModo(b.getAttribute('data-modo')); };
    });
    this.el.girar.onclick = function () {
      self.girar = !self.girar;
      self.el.girar.setAttribute('aria-pressed', String(self.girar));
      self.pedirQuadro();
    };
    this.el.topo.onclick = function () {
      var deCima = self.el.topo.getAttribute('aria-pressed') === 'true';
      self.irPara(deCima ? VISTA_INICIAL : VISTA_TOPO);
      if (!deCima && self.girar) self.el.girar.click();
    };
    raiz.querySelector('[data-acao=mais]').onclick = function () { self.zoom(0.8); };
    raiz.querySelector('[data-acao=menos]').onclick = function () { self.zoom(1.25); };
    this.el.play.onclick = function () { self.alternarLinha(); };
    this.el.range.addEventListener('input', function () {
      var L = self.linha;
      L.ativa = true;
      L.tocando = false;
      L.prog = Number(self.el.range.value) / 1000;
      self.atualizarBotao();
      self.pedirQuadro();
    });

    /* arrastar para girar, duplo clique volta a vista inicial */
    var cv = this.cv;
    cv.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      self.arrasto = { x: e.clientX, y: e.clientY };
      self.alvo = null;
      cv.setPointerCapture(e.pointerId);
      cv.classList.add('arrastando');
    });
    cv.addEventListener('pointermove', function (e) {
      if (self.arrasto) {
        var dx = e.clientX - self.arrasto.x, dy = e.clientY - self.arrasto.y;
        self.arrasto.x = e.clientX;
        self.arrasto.y = e.clientY;
        self.cam.yaw -= dx * 0.006;
        self.cam.pitch = limitar(self.cam.pitch + dy * 0.005, 0.32, 1.52);
        self.hover = null;
        if (self.op.esconder) self.op.esconder();
        self.pedirQuadro();
        return;
      }
      self.testarHover(e);
    });
    var soltar = function () { self.arrasto = null; cv.classList.remove('arrastando'); };
    cv.addEventListener('pointerup', soltar);
    cv.addEventListener('pointercancel', soltar);
    cv.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') self.mouseDentro = true; });
    cv.addEventListener('pointerleave', function () {
      self.mouseDentro = false;
      self.hover = null;
      if (self.op.esconder) self.op.esconder();
      self.pedirQuadro();
    });
    cv.addEventListener('dblclick', function () { self.irPara(VISTA_INICIAL); });
    cv.addEventListener('wheel', function (e) {
      if (!e.ctrlKey) return; /* sem Ctrl a rolagem continua sendo da pagina */
      e.preventDefault();
      self.zoom(e.deltaY > 0 ? 1.12 : 0.89);
    }, { passive: false });

    /* so anima quando o mapa esta visivel */
    if ('ResizeObserver' in window) new ResizeObserver(function () { self.redimensionar(); }).observe(this.cont);
    else window.addEventListener('resize', function () { self.redimensionar(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        self.naTela = es[es.length - 1].isIntersecting;
        self.atualizarVisivel();
      }).observe(cv);
    }
    document.addEventListener('visibilitychange', function () { self.atualizarVisivel(); });

    this.redimensionar();
    this.definirModo('colunas');
    this.atualizarBotao();
  };

  Mapa.prototype.redimensionar = function () {
    var W = this.cont.clientWidth || 600;
    var H = Math.round(limitar(W < 520 ? W * 1.45 : W * 0.58, 380, 620));
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (W === this.W && H === this.H && dpr === this.dpr) return;
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    this.cv.width = Math.round(W * dpr);
    this.cv.height = Math.round(H * dpr);
    this.cv.style.height = H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.pedirQuadro();
  };

  Mapa.prototype.atualizarVisivel = function () {
    this.visivel = this.naTela && !document.hidden;
    if (this.visivel) this.pedirQuadro();
  };

  Mapa.prototype.definirModo = function (modo) {
    this.modo = modo;
    Array.prototype.forEach.call(this.raiz.querySelectorAll('[data-modo]'), function (b) {
      var ativo = b.getAttribute('data-modo') === modo;
      b.classList.toggle('ativo', ativo);
      b.setAttribute('aria-pressed', String(ativo));
    });
    this.atualizarLegenda();
    this.hover = null;
    this.t0 = performance.now() - (REDUZIR ? 5000 : 300);
    this.pedirQuadro();
  };

  /* nas colunas a cor vai da menor a maior media observada */
  Mapa.prototype.atualizarLegenda = function () {
    var colunas = this.modo === 'colunas';
    this.el.leg.textContent = colunas
      ? 'Altura: quantidade de imagens na região. Cor: nuvens em média.'
      : 'Cada ponto é uma imagem. Altura e cor: cobertura de nuvens.';
    this.el.escMin.textContent = colunas ? Math.round(this.faixa[0]) + '%' : 'céu limpo';
    this.el.escMax.textContent = colunas ? Math.round(this.faixa[1]) + '%' : 'nublado';
  };

  Mapa.prototype.corColuna = function (media) {
    var t = limitar((media - this.faixa[0]) / (this.faixa[1] - this.faixa[0] || 1), 0, 1);
    return misturar(VERDE_FORTE, BRANCO, t);
  };

  Mapa.prototype.irPara = function (vista) {
    this.alvo = { yaw: vista.yaw, pitch: vista.pitch, dist: vista.dist };
    this.pedirQuadro();
  };

  Mapa.prototype.zoom = function (fator) {
    var base = this.alvo || this.cam;
    this.alvo = { yaw: this.cam.yaw, pitch: base.pitch, dist: limitar(base.dist * fator, 18, 90) };
    this.pedirQuadro();
  };

  /* ---------- Dados ---------- */
  /* pontos: [id, timestamp, lat, lon, nuvens] vindos do servidor */
  Mapa.prototype.definirDados = function (pontos, resumo) {
    var ordenados = pontos.slice().sort(function (a, b) { return a[1] - b[1]; });
    var indice = {}, cols = [];
    this.pontos = ordenados.map(function (p) {
      var w = mundo(p[3], p[2]);
      var h = hexDe(w[0], w[1]);
      var chave = h[0] + ',' + h[1];
      var c = indice[chave];
      if (!c) {
        c = indice[chave] = {
          i: cols.length, x: HEX * Math.sqrt(3) * (h[0] + h[1] / 2), z: HEX * 1.5 * h[1],
          total: 0, n: 0, soma: 0, ultimo: -1
        };
        cols.push(c);
      }
      c.total++;
      c.somaTotal = (c.somaTotal || 0) + p[4];
      return { id: p[0], ts: p[1], lat: p[2], lon: p[3], nuv: p[4], x: w[0], z: w[1], col: c.i };
    });
    this.colunas = cols;
    this.maxN = 1;
    var menor = 100, maior = 0;
    for (var i = 0; i < cols.length; i++) {
      var col = cols[i];
      if (col.total > this.maxN) this.maxN = col.total;
      if (col.total >= 3) {
        var media = col.somaTotal / col.total;
        if (media < menor) menor = media;
        if (media > maior) maior = media;
      }
    }
    this.faixa = maior > menor ? [menor, maior] : [0, 100];
    this.atualizarLegenda();
    this.resumo = resumo;
    this.linha = { ativa: false, tocando: false, prog: 1, inicio: 0 };
    this.hover = null;
    this.t0 = performance.now() - (REDUZIR ? 5000 : 0);
    this.textos = {};

    var n = this.pontos.length;
    this.el.ini.textContent = n ? fmtData(this.pontos[0].ts, { day: 'numeric', month: 'short' }) : '';
    this.el.fim.textContent = n ? fmtData(this.pontos[n - 1].ts, { day: 'numeric', month: 'short' }) : '';
    this.el.range.value = 1000;
    this.atualizarBotao();
    this.pedirQuadro();
  };

  /* ---------- Linha do tempo ---------- */
  Mapa.prototype.alternarLinha = function () {
    var L = this.linha;
    if (L.tocando) {
      L.tocando = false;
    } else {
      if (!L.ativa || L.prog >= 1) L.prog = 0;
      L.ativa = true;
      L.tocando = true;
      L.inicio = performance.now() - L.prog * DURACAO;
    }
    this.atualizarBotao();
    this.pedirQuadro();
  };

  Mapa.prototype.atualizarBotao = function () {
    var L = this.linha, b = this.el.play;
    var rotulo = L.tocando ? 'Pausar' : (L.ativa && L.prog < 1 ? 'Continuar' : 'Ver capturas em ordem');
    b.innerHTML = (L.tocando ? ICONES.pausar : ICONES.tocar) + '<span>' + rotulo + '</span>';
    b.setAttribute('aria-label', L.tocando ? 'Pausar a linha do tempo' : 'Reproduzir as capturas em ordem cronológica');
  };

  Mapa.prototype.escrever = function (chave, el, texto) {
    if (this.textos[chave] === texto) return;
    this.textos[chave] = texto;
    el.textContent = texto;
  };

  Mapa.prototype.atualizarLeitura = function (k) {
    var n = this.pontos.length, L = this.linha;
    if (!n) {
      this.escrever('data', this.el.data, 'Sem imagens');
      this.escrever('conta', this.el.conta, '');
      return;
    }
    if (L.ativa && k < n) {
      var ts = k > 0 ? this.pontos[k - 1].ts : this.pontos[0].ts;
      this.escrever('data', this.el.data, fmtData(ts, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }));
      this.escrever('conta', this.el.conta, fmtN(k) + ' de ' + fmtN(n) + ' imagens capturadas até aqui');
    } else {
      var mes = fmtData(this.pontos[0].ts, { month: 'long', year: 'numeric' });
      this.escrever('data', this.el.data, mes.charAt(0).toUpperCase() + mes.slice(1));
      var total = this.resumo && this.resumo.total > n ? ' (amostra de ' + fmtN(this.resumo.total) + ')' : '';
      this.escrever('conta', this.el.conta, fmtN(n) + ' imagens' + total);
    }
    if (L.tocando) this.el.range.value = Math.round(L.prog * 1000);
  };

  /* ---------- Laco de animacao ---------- */
  Mapa.prototype.pedirQuadro = function () {
    if (this.quadro || !this.visivel) return;
    var self = this;
    this.quadro = requestAnimationFrame(function (t) { self.quadro = 0; self.passo(t); });
  };

  Mapa.prototype.passo = function (agora) {
    var dt = this.ultimo ? Math.min(0.05, (agora - this.ultimo) / 1000) : 0.016;
    this.ultimo = agora;
    var animando = !REDUZIR; /* o satelite esta sempre em orbita */

    if (this.alvo) {
      var a = this.alvo, c = this.cam, t = 1 - Math.pow(0.002, dt);
      var dyaw = ((a.yaw - c.yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      c.yaw += dyaw * t;
      c.pitch += (a.pitch - c.pitch) * t;
      c.dist += (a.dist - c.dist) * t;
      if (Math.abs(dyaw) < 0.002 && Math.abs(a.pitch - c.pitch) < 0.002 && Math.abs(a.dist - c.dist) < 0.02) {
        c.pitch = a.pitch;
        c.dist = a.dist;
        this.alvo = null;
      }
      animando = true;
    } else if (this.girar && !this.arrasto && !this.mouseDentro) {
      this.cam.yaw += dt * 0.07;
      animando = true;
    }
    var deCima = String((this.alvo || this.cam).pitch > 1.3);
    if (this.textos.topo !== deCima) { this.textos.topo = deCima; this.el.topo.setAttribute('aria-pressed', deCima); }

    var L = this.linha;
    if (L.tocando) {
      L.prog = Math.min(1, (agora - L.inicio) / DURACAO);
      if (L.prog >= 1) { L.tocando = false; this.atualizarBotao(); }
      animando = true;
    }
    if (agora - this.t0 < 1800) animando = true;

    this.desenhar(agora);
    if (animando) this.pedirQuadro();
    else this.ultimo = 0;
  };

  /* ---------- Desenho ---------- */
  Mapa.prototype.desenhar = function (agora) {
    var self = this, ctx = this.ctx, W = this.W, H = this.H, cam = this.cam;
    var cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    var estreito = W < 520;
    var f = Math.min(W * 1.3, H * 1.6), ox = W / 2 - (estreito ? 20 : 0), oy = H * (estreito ? 0.48 : 0.43), d = cam.dist;

    /* projecao em perspectiva: devolve [x, y, distancia, escala] */
    function P(x, y, z) {
      var x1 = x * cy - z * sy, z1 = x * sy + z * cy;
      var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      var zv = d - z2;
      if (zv < 0.5) zv = 0.5;
      var k = f / zv;
      return [ox + x1 * k, oy - y2 * k, zv, k];
    }

    var cantos = [[X1, Z1], [X0, Z1], [X0, Z0], [X1, Z0]];
    var topo = cantos.map(function (c) { return P(c[0], 0, c[1]); });
    var zMin = Infinity, zMax = -Infinity;
    topo.forEach(function (p) { zMin = Math.min(zMin, p[2]); zMax = Math.max(zMax, p[2]); });
    function neblina(zv) { return 0.5 * limitar((zv - zMin) / (zMax - zMin + 0.001), 0, 1); }

    /* ceu */
    var fundo = ctx.createRadialGradient(W * 0.5, H * 0.3, 10, W * 0.5, H * 0.3, Math.max(W, H) * 0.85);
    fundo.addColorStop(0, '#133a2c');
    fundo.addColorStop(0.55, '#0a1f17');
    fundo.addColorStop(1, '#030806');
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    this.estrelas.forEach(function (e) {
      ctx.globalAlpha = e[3];
      ctx.fillRect(e[0] * W, e[1] * H, e[2], e[2]);
    });
    ctx.globalAlpha = 1;

    /* bloco de terreno: laterais visiveis e topo */
    var base = cantos.map(function (c) { return P(c[0], -ESPESSURA, c[1]); });
    var normais = [[0, 1], [-1, 0], [0, -1], [1, 0]];
    for (var i = 0; i < 4; i++) {
      var j = (i + 1) % 4, face = [base[i], base[j], topo[j], topo[i]];
      if (area(face) <= 0) continue;
      var l = Math.max(0, normais[i][0] * LUZ[0] + normais[i][1] * LUZ[2]);
      ctx.fillStyle = css(misturar([6, 24, 17], [26, 88, 62], 0.15 + 0.85 * l));
      poligono(ctx, face);
      ctx.fill();
    }
    var pn = P(0, 0, Z0), ps = P(0, 0, Z1);
    var chao = ctx.createLinearGradient(pn[0], pn[1], ps[0], ps[1]);
    chao.addColorStop(0, '#0b2c20');
    chao.addColorStop(1, '#17573e');
    ctx.fillStyle = chao;
    poligono(ctx, topo);
    ctx.fill();
    ctx.strokeStyle = 'rgba(95, 208, 143, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    /* textura de copa de arvores */
    for (var g = 0; g < 3; g++) {
      ctx.beginPath();
      this.folhas[g].forEach(function (q) {
        var p = P(q[0], 0, q[1]), r = Math.max(0.5, q[2] * p[3]);
        ctx.moveTo(p[0] + r, p[1]);
        ctx.ellipse(p[0], p[1], r, r * sp + 0.3, 0, 0, 2 * Math.PI);
      });
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = CORES_FOLHA[g];
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* grade de 5 graus e equador */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.beginPath();
    var a, b, lon, lat;
    for (lon = -70; lon < LON[1]; lon += 5) {
      a = P(lon - CLON, 0.01, Z0); b = P(lon - CLON, 0.01, Z1);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    for (lat = -5; lat > LAT[1]; lat -= 5) {
      a = P(X0, 0.01, CLAT - lat); b = P(X1, 0.01, CLAT - lat);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    a = P(X0, 0.01, CLAT); b = P(X1, 0.01, CLAT);
    ctx.strokeStyle = 'rgba(232, 149, 43, 0.5)';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();

    /* rios */
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    RIOS.forEach(function (rio) {
      var pts = rio.map(function (q) { var w = mundo(q[0], q[1]); return P(w[0], 0.02, w[1]); });
      var k = 0;
      ctx.beginPath();
      pts.forEach(function (p, n) { if (n) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); k += p[3]; });
      k /= pts.length;
      ctx.strokeStyle = 'rgba(120, 180, 240, 0.16)';
      ctx.lineWidth = Math.max(2, 0.36 * k);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(165, 208, 255, 0.6)';
      ctx.lineWidth = Math.max(1, 0.07 * k);
      ctx.stroke();
    });

    /* rotulos de latitude e longitude (so em telas largas) */
    ctx.font = '600 11px ' + FONTE;
    if (!estreito) {
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(214, 236, 224, 0.75)';
    ctx.textAlign = 'center';
    for (lon = -70; lon < LON[1]; lon += 5) {
      a = P(lon - CLON, 0, Z1 + 0.9);
      ctx.fillText(-lon + '° O', a[0], a[1]);
    }
    ctx.textAlign = 'right';
    for (lat = 0; lat > LAT[1]; lat -= 5) {
      a = P(X0 - 0.5, 0, CLAT - lat);
      ctx.fillText(lat === 0 ? 'Equador' : -lat + '° S', a[0], a[1]);
    }
    }

    /* satelite: posicao e pegada no chao */
    var u = REDUZIR ? 0.55 : (agora / 11000) % 1;
    var S = [SAT_A[0] + (SAT_B[0] - SAT_A[0]) * u, SAT_A[1], SAT_A[2] + (SAT_B[2] - SAT_A[2]) * u];
    var pegada = null;
    if (S[0] > X0 && S[0] < X1 && S[2] > Z0 && S[2] < Z1) {
      pegada = [];
      for (i = 0; i < 24; i++) {
        var ang = i / 24 * 2 * Math.PI;
        pegada.push(P(S[0] + 1.7 * Math.cos(ang), 0.03, S[2] + 1.7 * Math.sin(ang)));
      }
      ctx.fillStyle = 'rgba(232, 149, 43, 0.14)';
      poligono(ctx, pegada);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232, 149, 43, 0.55)';
      ctx.stroke();
    }

    /* imagens */
    var N = this.pontos.length, L = this.linha;
    var k = L.ativa ? Math.round(L.prog * N) : N;
    var janela = Math.max(3, Math.round(N * 0.012));
    var t0 = this.t0;
    var crescer = function (x) {
      var atraso = (x - X0) / (X1 - X0) * 650;
      return suave(limitar((agora - t0 - atraso) / 900, 0, 1));
    };
    var reproduzindo = L.ativa && k < N;
    if (this.modo === 'colunas') this.desenharColunas(P, neblina, k, janela, crescer, reproduzindo);
    else this.desenharPontos(P, neblina, k, janela, crescer, reproduzindo);

    /* cidades por cima, para os nomes ficarem legiveis */
    ctx.font = '600 ' + (estreito ? 10 : 12) + 'px ' + FONTE;
    ctx.textAlign = 'left';
    this.alvosCid = [];
    CIDADES.map(function (c) {
      var w = mundo(c[2], c[1]);
      return { c: c, b: P(w[0], 0, w[1]), t: P(w[0], 1.7, w[1]) };
    }).sort(function (p, q) { return q.b[2] - p.b[2]; }).forEach(function (o) {
      ctx.strokeStyle = 'rgba(232, 149, 43, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(o.b[0], o.b[1]); ctx.lineTo(o.t[0], o.t[1]); ctx.stroke();
      var r = Math.max(3.5, 0.17 * o.t[3]);
      ctx.beginPath();
      ctx.arc(o.t[0], o.t[1], r, 0, 2 * Math.PI);
      ctx.fillStyle = '#e8952b';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#06130d';
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(4, 12, 9, 0.85)';
      ctx.strokeText(o.c[0], o.t[0] + r + 5, o.t[1]);
      ctx.fillStyle = '#f3faf6';
      ctx.fillText(o.c[0], o.t[0] + r + 5, o.t[1]);
      self.alvosCid.push({ nome: o.c[0], lat: o.c[1], lon: o.c[2], x: o.t[0], y: o.t[1] });
    });

    /* satelite: orbita, rastro, feixe e corpo */
    var s = P(S[0], S[1], S[2]);
    a = P(SAT_A[0], SAT_A[1], SAT_A[2]);
    b = P(SAT_B[0], SAT_B[1], SAT_B[2]);
    ctx.setLineDash([2, 7]);
    ctx.strokeStyle = 'rgba(232, 149, 43, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.setLineDash([]);
    var anterior = s;
    for (i = 1; i <= 14; i++) {
      var ui = u - 0.012 * i;
      if (ui < 0) break;
      var q = P(SAT_A[0] + (SAT_B[0] - SAT_A[0]) * ui, SAT_A[1], SAT_A[2] + (SAT_B[2] - SAT_A[2]) * ui);
      ctx.strokeStyle = 'rgba(255, 190, 110, ' + (0.7 * (1 - i / 15)) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(anterior[0], anterior[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      anterior = q;
    }
    if (pegada) {
      var esq = pegada[0], dir = pegada[0];
      pegada.forEach(function (p) { if (p[0] < esq[0]) esq = p; if (p[0] > dir[0]) dir = p; });
      var centro = P(S[0], 0, S[2]);
      var feixe = ctx.createLinearGradient(s[0], s[1], centro[0], centro[1]);
      feixe.addColorStop(0, 'rgba(255, 180, 90, 0.38)');
      feixe.addColorStop(1, 'rgba(232, 149, 43, 0.04)');
      ctx.fillStyle = feixe;
      ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(esq[0], esq[1]); ctx.lineTo(dir[0], dir[1]); ctx.closePath();
      ctx.fill();
    }
    var brilho = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], 26);
    brilho.addColorStop(0, 'rgba(255, 190, 110, 0.55)');
    brilho.addColorStop(1, 'rgba(232, 149, 43, 0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(s[0] - 26, s[1] - 26, 52, 52);
    var direcao = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ctx.save();
    ctx.translate(s[0], s[1]);
    ctx.rotate(direcao + Math.PI / 2);
    ctx.fillStyle = '#ffc98a';
    ctx.fillRect(-17, -3, 10, 6);
    ctx.fillRect(7, -3, 10, 6);
    ctx.fillStyle = '#7a4a10';
    ctx.fillRect(-8, -0.5, 16, 1);
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffb347';
    ctx.fill();
    ctx.restore();

    /* norte */
    var n1 = P(0, 0, Z0 - 0.9), n2 = P(0, 0, Z0 - 2.2);
    ctx.strokeStyle = 'rgba(232, 149, 43, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(n1[0], n1[1]); ctx.lineTo(n2[0], n2[1]); ctx.stroke();
    ctx.font = '700 12px ' + FONTE;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc98a';
    var dn = Math.atan2(n2[1] - n1[1], n2[0] - n1[0]);
    ctx.fillText('N', n2[0] + Math.cos(dn) * 10, n2[1] + Math.sin(dn) * 10);

    this.atualizarLeitura(k);
  };

  Mapa.prototype.desenharColunas = function (P, neblina, k, janela, crescer, reproduzindo) {
    var ctx = this.ctx, cols = this.colunas, pts = this.pontos, i, j;
    for (i = 0; i < cols.length; i++) { cols[i].n = 0; cols[i].soma = 0; cols[i].ultimo = -1; }
    for (i = 0; i < k; i++) {
      var c = cols[pts[i].col];
      c.n++;
      c.soma += pts[i].nuv;
      c.ultimo = i;
    }

    var lista = [];
    for (i = 0; i < cols.length; i++) {
      var col = cols[i];
      if (!col.n) continue;
      var h = (0.25 + col.n / this.maxN * ALT_COLUNA) * crescer(col.x);
      if (h < 0.005) continue;
      lista.push({ c: col, h: h, zv: P(col.x, h / 2, col.z)[2] });
    }
    lista.sort(function (p, q) { return q.zv - p.zv; });

    var R = HEX * 0.78; /* folga entre colunas */
    var hover = this.hover && this.hover.tipo === 'col' ? this.hover.c : null;
    this.alvosCol = [];
    for (i = 0; i < lista.length; i++) {
      var it = lista[i], cl = it.c, base6 = [], topo6 = [];
      for (j = 0; j < 6; j++) {
        var ang = (60 * j - 30) * GRAU;
        var vx = cl.x + R * Math.cos(ang), vz = cl.z + R * Math.sin(ang);
        base6.push(P(vx, 0, vz));
        topo6.push(P(vx, it.h, vz));
      }
      var cor = this.corColuna(cl.soma / cl.n);
      if (reproduzindo && k - cl.ultimo <= janela) cor = misturar(cor, LARANJA, 0.8 * (1 - (k - cl.ultimo) / (janela + 1)));
      var nb = neblina(it.zv);
      var polis = [];
      for (j = 0; j < 6; j++) {
        var j2 = (j + 1) % 6, face = [base6[j], base6[j2], topo6[j2], topo6[j]];
        if (area(face) <= 0) continue;
        var nAng = 60 * j * GRAU;
        var luz = Math.max(0, Math.cos(nAng) * LUZ[0] + Math.sin(nAng) * LUZ[2]);
        ctx.fillStyle = tom(cor, 0.42 + 0.4 * luz, nb);
        poligono(ctx, face);
        ctx.fill();
        polis.push(face);
      }
      ctx.fillStyle = tom(cor, 1, nb);
      poligono(ctx, topo6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.25 * (1 - nb)) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
      polis.push(topo6);
      if (cl === hover) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        polis.forEach(function (p) { poligono(ctx, p); ctx.stroke(); });
      }
      this.alvosCol.push({ c: cl, polis: polis });
    }
    this.alvosPts = null;
  };

  Mapa.prototype.desenharPontos = function (P, neblina, k, janela, crescer, reproduzindo) {
    var ctx = this.ctx, pts = this.pontos, i;
    var baldes = {};
    var xs = new Float32Array(k), ys = new Float32Array(k);
    /* agrupa por cor e distancia para desenhar milhares de pontos de uma vez */
    for (i = 0; i < k; i++) {
      var p = pts[i];
      var h = Math.max(0.12, p.nuv / 100 * ALT_PONTO) * crescer(p.x);
      var b = P(p.x, 0, p.z), t = P(p.x, h, p.z);
      var nb = Math.min(2, Math.floor(neblina(t[2]) * 6));
      var cb = Math.min(9, Math.floor(p.nuv / 10));
      var chave = nb * 10 + cb;
      var bal = baldes[chave] || (baldes[chave] = { hastes: new Path2D(), bolas: new Path2D(), nb: nb, cb: cb });
      bal.hastes.moveTo(b[0], b[1]);
      bal.hastes.lineTo(t[0], t[1]);
      var r = Math.max(1.4, 0.13 * t[3]);
      bal.bolas.moveTo(t[0] + r, t[1]);
      bal.bolas.arc(t[0], t[1], r, 0, 2 * Math.PI);
      xs[i] = t[0];
      ys[i] = t[1];
    }
    ctx.lineWidth = 1;
    Object.keys(baldes).map(Number).sort(function (p, q) { return q - p; }).forEach(function (chave) {
      var bal = baldes[chave], cor = corNuvem(bal.cb * 10 + 5), nb = bal.nb / 6;
      ctx.strokeStyle = tom(cor, 0.85, nb, 0.3);
      ctx.stroke(bal.hastes);
      ctx.fillStyle = tom(cor, 1, nb, 0.95);
      ctx.fill(bal.bolas);
    });

    /* capturas mais recentes da linha do tempo */
    if (reproduzindo) {
      for (i = Math.max(0, k - janela); i < k; i++) {
        var idade = (k - i) / (janela + 1);
        ctx.beginPath();
        ctx.arc(xs[i], ys[i], 3 + 9 * (1 - idade), 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(232, 149, 43, ' + (0.9 * (1 - idade)) + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    if (this.hover && this.hover.tipo === 'pt' && this.hover.i < k) {
      ctx.beginPath();
      ctx.arc(xs[this.hover.i], ys[this.hover.i], 7, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    this.alvosPts = { x: xs, y: ys, n: k };
    this.alvosCol = [];
  };

  /* ---------- Dica ao passar o mouse ---------- */
  Mapa.prototype.testarHover = function (e) {
    var r = this.cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    var achado = null, i;
    for (i = this.alvosCid.length - 1; i >= 0 && !achado; i--) {
      var c = this.alvosCid[i];
      if (Math.abs(c.x - x) < 9 && Math.abs(c.y - y) < 9) achado = { tipo: 'cid', c: c };
    }
    for (i = this.alvosCol.length - 1; i >= 0 && !achado; i--) {
      var alvo = this.alvosCol[i];
      for (var j = 0; j < alvo.polis.length; j++) {
        if (dentro(x, y, alvo.polis[j])) { achado = { tipo: 'col', c: alvo.c }; break; }
      }
    }
    if (!achado && this.alvosPts) {
      var A = this.alvosPts, melhor = -1, dist = 81;
      for (i = 0; i < A.n; i++) {
        var dx = A.x[i] - x, dy = A.y[i] - y, dd = dx * dx + dy * dy;
        if (dd < dist) { dist = dd; melhor = i; }
      }
      if (melhor >= 0) achado = { tipo: 'pt', i: melhor };
    }

    var antes = this.hover;
    this.hover = achado;
    if (!achado) {
      if (this.op.esconder) this.op.esconder();
    } else if (this.op.dica) {
      if (achado.tipo === 'cid') {
        this.op.dica(e, achado.c.nome, [
          ['Latitude', fmtGrau(achado.c.lat, 'N', 'S')],
          ['Longitude', fmtGrau(achado.c.lon, 'L', 'O')]
        ]);
      } else if (achado.tipo === 'col') {
        var cl = achado.c, media = cl.soma / cl.n;
        this.op.dica(e, 'Região perto de ' + fmtGrau(CLAT - cl.z, 'N', 'S') + ', ' + fmtGrau(cl.x + CLON, 'L', 'O'), [
          ['Imagens nesta coluna', fmtN(cl.n)],
          ['Nuvens em média', Math.round(media) + '%', css(this.corColuna(media))]
        ]);
      } else {
        var p = this.pontos[achado.i];
        this.op.dica(e, 'Imagem #' + p.id, [
          ['Captura', fmtData(p.ts, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' UTC'],
          ['Latitude', fmtGrau(p.lat, 'N', 'S')],
          ['Longitude', fmtGrau(p.lon, 'L', 'O')],
          ['Nuvens', p.nuv + '%', css(corNuvem(p.nuv))]
        ]);
      }
    }
    var mudou = !antes !== !achado || (antes && achado && (antes.c !== achado.c || antes.i !== achado.i));
    if (mudou) this.pedirQuadro();
  };

  window.GeoSortMapa3D = {
    criar: function (cont, opcoes) { return new Mapa(cont, opcoes); }
  };
})();
