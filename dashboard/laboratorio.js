/* GeoSort - laboratorio de cenarios
 * Pede ao servidor para executar o menu do geosort (opcoes 1-4, 7 e 9)
 * e mostra os resultados: ranking por cenario, mapa e antes/depois.
 */
(function () {
  'use strict';

  var G = window.GeoSort;
  var TAMANHOS = [1000, 10000, 50000, 100000];
  var ICONES = {
    aleatorio: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
    ordenado: 'M4 20v-4M9 20v-8M14 20v-11M19 20V4',
    inverso: 'M4 20V4M9 20V9M14 20v-8M19 20v-4',
    semi: 'M4 20v-6M9 20v-10M14 20v-4M19 20V4'
  };
  var ESTRELA = 'M12 2l3 6.5 7 .8-5.2 4.8 1.5 7-6.3-3.6-6.3 3.6 1.5-7L2 9.3l7-.8z';
  var lab = {
    resultados: {},
    carregando: {},
    erros: {},
    selecionado: null,
    n: 10000,
    cenario: 'todos',
    ocupado: false,
    servidor: false
  };

  var $ = function (id) { return document.getElementById(id); };
  function fmtData(ts) {
    return new Date(ts * 1000).toLocaleString('pt-BR', {
      timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
  function fmtDia(ts) {
    return new Date(ts * 1000).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
  }
  function fmtPct(v) { return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + '%'; }
  function icone(id) {
    return '<span class="cen-icone ' + id + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
      (ICONES[id] || ICONES.aleatorio) + '"/></svg></span>';
  }
  /* ---------- Controles ---------- */
  function montarControles() {
    var gt = $('lab-tamanhos');
    gt.innerHTML = '';
    TAMANHOS.forEach(function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = n >= 1000 ? (n / 1000) + 'k' : n;
      if (n === lab.n) b.className = 'ativo';
      b.disabled = lab.ocupado;
      b.onclick = function () { lab.n = n; $('lab-n').value = n; montarControles(); };
      gt.appendChild(b);
    });

    var gc = $('lab-cenarios');
    gc.innerHTML = '';
    [{ id: 'todos', nome: 'Todos' }].concat(G.CENARIOS).forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.nome;
      if (c.id === lab.cenario) b.className = 'ativo';
      b.disabled = lab.ocupado;
      b.onclick = function () { lab.cenario = c.id; montarControles(); };
      gc.appendChild(b);
    });

    $('lab-n').disabled = lab.ocupado;
    $('lab-gerar').disabled = lab.ocupado || !lab.servidor;
    avisoTamanho();
  }

  function avisoTamanho() {
    if (lab.ocupado) return;
    var n = Number($('lab-n').value), av = $('lab-aviso');
    av.className = 'lab-aviso';
    if (!Number.isInteger(n) || n < 1 || n > 1000000) {
      av.textContent = 'Use um número inteiro entre 1 e 1.000.000.';
      av.className = 'lab-aviso alerta';
    } else if (n > 100000 && lab.cenario !== 'ordenado') {
      av.textContent = 'Acima de 100.000 registros só o cenário ordenado é liberado: nos outros o Bubble Sort levaria vários minutos.';
      av.className = 'lab-aviso alerta';
    } else if (n >= 50000 && lab.cenario !== 'ordenado') {
      av.textContent = 'Com ' + G.fmtN(n) + ' registros o Bubble Sort e o Insertion Sort levam alguns segundos por cenário.';
    } else {
      av.textContent = 'Os dados são gerados pelo programa em C a cada execução, com uma nova semente aleatória.';
    }
  }

  /* ---------- Geracao ---------- */
  function pedir(cen, n) {
    return fetch('api/cenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cenario: cen, n: n })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) { var e = new Error(j.erro || 'Falha ao gerar o cenário.'); e.status = r.status; throw e; }
        return j;
      });
    });
  }

  function gerar() {
    if (lab.ocupado || !lab.servidor) return;
    var n = Number($('lab-n').value);
    if (!Number.isInteger(n) || n < 1 || n > 1000000) { avisoTamanho(); return; }
    lab.n = n;
    var lista = lab.cenario === 'todos' ? G.CENARIOS.map(function (c) { return c.id; }) : [lab.cenario];

    lab.ocupado = true;
    montarControles();
    lista.forEach(function (c) { lab.carregando[c] = true; delete lab.erros[c]; });
    desenharCards();

    var i = 0;
    function proximo() {
      if (i >= lista.length) return Promise.resolve();
      var c = lista[i++];
      $('lab-aviso').className = 'lab-aviso';
      $('lab-aviso').textContent = 'Executando o geosort: ' + G.nomeCenario(c).toLowerCase() + ' (' + i + ' de ' + lista.length + ')…';
      return pedir(c, n).then(function (r) {
        lab.resultados[c] = r;
        delete lab.carregando[c];
        /* mostra os detalhes do primeiro cenario desta rodada */
        if (i === 1 || lab.selecionado === c) selecionar(c);
        desenharCards();
        return proximo();
      }, function (e) {
        delete lab.carregando[c];
        lab.erros[c] = e.message;
        desenharCards();
        if (e.status === 409) {
          lista.slice(i).forEach(function (x) { delete lab.carregando[x]; });
          throw e;
        }
        return proximo();
      });
    }

    proximo().catch(function (e) {
      $('lab-aviso').textContent = e.message;
      $('lab-aviso').className = 'lab-aviso alerta';
    }).then(function () {
      var erro = $('lab-aviso').className.indexOf('alerta') >= 0;
      lab.ocupado = false;
      desenharCards();
      montarControles();
      if (!erro) {
        $('lab-aviso').className = 'lab-aviso';
        $('lab-aviso').textContent = 'Pronto! Clique em um cenário para ver o mapa e o antes/depois.';
      }
    });
  }

  /* ---------- Cards por cenario ---------- */
  function desenharCards() {
    var html = '';
    G.CENARIOS.forEach(function (c) {
      var r = lab.resultados[c.id], carregando = lab.carregando[c.id], erro = lab.erros[c.id];
      if (!r && !carregando && !erro) return;
      var sel = lab.selecionado === c.id && r ? ' selecionado' : '';
      html += '<div class="cen-card' + sel + '" data-cen="' + c.id + '" tabindex="0">';
      html += '<div class="cen-topo">' + icone(c.id) + '<div><div class="cen-titulo">' + c.nome + '</div>';

      if (carregando) {
        html += '<div class="cen-sub">gerando n = ' + G.fmtN(lab.n) + '…</div></div></div>';
        html += '<div class="barras-mini" style="margin-top:14px">';
        for (var k = 0; k < 6; k++) html += '<div class="esqueleto" style="width:' + (40 + k * 10) + '%"></div>';
        html += '</div></div>';
        return;
      }
      if (!r) {
        html += '<div class="cen-sub">não executado</div></div></div><div class="cen-erro">' + erro + '</div></div>';
        return;
      }

      var lista = r.tempos.slice().sort(function (a, b) { return a.tempo_ms - b.tempo_ms; });
      var max = lista[lista.length - 1].tempo_ms || 1;
      var primeiro = lista[0], ultimo = lista[lista.length - 1];
      html += '<div class="cen-sub">n = ' + G.fmtN(r.n) + ' · executado em ' +
        r.segundos.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' s</div></div></div>';
      html += '<div class="vencedor"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ESTRELA + '"/></svg>' +
        '<span>Mais rápido: <span class="ponto" style="background:' + G.cor(primeiro.algoritmo) + '"></span> <b>' +
        primeiro.algoritmo + '</b> · ' + G.fmtMs(primeiro.tempo_ms) + '</span></div>';
      html += '<div class="barras-mini">';
      lista.forEach(function (t, j) {
        html += '<div class="barra-mini" data-alg="' + t.algoritmo + '" data-t="' + t.tempo_ms + '">' +
          '<span class="nome">' + t.algoritmo + '</span>' +
          '<span class="trilho"><span class="cheio" style="display:block;width:' + Math.max(0.5, 100 * t.tempo_ms / max) +
          '%;background:' + G.cor(t.algoritmo) + ';animation-delay:' + (j * 60) + 'ms"></span></span>' +
          '<span class="val">' + G.fmtMs(t.tempo_ms) + '</span></div>';
      });
      html += '</div>';
      if (primeiro.tempo_ms > 0 && ultimo !== primeiro) {
        html += '<div class="cen-rodape">' + ultimo.algoritmo + ' foi ' +
          Math.round(ultimo.tempo_ms / primeiro.tempo_ms).toLocaleString('pt-BR') + '× mais lento que o ' + primeiro.algoritmo + '.</div>';
      }
      if (r.erros_ordenacao.length) html += '<div class="cen-erro">' + r.erros_ordenacao.join('<br>') + '</div>';
      html += '</div>';
    });
    var cont = $('lab-cards');
    cont.innerHTML = html;
    montarAbasMapa();

    Array.prototype.forEach.call(cont.querySelectorAll('.cen-card'), function (card) {
      var c = card.getAttribute('data-cen');
      var abrir = function () { if (lab.resultados[c]) { selecionar(c); desenharCards(); } };
      card.onclick = abrir;
      card.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } };
    });
    Array.prototype.forEach.call(cont.querySelectorAll('.barra-mini'), function (b) {
      b.addEventListener('mousemove', function (ev) {
        var alg = b.getAttribute('data-alg');
        G.mostrarDica(ev, alg, [['Tempo', G.fmtMs(parseFloat(b.getAttribute('data-t'))), G.cor(alg)]]);
      });
      b.addEventListener('mouseleave', G.esconderDica);
    });
  }

  /* ---------- Detalhes do cenario selecionado ---------- */
  function selecionar(c) {
    lab.selecionado = c;
    var r = lab.resultados[c];
    if (!r) return;
    $('lab-detalhes').hidden = false;
    montarAbasMapa();

    var amostra = r.pontos.length < r.resumo.total
      ? 'Amostra de ' + G.fmtN(r.pontos.length) + ' das ' + G.fmtN(r.resumo.total) + ' imagens geradas'
      : G.fmtN(r.resumo.total) + ' imagens geradas';
    $('lab-mapa-sub').textContent = amostra + ' no cenário ' + G.nomeCenario(c).toLowerCase() +
      '. Arraste para girar e use o botão laranja para ver as capturas em ordem.';
    desenharMapa(r);
    desenharStats(r);
    desenharTabela($('lab-antes'), r.antes, false);
    desenharTabela($('lab-depois'), r.depois, true);
    $('lab-depois-alg').textContent = 'ordenados por ' + (r.algoritmo_listado || 'Heap Sort');
  }

  /* abas com os cenarios ja gerados */
  function montarAbasMapa() {
    var g = $('lab-mapa-cen');
    g.innerHTML = '';
    G.CENARIOS.forEach(function (x) {
      if (!lab.resultados[x.id]) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = x.nome;
      if (x.id === lab.selecionado) b.className = 'ativo';
      b.onclick = function () { selecionar(x.id); desenharCards(); };
      g.appendChild(b);
    });
  }

  var mapa3d = null;
  function desenharMapa(r) {
    if (!mapa3d) mapa3d = window.GeoSortMapa3D.criar($('lab-mapa'), { dica: G.mostrarDica, esconder: G.esconderDica });
    mapa3d.definirDados(r.pontos, r.resumo);
  }

  function desenharStats(r) {
    var s = r.resumo;
    $('lab-stats').innerHTML =
      '<div><b>' + G.fmtN(s.total) + '</b><span>imagens geradas</span></div>' +
      '<div><b>' + fmtPct(s.nuvens_media) + '</b><span>nuvens em média</span></div>' +
      '<div><b>' + fmtPct(100 * s.limpas / Math.max(1, s.total)) + '</b><span>céu limpo (≤ 20%)</span></div>' +
      '<div><b>' + fmtDia(s.inicio) + '–' + fmtDia(s.fim) + '</b><span>período de captura</span></div>';

    var max = Math.max.apply(null, s.faixas_nuvens) || 1;
    var h = $('lab-hist');
    h.innerHTML = s.faixas_nuvens.map(function (v, i) {
      return '<div data-i="' + i + '" data-v="' + v + '" style="height:' + (100 * v / max) + '%;background:var(--destaque);opacity:' +
        (0.45 + 0.055 * i).toFixed(2) + '"></div>';
    }).join('');
    Array.prototype.forEach.call(h.children, function (b) {
      b.addEventListener('mousemove', function (ev) {
        var i = +b.getAttribute('data-i');
        G.mostrarDica(ev, (i * 10) + '% a ' + (i === 9 ? 100 : i * 10 + 9) + '% de nuvens',
          [['Imagens', G.fmtN(+b.getAttribute('data-v'))]]);
      });
      b.addEventListener('mouseleave', G.esconderDica);
    });
  }

  function desenharTabela(tab, regs, ordenada) {
    var h = '<thead><tr><th>ID</th><th>Captura (UTC)</th><th>Lat</th><th>Lon</th><th>Nuvens</th></tr></thead><tbody>';
    regs.forEach(function (x) {
      h += '<tr><td>' + x.id + '</td><td' + (ordenada ? ' class="chave"' : '') + '>' + fmtData(x.timestamp) + '</td>' +
        '<td>' + x.latitude.toFixed(2) + '</td><td>' + x.longitude.toFixed(2) + '</td>' +
        '<td><span class="nuvem-cel">' + x.nuvens + '%<i><b style="width:' + x.nuvens + '%"></b></i></span></td></tr>';
    });
    tab.innerHTML = h + '</tbody>';
  }

  /* ---------- Inicio ---------- */
  function iniciar() {
    $('lab-n').value = lab.n;
    $('lab-n').addEventListener('input', function () {
      lab.n = Number(this.value);
      montarControles();
    });
    $('lab-n').addEventListener('keydown', function (e) { if (e.key === 'Enter') gerar(); });
    $('lab-gerar').onclick = gerar;
    $('hero-gerar').addEventListener('click', function () { if (lab.servidor && !lab.ocupado) gerar(); });

    var semServidor = function () {
      lab.servidor = false;
      $('lab-sem-servidor').hidden = false;
      $('lab-controles').hidden = true;
    };
    if (location.protocol.indexOf('http') !== 0) { semServidor(); return; }

    fetch('api/status').then(function (r) {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(function (st) {
      lab.servidor = true;
      montarControles();
      /* gera os quatro cenarios automaticamente ao abrir */
      if (!st.rodando) gerar();
      else {
        $('lab-aviso').textContent = 'O programa está ocupado com o benchmark; gere os cenários quando ele terminar.';
        $('lab-aviso').className = 'lab-aviso alerta';
      }
    }).catch(semServidor);
  }

  iniciar();
})();
