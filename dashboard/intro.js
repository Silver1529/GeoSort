/* GeoSort - apresentacao na primeira visita
 * Explica o que e o sistema, por que foi feito, como os testes sao
 * realizados e como ler os graficos. Pode ser reaberta pelo botao
 * "Como funciona" no topo.
 */
(function () {
  'use strict';

  var CHAVE = 'geosort-intro-vista';
  var COR_BUBBLE = '#3987e5';
  var COR_QUICK = '#e87ba4';

  var atual = 0;
  var corrida = null; /* timer da animacao de ordenacao */
  var raiz = null;

  var $ = function (sel, base) { return (base || document).querySelector(sel); };

  /* ---------- Conteudo das etapas ---------- */
  var ETAPAS = [
    {
      titulo: 'Bem-vindo ao GeoSort',
      texto: 'Um sistema que compara <b>6 algoritmos de ordenação</b> organizando um catálogo de <b>imagens de satélite da Floresta Amazônica</b> pela data e hora em que cada foto foi capturada.',
      itens: [
        ['6', 'algoritmos: Bubble, Insertion, Shell, Merge, Quick e Heap'],
        ['4', 'cenários de dados: aleatório, ordenado, inverso e semi-ordenado'],
        ['1M', 'até um milhão de imagens por teste']
      ],
      palco: palcoBoasVindas
    },
    {
      titulo: 'Por que ele foi feito?',
      texto: 'Satélites fotografam a Amazônia o tempo todo e as imagens chegam <b>fora de ordem</b>. Para acompanhar o desmatamento é preciso colocá-las em ordem cronológica, e com milhares de imagens a escolha do algoritmo faz toda a diferença.',
      itens: [
        ['1', 'Trabalho da APS de Estrutura de Dados (UNIP, 2026/2)'],
        ['2', 'Mostrar na prática a diferença entre O(n²) e O(n log n)'],
        ['3', 'Medir tempos reais com um programa em C, não só a teoria']
      ],
      palco: palcoSatelite
    },
    {
      titulo: 'O que é ordenar?',
      texto: 'Cada barra é uma imagem; a altura é o instante de captura. Os dois algoritmos recebem <b>a mesma lista</b>. Veja quantas comparações cada um precisa até deixar tudo em ordem.',
      itens: [
        ['O(n²)', 'Bubble Sort compara vizinhos e vai trocando aos poucos'],
        ['O(n log n)', 'Quick Sort divide a lista em partes ao redor de um pivô']
      ],
      palco: palcoCorrida
    },
    {
      titulo: 'Como os testes são feitos',
      texto: 'O programa em C repete o mesmo roteiro para cada algoritmo, cenário e tamanho. São <b>120 medições</b>, cada uma com a média de 3 execuções.',
      itens: [
        ['5', 'tamanhos: 1.000 · 5.000 · 10.000 · 50.000 · 100.000'],
        ['3×', 'cada medição é repetida e o painel mostra a média']
      ],
      palco: palcoTestes
    },
    {
      titulo: 'Como ler os gráficos',
      texto: 'Quanto maior a entrada, mais a diferença aparece: os algoritmos O(n²) disparam, enquanto os O(n log n) quase não sobem.',
      itens: [
        ['log', 'Na escala logarítmica cada linha da grade vale 10× mais tempo'],
        ['■', 'No mapa de calor, quanto mais escuro, mais lento'],
        ['▶', 'No Laboratório você gera cenários na hora e vê as imagens no mapa']
      ],
      palco: palcoGraficos
    }
  ];

  /* ---------- Palcos (animacoes de cada etapa) ---------- */
  function palcoBoasVindas() {
    var fotos = '';
    var pos = [[5, 8], [79, 6], [84, 50], [3, 54], [16, 82], [70, 82]];
    pos.forEach(function (p, i) {
      fotos += '<span class="foto" style="left:' + p[0] + '%;top:' + p[1] + '%;animation-delay:' + (0.3 + i * 0.25) + 's">' +
        '<i></i><small>' + (10 + i * 3) + '/01 ' + (8 + i) + ':' + (10 + i * 7) + '</small></span>';
    });
    return '<div class="palco-boas">' +
      '<div class="planeta"><span class="orbita-intro"><span class="satelite"></span></span>' +
      '<img src="../public/simbolo-escuro.png" alt=""></div>' + fotos + '</div>';
  }

  function palcoSatelite() {
    var fotos = '';
    var dados = [[18, 62, '14/01 18:48'], [52, 40, '02/01 07:15'], [78, 70, '27/01 22:03'],
      [42, 64, '09/01 11:30'], [66, 22, '21/01 05:52'], [86, 46, '05/01 16:20']];
    dados.forEach(function (d, i) {
      fotos += '<g class="pin" style="animation-delay:' + (0.6 + i * 0.45) + 's">' +
        '<rect x="' + (d[0] * 4 - 14) + '" y="' + (d[1] * 3 - 10) + '" width="28" height="20" rx="4"/>' +
        '<text x="' + (d[0] * 4) + '" y="' + (d[1] * 3 + 24) + '">' + d[2] + '</text></g>';
    });
    return '<svg class="palco-sat" viewBox="0 0 400 300" aria-hidden="true">' +
      '<defs><linearGradient id="intro-mapa" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#0f3d2e"/><stop offset="1" stop-color="#1f6b4a"/></linearGradient></defs>' +
      '<rect width="400" height="300" rx="18" fill="url(#intro-mapa)"/>' +
      '<path class="rio" d="M0 140 C 60 120, 90 170, 150 150 S 250 110, 300 140 S 370 170, 400 150"/>' +
      '<path class="rio fino" d="M150 150 C 160 200, 130 240, 160 300"/>' +
      '<path class="trilha-sat" d="M -20 40 Q 200 -30 420 40"/>' +
      '<g class="sat-voando"><circle r="9" fill="#e8952b"/><rect x="-22" y="-4" width="12" height="8" rx="2" fill="#ffc98a"/>' +
      '<rect x="10" y="-4" width="12" height="8" rx="2" fill="#ffc98a"/>' +
      '<animateMotion dur="5s" repeatCount="indefinite" path="M -20 40 Q 200 -30 420 40"/></g>' +
      fotos +
      '<g class="aviso-desordem"><rect x="110" y="250" width="180" height="30" rx="15"/>' +
      '<text x="200" y="270">⚠ imagens fora de ordem</text></g>' +
      '</svg>';
  }

  function palcoCorrida() {
    function pista(nome, comp, cor, id) {
      return '<div class="pista" id="' + id + '">' +
        '<div class="pista-cab"><span class="ponto" style="background:' + cor + '"></span><b>' + nome + '</b>' +
        '<span class="comp">' + comp + '</span><span class="contador">0 comparações</span></div>' +
        '<div class="barras-corrida"></div><div class="chegada"></div></div>';
    }
    return '<div class="palco-corrida">' +
      pista('Bubble Sort', 'O(n²)', COR_BUBBLE, 'pista-bubble') +
      pista('Quick Sort', 'O(n log n)', COR_QUICK, 'pista-quick') +
      '<button type="button" class="botao-repetir" id="repetir-corrida">↻ Repetir corrida</button></div>';
  }

  function palcoTestes() {
    var passos = [
      ['Gerar', 'cria as imagens no cenário escolhido', 'M12 5v14M5 12h14'],
      ['Copiar', 'cada algoritmo recebe uma cópia idêntica', 'M8 8h11v11H8zM5 16V5h11'],
      ['Medir', 'clock() cronometra só a ordenação', 'M12 8v5l3 2M9 2h6M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16z'],
      ['Conferir', 'verifica se ficou em ordem', 'M5 12l5 5 9-10'],
      ['Repetir', '3 vezes; o CSV guarda a média', 'M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M20 4v5h-5M4 20v-5h5']
    ];
    var html = '<div class="palco-testes"><div class="linha-passos"><span class="fluxo"></span>';
    passos.forEach(function (p, i) {
      html += '<div class="passo" style="--i:' + i + '"><span class="passo-icone"><svg viewBox="0 0 24 24"><path d="' + p[2] +
        '"/></svg></span><b>' + p[0] + '</b><small>' + p[1] + '</small></div>';
    });
    html += '</div><div class="cenarios-intro">';
    var padroes = {
      'Aleatório': [5, 2, 8, 3, 9, 1, 6, 4, 7],
      'Ordenado': [1, 2, 3, 4, 5, 6, 7, 8, 9],
      'Inverso': [9, 8, 7, 6, 5, 4, 3, 2, 1],
      'Semi-ordenado': [1, 2, 7, 4, 5, 6, 3, 8, 9]
    };
    Object.keys(padroes).forEach(function (nome, k) {
      html += '<div class="cen-intro" style="animation-delay:' + (0.2 + k * 0.15) + 's"><div class="mini-barras">';
      padroes[nome].forEach(function (v, j) {
        html += '<i style="height:' + (v * 11) + '%;animation-delay:' + (0.4 + k * 0.15 + j * 0.04) + 's"></i>';
      });
      html += '</div><span>' + nome + '</span></div>';
    });
    return html + '</div></div>';
  }

  function palcoGraficos() {
    /* curvas ilustrativas: n^2 e n log n */
    var n2 = [], nlog = [];
    for (var k = 0; k <= 20; k++) {
      var x = k / 20, px = 40 + x * 330;
      n2.push(px.toFixed(1) + ',' + (250 - Math.pow(x, 2) * 210).toFixed(1));
      nlog.push(px.toFixed(1) + ',' + (250 - (x * Math.log(1 + x * 9) / Math.log(10)) * 42).toFixed(1));
    }
    var grade = '';
    for (var g = 0; g < 5; g++) grade += '<line x1="40" x2="370" y1="' + (40 + g * 52.5) + '" y2="' + (40 + g * 52.5) + '"/>';
    return '<svg class="palco-graf" viewBox="0 0 400 300" aria-hidden="true">' +
      '<g class="grade-intro">' + grade + '</g>' +
      '<line class="eixo-intro" x1="40" x2="370" y1="250" y2="250"/>' +
      '<line class="eixo-intro" x1="40" x2="40" y1="30" y2="250"/>' +
      '<text class="rot-eixo" x="205" y="282">tamanho da entrada (n) →</text>' +
      '<text class="rot-eixo" x="16" y="140" transform="rotate(-90 16 140)">tempo →</text>' +
      '<polyline class="curva c1" points="' + n2.join(' ') + '" stroke="' + COR_BUBBLE + '"/>' +
      '<polyline class="curva c2" points="' + nlog.join(' ') + '" stroke="' + COR_QUICK + '"/>' +
      '<g class="rot-curva r1"><rect x="270" y="26" width="96" height="24" rx="12" fill="' + COR_BUBBLE + '"/>' +
      '<text x="318" y="42">O(n²)</text></g>' +
      '<g class="rot-curva r2"><rect x="262" y="188" width="104" height="24" rx="12" fill="' + COR_QUICK + '"/>' +
      '<text x="314" y="204">O(n log n)</text></g>' +
      '<circle class="bolinha b1" r="6" fill="' + COR_BUBBLE + '"><animateMotion dur="2.4s" begin="0.4s" fill="freeze" path="M' + n2.join(' L') + '"/></circle>' +
      '<circle class="bolinha b2" r="6" fill="' + COR_QUICK + '"><animateMotion dur="2.4s" begin="0.4s" fill="freeze" path="M' + nlog.join(' L') + '"/></circle>' +
      '</svg>';
  }

  /* ---------- Corrida: Bubble x Quick ---------- */
  function passosBubble(v) {
    var a = v.slice(), ops = [];
    for (var i = 0; i < a.length - 1; i++) {
      var trocou = false;
      for (var j = 0; j < a.length - 1 - i; j++) {
        var op = { i: j, j: j + 1, troca: a[j] > a[j + 1] };
        if (op.troca) { var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; trocou = true; }
        ops.push(op);
      }
      if (!trocou) break;
    }
    return ops;
  }

  function passosQuick(v) {
    var a = v.slice(), ops = [];
    function troca(i, j) { var t = a[i]; a[i] = a[j]; a[j] = t; }
    function rec(ini, fim) {
      if (ini >= fim) return;
      var pivo = a[fim], i = ini;
      for (var j = ini; j < fim; j++) {
        var op = { i: j, j: fim, troca: false, ti: i, tj: j };
        if (a[j] < pivo) { if (i !== j) { troca(i, j); op.troca = true; } i++; }
        ops.push(op);
      }
      if (i !== fim) { troca(i, fim); ops.push({ i: i, j: fim, troca: true, ti: i, tj: fim, sem: true }); }
      rec(ini, i - 1);
      rec(i + 1, fim);
    }
    rec(0, a.length - 1);
    return ops;
  }

  function iniciarCorrida() {
    pararCorrida();
    var N = 16, base = [];
    for (var k = 1; k <= N; k++) base.push(k);
    for (var s = N - 1; s > 0; s--) { var r = Math.floor(Math.random() * (s + 1)); var t = base[s]; base[s] = base[r]; base[r] = t; }

    var pistas = [
      { el: $('#pista-bubble', raiz), ops: passosBubble(base), cor: COR_BUBBLE },
      { el: $('#pista-quick', raiz), ops: passosQuick(base), cor: COR_QUICK }
    ];
    pistas.forEach(function (p) {
      p.vals = base.slice();
      p.passo = 0;
      p.comp = 0;
      var cont = $('.barras-corrida', p.el);
      cont.innerHTML = '';
      p.barras = p.vals.map(function (v) {
        var b = document.createElement('i');
        b.style.height = (v / N * 100) + '%';
        b.style.background = p.cor;
        cont.appendChild(b);
        return b;
      });
      $('.contador', p.el).textContent = '0 comparações';
      $('.chegada', p.el).textContent = '';
      p.el.classList.remove('terminou');
    });

    var ordem = 0;
    corrida = setInterval(function () {
      var ativos = 0;
      pistas.forEach(function (p) {
        p.barras.forEach(function (b) { b.classList.remove('comparando'); });
        if (p.passo >= p.ops.length) return;
        ativos++;
        var op = p.ops[p.passo++];
        if (!op.sem) p.comp++;
        var x = op.ti !== undefined ? op.ti : op.i, y = op.tj !== undefined ? op.tj : op.j;
        p.barras[op.i].classList.add('comparando');
        p.barras[op.j].classList.add('comparando');
        if (op.troca) {
          var t = p.vals[x]; p.vals[x] = p.vals[y]; p.vals[y] = t;
          p.barras[x].style.height = (p.vals[x] / N * 100) + '%';
          p.barras[y].style.height = (p.vals[y] / N * 100) + '%';
        }
        $('.contador', p.el).textContent = p.comp + ' comparações';
        if (p.passo >= p.ops.length) {
          ordem++;
          p.el.classList.add('terminou');
          p.barras.forEach(function (b, i) {
            b.style.background = '#5fd08f';
            b.style.transitionDelay = (i * 25) + 'ms';
          });
          $('.chegada', p.el).textContent = (ordem === 1 ? '★ Terminou primeiro: ' : 'Terminou: ') + p.comp + ' comparações';
        }
      });
      if (!ativos) pararCorrida();
    }, 70);
  }

  function pararCorrida() {
    if (corrida) { clearInterval(corrida); corrida = null; }
  }

  /* ---------- Montagem e navegacao ---------- */
  function montar() {
    raiz = document.createElement('div');
    raiz.className = 'intro';
    raiz.setAttribute('role', 'dialog');
    raiz.setAttribute('aria-modal', 'true');
    raiz.setAttribute('aria-labelledby', 'intro-titulo-0');

    var slides = ETAPAS.map(function (e, i) {
      var itens = e.itens.map(function (it, k) {
        return '<li style="animation-delay:' + (0.35 + k * 0.12) + 's"><b>' + it[0] + '</b><span>' + it[1] + '</span></li>';
      }).join('');
      return '<section class="intro-slide" data-i="' + i + '" aria-hidden="true">' +
        '<div class="intro-texto">' +
        '<span class="intro-etapa">' + (i + 1) + ' de ' + ETAPAS.length + '</span>' +
        '<h2 id="intro-titulo-' + i + '">' + e.titulo + '</h2>' +
        '<p>' + e.texto + '</p><ul>' + itens + '</ul></div>' +
        '<div class="intro-palco">' + e.palco() + '</div></section>';
    }).join('');

    var pontos = ETAPAS.map(function (e, i) {
      return '<button type="button" class="intro-ponto" data-i="' + i + '" aria-label="Ir para a etapa ' + (i + 1) + '"></button>';
    }).join('');

    raiz.innerHTML =
      '<div class="intro-caixa">' +
      '<div class="intro-barra"><span></span></div>' +
      '<button type="button" class="intro-fechar" aria-label="Fechar apresentação">×</button>' +
      '<div class="intro-slides">' + slides + '</div>' +
      '<footer class="intro-rodape">' +
      '<div class="intro-pontos">' + pontos + '</div>' +
      '<div class="intro-botoes">' +
      '<button type="button" class="botao fantasma intro-pular">Pular</button>' +
      '<button type="button" class="botao fantasma intro-voltar">Voltar</button>' +
      '<button type="button" class="botao destaque intro-avancar">Próximo</button>' +
      '</div></footer></div>';
    document.body.appendChild(raiz);

    $('.intro-fechar', raiz).onclick = fechar;
    $('.intro-pular', raiz).onclick = fechar;
    $('.intro-voltar', raiz).onclick = function () { ir(atual - 1); };
    $('.intro-avancar', raiz).onclick = function () {
      if (atual === ETAPAS.length - 1) { fechar(); irPara('#laboratorio'); } else ir(atual + 1);
    };
    Array.prototype.forEach.call(raiz.querySelectorAll('.intro-ponto'), function (b) {
      b.onclick = function () { ir(+b.getAttribute('data-i')); };
    });
    $('#repetir-corrida', raiz).onclick = iniciarCorrida;
    raiz.addEventListener('click', function (e) { if (e.target === raiz) fechar(); });
  }

  function ir(i) {
    if (i < 0 || i >= ETAPAS.length) return;
    atual = i;
    pararCorrida();
    Array.prototype.forEach.call(raiz.querySelectorAll('.intro-slide'), function (s, k) {
      var ativo = k === i;
      /* reinicia as animacoes CSS da etapa */
      if (ativo) { s.classList.remove('ativo'); void s.offsetWidth; }
      s.classList.toggle('ativo', ativo);
      s.setAttribute('aria-hidden', ativo ? 'false' : 'true');
      if (ativo) {
        Array.prototype.forEach.call(s.querySelectorAll('animateMotion'), function (a) {
          try { a.beginElement(); } catch (e) { /* sem SMIL */ }
        });
      }
    });
    Array.prototype.forEach.call(raiz.querySelectorAll('.intro-ponto'), function (p, k) {
      p.classList.toggle('ativo', k === i);
      p.classList.toggle('feito', k < i);
    });
    $('.intro-barra span', raiz).style.width = ((i + 1) / ETAPAS.length * 100) + '%';
    raiz.setAttribute('aria-labelledby', 'intro-titulo-' + i);
    $('.intro-voltar', raiz).disabled = i === 0;
    $('.intro-avancar', raiz).textContent = i === ETAPAS.length - 1 ? 'Explorar o painel' : 'Próximo';
    if (ETAPAS[i].palco === palcoCorrida) setTimeout(iniciarCorrida, 500);
  }

  function irPara(sel) {
    var alvo = $(sel);
    if (alvo) alvo.scrollIntoView({ behavior: 'smooth' });
  }

  function teclas(e) {
    if (!raiz || raiz.hidden) return;
    if (e.key === 'Escape') fechar();
    else if (e.key === 'ArrowRight') ir(atual + 1);
    else if (e.key === 'ArrowLeft') ir(atual - 1);
  }

  function abrir(i) {
    if (!raiz) montar();
    raiz.hidden = false;
    document.body.classList.add('intro-aberta');
    requestAnimationFrame(function () { raiz.classList.add('visivel'); });
    ir(i || 0);
    $('.intro-avancar', raiz).focus();
  }

  function fechar() {
    if (!raiz) return;
    pararCorrida();
    raiz.classList.remove('visivel');
    document.body.classList.remove('intro-aberta');
    setTimeout(function () { raiz.hidden = true; }, 250);
    try { localStorage.setItem(CHAVE, '1'); } catch (e) { /* sem armazenamento */ }
  }

  function iniciar() {
    document.addEventListener('keydown', teclas);
    var botao = document.getElementById('como-funciona');
    if (botao) botao.onclick = function () { abrir(0); };

    var vista = false;
    try { vista = localStorage.getItem(CHAVE) === '1'; } catch (e) { /* sem armazenamento */ }
    if (!vista || location.hash === '#apresentacao') abrir(0);
  }

  window.GeoSortIntro = { abrir: abrir, fechar: fechar };
  iniciar();
})();
