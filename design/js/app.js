/* ==========================================================================
   LaPoli · protótipo — shell, rotas, estado e ações
   Sem build, sem servidor: abre direto no navegador (file://).
   ========================================================================== */
(function () {
  var LP = window.LP, ic = LP.icon;
  LP.act = LP.act || {}; LP.hooks = LP.hooks || {}; LP.inp = {};

  LP.S = {
    empty: false, loading: false, notes: true,
    period: 'month', prodView: 'grid', prodQ: '', prodCat: 'all', prodStatus: 'active',
    stockTab: 'materiais', stockQ: '', stockFilter: 'all', matTab: 'compras',
    orderView: 'list', orderFilter: 'open', orderQ: '', orderSort: 'deadline', kPhase: 'producao',
    finTab: 'caixa', moveTab: 'done', moveType: 'all', moveCat: 'all', moveQ: '', moveAll: false, clientQ: '',
    sim: null, pf: null, wiz: null, wa: null
  };
  var S = LP.S;

  /* ---------- Navegação ---------- */
  var NAV = [
    { id: 'overview', label: 'Visão geral', path: '/', icon: 'home', group: 'Dia a dia' },
    { id: 'orders', label: 'Pedidos', path: '/pedidos', icon: 'bag', group: 'Dia a dia' },
    { id: 'products', label: 'Produtos', path: '/produtos', icon: 'package', group: 'Dia a dia' },
    { id: 'stock', label: 'Estoque', path: '/estoque', icon: 'layers', group: 'Dia a dia' },
    { id: 'clients', label: 'Clientes', path: '/clientes', icon: 'users', group: 'Gestão', isNew: true },
    { id: 'finance', label: 'Financeiro', path: '/financeiro', icon: 'wallet', group: 'Gestão', isNew: true },
    { id: 'reports', label: 'Relatórios', path: '/relatorios', icon: 'chart', group: 'Gestão', isNew: true },
    { id: 'settings', label: 'Configurações', path: '/configuracoes', icon: 'sliders', group: 'Sistema' },
    { id: 'guide', label: 'Guia visual', path: '/guia', icon: 'sparkle', group: 'Sistema', proto: true }
  ];

  function parse() {
    var h = location.hash.replace(/^#/, '') || '/';
    var qi = h.indexOf('?'), q = {};
    if (qi > -1) { h.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); q[p[0]] = decodeURIComponent(p[1] || ''); }); h = h.slice(0, qi); }
    return { segs: h.split('/').filter(Boolean).map(decodeURIComponent), q: q, raw: h };
  }

  function route() {
    var r = parse(), a = r.segs;
    var R = function (nav, title, crumbs, html, post) { return { nav: nav, title: title, crumbs: crumbs, html: html, post: post }; };
    var home = ['Visão geral', '#/'];
    if (!a.length) return R('overview', 'Visão geral', [], LP.screens.overview());
    if (a[0] === 'produtos') {
      if (!a[1]) return R('products', 'Produtos', [home, ['Produtos']], LP.screens.products());
      if (a[1] === 'novo') return R('products', 'Novo produto', [home, ['Produtos', '#/produtos'], ['Novo produto']], LP.screens.productForm(null), 'pf');
      var p = LP.prod(a[1]); if (!p) return R('products', 'Produto', [home, ['Produtos', '#/produtos']], LP.pageHead('Produto não encontrado', ''));
      if (a[2] === 'editar') return R('products', 'Editar ' + p.name, [home, ['Produtos', '#/produtos'], [p.name, '#/produtos/' + p.id], ['Editar']], LP.screens.productForm(p.id), 'pf');
      return R('products', p.name, [home, ['Produtos', '#/produtos'], [p.name]], LP.screens.pricing(p.id), 'sim');
    }
    if (a[0] === 'estoque') {
      if (!a[1]) return R('stock', 'Estoque', [home, ['Estoque']], LP.screens.stock());
      var m = LP.mat(a[1]); return R('stock', m ? m.name : 'Material', [home, ['Estoque', '#/estoque'], [m ? m.name : 'Material']], LP.screens.material(a[1]));
    }
    if (a[0] === 'pedidos') {
      if (!a[1]) { if (r.q.fase && S.orderFilter !== r.q.fase && !S._faseApplied) { S.orderFilter = r.q.fase; S._faseApplied = true; } return R('orders', 'Pedidos', [home, ['Pedidos']], LP.screens.orders()); }
      if (a[1] === 'novo') return R('orders', 'Novo pedido', [home, ['Pedidos', '#/pedidos'], ['Novo pedido']], LP.screens.newOrder(r.q), 'wiz');
      var o = LP.order(a[1]); return R('orders', o ? 'Pedido #' + o.id : 'Pedido', [home, ['Pedidos', '#/pedidos'], [o ? 'Pedido #' + o.id : 'Pedido']], LP.screens.orderDetail(a[1]));
    }
    if (a[0] === 'clientes') {
      if (!a[1]) return R('clients', 'Clientes', [home, ['Clientes']], LP.screens.clients());
      return R('clients', a[1], [home, ['Clientes', '#/clientes'], [a[1]]], LP.screens.client(a[1]));
    }
    if (a[0] === 'financeiro') {
      if (a[1] === 'movimentacoes') return R('finance', 'Movimentações', [home, ['Financeiro', '#/financeiro'], ['Movimentações']], LP.screens.moves());
      return R('finance', 'Financeiro', [home, ['Financeiro']], LP.screens.finance());
    }
    if (a[0] === 'relatorios') return R('reports', 'Relatórios', [home, ['Relatórios']], LP.screens.reports());
    if (a[0] === 'configuracoes') return R('settings', 'Configurações', [home, ['Configurações']], LP.screens.settings());
    if (a[0] === 'guia') return R('guide', 'Guia visual', [home, ['Guia visual']], LP.screens.guide());
    return R('overview', 'Página não encontrada', [home], LP.empty({ ill: 'box', title: 'Página não encontrada', text: 'Esse endereço não existe no protótipo.', actions: '<a class="btn btn-primary" href="#/">Voltar ao início</a>' }));
  }

  /* ---------- Notas de design (o que foi mantido, aprimorado e acrescentado) ---------- */
  var NOTES = {
    overview: { exist: 'Existe (Painel)', keep: ['Saudação calorosa em Fraunces', 'Seletor de período', 'Textura de crochê discreta', 'Alertas de estoque e prazo'], improve: ['9 cartões iguais viram uma tira com 3 lentes: faturamento, caixa e lucro', '“Precisa de atenção” reúne atrasos, estoque e margem em um só lugar', 'Gráfico de pizza com 11 status vira funil de 3 fases', 'Emojis da saudação trocados por ícones'], add: ['Atalhos para as 4 ações mais frequentes', 'Para produzir e entregar (tarefas)', 'Estado de primeiro uso'] },
    products: { exist: 'Existe (Produtos)', keep: ['Cadastro com materiais, tempo e preços', 'Fórmula de margem sobre o preço', 'Duplicar e arquivar'], improve: ['Foto no cartão e visão em lista', 'Selo de margem: saudável, abaixo da meta ou prejuízo', 'Filtros por categoria e situação'], add: ['Campo de foto (precisa de um campo novo no produto)', 'Lucro por unidade visível no catálogo'] },
    pricing: { exist: 'Parte existe (cálculo)', keep: ['calculateProductCost e calculateSuggestedPrice', 'Mão de obra = horas × valor da hora', 'Custo unitário pela média das compras'], improve: ['Mostra de onde vem cada centavo em vez de só o total', 'Fórmula da margem explicada em uma linha'], add: ['Tela dedicada de precificação', 'Simulador de preço, horas e valor da hora', 'Alerta com ação: quanto cobrar para chegar na meta'] },
    productForm: { exist: 'Existe (modal longo)', keep: ['Mesmos campos e regras', 'Cálculo automático do custo'], improve: ['Vira página dividida em 4 blocos numerados', 'Escolha de material pelo estoque, sem digitar custo'], add: ['Resumo de precificação ao vivo ao lado', 'Meta de margem por produto'] },
    stock: { exist: 'Existe (Estoque)', keep: ['Compras com status e pagamento', 'Lista de compras sugerida', 'Alerta de estoque baixo'], improve: ['Uma linha por material (hoje é uma por compra)', 'Barra mostrando estoque × mínimo', 'Lista de compras explica o motivo e arredonda em pacotes'], add: ['Resumo: valor parado, itens a repor, compra sugerida', 'Perdas e ajustes como ações de primeira classe'] },
    material: { exist: 'Novo', keep: ['Custo unitário por compra e média ponderada'], improve: [], add: ['Físico (quantidade) separado do financeiro (R$)', 'Histórico de compras, consumo e perdas', 'Previsão de recompra só com dados suficientes', 'Regra de baixa única explicada na tela'] },
    orders: { exist: 'Existe (Pedidos)', keep: ['Lista e Kanban', 'Arrastar entre colunas', 'As 11 etapas atuais continuam existindo', 'Saldo, sinal e prazo'], improve: ['Kanban de 3 fases (Orçamento, Produção, Entrega) em vez de 11 colunas de 300 px', 'No celular, uma fase por vez', 'Concluídos e cancelados ficam à parte'], add: ['Indicadores de atraso e pagamento em cada pedido', 'Filtros, busca e ordenação'] },
    newOrder: { exist: 'Existe (modal)', keep: ['Sinal em percentual', 'Pedido personalizado sem catálogo'], improve: ['Vira fluxo de 6 etapas com resumo fixo'], add: ['Sugestão de prazo pelas horas da peça', 'Aviso de material faltando', 'Lucro estimado antes de fechar'] },
    orderDetail: { exist: 'Parcial', keep: ['Mensagens de WhatsApp prontas', 'Registro de sinal e saldo'], improve: ['Tudo do pedido em uma tela só', 'Mensagens editáveis, nunca enviadas sozinhas'], add: ['Checklist de produção', 'Histórico e notas internas', 'Ação principal muda conforme a etapa'] },
    clients: { exist: 'Novo (tipo Client existe, sem tela)', keep: ['Nome e telefone'], improve: [], add: ['Lista com saldo pendente', 'Histórico de encomendas', 'Preferências', 'Sem virar um CRM'] },
    finance: { exist: 'Novo (planejado em FINANCEIRO_PLAN.md)', keep: ['Lucro = faturamento − custos'], improve: [], add: ['Duas camadas: caixa e resultado', 'Ponte que explica a diferença entre elas', 'Previstos separados de realizados', 'Receita só na entrega'] },
    moves: { exist: 'Novo', keep: [], improve: [], add: ['Livro-caixa único', 'Origem de cada lançamento (pedido, compra, manual)', 'Sem contar duas vezes'] },
    reports: { exist: 'Novo', keep: ['Produtos mais vendidos', 'Margem'], improve: [], add: ['Cada relatório diz se é dado real, estimativa ou sem dados', 'Gráficos só onde ajudam a decidir'] },
    settings: { exist: 'Existe (Configurações)', keep: ['Valor da hora, sinal, margem', 'Categorias, tipos, unidades', 'Exportar e importar JSON'], improve: ['Backup com data, lembrete e linguagem clara sobre responsabilidade', 'Importação em passos: validar, confirmar, backup de segurança'], add: ['Alertas configuráveis', 'Saldo inicial do caixa e horas por dia'] },
    guide: { exist: 'DESIGN_SYSTEM.md', keep: ['Toda a paleta, tipografia, raios e sombras'], improve: ['Cores “texto” com contraste AA'], add: ['Lentes financeiras', 'Elementos de precificação'] }
  };
  function noteKey(r) {
    var a = parse().segs;
    if (!a.length) return 'overview';
    if (a[0] === 'produtos') return !a[1] ? 'products' : a[1] === 'novo' || a[2] === 'editar' ? 'productForm' : 'pricing';
    if (a[0] === 'estoque') return a[1] ? 'material' : 'stock';
    if (a[0] === 'pedidos') return !a[1] ? 'orders' : a[1] === 'novo' ? 'newOrder' : 'orderDetail';
    if (a[0] === 'clientes') return 'clients';
    if (a[0] === 'financeiro') return a[1] ? 'moves' : 'finance';
    if (a[0] === 'relatorios') return 'reports';
    if (a[0] === 'configuracoes') return 'settings';
    if (a[0] === 'guia') return 'guide';
    return null;
  }
  function notesHtml() {
    var k = noteKey(), n = NOTES[k]; if (!n || !S.notes) return '';
    var col = function (t, arr, cls) { return arr.length ? '<div><b class="badge ' + cls + '">' + t + '</b><ul>' + arr.map(function (x) { return '<li>' + LP.esc(x) + '</li>'; }).join('') + '</ul></div>' : ''; };
    return '<details class="proto-note"><summary>' + ic('sparkle', 16) + 'Notas de design desta tela <span class="small muted">· ' + n.exist + '</span>' + ic('chevron-down', 16, 'chev') + '</summary><div class="note-grid">' + col('Mantido', n.keep, 'b-neutral') + col('Aprimorado', n.improve, 'b-warning') + col('Acrescentado', n.add, 'b-primary') + '</div></details>';
  }

  /* ---------- Shell ---------- */
  function shell() {
    var groups = {}, order = [];
    NAV.forEach(function (n) { if (!groups[n.group]) { groups[n.group] = []; order.push(n.group); } groups[n.group].push(n); });
    var nav = '<aside class="nav" id="nav" aria-label="Menu principal"><a class="nav-brand" href="#/"><img src="assets/logo.jpg" alt="" width="44" height="44"/><div><span class="name">LaPoli</span><span class="tag">Gestão do ateliê</span></div></a>' +
      order.map(function (g) { return '<div class="nav-group">' + g + '</div>' + groups[g].map(function (n) { return '<a class="nav-item" data-nav="' + n.id + '" href="#' + n.path + '">' + ic(n.icon, 22) + '<span>' + (n.label.length > 11 && n.id !== 'overview' ? n.label : n.label) + '</span>' + (n.isNew ? '<span class="new-tag">Proposta</span>' : n.proto ? '<span class="new-tag">Protótipo</span>' : '') + '</a>'; }).join(''); }).join('') +
      '<div class="nav-spacer"></div><div class="nav-foot"><strong>' + ic('shield', 16) + 'Dados só neste aparelho</strong>Último backup há <span id="bk-days"></span> dias.<a class="btn btn-secondary btn-sm" href="#/configuracoes">Fazer backup</a></div></aside>';
    var tabs = [['overview', 'Início', 'home', '/'], ['orders', 'Pedidos', 'bag', '/pedidos'], ['products', 'Produtos', 'package', '/produtos'], ['stock', 'Estoque', 'layers', '/estoque']];
    var tabbar = '<nav class="tabbar" aria-label="Menu principal">' + tabs.map(function (t) { return '<a class="tab" data-nav="' + t[0] + '" href="#' + t[3] + '">' + ic(t[2], 24) + t[1] + '</a>'; }).join('') + '<button class="tab" data-nav="more" data-action="open-more">' + ic('menu', 24) + 'Mais</button></nav>';
    var newMenu = LP.menu('new', ic('plus', 18) + '<span class="hide-sm">Novo</span>', [
      { icon: 'bag', label: 'Novo pedido', action: 'go', arg: '#/pedidos/novo' }, { icon: 'package', label: 'Cadastrar produto', action: 'go', arg: '#/produtos/novo' }, { icon: 'cart', label: 'Registrar compra', action: 'open-buy' }, { icon: 'wallet', label: 'Lançar movimentação', action: 'open-move', arg: 'in' }, { icon: 'user-plus', label: 'Nova cliente', action: 'new-client' }], { btnClass: 'btn btn-primary btn-sm' });
    var protoMenu = '<div class="menu-wrap"><button class="btn btn-secondary btn-sm" data-action="menu" aria-haspopup="true" aria-expanded="false">' + ic('sliders', 16) + '<span class="hide-sm">Protótipo</span></button><div class="menu" role="menu" hidden style="min-width:280px">' +
      '<button role="menuitemcheckbox" data-action="toggle-empty" id="pm-empty">' + ic('yarn', 18) + 'Primeiro uso (sem dados)<span class="pm-state" style="margin-left:auto"></span></button><button role="menuitem" data-action="toggle-loading">' + ic('clock', 18) + 'Mostrar carregamento</button><button role="menuitemcheckbox" data-action="toggle-notes" id="pm-notes">' + ic('sparkle', 18) + 'Notas de design<span class="pm-state" style="margin-left:auto"></span></button><hr/><button role="menuitem" data-action="reload-demo">' + ic('refresh', 18) + 'Restaurar dados de demonstração</button></div></div>';
    return '<a class="skip-link" href="#view">Ir para o conteúdo</a><div class="app">' + nav + '<div class="main"><div class="demo-banner" role="note">' + ic('info', 14) + '<span><b>Protótipo de design</b> · dados demonstrativos e fictícios, não são informações reais da LaPoli</span></div>' +
      '<header class="topbar"><a class="topbar-title" href="#/"><img src="assets/logo.jpg" alt="" width="34" height="34"/>LaPoli</a><nav class="crumbs" id="crumbs" aria-label="Você está em"></nav><div class="topbar-spacer"></div><span class="device-pill" title="Os dados ficam armazenados somente neste aparelho"><span class="dot"></span><span class="long">Offline · dados neste aparelho</span><span class="short">Offline</span></span>' + protoMenu + newMenu + '</header>' +
      '<main id="view" class="view" tabindex="-1"></main></div>' + tabbar + '</div><div id="overlay-root"></div><div id="toasts" class="toasts" aria-live="polite"></div>';
  }

  /* ---------- Render ---------- */
  var lastRoute = null;
  LP.render = function (opts) {
    opts = opts || {};
    var active = document.activeElement, keep = null;
    if (active && active.dataset && active.dataset.input && /(-q)$/.test(active.dataset.input)) keep = { k: active.dataset.input, s: active.selectionStart };
    var scroll = window.scrollY;
    var r = route();
    var view = document.getElementById('view');
    view.innerHTML = r.html + notesHtml();
    var changed = lastRoute !== location.hash;
    lastRoute = location.hash;
    // navegação ativa
    document.querySelectorAll('[data-nav]').forEach(function (el) { var on = el.dataset.nav === r.nav; if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
    var more = document.querySelector('.tab[data-nav="more"]'); if (more) { var inMore = ['clients', 'finance', 'reports', 'settings', 'guide'].indexOf(r.nav) > -1; if (inMore) more.setAttribute('aria-current', 'page'); else more.removeAttribute('aria-current'); }
    var cr = document.getElementById('crumbs');
    cr.innerHTML = r.crumbs.map(function (c, i) { var last = i === r.crumbs.length - 1; return (i ? '<span class="sep">' + ic('chevron-right', 14) + '</span>' : '') + (last || !c[1] ? '<span class="here">' + LP.esc(c[0]) + '</span>' : '<a href="' + c[1] + '">' + LP.esc(c[0]) + '</a>'); }).join('');
    document.title = r.title + ' · LaPoli (protótipo)';
    var bk = document.getElementById('bk-days'); if (bk) bk.textContent = LP.daysBetween(LP.settings.lastBackup, LP.TODAY);
    document.getElementById('pm-empty') && (document.querySelector('#pm-empty .pm-state').innerHTML = S.empty ? '<span class="badge b-primary">ligado</span>' : '');
    document.getElementById('pm-notes') && (document.querySelector('#pm-notes .pm-state').innerHTML = S.notes ? '<span class="badge b-success">ligado</span>' : '');
    // ganchos pós-render
    if (r.post === 'pf') LP.hooks.pfUpdate();
    if (r.post === 'wiz') LP.hooks.wizUpdate();
    if (r.post === 'sim') LP.hooks.simUpdate();
    document.querySelectorAll('input[type=range]').forEach(function (el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); });
    if (changed && !opts.keepScroll) { window.scrollTo(0, 0); }
    else window.scrollTo(0, scroll);
    if (keep) { var el = document.querySelector('[data-input="' + keep.k + '"]'); if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch (e) {} } }
  };

  /* ---------- Entradas de formulário ---------- */
  var I = LP.inp;
  I['prod-q'] = function (el) { S.prodQ = el.value; LP.render(); };
  I['prod-status'] = function (el) { S.prodStatus = el.value; LP.render(); };
  I['stock-q'] = function (el) { S.stockQ = el.value; LP.render(); };
  I['order-q'] = function (el) { S.orderQ = el.value; LP.render(); };
  I['order-sort'] = function (el) { S.orderSort = el.value; LP.render(); };
  I['client-q'] = function (el) { S.clientQ = el.value; LP.render(); };
  I['move-q'] = function (el) { S.moveQ = el.value; LP.render(); };
  I['move-cat'] = function (el) { S.moveCat = el.value; LP.render(); };
  I['sim-price'] = function (el) { S.sim.price = +el.value; LP.hooks.simUpdate(); };
  I['sim-hours'] = function (el) { S.sim.hours = +el.value; LP.hooks.simUpdate(); };
  I['sim-rate'] = function (el) { S.sim.rate = +el.value; LP.hooks.simUpdate(); };
  ['name', 'cat', 'size', 'desc', 'notes'].forEach(function (k) { I['pf-' + k] = function (el) { S.pf[k] = el.value; }; });
  ['hours', 'rate', 'other', 'price', 'goal'].forEach(function (k) { I['pf-' + k] = function (el) { S.pf[k] = el.value === '' ? 0 : +el.value; LP.hooks.pfUpdate(); }; });
  I['pf-qty'] = function (el) { S.pf.mats[+el.dataset.i][1] = +el.value || 0; LP.hooks.pfUpdate(); };
  I['buy-calc'] = function () { LP.hooks.buyCalc(); };
  I['buy-mat'] = function () { LP.hooks.buyMat(); };
  I['wiz-nName'] = function (el) { S.wiz.nName = el.value; LP.hooks.wizUpdate(); };
  I['wiz-nPhone'] = function (el) { S.wiz.nPhone = el.value; };
  I['wiz-cName'] = function (el) { S.wiz.cName = el.value; LP.hooks.wizUpdate(); };
  I['wiz-color'] = function (el) { S.wiz.color = el.value; };
  I['wiz-size'] = function (el) { S.wiz.size = el.value; };
  I['wiz-details'] = function (el) { S.wiz.details = el.value; };
  I['wiz-price'] = function (el) { S.wiz.price = +el.value; S.wiz.priceTouched = true; LP.hooks.wizUpdate(); };
  I['wiz-deadline'] = function (el) { S.wiz.deadline = el.value; S.wiz.deadTouched = true; LP.hooks.wizUpdate(); };
  I['wiz-pct'] = function (el) { S.wiz.pct = +el.value; LP.hooks.wizUpdate(); };
  I['wiz-method'] = function (el) { S.wiz.method = el.value; };
  I['order-note'] = function (el) { var o = LP.order(parse().segs[1]); if (o) o.note = el.value; };

  document.addEventListener('input', function (e) { var k = e.target.dataset && e.target.dataset.input; if (k && I[k] && e.target.tagName !== 'SELECT') I[k](e.target, e); });
  document.addEventListener('change', function (e) {
    var t = e.target, k = t.dataset && t.dataset.input;
    if (k && I[k] && (t.tagName === 'SELECT' || t.type === 'date')) I[k](t, e);
    if (t.id === 'pf-add-sel' && t.value) { S.pf.mats.push([t.value, 0]); LP.hooks.pfMats(); }
  });

  /* ---------- Ações ---------- */
  var A = LP.act;
  A.go = function (el) { location.hash = el.dataset.arg; };
  A['close-modal'] = function () { LP.closeModal(); };
  A['confirm-ok'] = function () { var f = LP._confirm; if (f) f(); };
  A['set-period'] = function (el) { S.period = el.dataset.arg; LP.render({ keepScroll: true }); };
  A['set-prodview'] = function (el) { S.prodView = el.dataset.arg; LP.render({ keepScroll: true }); };
  A['set-prodcat'] = function (el) { S.prodCat = el.dataset.arg; LP.render({ keepScroll: true }); };
  A['clear-prod-filters'] = function () { S.prodQ = ''; S.prodCat = 'all'; S.prodStatus = 'active'; LP.render(); };
  A['set-stocktab'] = function (el) { S.stockTab = el.dataset.arg; LP.render({ keepScroll: true }); };
  A['set-stockfilter'] = function (el) { S.stockFilter = el.dataset.arg; LP.render({ keepScroll: true }); };
  A['set-mattab'] = function (el) { S.matTab = el.dataset.arg; LP.render({ keepScroll: true }); };
  A['set-orderview'] = function (el) { S.orderView = el.dataset.arg; LP.render({ keepScroll: true }); };
  A['set-orderfilter'] = function (el) { S.orderFilter = el.dataset.arg; LP.render({ keepScroll: true }); };
  A['set-kphase'] = function (el) { S.kPhase = el.dataset.arg; LP.render({ keepScroll: true }); };
  A['set-fintab'] = function (el) { S.finTab = el.dataset.arg; LP.render({ keepScroll: true }); };
  A['set-movetab'] = function (el) { S.moveTab = el.dataset.arg; LP.render({ keepScroll: true }); };
  A['set-movetype'] = function (el) { S.moveType = el.dataset.arg; LP.render({ keepScroll: true }); };
  A['sim-reset'] = function () { S.sim = null; LP.render({ keepScroll: true }); };
  A['sim-set-price'] = function (el) { S.sim.price = +el.dataset.arg; var r = document.getElementById('sim-price'); r.value = S.sim.price; LP.hooks.simUpdate(); };
  A['pf-del-mat'] = function (el) { S.pf.mats.splice(+el.dataset.arg, 1); LP.hooks.pfMats(); };
  A['fake-photo'] = function () { LP.toast('No app, abriria a câmera ou a galeria', { type: 'info', sub: 'A foto fica salva só neste aparelho.' }); };
  A['save-product'] = function () {
    var f = S.pf; if (!f.name.trim()) { LP.toast('Dê um nome à peça', { type: 'err', sub: 'O nome é obrigatório.' }); var n = document.getElementById('f-name'); n.classList.add('is-error'); n.focus(); return; }
    var id = f.id;
    if (id === 'new') { id = 'p' + (LP.products.length + 1); LP.products.push({ id: id, name: f.name, cat: f.cat, size: f.size || '—', needle: '—', hours: +f.hours, other: +f.other, otherNote: 'Outros custos', price: +f.price, art: 'novelo', active: true, desc: f.desc, notes: f.notes, mats: f.mats }); }
    else { var p = LP.prod(id); p.name = f.name; p.cat = f.cat; p.size = f.size; p.hours = +f.hours; p.other = +f.other; p.price = +f.price; p.desc = f.desc; p.notes = f.notes; p.mats = f.mats; }
    S.pf = null; S.sim = null; LP.toast('Produto salvo', { sub: f.name }); location.hash = '#/produtos/' + id;
  };
  A['dup-product'] = function (el) { var p = LP.prod(el.dataset.arg), c = JSON.parse(JSON.stringify(p)); c.id = 'p' + (LP.products.length + 1); c.name = p.name + ' (cópia)'; LP.products.push(c); LP.render(); LP.toast('Produto duplicado', { sub: c.name, undo: true }); };
  A['archive-product'] = function (el) {
    var p = LP.prod(el.dataset.arg);
    if (!p.active) { p.active = true; LP.render(); LP.toast('Produto reativado', { sub: p.name }); return; }
    LP.confirm({ title: 'Arquivar “' + p.name + '”?', danger: true, ok: 'Arquivar produto', text: 'O produto sai do catálogo ativo, mas pedidos antigos e histórico continuam. Você pode reativar quando quiser.', onOk: function () { p.active = false; LP.closeModal(); LP.render(); LP.toast('Produto arquivado', { type: 'info', sub: p.name, undo: true }); } });
  };
  A['set-period'] = A['set-period'];
  A['toggle-empty'] = function () { S.empty = !S.empty; LP.render({ keepScroll: true }); LP.toast(S.empty ? 'Mostrando o primeiro uso (sem dados)' : 'Dados de demonstração de volta', { type: 'info' }); };
  A['toggle-notes'] = function () { S.notes = !S.notes; LP.render({ keepScroll: true }); };
  A['toggle-loading'] = function () { S.loading = true; LP.render({ keepScroll: true }); setTimeout(function () { S.loading = false; LP.render({ keepScroll: true }); }, 1400); };
  A['reload-demo'] = function () { location.reload(); };
  A['copy-shop'] = function () { var t = LP.shopping().map(function (i) { return '• ' + i.m.name + ': ' + i.packs + ' × ' + i.m.pack + ' ' + i.m.unit; }).join('\n'); try { navigator.clipboard.writeText(t); } catch (e) {} LP.toast('Lista de compras copiada', { type: 'info' }); };
  A['open-more'] = function () {
    var items = [['clients', 'Clientes', 'users', '#/clientes', 'Proposta'], ['finance', 'Financeiro', 'wallet', '#/financeiro', 'Proposta'], ['reports', 'Relatórios', 'chart', '#/relatorios', 'Proposta'], ['settings', 'Configurações e backup', 'sliders', '#/configuracoes'], ['guide', 'Guia visual', 'sparkle', '#/guia', 'Protótipo']];
    LP.openModal({ title: 'Mais', body: '<div class="rows">' + items.map(function (i) { return '<a class="li click" href="' + i[3] + '" data-action="close-modal" style="min-height:56px"><span class="dot-ic p">' + ic(i[2], 22) + '</span><b class="grow">' + i[1] + '</b>' + (i[4] ? '<span class="badge b-neutral">' + i[4] + '</span>' : '') + ic('chevron-right', 18, 'faint') + '</a>'; }).join('') + '</div>' });
  };
  A.buy = A['open-buy']; A.move = A['open-move'];

  /* menus */
  function closeMenus(except) { document.querySelectorAll('.menu:not([hidden])').forEach(function (m) { if (m !== except) { m.hidden = true; var b = m.previousElementSibling; if (b) b.setAttribute('aria-expanded', 'false'); } }); }
  A.menu = function (el) { var m = el.nextElementSibling; var open = m.hidden; closeMenus(); m.hidden = !open; el.setAttribute('aria-expanded', String(open)); };

  document.addEventListener('click', function (e) {
    var t = e.target;
    var act = t.closest('[data-action]');
    if (act) {
      var name = act.dataset.action;
      if (name !== 'menu') { var inMenu = act.closest('.menu'); if (inMenu) closeMenus(); }
      if (A[name]) { var link = act.tagName === 'A'; if (!link) e.preventDefault(); A[name](act, e); }
      if (name === 'menu') return;
    } else if (!t.closest('.menu-wrap')) closeMenus();
    var ov = t.closest('[data-overlay]'); if (ov && t === ov) LP.closeModal();
    if (!act) {
      var hr = t.closest('[data-href]');
      if (hr && !t.closest('a,button,.menu-wrap,input,select,textarea')) location.hash = hr.dataset.href;
    }
    var tabLink = t.closest('a[data-tab]'); if (tabLink) S.stockTab = tabLink.dataset.tab;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (document.querySelector('.overlay')) LP.closeModal(); else closeMenus(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.href && e.target === document.activeElement) { e.preventDefault(); location.hash = e.target.dataset.href; }
  });

  /* arrastar e soltar no quadro */
  document.addEventListener('dragstart', function (e) { var c = e.target.closest && e.target.closest('[data-drag]'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.drag); e.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging'); });
  document.addEventListener('dragend', function (e) { var c = e.target.closest && e.target.closest('[data-drag]'); if (c) c.classList.remove('dragging'); document.querySelectorAll('.k-body.over').forEach(function (x) { x.classList.remove('over'); }); });
  document.addEventListener('dragover', function (e) { var d = e.target.closest && e.target.closest('[data-drop]'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  document.addEventListener('dragleave', function (e) { var d = e.target.closest && e.target.closest('[data-drop]'); if (d && !d.contains(e.relatedTarget)) d.classList.remove('over'); });
  document.addEventListener('drop', function (e) {
    var d = e.target.closest && e.target.closest('[data-drop]'); if (!d) return; e.preventDefault();
    var o = LP.order(e.dataTransfer.getData('text/plain')); if (!o) return;
    var ph = LP.phases.filter(function (p) { return p.id === d.dataset.drop; })[0];
    if (ph.statuses.indexOf(o.status) > -1) return;
    var target = ph.statuses[0], msgs = LP.setStatus(o, target); LP.render({ keepScroll: true });
    LP.toast('Pedido #' + o.id + ' → ' + target, { sub: (o.pays.length === 0 && ph.id !== 'orcamento' ? 'Atenção: nenhum sinal registrado ainda. ' : '') + (msgs.join('. ') || ''), type: o.pays.length === 0 && ph.id !== 'orcamento' ? 'warn' : 'ok', undo: true });
  });

  window.addEventListener('hashchange', function () { LP.closeModal(); S._faseApplied = false; LP.render(); });
  document.addEventListener('DOMContentLoaded', function () { document.getElementById('root').innerHTML = shell(); LP.render(); });
})();
