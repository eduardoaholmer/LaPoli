/* ==========================================================================
   Telas fundamentais: Visão geral · Produtos · Precificação detalhada · Cadastro de produto
   ========================================================================== */
(function () {
  var LP = window.LP, ic = LP.icon, S = function () { return LP.S; };
  LP.screens = LP.screens || {};
  LP.hooks = LP.hooks || {};

  function greeting() { return 'Boa tarde'; } // protótipo fixo às 15h

  /* ------------------------------------------------------------------
     VISÃO GERAL
     ------------------------------------------------------------------ */
  LP.screens.overview = function () {
    var s = S();
    if (s.loading) {
      return LP.pageHead(greeting() + '!', LP.dlong(LP.TODAY)) + '<div class="grid g-3">' + LP.skeletonCards(3) + '</div><div class="grid g-2 mt-16">' + LP.skeletonCards(2) + '</div>';
    }
    if (s.empty) return overviewEmpty();

    var p = LP.period(s.period);
    var res = LP.result(p), cash = LP.cash(p);
    var open = LP.orders.filter(LP.isOpen);
    var late = open.filter(LP.isLate), near = open.filter(LP.isNear);
    var lowMats = LP.materials.filter(function (m) { return LP.matStats(m).level !== 'ok'; });
    var badProds = LP.products.filter(function (pr) { return pr.active && LP.productCost(pr).state !== 'ok'; });

    var periodSel = '<div class="seg" role="group" aria-label="Período">' +
      [['month', 'Este mês'], ['last', 'Mês passado'], ['7d', '7 dias']].map(function (x) { return '<button aria-pressed="' + (s.period === x[0]) + '" data-action="set-period" data-arg="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';

    // --- Tira financeira: três conceitos, três rótulos, nunca misturados ---
    var money = '<section class="card money-strip textured" aria-label="Resumo financeiro de ' + LP.esc(p.label) + '">' +
      '<div class="money-head"><div><span class="eyebrow">' + LP.esc(p.label) + '</span><h2>Como foi o período</h2></div>' + periodSel + '</div>' +
      '<div class="money-grid">' +
      '<div class="money-col">' + LP.lens('fat') + '<div class="display-num">' + LP.money(res.rev) + '</div><p>Valor das peças <b>entregues</b> no período. É o que você vendeu, não o que entrou na conta.</p></div>' +
      '<div class="money-col">' + LP.lens('caixa') + '<div class="display-num">' + LP.money(cash.inn) + '</div><p>Dinheiro que <b>entrou</b> de fato (sinais e saldos). Saiu: <b>' + LP.money(cash.out) + '</b>.</p></div>' +
      '<div class="money-col hl">' + LP.lens('lucro') + '<div class="display-num ' + (res.profit < 0 ? 'neg' : '') + '">' + LP.money(res.profit) + '</div><p>Sobra depois de materiais, seu trabalho (horas × R$/h) e despesas. Margem de <b>' + LP.pct(res.margin) + '</b>.</p></div>' +
      '</div>' +
      '<div class="money-foot">' + ic('info', 16) + '<span>Por que são diferentes? Sinais de pedidos ainda não entregues entram no caixa, mas só viram faturamento na entrega. <a href="#/financeiro">Entender no Financeiro</a></span></div>' +
      '</section>';

    // --- Precisa de atenção (só o que exige ação) ---
    var att = [];
    late.forEach(function (o) {
      att.push({ tone: 'e', ic: 'clock', t: 'Pedido #' + o.id + ' está atrasado ' + Math.abs(LP.orderDays(o)) + ' dias', s: o.client + ' · ' + LP.orderName(o) + ' · prazo ' + LP.dshort(o.deadline), act: 'Abrir pedido', href: '#/pedidos/' + o.id });
    });
    near.forEach(function (o) {
      att.push({ tone: 'w', ic: 'truck', t: 'Entrega ' + LP.rel(LP.orderDays(o)) + ': pedido #' + o.id, s: o.client + ' · ' + LP.orderName(o) + (LP.orderBalance(o) > 0 ? ' · saldo ' + LP.money(LP.orderBalance(o)) + ' a receber' : ''), act: 'Abrir pedido', href: '#/pedidos/' + o.id });
    });
    lowMats.forEach(function (m) {
      var st = LP.matStats(m);
      att.push({ tone: st.level === 'low' ? 'e' : 'w', ic: 'layers', t: m.name + (st.level === 'low' ? ' abaixo do mínimo' : ' quase no mínimo'), s: 'Restam ' + LP.qty(st.stock, m.unit) + ' · mínimo ' + LP.qty(m.min, m.unit), act: 'Ver material', href: '#/estoque/' + m.id });
    });
    badProds.forEach(function (pr) {
      var c = LP.productCost(pr);
      att.push({ tone: c.state === 'loss' ? 'e' : 'w', ic: 'percent', t: pr.name + (c.state === 'loss' ? ': vendendo com prejuízo' : ': margem abaixo da meta'), s: 'Margem de ' + LP.pct(c.margin) + ' (meta ' + LP.pct(c.goal, 0) + ') · preço sugerido ' + LP.money(c.suggested), act: 'Ajustar preço', href: '#/produtos/' + pr.id });
    });
    att.sort(function (a, b) { return (a.tone === 'e' ? 0 : 1) - (b.tone === 'e' ? 0 : 1); });
    var attHtml = att.length ? '<div class="rows">' + att.slice(0, 6).map(function (a) {
      return '<a class="li click att" href="' + a.href + '"><span class="dot-ic ' + a.tone + '">' + ic(a.ic, 20) + '</span><div class="grow"><div class="t">' + LP.esc(a.t) + '</div><div class="s">' + LP.esc(a.s) + '</div></div><span class="link-btn hide-sm">' + a.act + ic('chevron-right', 16) + '</span></a>';
    }).join('') + '</div>' + (att.length > 6 ? '<p class="small muted mt-8">+ ' + (att.length - 6) + ' avisos</p>' : '') :
      LP.empty({ compact: true, ill: 'bear', title: 'Tudo em dia por aqui', text: 'Nenhum atraso, estoque baixo ou margem fora da meta.' });

    var attention = '<section class="card" aria-labelledby="h-att"><div class="card-head"><h2 id="h-att">' + ic('bell', 20) + ' Precisa de atenção <span class="badge-count">' + att.length + '</span></h2></div>' + attHtml + '</section>';

    // --- Próximas tarefas de produção ---
    var tasks = open.filter(function (o) { return ['Em produção', 'Sinal recebido', 'Materiais comprados', 'Aguardando compra de materiais', 'Produção concluída', 'Aguardando entrega'].indexOf(o.status) > -1; })
      .sort(function (a, b) { return a.deadline < b.deadline ? -1 : 1; }).slice(0, 5);
    var taskText = {
      'Em produção': function (o) { var c = o.checklist; if (c) { var nx = c.filter(function (x) { return !x[1]; })[0]; return nx ? 'Próxima etapa: ' + nx[0] : 'Revisar acabamento'; } return 'Continuar produção'; },
      'Sinal recebido': function () { return 'Separar materiais e começar'; },
      'Aguardando compra de materiais': function () { return 'Comprar materiais que faltam'; },
      'Materiais comprados': function () { return 'Iniciar a produção'; },
      'Produção concluída': function () { return 'Avisar cliente e combinar entrega'; },
      'Aguardando entrega': function () { return 'Entregar e receber o saldo'; }
    };
    var taskHtml = '<div class="rows">' + tasks.map(function (o) {
      var n = LP.orderDays(o);
      var when = n < 0 ? '<span class="neg">Atrasado ' + Math.abs(n) + 'd</span>' : (n === 0 ? '<b>Hoje</b>' : LP.dshort(o.deadline));
      return '<a class="li click" href="#/pedidos/' + o.id + '">' + LP.art(LP.orderArt(o), 'sm') + '<div class="grow"><div class="t">' + taskText[o.status](o) + '</div><div class="s">#' + o.id + ' · ' + LP.esc(o.client) + ' · ' + LP.esc(LP.orderName(o)) + '</div></div><div class="right small nowrap">' + when + '</div></a>';
    }).join('') + '</div>';
    var tasksCard = '<section class="card" aria-labelledby="h-task"><div class="card-head"><h2 id="h-task">' + ic('checks', 20) + ' Para produzir e entregar</h2><a class="link-btn" href="#/pedidos">Ver pedidos' + ic('arrow-right', 16) + '</a></div>' + taskHtml + '</section>';

    // --- Atalhos ---
    var quick = '<section aria-label="Atalhos"><div class="grid g-4 keep2 quick">' +
      [['#/pedidos/novo', 'bag', 'Novo pedido'], ['#/produtos/novo', 'package', 'Cadastrar produto'], ['act:buy', 'cart', 'Registrar compra'], ['act:move', 'wallet', 'Lançar movimentação']].map(function (q) {
        var a = q[0].indexOf('act:') === 0 ? '<button class="quick-btn" data-action="' + q[0].slice(4) + '">' : '<a class="quick-btn" href="' + q[0] + '">';
        return a + '<span class="dot-ic p">' + ic(q[1], 22) + '</span><b>' + q[2] + '</b>' + (q[0].indexOf('act:') === 0 ? '</button>' : '</a>');
      }).join('') + '</div></section>';

    // --- Atividade recente ---
    var days = [];
    for (var i = 13; i >= 0; i--) {
      var dd = new Date(LP.TODAY.getTime() - i * 86400000), key = dd.getFullYear() + '-' + ('0' + (dd.getMonth() + 1)).slice(-2) + '-' + ('0' + dd.getDate()).slice(-2);
      var rin = 0, rout = 0;
      LP.ledger().forEach(function (e) { if (e.d === key) { if (e.type === 'in') rin += e.amount; else rout += e.amount; } });
      days.push({ d: dd, in: rin, out: rout });
    }
    var activity = '<section class="card" aria-labelledby="h-act"><div class="card-head"><h2 id="h-act">' + ic('history', 20) + ' Atividade recente</h2></div>' +
      '<div class="mini-chart">' + LP.miniBars(days) + '<div class="legend"><span><i style="background:var(--color-secondary)"></i>Entrou</span><span><i style="background:var(--color-primary-light)"></i>Saiu</span><span class="faint">últimos 14 dias · caixa</span></div></div>' +
      '<div class="rows mt-16">' + LP.activity.slice(0, 5).map(function (a) {
        return '<div class="li"><span class="dot-ic ' + a.tone + '">' + ic(a.ic, 18) + '</span><div class="grow"><div class="t" style="font-weight:500">' + LP.esc(a.t) + '</div><div class="s">' + LP.esc(a.s) + '</div></div><span class="small faint nowrap">' + LP.dshort(a.d) + '</span></div>';
      }).join('') + '</div></section>';

    // --- Pedidos em andamento (resumo) ---
    var phaseCount = LP.phases.map(function (ph) { return [ph, open.filter(function (o) { return ph.statuses.indexOf(o.status) > -1; }).length]; });
    var pipe = '<section class="card" aria-labelledby="h-pipe"><div class="card-head"><h2 id="h-pipe">' + ic('bag', 20) + ' Pedidos em andamento</h2><a class="link-btn" href="#/pedidos">Ver todos' + ic('arrow-right', 16) + '</a></div>' +
      '<div class="pipe">' + phaseCount.map(function (x, i) { return '<a class="pipe-step" href="#/pedidos?fase=' + x[0].id + '"><span class="display-num">' + x[1] + '</span><b>' + x[0].name + '</b><span class="small muted">' + x[0].hint + '</span></a>'; }).join('<span class="pipe-arrow">' + ic('chevron-right', 18) + '</span>') + '</div>' +
      '<div class="kv"><span class="k">Saldo a receber dos pedidos abertos</span><span class="v">' + LP.money(open.reduce(function (a, o) { return a + LP.orderBalance(o); }, 0)) + '</span></div></section>';

    var hello = LP.pageHead(greeting() + '!', LP.dlong(LP.TODAY) + ' · você tem <b>' + open.length + ' pedidos em andamento</b>' + (late.length ? ' e <b class="neg">' + late.length + ' atrasado</b>' : '') + '.', '<a class="btn btn-primary" href="#/pedidos/novo">' + ic('plus', 18) + 'Novo pedido</a>');

    return hello + money + '<div class="mt-16"></div>' + quick +
      '<div class="grid g-main-side mt-16"><div class="stack">' + attention + tasksCard + '</div><div class="stack">' + pipe + activity + '</div></div>';
  };

  function overviewEmpty() {
    return LP.pageHead('Bem-vinda ao LaPoli', 'Vamos organizar o ateliê em três passos. Seus dados ficam só neste aparelho.') +
      '<div class="card textured welcome"><div class="grid g-3 steps">' +
      [['1', 'yarn', 'Cadastre uma compra de material', 'Registre fios e enchimento que você já tem. O sistema calcula o custo por grama.', '#/estoque', 'Registrar compra'],
       ['2', 'bear', 'Monte seu primeiro produto', 'Escolha os materiais e as horas de trabalho. Mostramos custo, preço sugerido e lucro.', '#/produtos/novo', 'Cadastrar produto'],
       ['3', 'box', 'Anote o primeiro pedido', 'Cliente, prazo e sinal. O pedido aparece no quadro de produção.', '#/pedidos/novo', 'Novo pedido']].map(function (x) {
        return '<div class="step"><span class="step-n">' + x[0] + '</span>' + LP.ill(x[1]) + '<h3>' + x[2] + '</h3><p class="muted">' + x[3] + '</p><a class="btn btn-secondary" href="' + x[4] + '">' + x[5] + '</a></div>';
      }).join('') + '</div></div>' +
      '<div class="alert alert-info mt-16">' + ic('shield', 20) + '<div class="a-body"><div class="a-title">Seus dados ficam neste aparelho</div><p>Não há conta nem nuvem. Faça backup em Configurações de vez em quando — se o navegador limpar os dados, só o backup traz tudo de volta.</p></div></div>' +
      '<div class="grid g-4 mt-16 keep2">' + ['Faturamento', 'Caixa', 'Lucro'].map(function (k, i) { return '<div class="card metric"><div class="m-top">' + LP.lens(['fat', 'caixa', 'lucro'][i]) + '</div><div class="m-val faint">—</div><div class="m-note">Aparece quando houver pedidos entregues.</div></div>'; }).join('') + '</div>';
  }

  /* ------------------------------------------------------------------
     PRODUTOS — catálogo interno
     ------------------------------------------------------------------ */
  LP.screens.products = function () {
    var s = S();
    var head = LP.pageHead('Produtos', 'Seu catálogo interno: quanto custa produzir cada peça e quanto sobra em cada venda.',
      '<a class="btn btn-primary" href="#/produtos/novo">' + ic('plus', 18) + 'Cadastrar produto</a>');
    if (s.loading) return head + '<div class="grid g-3">' + LP.skeletonCards(6) + '</div>';
    if (s.empty) return head + LP.empty({ ill: 'bear', title: 'Nenhum produto cadastrado', text: 'Cadastre sua primeira peça e descubra quanto custa produzi-la e quanto cobrar para ter lucro.', actions: '<a class="btn btn-primary" href="#/produtos/novo">' + ic('plus', 18) + 'Cadastrar produto</a>' });

    var cats = ['all'].concat(LP.categories);
    var list = LP.products.filter(function (p) {
      if (s.prodStatus === 'active' && !p.active) return false;
      if (s.prodStatus === 'archived' && p.active) return false;
      if (s.prodCat !== 'all' && p.cat !== s.prodCat) return false;
      if (s.prodQ && p.name.toLowerCase().indexOf(s.prodQ.toLowerCase()) < 0) return false;
      return true;
    });
    var alerts = LP.products.filter(function (p) { return p.active && LP.productCost(p).state !== 'ok'; }).length;

    var bar = '<div class="toolbar"><div class="search"><span class="sr-only">Buscar produto</span>' + ic('search', 18) + '<input class="input" type="search" placeholder="Buscar por nome" value="' + LP.esc(s.prodQ) + '" data-input="prod-q" aria-label="Buscar produto por nome"/></div>' +
      '<select class="select tb-select" data-input="prod-status" aria-label="Situação"><option value="active"' + (s.prodStatus === 'active' ? ' selected' : '') + '>Ativos</option><option value="archived"' + (s.prodStatus === 'archived' ? ' selected' : '') + '>Arquivados</option><option value="all"' + (s.prodStatus === 'all' ? ' selected' : '') + '>Todos</option></select>' +
      '<div class="seg" role="group" aria-label="Visualização"><button aria-pressed="' + (s.prodView === 'grid') + '" data-action="set-prodview" data-arg="grid" aria-label="Grade">' + ic('grid', 18) + '<span class="hide-sm">Grade</span></button><button aria-pressed="' + (s.prodView === 'list') + '" data-action="set-prodview" data-arg="list" aria-label="Lista">' + ic('list', 18) + '<span class="hide-sm">Lista</span></button></div></div>' +
      '<div class="chips scroll" role="group" aria-label="Categoria">' + cats.map(function (c) { return '<button class="chip" aria-pressed="' + (s.prodCat === c) + '" data-action="set-prodcat" data-arg="' + c + '">' + (c === 'all' ? 'Todas' : c) + '</button>'; }).join('') + '</div>';

    var banner = alerts ? '<div class="alert alert-warning mt-16">' + ic('alert', 20) + '<div class="a-body"><div class="a-title">' + alerts + ' produto' + (alerts > 1 ? 's' : '') + ' precisa' + (alerts > 1 ? 'm' : '') + ' de ajuste de preço</div><p>Margem abaixo da meta de ' + LP.pct(LP.settings.marginGoal, 0) + ' ou venda com prejuízo. Abra o produto para ver o preço sugerido.</p></div></div>' : '';

    var body;
    if (!list.length) body = '<div class="mt-16">' + LP.empty({ compact: true, ill: 'box', title: 'Nada encontrado', text: 'Tente outra palavra ou limpe os filtros.', actions: '<button class="btn btn-secondary btn-sm" data-action="clear-prod-filters">Limpar filtros</button>' }) + '</div>';
    else if (s.prodView === 'grid') {
      body = '<div class="grid g-3 prod-grid mt-16">' + list.map(function (p) {
        var c = LP.productCost(p);
        return '<article class="card pad-0 clickable prod-card ' + (p.active ? '' : 'is-arch') + '" data-href="#/produtos/' + p.id + '" tabindex="0" role="link" aria-label="' + LP.esc(p.name) + '">' +
          LP.art(p.art, 'wide', true) +
          '<div class="prod-body"><div class="row between"><span class="eyebrow">' + p.cat + '</span>' + (p.active ? '' : LP.badge('Arquivado', 'b-neutral', 'archive')) + '</div>' +
          '<h3>' + LP.esc(p.name) + '</h3>' +
          '<div class="prod-nums"><div><span class="small muted">Preço de venda</span><b class="num">' + LP.money(p.price) + '</b></div><div><span class="small muted">Custo</span><b class="num">' + LP.money(c.total) + '</b></div><div><span class="small muted">Lucro / un.</span><b class="num ' + (c.profit < 0 ? 'neg' : 'pos') + '">' + LP.money(c.profit) + '</b></div></div>' +
          '<div class="row between wrap-sm">' + LP.marginBadge(c.state) + '<span class="num small ' + (c.state === 'ok' ? 'pos' : c.state === 'low' ? 'warn' : 'neg') + '"><b>' + LP.pct(c.margin) + '</b> de margem</span></div>' +
          '</div>' +
          '<div class="prod-act" onclick="event.stopPropagation()">' + LP.menu('pm' + p.id, ic('more', 20), [
            { icon: 'eye', label: 'Ver precificação', action: 'go', arg: '#/produtos/' + p.id },
            { icon: 'pencil', label: 'Editar', action: 'go', arg: '#/produtos/' + p.id + '/editar' },
            { icon: 'copy', label: 'Duplicar', action: 'dup-product', arg: p.id },
            '-',
            { icon: 'archive', label: p.active ? 'Arquivar' : 'Reativar', action: 'archive-product', arg: p.id, danger: p.active }], { btnClass: 'btn btn-secondary btn-icon btn-sm', aria: 'Mais ações de ' + p.name }) + '</div></article>';
      }).join('') + '</div>';
    } else {
      body = '<div class="card pad-0 mt-16"><div class="table-wrap"><table class="table"><thead><tr><th class="mw">Produto</th><th>Categoria</th><th class="right">Preço</th><th class="right">Custo</th><th class="right">Lucro/un.</th><th class="right">Margem</th><th></th></tr></thead><tbody>' + list.map(function (p) {
        var c = LP.productCost(p);
        return '<tr class="click" data-href="#/produtos/' + p.id + '"><td><div class="row">' + LP.art(p.art, 'sm') + '<div><div class="name">' + LP.esc(p.name) + '</div><div class="sub">' + p.size + (p.active ? '' : ' · arquivado') + '</div></div></div></td><td>' + p.cat + '</td><td class="right num">' + LP.money(p.price) + '</td><td class="right num">' + LP.money(c.total) + '</td><td class="right num ' + (c.profit < 0 ? 'neg' : 'pos') + '"><b>' + LP.money(c.profit) + '</b></td><td class="right">' + LP.marginBadge(c.state) + '<div class="small num muted mt-8">' + LP.pct(c.margin) + '</div></td><td class="right" onclick="event.stopPropagation()">' + LP.menu('pl' + p.id, ic('more', 20), [
          { icon: 'pencil', label: 'Editar', action: 'go', arg: '#/produtos/' + p.id + '/editar' }, { icon: 'copy', label: 'Duplicar', action: 'dup-product', arg: p.id }, '-', { icon: 'archive', label: p.active ? 'Arquivar' : 'Reativar', action: 'archive-product', arg: p.id, danger: p.active }], { btnClass: 'btn btn-ghost btn-icon btn-sm', aria: 'Mais ações' }) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    }
    return head + bar + banner + body;
  };

  /* ------------------------------------------------------------------
     PRECIFICAÇÃO DETALHADA (tela 4) — de onde vem cada centavo
     ------------------------------------------------------------------ */
  LP.screens.pricing = function (id) {
    var p = LP.prod(id); if (!p) return LP.pageHead('Produto não encontrado', '');
    var s = S();
    var sim = s.sim && s.sim.id === p.id ? s.sim : (s.sim = { id: p.id, price: p.price, hours: p.hours, rate: LP.settings.hourlyRate, goal: LP.settings.marginGoal });
    var c = LP.productCost(p, { price: sim.price, hours: sim.hours, rate: sim.rate, goal: sim.goal });
    var head = LP.pageHead(LP.esc(p.name), p.cat + ' · ' + p.size + ' · agulha ' + p.needle,
      '<a class="btn btn-secondary" href="#/produtos/' + p.id + '/editar">' + ic('pencil', 18) + 'Editar produto</a><a class="btn btn-primary" href="#/pedidos/novo?produto=' + p.id + '">' + ic('plus', 18) + 'Novo pedido com esta peça</a>');

    // Tabela de materiais
    var mats = '<div class="card pad-0"><div class="card-head" style="padding:20px 24px 0"><h2>' + ic('yarn', 20) + ' Materiais usados</h2>' + LP.tip('O custo unitário vem da média ponderada das suas compras registradas (R$ pago ÷ quantidade comprada).') + '</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th class="mw">Material</th><th class="right">Quantidade</th><th class="right">Custo unitário</th><th class="right">Custo</th></tr></thead><tbody>' +
      c.lines.map(function (l) { return '<tr><td><a class="name" href="#/estoque/' + l.m.id + '" style="color:inherit">' + LP.esc(l.m.name) + '</a></td><td class="right num">' + LP.qty(l.qty, l.unit) + (LP.pkgEq(l.m, l.qty) ? '<div class="sub">≈ ' + LP.pkgEq(l.m, l.qty) + '</div>' : '') + '</td><td class="right num">' + LP.moneyU(l.unitCost) + ' / ' + l.unit + '</td><td class="right num"><b>' + LP.money(l.cost) + '</b></td></tr>'; }).join('') +
      '</tbody><tfoot><tr><td colspan="3">Total de materiais</td><td class="right num">' + LP.money(c.mat) + '</td></tr></tfoot></table></div></div>';

    // Composição do custo
    var parts = [['Materiais', c.mat, 'var(--color-secondary)'], ['Mão de obra', c.labor, 'var(--color-primary)'], ['Outros custos', c.other, 'var(--color-warning-light)']];
    var comp = '<div class="card"><div class="card-head"><h2>' + ic('calculator', 20) + ' Como o custo é montado</h2></div>' +
      '<div class="compbar" role="img" aria-label="Composição do custo">' + parts.map(function (x) { return '<i style="width:' + (x[1] / c.total * 100) + '%;background:' + x[2] + '" title="' + x[0] + '"></i>'; }).join('') + '</div>' +
      '<div class="stack-sm mt-16">' + parts.map(function (x) { return '<div class="kv"><span class="k"><i class="sw" style="background:' + x[2] + '"></i>' + x[0] + (x[0] === 'Mão de obra' ? ' <span class="faint small">' + LP.num(c.hours, 1) + ' h × ' + LP.money(c.rate) + '</span>' : '') + (x[0] === 'Outros custos' ? ' <span class="faint small">' + LP.esc(p.otherNote) + '</span>' : '') + '</span><span class="v">' + LP.money(x[1]) + ' <span class="faint small">' + LP.pct(x[1] / c.total * 100, 0) + '</span></span></div>'; }).join('') +
      '<div class="kv total"><span class="k"><b>Custo total de produção</b></span><span class="v"><b>' + LP.money(c.total) + '</b></span></div></div></div>';

    // Hero: preço recomendado + lucro
    var stateCls = c.state === 'ok' ? 'ok' : (c.state === 'low' ? 'low' : 'loss');
    var hero = '<div class="card price-hero ' + stateCls + '" id="sim-hero">' + simHero(p, c, sim) + '</div>';

    // Simulador
    var simCard = '<div class="card" id="sim-controls"><div class="card-head"><h2>' + ic('sliders', 20) + ' Simule outros valores</h2><button class="link-btn" data-action="sim-reset">Voltar aos valores do produto</button></div>' +
      '<div class="stack">' +
      '<div class="field"><label for="sim-price">Preço de venda <output id="o-price" class="prim num">' + LP.money(sim.price) + '</output></label><input id="sim-price" type="range" min="' + Math.floor(c.total * .6) + '" max="' + Math.ceil(c.total * 2.4) + '" step="0.5" value="' + sim.price + '" data-input="sim-price" aria-describedby="sim-price-help"/><span id="sim-price-help" class="help">Arraste para ver o efeito no lucro e na margem.</span></div>' +
      '<div class="field"><label for="sim-hours">Horas de trabalho <output id="o-hours" class="prim num">' + LP.num(sim.hours, 1) + ' h</output></label><input id="sim-hours" type="range" min="0.5" max="14" step="0.5" value="' + sim.hours + '" data-input="sim-hours"/></div>' +
      '<div class="field"><label for="sim-rate">Valor da sua hora <output id="o-rate" class="prim num">' + LP.money(sim.rate) + '</output></label><input id="sim-rate" type="range" min="5" max="50" step="1" value="' + sim.rate + '" data-input="sim-rate"/></div>' +
      '</div><div class="price-chips mt-16" id="sim-chips">' + simChips(p, c) + '</div></div>';

    var fx = '<div class="card sand flat pad-sm formula"><b>' + ic('info', 16) + ' Margem não é markup.</b> <span>Margem = lucro ÷ <u>preço de venda</u>. O preço sugerido é <b>custo ÷ (1 − margem)</b>: com meta de <b class="num">' + LP.pct(c.goal, 0) + '</b>, custo de <b class="num">' + LP.money(c.total) + '</b> ÷ <b class="num">' + LP.num(1 - c.goal / 100, 2) + '</b> = <b class="num">' + LP.money(c.suggested) + '</b>.</span></div>';

    return head + '<div class="grid g-main-side"><div class="stack">' + hero + mats + fx + '</div><div class="stack">' + LP.art(p.art, 'wide', true) + comp + simCard + (p.notes ? '<div class="card sand flat pad-sm"><span class="eyebrow">Observações de produção</span><p class="mt-8">' + LP.esc(p.notes) + '</p></div>' : '') + '</div></div>';
  };

  function simHero(p, c, sim) {
    var diff = sim.price - c.suggested;
    var msg = c.state === 'loss' ? ['alert-error', 'alert', 'Você perde ' + LP.money(Math.abs(c.profit)) + ' a cada peça vendida', 'Com este preço o valor não cobre o custo de produção. O mínimo para não perder é ' + LP.money(c.total) + '; para atingir a meta, ' + LP.money(c.suggested) + '.']
      : c.state === 'low' ? ['alert-warning', 'alert', 'Margem de ' + LP.pct(c.margin) + ', abaixo da meta de ' + LP.pct(c.goal, 0), 'Para chegar à meta, cobre ' + LP.money(c.suggested) + ' (' + LP.money(c.suggested - sim.price) + ' a mais) ou reduza o tempo de produção.']
      : ['alert-success', 'check-circle', 'Margem saudável', 'Você está ' + (diff >= 0 ? LP.money(diff) + ' acima' : LP.money(Math.abs(diff)) + ' abaixo') + ' do preço sugerido e dentro da meta.'];
    return '<div class="hero-grid"><div><span class="eyebrow">Preço recomendado</span><div class="display-num hero-price">' + LP.money(c.suggested) + '</div><p class="muted small">para ' + LP.pct(c.goal, 0) + ' de margem · custo ' + LP.money(c.total) + '</p></div>' +
      '<div><span class="eyebrow">Você cobra</span><div class="display-num hero-sub">' + LP.money(sim.price) + '</div><p class="muted small">preço de venda</p></div>' +
      '<div><span class="eyebrow">Lucro por peça</span><div class="display-num hero-sub ' + (c.profit < 0 ? 'neg' : 'pos') + '">' + LP.money(c.profit) + '</div><p class="muted small">margem <b class="num">' + LP.pct(c.margin) + '</b></p></div></div>' +
      '<div class="marginmeter" role="img" aria-label="Margem ' + LP.pct(c.margin) + ' contra meta ' + LP.pct(c.goal, 0) + '"><div class="bar ' + (c.state === 'ok' ? '' : c.state === 'low' ? 'warn' : 'err') + '"><i style="width:' + Math.max(0, Math.min(100, c.margin / 50 * 100)) + '%"></i><span class="mark" style="left:' + (c.goal / 50 * 100) + '%"></span></div><div class="row between small muted"><span>0%</span><span style="margin-left:' + Math.max(0, c.goal / 50 * 100 - 16) + '%">meta ' + LP.pct(c.goal, 0) + '</span><span>50%</span></div></div>' +
      '<div class="alert ' + msg[0] + ' mt-16">' + ic(msg[1], 20) + '<div class="a-body"><div class="a-title">' + msg[2] + '</div><p>' + msg[3] + '</p></div></div>';
  }
  function simChips(p, c) {
    var opts = [['Custo (sem lucro)', c.total], ['Meta ' + LP.pct(c.goal, 0), c.suggested], ['Meta + 10 pts', c.total / (1 - (c.goal + 10) / 100)], ['Arredondado', Math.ceil(c.suggested / 5) * 5 - .1]];
    return '<span class="small muted" style="display:block;margin-bottom:8px">Experimentar um preço:</span><div class="chips">' + opts.map(function (o) { return '<button class="chip" data-action="sim-set-price" data-arg="' + o[1].toFixed(2) + '">' + o[0] + ' · <b class="num">' + LP.money(o[1]) + '</b></button>'; }).join('') + '</div>';
  }
  LP.hooks.simUpdate = function () {
    var s = S(), sim = s.sim, p = LP.prod(sim.id);
    var c = LP.productCost(p, { price: sim.price, hours: sim.hours, rate: sim.rate, goal: sim.goal });
    var hero = document.getElementById('sim-hero');
    hero.className = 'card price-hero ' + (c.state === 'ok' ? 'ok' : c.state === 'low' ? 'low' : 'loss');
    hero.innerHTML = simHero(p, c, sim);
    document.getElementById('o-price').textContent = LP.money(sim.price);
    document.getElementById('o-hours').textContent = LP.num(sim.hours, 1) + ' h';
    document.getElementById('o-rate').textContent = LP.money(sim.rate);
    document.getElementById('sim-chips').innerHTML = simChips(p, c);
    ['sim-price', 'sim-hours', 'sim-rate'].forEach(function (id) { var el = document.getElementById(id); el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); });
  };

  /* ------------------------------------------------------------------
     CADASTRO / EDIÇÃO DE PRODUTO (tela 3) com resumo de precificação ao vivo
     ------------------------------------------------------------------ */
  LP.screens.productForm = function (id) {
    var p = id ? LP.prod(id) : null;
    var s = S();
    var f = s.pf && s.pf.id === (id || 'new') ? s.pf : (s.pf = {
      id: id || 'new', name: p ? p.name : '', cat: p ? p.cat : 'Amigurumi', size: p ? p.size : '', needle: p ? p.needle : '', hours: p ? p.hours : 0, rate: LP.settings.hourlyRate,
      other: p ? p.other : 0, price: p ? p.price : 0, mats: p ? p.mats.map(function (m) { return m.slice(); }) : [], art: p ? p.art : 'novelo', desc: p ? p.desc : '', notes: p ? p.notes : '', goal: LP.settings.marginGoal
    });
    var title = p ? 'Editar ' + LP.esc(p.name) : 'Novo produto';
    var head = LP.pageHead(title, 'Preencha o que souber. O resumo ao lado se atualiza a cada valor digitado.',
      '<a class="btn btn-secondary" href="' + (p ? '#/produtos/' + p.id : '#/produtos') + '">Cancelar</a><button class="btn btn-primary" data-action="save-product">' + ic('check', 18) + 'Salvar produto</button>');

    var catOpts = LP.categories.map(function (c) { return '<option' + (c === f.cat ? ' selected' : '') + '>' + c + '</option>'; }).join('');
    var section = function (n, t, body, hint) { return '<section class="card form-sec"><div class="sec-head"><span class="step-n sm">' + n + '</span><div><h2>' + t + '</h2>' + (hint ? '<p class="small muted">' + hint + '</p>' : '') + '</div></div>' + body + '</section>'; };

    var basics = section(1, 'A peça', '<div class="form-grid">' +
      '<div class="field full"><label>Fotografia</label><div class="photo-drop">' + LP.art(f.art, 'md') + '<div><b>Foto da peça</b><p class="small muted">No app, você tira a foto ou escolhe da galeria. Fica salva só neste aparelho.</p><button class="btn btn-secondary btn-sm mt-8" data-action="fake-photo">' + ic('image', 16) + 'Escolher foto</button></div></div></div>' +
      LP.field('Nome da peça', '<input id="f-name" class="input" data-input="pf-name" value="' + LP.esc(f.name) + '" placeholder="Ex.: Amigurumi de capivara"/>', { for: 'f-name', cls: 'full' }) +
      LP.field('Categoria', '<select id="f-cat" class="select" data-input="pf-cat">' + catOpts + '</select>', { for: 'f-cat' }) +
      LP.field('Tamanho', '<input id="f-size" class="input" data-input="pf-size" value="' + LP.esc(f.size) + '" placeholder="Ex.: 22 cm"/>', { for: 'f-size', opt: true }) +
      LP.field('Descrição', '<textarea id="f-desc" class="textarea" data-input="pf-desc" placeholder="Como é a peça, para quem costuma ser, o que pode personalizar…">' + LP.esc(f.desc) + '</textarea>', { for: 'f-desc', cls: 'full', opt: true }) + '</div>');

    var matsHtml = '<div id="pf-mats">' + pfMats(f) + '</div>';
    var materials = section(2, 'Materiais usados', matsHtml, 'Escolha do estoque e informe a quantidade. O custo vem das suas compras.');

    var time = section(3, 'Tempo e custos extras', '<div class="form-grid">' +
      LP.field('Tempo estimado', '<div class="input-group"><input id="f-hours" class="input num-in" type="number" step="0.5" min="0" inputmode="decimal" data-input="pf-hours" value="' + f.hours + '"/><span class="suffix">horas</span></div>', { for: 'f-hours' }) +
      LP.field('Valor da hora de trabalho', '<div class="input-group"><span class="prefix">R$</span><input id="f-rate" class="input money" type="number" step="0.5" min="0" inputmode="decimal" data-input="pf-rate" value="' + f.rate + '"/></div>', { for: 'f-rate', help: 'Padrão das Configurações. Pode mudar só para este produto.' }) +
      LP.field('Outros custos', '<div class="input-group"><span class="prefix">R$</span><input id="f-other" class="input money" type="number" step="0.1" min="0" inputmode="decimal" data-input="pf-other" value="' + f.other + '"/></div>', { for: 'f-other', help: 'Embalagem, etiqueta, caixa de presente…', cls: 'full' }) + '</div>');

    var price = section(4, 'Preço de venda', '<div class="form-grid">' +
      LP.field('Preço sugerido', '<div class="input-group"><span class="prefix">R$</span><input class="input money" id="f-sug" readonly value="" aria-readonly="true"/></div>', { for: 'f-sug', help: 'Calculado pela sua meta de margem.' }) +
      LP.field('Preço que você pratica', '<div class="input-group"><span class="prefix">R$</span><input id="f-price" class="input money" type="number" step="0.1" min="0" inputmode="decimal" data-input="pf-price" value="' + f.price + '"/></div>', { for: 'f-price' }) +
      LP.field('Meta de margem para este produto', '<div class="input-group"><input id="f-goal" class="input num-in" type="number" min="1" max="90" inputmode="decimal" data-input="pf-goal" value="' + f.goal + '"/><span class="suffix">%</span></div>', { for: 'f-goal', help: 'Padrão: ' + LP.settings.marginGoal + '% (Configurações).' }) +
      LP.field('Observações de produção', '<textarea id="f-notes" class="textarea" data-input="pf-notes" placeholder="Dicas de montagem, cuidados, medidas…">' + LP.esc(f.notes) + '</textarea>', { for: 'f-notes', cls: 'full', opt: true }) + '</div>');

    var summary = '<aside class="card summary" id="pf-summary" aria-live="polite" aria-label="Resumo de precificação">' + pfSummary(f) + '</aside>';
    return head + '<div class="grid g-main-side pf"><div class="stack">' + basics + materials + time + price + '</div>' + summary + '</div>' +
      '<div class="mobile-summary" id="pf-mini"></div>';
  };
  function pfMats(f) {
    var rows = f.mats.map(function (r, i) {
      var m = LP.mat(r[0]), st = LP.matStats(m);
      return '<div class="mat-row"><div class="mr-name"><b>' + LP.esc(m.name) + '</b><span class="small muted">' + LP.moneyU(st.avg) + ' / ' + m.unit + '</span><span class="small prim" id="mu' + i + '">' + LP.pkgNote(m, r[1]) + '</span></div>' +
        '<div class="input-group mr-qty"><input class="input num-in" type="number" min="0" step="1" inputmode="decimal" value="' + r[1] + '" data-input="pf-qty" data-i="' + i + '" aria-label="Quantidade de ' + LP.esc(m.name) + '"/><span class="suffix">' + m.unit + '</span></div>' +
        '<b class="num mr-cost" id="mc' + i + '">' + LP.money(r[1] * st.avg) + '</b>' +
        '<button class="btn btn-ghost btn-icon btn-sm" data-action="pf-del-mat" data-arg="' + i + '" aria-label="Remover ' + LP.esc(m.name) + '">' + ic('x', 18) + '</button></div>';
    }).join('');
    var used = f.mats.map(function (r) { return r[0]; });
    var avail = LP.materials.filter(function (m) { return used.indexOf(m.id) < 0; });
    return (rows || '<p class="muted" style="padding:8px 0">Nenhum material adicionado ainda.</p>') +
      '<div class="mat-add"><select class="select" id="pf-add-sel" aria-label="Adicionar material"><option value="">+ Adicionar material do estoque…</option>' + avail.map(function (m) { return '<option value="' + m.id + '">' + LP.esc(m.name) + '</option>'; }).join('') + '</select></div>';
  }
  function pfSummary(f) {
    var c = LP.productCost({ hours: f.hours, other: f.other, price: f.price, mats: f.mats }, { hours: +f.hours || 0, rate: +f.rate || 0, other: +f.other || 0, price: +f.price || 0, mats: f.mats, goal: +f.goal || 30 });
    var st = c.total <= 0 ? 'none' : c.state;
    var rows = [['Materiais', c.mat], ['Mão de obra', c.labor], ['Outros custos', c.other]];
    var msg = c.total <= 0 ? ['alert-neutral', 'info', 'Adicione materiais e horas', 'O resumo aparece aqui conforme você preenche.'] :
      !f.price ? ['alert-info', 'info', 'Defina o preço de venda', 'Sugestão para ' + LP.pct(c.goal, 0) + ' de margem: ' + LP.money(c.suggested) + '.'] :
      st === 'loss' ? ['alert-error', 'alert', 'Venda com prejuízo', 'Cada peça vendida perde ' + LP.money(Math.abs(c.profit)) + '. Cobre pelo menos ' + LP.money(c.total) + '.'] :
      st === 'low' ? ['alert-warning', 'alert', 'Margem abaixo da meta', 'Meta de ' + LP.pct(c.goal, 0) + '. Preço sugerido: ' + LP.money(c.suggested) + '.'] :
      ['alert-success', 'check-circle', 'Margem saudável', 'Acima da meta de ' + LP.pct(c.goal, 0) + '.'];
    return '<div class="card-head"><h2>' + ic('calculator', 20) + ' Resumo de precificação</h2></div>' +
      '<div class="stack-sm">' + rows.map(function (r) { return '<div class="kv"><span class="k">' + r[0] + '</span><span class="v">' + LP.money(r[1]) + '</span></div>'; }).join('') +
      '<div class="kv total"><span class="k"><b>Custo total estimado</b></span><span class="v"><b>' + LP.money(c.total) + '</b></span></div></div>' +
      '<div class="sum-price"><div><span class="small muted">Preço de venda</span><div class="display-num" style="font-size:28px">' + LP.money(c.price) + '</div></div><div class="right"><span class="small muted">Lucro por peça</span><div class="display-num ' + (c.profit < 0 ? 'neg' : 'pos') + '" style="font-size:28px">' + LP.money(c.profit) + '</div></div></div>' +
      '<div class="marginmeter mt-16"><div class="row between small"><span class="muted">Margem</span><b class="num ' + (st === 'ok' ? 'pos' : st === 'low' ? 'warn' : st === 'loss' ? 'neg' : '') + '">' + LP.pct(c.margin) + '</b></div><div class="bar ' + (st === 'ok' ? '' : st === 'low' ? 'warn' : 'err') + ' mt-8"><i style="width:' + Math.max(0, Math.min(100, c.margin / 50 * 100)) + '%"></i><span class="mark" style="left:' + (c.goal / 50 * 100) + '%"></span></div><div class="small muted mt-8">Meta: ' + LP.pct(c.goal, 0) + '</div></div>' +
      '<div class="alert ' + msg[0] + ' mt-16">' + ic(msg[1], 20) + '<div class="a-body"><div class="a-title">' + msg[2] + '</div><p>' + msg[3] + '</p></div></div>' +
      '<p class="small muted mt-16">' + ic('info', 14) + ' Margem = lucro ÷ preço de venda (não é markup).</p>';
  }
  LP.hooks.pfUpdate = function () {
    var f = S().pf;
    var el = document.getElementById('pf-summary'); if (el) el.innerHTML = pfSummary(f);
    var sug = document.getElementById('f-sug');
    var c = LP.productCost({ hours: f.hours, other: f.other, price: f.price, mats: f.mats }, { hours: +f.hours || 0, rate: +f.rate || 0, other: +f.other || 0, price: +f.price || 0, mats: f.mats, goal: +f.goal || 30 });
    if (sug) sug.value = c.total > 0 ? c.suggested.toFixed(2).replace('.', ',') : '';
    f.mats.forEach(function (r, i) { var e = document.getElementById('mc' + i); if (e) e.textContent = LP.money(r[1] * LP.matStats(LP.mat(r[0])).avg); var u = document.getElementById('mu' + i), mm = LP.mat(r[0]); if (u) u.textContent = LP.pkgNote(mm, r[1]); });
    var mini = document.getElementById('pf-mini');
    if (mini) mini.innerHTML = '<div><span class="small muted">Custo</span><b class="num">' + LP.money(c.total) + '</b></div><div><span class="small muted">Lucro</span><b class="num ' + (c.profit < 0 ? 'neg' : 'pos') + '">' + LP.money(c.profit) + '</b></div><div><span class="small muted">Margem</span><b class="num">' + LP.pct(c.margin) + '</b></div>';
  };
  LP.hooks.pfMats = function () { var el = document.getElementById('pf-mats'); if (el) el.innerHTML = pfMats(S().pf); LP.hooks.pfUpdate(); };
})();
