/* ==========================================================================
   Módulos complementares: Clientes · Financeiro · Movimentações · Relatórios · Configurações
   ========================================================================== */
(function () {
  var LP = window.LP, ic = LP.icon, S = function () { return LP.S; };
  LP.screens = LP.screens || {}; LP.hooks = LP.hooks || {}; LP.act = LP.act || {};

  function periodSeg(s, action) {
    return '<div class="seg" role="group" aria-label="Período">' + [['month', 'Este mês'], ['last', 'Mês passado'], ['7d', '7 dias']].map(function (x) { return '<button aria-pressed="' + (s.period === x[0]) + '" data-action="' + (action || 'set-period') + '" data-arg="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }

  /* ------------------------------------------------------------------
     CLIENTES
     ------------------------------------------------------------------ */
  LP.screens.clients = function () {
    var s = S();
    var head = LP.pageHead('Clientes', 'Quem compra de você, o que já encomendou e o que ainda falta receber.', '<button class="btn btn-primary" data-action="new-client">' + ic('user-plus', 18) + 'Nova cliente</button>');
    if (s.loading) return head + '<div class="grid g-3">' + LP.skeletonCards(6) + '</div>';
    if (s.empty) return head + LP.empty({ ill: 'users', title: 'Nenhuma cliente cadastrada', text: 'As clientes aparecem aqui conforme você cria pedidos. Você também pode cadastrar uma agora.', actions: '<button class="btn btn-primary" data-action="new-client">' + ic('user-plus', 18) + 'Nova cliente</button>' });
    var q = (s.clientQ || '').toLowerCase();
    var list = LP.clients.filter(function (c) { return !q || c.name.toLowerCase().indexOf(q) > -1; }).map(function (c) { return [c, LP.clientStats(c.name)]; }).sort(function (a, b) { return (b[1].pending - a[1].pending) || (b[1].bought - a[1].bought); });
    var pending = list.reduce(function (a, x) { return a + x[1].pending; }, 0);
    var bar = '<div class="toolbar"><div class="search">' + ic('search', 18) + '<input class="input" type="search" placeholder="Buscar cliente" value="' + LP.esc(s.clientQ || '') + '" data-input="client-q" aria-label="Buscar cliente"/></div></div>';
    var sum = '<div class="grid g-3 keep2 mini-metrics mb-16"><div class="card metric"><div class="m-label">Clientes</div><div class="m-val">' + LP.clients.length + '</div></div><div class="card metric"><div class="m-label">Com pedido em andamento</div><div class="m-val">' + list.filter(function (x) { return x[1].open.length; }).length + '</div></div><div class="card metric"><div class="m-label">Saldo a receber</div><div class="m-val">' + LP.money(pending) + '</div></div></div>';
    var cards = '<div class="grid g-3 mt-16">' + list.map(function (x) {
      var c = x[0], st = x[1];
      return '<a class="card clickable client-card" href="#/clientes/' + encodeURIComponent(c.name) + '"><div class="row"><span class="avatar">' + LP.initials(c.name) + '</span><div class="grow"><b>' + LP.esc(c.name) + '</b><div class="small muted">' + c.phone + '</div></div>' + ic('chevron-right', 18, 'faint') + '</div>' +
        '<div class="grid g-2 keep2 mt-16" style="gap:10px"><div><span class="small muted">Já comprou</span><div class="num"><b>' + (st.bought ? LP.money(st.bought) : '—') + '</b></div></div><div><span class="small muted">Pedidos</span><div class="num"><b>' + st.count + '</b></div></div></div>' +
        '<div class="row-wrap mt-16">' + (st.open.length ? LP.badge(st.open.length + ' em andamento', 'b-primary', 'clock') : LP.badge('Sem pedidos abertos', 'b-neutral')) + (st.pending > 0.01 ? LP.badge('Saldo ' + LP.money(st.pending), 'b-warning', 'wallet') : '') + '</div></a>';
    }).join('') + '</div>';
    return head + sum + bar + (list.length ? cards : '<div class="mt-16">' + LP.empty({ compact: true, ill: 'users', title: 'Ninguém com esse nome', text: 'Confira a grafia ou cadastre uma nova cliente.' }) + '</div>');
  };
  LP.screens.client = function (name) {
    name = decodeURIComponent(name);
    var c = LP.clients.filter(function (x) { return x.name === name; })[0]; if (!c) return LP.pageHead('Cliente não encontrada', '');
    var st = LP.clientStats(name);
    var head = LP.pageHead(LP.esc(c.name), 'Cliente desde ' + LP.dfull(c.first) + ' · ' + c.phone, '<button class="btn btn-secondary" data-action="client-wa" data-arg="' + LP.esc(c.name) + '">' + ic('chat', 18) + 'WhatsApp</button><a class="btn btn-primary" href="#/pedidos/novo?cliente=' + encodeURIComponent(c.name) + '">' + ic('plus', 18) + 'Novo pedido</a>');
    var left = '<div class="stack"><div class="card"><div class="row"><span class="avatar lg">' + LP.initials(c.name) + '</span><div><b style="font-size:18px">' + LP.esc(c.name) + '</b><div class="small muted">' + c.phone + '</div></div></div><div class="stack-sm mt-16"><div class="kv"><span class="k">Primeiro pedido</span><span class="v">' + LP.dfull(c.first) + '</span></div><div class="kv"><span class="k">Total já comprado</span><span class="v">' + (st.bought ? LP.money(st.bought) : '—') + '</span></div><div class="kv"><span class="k">Pedidos</span><span class="v">' + st.count + '</span></div><div class="kv"><span class="k">Em andamento</span><span class="v">' + st.open.length + '</span></div><div class="kv"><span class="k"><b>Saldo pendente</b></span><span class="v ' + (st.pending > 0.01 ? 'warn' : '') + '"><b>' + (st.pending > 0.01 ? LP.money(st.pending) : '—') + '</b></span></div></div></div>' +
      '<div class="card"><div class="card-head"><h3>' + ic('heart', 18) + ' Preferências e observações</h3></div><textarea class="textarea" aria-label="Preferências">' + LP.esc(c.prefs) + '</textarea><p class="small muted mt-8">Gostos, tamanhos, datas importantes. Só você vê.</p></div></div>';
    var right = '<div class="card pad-0"><div class="card-head" style="padding:20px 24px 0"><h2>' + ic('bag', 20) + ' Histórico de encomendas</h2></div><div class="rows" style="padding:0 12px 12px">' + st.orders.map(function (o) {
      return '<a class="li click" href="#/pedidos/' + o.id + '">' + LP.art(LP.orderArt(o), 'sm') + '<div class="grow"><div class="t">#' + o.id + ' · ' + LP.esc(LP.orderName(o)) + (o.qty > 1 ? ' × ' + o.qty : '') + '</div><div class="s">' + LP.dfull(o.created) + '</div></div><div class="right">' + LP.statusBadge(o.status) + '<div class="num small mt-8"><b>' + LP.money(o.total) + '</b></div></div></a>';
    }).join('') + '</div></div>';
    return head + '<div class="grid g-side-main">' + left + right + '</div>';
  };
  LP.act['new-client'] = function () {
    LP.openModal({ title: 'Nova cliente', body: '<div class="form-grid">' + LP.field('Nome', '<input id="nc-n" class="input" placeholder="Nome e sobrenome"/>', { for: 'nc-n', cls: 'full' }) + LP.field('WhatsApp ou telefone', '<input id="nc-p" class="input" inputmode="tel" placeholder="(00) 90000-0000"/>', { for: 'nc-p', cls: 'full' }) + LP.field('Preferências', '<textarea id="nc-pr" class="textarea" placeholder="Cores, tamanhos, datas importantes…"></textarea>', { for: 'nc-pr', cls: 'full', opt: true }) + '</div>', foot: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-client">Salvar</button>' });
  };
  LP.act['save-client'] = function () {
    var n = document.getElementById('nc-n').value.trim(); if (n.length < 2) { LP.toast('Informe o nome', { type: 'err' }); return; }
    LP.clients.push({ name: n, phone: document.getElementById('nc-p').value || '(00) 90000-0000', first: LP.iso(LP.TODAY), prefs: document.getElementById('nc-pr').value });
    LP.closeModal(); LP.render(); LP.toast('Cliente cadastrada', { sub: n });
  };
  LP.act['client-wa'] = function () { LP.toast('No app, abriria o WhatsApp da cliente', { type: 'info', sub: 'No protótipo nada é aberto ou enviado.' }); };

  /* ------------------------------------------------------------------
     FINANCEIRO — duas camadas: caixa x resultado
     ------------------------------------------------------------------ */
  function catSums(entries, type) {
    var m = {}; entries.filter(function (e) { return e.type === type; }).forEach(function (e) { m[e.cat] = (m[e.cat] || 0) + e.amount; });
    return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }
  function hbars(rows, color, total) {
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; })) || 1;
    return rows.map(function (r) { return '<div class="hbar"><span class="lbl" title="' + LP.esc(r[0]) + '">' + LP.esc(r[0]) + '</span><div class="bar" style="height:10px"><i style="width:' + (r[1] / max * 100) + '%;background:' + color + '"></i></div><span class="val num">' + LP.money(r[1]) + '</span></div>'; }).join('');
  }
  LP.screens.finance = function () {
    var s = S();
    var head = LP.pageHead('Financeiro', 'Duas visões do mesmo ateliê: o dinheiro que se mexeu e o que realmente sobrou.',
      '<a class="btn btn-secondary" href="#/financeiro/movimentacoes">' + ic('list', 18) + 'Movimentações</a><button class="btn btn-primary" data-action="open-move" data-arg="in">' + ic('plus', 18) + 'Lançar</button>');
    if (s.loading) return head + '<div class="grid g-3">' + LP.skeletonCards(3) + '</div>';
    if (s.empty) return head + LP.empty({ ill: 'wallet', title: 'Ainda não há movimentações', text: 'Quando você registrar compras, receber sinais ou lançar despesas, o caixa e o resultado do ateliê aparecem aqui. Sem dados, nada é inventado.', actions: '<button class="btn btn-primary" data-action="open-move" data-arg="in">' + ic('plus', 18) + 'Lançar movimentação</button>' }) +
      '<div class="grid g-2 mt-16"><div class="card flat metric">' + LP.lens('caixa') + '<div class="m-val faint mt-8">—</div><div class="m-note">Saldo de caixa: informe o saldo inicial em Configurações.</div></div><div class="card flat metric">' + LP.lens('lucro') + '<div class="m-val faint mt-8">—</div><div class="m-note">Lucro: precisa de ao menos um pedido entregue.</div></div></div>';
    var p = LP.period(s.period), cash = LP.cash(p), res = LP.result(p);
    var tab = s.finTab;
    var layer = '<div class="layer-switch" role="tablist" aria-label="Escolha a visão">' +
      '<button role="tab" aria-selected="' + (tab === 'caixa') + '" data-action="set-fintab" data-arg="caixa" class="ls ls-caixa"><span class="dot-ic s">' + ic('wallet', 22) + '</span><span><b>Fluxo de caixa</b><span class="small muted" style="display:block">Dinheiro que entrou e saiu de verdade</span></span></button>' +
      '<button role="tab" aria-selected="' + (tab === 'resultado') + '" data-action="set-fintab" data-arg="resultado" class="ls ls-res"><span class="dot-ic p">' + ic('chart', 22) + '</span><span><b>Resultado do negócio</b><span class="small muted" style="display:block">O que o ateliê realmente ganhou</span></span></button></div>';
    var sub = '<div class="row between wrap-sm mt-16"><span class="eyebrow">' + LP.esc(p.label) + '</span>' + periodSeg(s, 'set-period') + '</div>';
    var body = tab === 'caixa' ? cashView(s, p, cash, res) : resultView(s, p, res, cash);
    return head + layer + sub + body + bridge(p, cash, res);
  };

  function cashView(s, p, cash, res) {
    var pts = LP.cashSeries(p);
    var metrics = '<div class="grid g-4 keep2 mt-16">' +
      '<div class="card metric"><div class="m-top"><span class="m-label">Saldo de caixa ' + LP.dshort(p.end) + '</span>' + LP.lens('caixa') + '</div><div class="m-val">' + LP.money(cash.balance) + '</div><div class="m-note">Começou o período com ' + LP.money(cash.opening) + '.</div></div>' +
      '<div class="card metric"><div class="m-top"><span class="m-label">Entradas</span>' + ic('arrow-down-left', 20, 'pos') + '</div><div class="m-val pos">' + LP.money(cash.inn) + '</div><div class="m-note">Sinais e saldos recebidos.</div></div>' +
      '<div class="card metric"><div class="m-top"><span class="m-label">Saídas</span>' + ic('arrow-up-right', 20, 'neg') + '</div><div class="m-val">' + LP.money(cash.out) + '</div><div class="m-note">Compras ' + LP.money(cash.buy) + ' · despesas ' + LP.money(cash.op) + '.</div></div>' +
      '<div class="card metric"><div class="m-top"><span class="m-label">Variação no período</span>' + LP.tip('Entradas menos saídas. Não é lucro: inclui sinais de pedidos ainda não entregues e material comprado que ainda não foi usado.') + '</div><div class="m-val ' + (cash.net < 0 ? 'neg' : 'pos') + '">' + (cash.net >= 0 ? '+' : '') + LP.money(cash.net) + '</div><div class="m-note">Não é o lucro.</div></div></div>';
    var chart = '<div class="card mt-16"><div class="card-head"><h2>' + ic('trending-up', 20) + ' Evolução do caixa</h2><span class="badge b-success">Dados reais</span></div>' + (pts.length > 1 ? LP.lineChart(pts, { label: 'Saldo de caixa no período' }) : LP.empty({ compact: true, ill: 'chart', title: 'Poucos dias para desenhar', text: 'Escolha um período maior.' })) + '</div>';
    var ins = catSums(cash.entries, 'in'), outs = catSums(cash.entries, 'out');
    var flows = '<div class="grid g-2 mt-16"><div class="card"><div class="card-head"><h3>Entradas por origem</h3></div>' + (ins.length ? hbars(ins, 'var(--color-secondary)') : '<p class="muted">Sem entradas no período.</p>') + '</div><div class="card"><div class="card-head"><h3>Saídas por categoria</h3></div>' + (outs.length ? hbars(outs, 'var(--color-primary-light)') : '<p class="muted">Sem saídas no período.</p>') + '</div></div>';
    var fi = LP.forecastIn(), fiT = fi.reduce(function (a, x) { return a + x.amount; }, 0);
    var prev = '<div class="card mt-16"><div class="card-head"><h2>' + ic('clock', 20) + ' A receber ' + LP.lens('prev') + '</h2><span class="num"><b>' + LP.money(fiT) + '</b></span></div><p class="small muted" style="margin:-8px 0 8px">Dinheiro combinado, mas que ainda não entrou. Não está no saldo acima.</p><div class="rows">' + fi.slice(0, 5).map(function (x) { return '<a class="li click" href="#/pedidos/' + x.link.id + '" style="padding:12px"><span class="dot-ic ' + (x.late ? 'e' : 'n') + '">' + ic('clock', 18) + '</span><div class="grow"><div class="t" style="font-weight:500">' + LP.esc(x.desc) + '</div><div class="s">' + x.cat + ' · ' + LP.dshort(x.d) + (x.late ? ' · <span class="neg">atrasado</span>' : '') + '</div></div><b class="num">' + LP.money(x.amount) + '</b></a>'; }).join('') + '</div>' + (fi.length > 5 ? '<p class="small muted mt-8">+ ' + (fi.length - 5) + ' valores a receber. <a href="#/financeiro/movimentacoes">Ver todos</a></p>' : '') + '</div>';
    var last = '<div class="card mt-16 pad-0"><div class="card-head" style="padding:20px 24px 0"><h2>' + ic('history', 20) + ' Últimas movimentações</h2><a class="link-btn" href="#/financeiro/movimentacoes">Ver todas' + ic('arrow-right', 16) + '</a></div><div class="rows" style="padding:0 12px 8px">' + cash.entries.slice(0, 5).map(moveRow).join('') + '</div></div>';
    return metrics + chart + flows + prev + last;
  }
  function moveRow(e) {
    return '<div class="li" style="padding:12px"><span class="dot-ic ' + (e.type === 'in' ? 's' : 'n') + '">' + ic(e.type === 'in' ? 'arrow-down-left' : 'arrow-up-right', 18) + '</span><div class="grow"><div class="t" style="font-weight:500">' + LP.esc(e.desc) + '</div><div class="s">' + LP.dshort(e.d) + ' · ' + LP.esc(e.cat) + ' · ' + LP.esc(e.method || '') + '</div></div><b class="num ' + (e.type === 'in' ? 'pos' : '') + '">' + (e.type === 'in' ? '+' : '−') + LP.money(e.amount) + '</b></div>';
  }

  function resultView(s, p, res, cash) {
    var prevKey = s.period === 'month' ? 'last' : null;
    var pr = prevKey ? LP.result(LP.period(prevKey)) : null;
    if (res.rev === 0) return '<div class="mt-16">' + LP.empty({ ill: 'chart', title: 'Sem vendas entregues neste período', text: 'O resultado só considera pedidos <b>entregues</b>. Sinais recebidos de pedidos em andamento aparecem no caixa, não aqui.' }) + '</div>';
    var rows = [
      ['Receita reconhecida', res.rev, 'Pedidos entregues no período (' + res.sold.length + ')', 'rev'],
      ['(−) Materiais usados nas peças vendidas', -res.mat, 'Custo médio dos fios e insumos de cada peça', ''],
      ['(−) Embalagem e outros custos das peças', -res.other, 'Estimativa cadastrada em cada produto', ''],
      ['(−) Seu trabalho (horas × valor da hora)', -res.labor, 'Custo calculado: não sai do caixa', 'calc'],
      ['= Lucro bruto', res.gross, '', 'sub'],
      ['(−) Despesas operacionais', -res.opx, 'Impostos, frete, divulgação', ''],
      ['= Lucro do período', res.profit, 'Margem de ' + LP.pct(res.margin), 'total']
    ];
    var tbl = '<div class="card pad-0 mt-16"><div class="card-head" style="padding:20px 24px 0"><h2>' + ic('chart', 20) + ' Do faturamento ao lucro</h2>' + LP.lens('lucro') + '</div><div class="table-wrap"><table class="table dre"><tbody>' + rows.map(function (r) {
      return '<tr class="' + r[3] + '"><td>' + (r[3] === 'calc' ? LP.esc(r[0]) + ' ' + LP.tip('O valor do seu trabalho entra no resultado para o preço refletir suas horas, mas nunca sai do caixa. Por isso lucro e caixa são diferentes.') : LP.esc(r[0])) + (r[2] ? '<div class="sub">' + r[2] + '</div>' : '') + '</td><td class="right num ' + (r[3] === 'total' ? (r[1] < 0 ? 'neg' : 'pos') : '') + '"><b>' + (r[1] < 0 ? '−' + LP.money(-r[1]) : LP.money(r[1])) + '</b></td></tr>';
    }).join('') + '</tbody></table></div></div>';
    var parts = [['Materiais', res.mat, 'var(--color-secondary)'], ['Embalagem', res.other, 'var(--color-warning-light)'], ['Seu trabalho', res.labor, 'var(--color-primary)'], ['Despesas', res.opx, 'var(--color-text-muted)'], ['Lucro', Math.max(0, res.profit), 'var(--color-success)']];
    var bar = '<div class="card mt-16"><div class="card-head"><h3>Para onde vai cada R$ 100 vendidos</h3></div><div class="compbar tall" role="img" aria-label="Distribuição da receita">' + parts.map(function (x) { return '<i style="width:' + (x[1] / res.rev * 100) + '%;background:' + x[2] + '" title="' + x[0] + '"></i>'; }).join('') + '</div><div class="legend mt-16">' + parts.map(function (x) { return '<span><i style="background:' + x[2] + '"></i>' + x[0] + ' <b class="num">' + LP.money(x[1] / res.rev * 100) + '</b></span>'; }).join('') + '</div></div>';
    var cmp = '';
    if (pr && pr.rev) {
      var d = function (a, b, inv) { var v = (a - b) / Math.abs(b) * 100, good = inv ? v <= 0 : v >= 0; return '<span class="delta ' + (good ? 'up' : 'down') + '">' + ic(v >= 0 ? 'trending-up' : 'trending-down', 14) + LP.pct(Math.abs(v), 0) + '</span>'; };
      cmp = '<div class="card mt-16 pad-0"><div class="card-head" style="padding:20px 24px 0"><h2>' + ic('arrow-up-down', 20) + ' Comparação com ' + LP.esc(LP.period('month').prevLabel) + '</h2></div><div class="table-wrap"><table class="table"><thead><tr><th></th><th class="right">' + LP.esc(p.label.split(' ')[0]) + '</th><th class="right">Setembro</th><th class="right">Variação</th></tr></thead><tbody>' + [['Receita', res.rev, pr.rev], ['Custos das peças', res.cogs, pr.cogs, 1], ['Despesas', res.opx, pr.opx, 1], ['Lucro', res.profit, pr.profit]].map(function (r) { return '<tr><td>' + r[0] + '</td><td class="right num"><b>' + LP.money(r[1]) + '</b></td><td class="right num">' + LP.money(r[2]) + '</td><td class="right">' + d(r[1], r[2], r[3]) + '</td></tr>'; }).join('') + '<tr><td>Margem</td><td class="right num"><b>' + LP.pct(res.margin) + '</b></td><td class="right num">' + LP.pct(pr.margin) + '</td><td class="right small muted">' + (res.margin - pr.margin >= 0 ? '+' : '−') + LP.num(Math.abs(res.margin - pr.margin), 1) + ' pts</td></tr></tbody></table></div><p class="small muted" style="padding:12px 24px 20px">Outubro vai só até o dia 22; setembro está completo. Compare com cautela.</p></div>';
    } else if (s.period !== 'month') {
      cmp = '<div class="card sand flat pad-sm mt-16"><span class="eyebrow">Comparação</span><p class="mt-8 muted">Disponível apenas para o mês atual, comparado ao anterior. ' + (s.period === 'last' ? 'Agosto não tem pedidos entregues.' : '') + '</p></div>';
    }
    var est = '<div class="alert alert-info mt-16">' + ic('info', 20) + '<div class="a-body"><div class="a-title">Estimativa baseada no custo atual</div><p>Os custos das peças usam o custo médio atual dos materiais e o tempo cadastrado. Se o preço do fio mudar, resultados passados não são recalculados no app real.</p></div></div>';
    return tbl + bar + cmp + est;
  }

  function bridge(p, cash, res) {
    var adv = cash.inn - res.rev, matGap = -(cash.buy - res.mat);
    var items = [['Lucro do período', res.profit, 'Resultado'], ['+ Seu trabalho (horas)', res.labor, 'Entra no resultado, nunca sai do caixa'], ['+ Embalagem e etiquetas estimadas', res.other, 'Custo estimado, ainda sem compra lançada'], ['Material usado − material comprado', matGap, cash.buy > res.mat ? 'Você comprou mais do que usou: o excedente está no estoque' : 'Você usou mais do que comprou'], ['Recebido − faturado', adv, 'Sinais e saldos recebidos de pedidos fora do período']];
    var tot = items.reduce(function (a, i) { return a + i[1]; }, 0);
    return '<section class="card mt-24 bridge"><div class="card-head"><h2>' + ic('scale', 20) + ' Por que o caixa não é igual ao lucro?</h2></div><p class="muted" style="margin-bottom:12px">Do lucro de <b class="num">' + LP.money(res.profit) + '</b> chegamos à variação do caixa de <b class="num">' + (cash.net >= 0 ? '+' : '') + LP.money(cash.net) + '</b> passo a passo:</p><div class="stack-sm">' + items.map(function (i, k) { return '<div class="kv"><span class="k">' + i[0] + '<span class="sub-k">' + i[2] + '</span></span><span class="v ' + (k && i[1] < 0 ? 'neg' : '') + '">' + (k && i[1] >= 0 ? '+' : '') + (i[1] < 0 ? '−' + LP.money(-i[1]) : LP.money(i[1])) + '</span></div>'; }).join('') + '<div class="kv total"><span class="k"><b>= Variação do caixa</b></span><span class="v"><b>' + (tot >= 0 ? '+' : '') + LP.money(tot) + '</b></span></div></div></section>';
  }

  /* ------------------------------------------------------------------
     MOVIMENTAÇÕES FINANCEIRAS
     ------------------------------------------------------------------ */
  LP.screens.moves = function () {
    var s = S();
    var head = LP.pageHead('Movimentações', 'Entradas e saídas, uma única vez cada. Pagamentos de pedidos e compras já aparecem sozinhos.',
      '<button class="btn btn-secondary" data-action="open-move" data-arg="out">' + ic('arrow-up-right', 18) + 'Nova saída</button><button class="btn btn-primary" data-action="open-move" data-arg="in">' + ic('arrow-down-left', 18) + 'Nova entrada</button>');
    if (s.empty) return head + LP.empty({ ill: 'wallet', title: 'Nenhuma movimentação', text: 'Registre uma compra, receba um sinal ou lance uma despesa para começar o seu livro-caixa.' });
    var tab = s.moveTab, t = s.moveType, q = (s.moveQ || '').toLowerCase();
    var p = LP.period(s.period === '7d' ? '7d' : s.moveAll ? 'all' : s.period);
    var all = tab === 'prev' ? LP.forecastIn() : LP.ledger().filter(function (e) { var d = LP.D(e.d); return d >= p.start && d <= p.end; });
    var cats = []; all.forEach(function (e) { if (cats.indexOf(e.cat) < 0) cats.push(e.cat); });
    var list = all.filter(function (e) { return (t === 'all' || e.type === t) && (s.moveCat === 'all' || e.cat === s.moveCat) && (!q || e.desc.toLowerCase().indexOf(q) > -1); });
    var tin = list.filter(function (e) { return e.type === 'in'; }).reduce(function (a, e) { return a + e.amount; }, 0), tout = list.filter(function (e) { return e.type === 'out'; }).reduce(function (a, e) { return a + e.amount; }, 0);
    var tabs = '<div class="tabs" role="tablist"><button role="tab" aria-selected="' + (tab === 'done') + '" data-action="set-movetab" data-arg="done">' + ic('check-circle', 18) + 'Realizadas</button><button role="tab" aria-selected="' + (tab === 'prev') + '" data-action="set-movetab" data-arg="prev">' + ic('clock', 18) + 'Previstas <span class="badge b-neutral">' + LP.forecastIn().length + '</span></button></div>';
    var bar = '<div class="toolbar"><div class="search">' + ic('search', 18) + '<input class="input" type="search" placeholder="Buscar descrição" value="' + LP.esc(s.moveQ || '') + '" data-input="move-q" aria-label="Buscar movimentação"/></div>' +
      '<select class="select tb-select" data-input="move-cat" aria-label="Categoria"><option value="all">Todas as categorias</option>' + cats.map(function (c) { return '<option' + (s.moveCat === c ? ' selected' : '') + '>' + LP.esc(c) + '</option>'; }).join('') + '</select>' +
      '<div class="seg" role="group" aria-label="Tipo">' + [['all', 'Todas'], ['in', 'Entradas'], ['out', 'Saídas']].map(function (x) { return '<button aria-pressed="' + (t === x[0]) + '" data-action="set-movetype" data-arg="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      (tab === 'done' ? '<div class="row-wrap mt-8">' + periodSeg(s, 'set-period') + '</div>' : '');
    var origin = function (e) { return e.link ? (e.link.kind === 'order' ? '<a href="#/pedidos/' + e.link.id + '" class="badge b-primary">' + ic('bag', 13) + 'Pedido #' + e.link.id + '</a>' : '<a href="#/estoque/' + e.link.id + '" class="badge b-info">' + ic('cart', 13) + 'Compra</a>') : '<span class="badge b-neutral">Manual</span>'; };
    var table = list.length ? '<div class="card pad-0 mt-16 hide-sm"><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Origem</th><th>Forma</th><th class="right">Valor</th></tr></thead><tbody>' + list.map(function (e) {
      return '<tr><td class="nowrap">' + LP.dshort(e.d) + '</td><td><div class="name" style="font-weight:500">' + LP.esc(e.desc) + '</div></td><td>' + LP.esc(e.cat) + '</td><td>' + (e.done ? origin(e) : LP.lens('prev')) + '</td><td>' + LP.esc(e.method || '—') + '</td><td class="right num ' + (e.type === 'in' ? 'pos' : '') + '"><b>' + (e.type === 'in' ? '+' : '−') + LP.money(e.amount) + '</b></td></tr>';
    }).join('') + '</tbody><tfoot><tr><td colspan="5">' + list.length + ' lançamentos · entradas ' + LP.money(tin) + ' · saídas ' + LP.money(tout) + '</td><td class="right num">' + (tin - tout >= 0 ? '+' : '−') + LP.money(Math.abs(tin - tout)) + '</td></tr></tfoot></table></div></div><div class="card pad-0 mt-16 only-sm"><div class="rows" style="padding:0 12px">' + list.map(moveRow).join('') + '</div></div>' : '<div class="mt-16">' + LP.empty({ compact: true, ill: 'wallet', title: 'Nada neste filtro', text: 'Troque o período, o tipo ou a categoria.' }) + '</div>';
    var note = '<div class="alert alert-info mt-16">' + ic('info', 20) + '<div class="a-body"><div class="a-title">Sem contar duas vezes</div><p>Pagamentos de pedidos e compras de material vêm direto do pedido ou do estoque (selo “Pedido” ou “Compra”). Ao lançar algo ligado a um pedido, o valor é gravado <b>no pedido</b>, não repetido aqui.</p></div></div>';
    return head + tabs + bar + table + note;
  };
  LP.act['open-move'] = function (el) {
    var type = (el && el.dataset.arg) || 'in', isIn = type === 'in';
    var orders = LP.orders.filter(function (o) { return LP.isOpen(o) && LP.orderBalance(o) > 0.01; });
    LP.openModal({ title: isIn ? 'Nova entrada' : 'Nova saída', body: '<div class="form-grid">' +
      LP.field('Valor', '<div class="input-group"><span class="prefix">R$</span><input id="mv-v" class="input money" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0,00"/></div>', { for: 'mv-v' }) + LP.field('Data', '<input id="mv-d" class="input" type="date" value="' + LP.iso(LP.TODAY) + '"/>', { for: 'mv-d' }) +
      LP.field('Categoria', '<select id="mv-c" class="select">' + (isIn ? '<option>Venda avulsa</option><option>Outras entradas</option>' : '<option>Impostos</option><option>Entrega</option><option>Divulgação</option><option>Embalagem e marca</option><option>Outras despesas</option>') + '</select>', { for: 'mv-c' }) + LP.field('Forma de pagamento', '<select id="mv-m" class="select"><option>Pix</option><option>Dinheiro</option><option>Cartão de débito</option><option>Cartão de crédito</option></select>', { for: 'mv-m' }) +
      LP.field('Descrição', '<input id="mv-n" class="input" placeholder="' + (isIn ? 'Ex.: venda na feira' : 'Ex.: frete para cliente') + '"/>', { for: 'mv-n', cls: 'full' }) +
      (isIn ? LP.field('Ligar a um pedido', '<select id="mv-o" class="select"><option value="">Não está ligada a um pedido</option>' + orders.map(function (o) { return '<option value="' + o.id + '">#' + o.id + ' · ' + LP.esc(o.client) + ' · saldo ' + LP.money(LP.orderBalance(o)) + '</option>'; }).join('') + '</select>', { for: 'mv-o', opt: true, cls: 'full', help: 'Se escolher um pedido, o pagamento é registrado no pedido e não duplica aqui.' }) : '') + '</div>',
      foot: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-move-fin" data-arg="' + type + '">Salvar</button>' });
  };
  LP.act['save-move-fin'] = function (el) {
    var type = el.dataset.arg, v = +document.getElementById('mv-v').value;
    if (!(v > 0)) { LP.toast('Informe o valor', { type: 'err' }); return; }
    var link = type === 'in' && document.getElementById('mv-o') && document.getElementById('mv-o').value;
    if (link) { LP.addPayment(LP.order(link), v, document.getElementById('mv-m').value); LP.toast('Pagamento registrado no pedido #' + link, { sub: 'Aparece em Movimentações sem duplicar.' }); }
    else {
      var d = { d: document.getElementById('mv-d').value, type: type, amount: v, cat: document.getElementById('mv-c').value, desc: document.getElementById('mv-n').value || document.getElementById('mv-c').value, method: document.getElementById('mv-m').value };
      if (type === 'out') LP.expenses.push({ d: d.d, desc: d.desc, cat: d.cat, amount: v, method: d.method }); else LP.extras.push(d);
      LP.toast(type === 'in' ? 'Entrada lançada' : 'Saída lançada', { sub: LP.money(v) + ' · ' + d.cat, undo: true });
    }
    LP.closeModal(); LP.render();
  };

  /* ------------------------------------------------------------------
     RELATÓRIOS
     ------------------------------------------------------------------ */
  LP.screens.reports = function () {
    var s = S();
    var head = LP.pageHead('Relatórios', 'Números para decidir: o que vende, o que dá lucro, o que consome mais material.', periodSeg(s, 'set-period') + '<button class="btn btn-secondary" data-action="export-report">' + ic('download', 18) + 'Exportar</button>');
    if (s.empty) return head + LP.empty({ ill: 'chart', title: 'Relatórios aparecem com os primeiros pedidos', text: 'Quando houver pedidos entregues e compras registradas, os gráficos e tabelas surgem aqui. Enquanto isso, nada é estimado no escuro.' });
    var p = LP.period(s.period), res = LP.result(p), cash = LP.cash(p);
    var tag = function (k) { return { real: '<span class="badge b-success">' + ic('check', 12) + 'Dados reais</span>', est: '<span class="badge b-warning">Estimativa</span>', none: '<span class="badge b-neutral">Sem dados suficientes</span>' }[k]; };

    // vendas por mês
    var months = [['Ago', LP.period('all')], ['Set', LP.period('last')], ['Out', LP.period('month')]];
    var mAug = { start: LP.D('2026-08-01'), end: LP.D('2026-08-31') };
    var sales = [['Ago', mAug], ['Set', LP.period('last')], ['Out', LP.period('month')]].map(function (m) { var r = LP.result(m[1]); return { label: m[0] + (m[0] === 'Out' ? ' (até 22)' : ''), bars: [{ v: r.rev, color: 'var(--color-primary)', name: 'Faturamento' }, { v: Math.max(0, r.profit), color: 'var(--color-secondary)', name: 'Lucro' }] }; });
    var c1 = '<section class="card"><div class="card-head"><h2>' + ic('chart', 20) + ' Vendas por mês</h2>' + tag('real') + '</div>' + LP.barChart(sales, { label: 'Faturamento e lucro por mês' }) + '<div class="legend mt-16"><span><i style="background:var(--color-primary)"></i>Faturamento</span><span><i style="background:var(--color-secondary)"></i>Lucro</span><span class="faint">Agosto sem pedidos entregues: o ateliê começou a registrar em agosto.</span></div></section>';

    // produtos mais vendidos
    var sold = {}; res.sold.forEach(function (o) { var n = LP.orderName(o); sold[n] = sold[n] || { q: 0, r: 0, id: o.pid }; sold[n].q += o.qty; sold[n].r += o.total; });
    var srows = Object.keys(sold).map(function (k) { return [k, sold[k].r, sold[k].q]; }).sort(function (a, b) { return b[1] - a[1]; });
    var c2 = '<section class="card"><div class="card-head"><h2>' + ic('star', 20) + ' Produtos mais vendidos</h2>' + tag('real') + '</div>' + (srows.length ? srows.map(function (r) { return '<div class="hbar"><span class="lbl" title="' + LP.esc(r[0]) + '">' + LP.esc(r[0]) + '</span><div class="bar prim" style="height:10px"><i style="width:' + (r[1] / srows[0][1] * 100) + '%"></i></div><span class="val num">' + LP.money(r[1]) + '<span class="small muted" style="display:block;font-weight:400">' + r[2] + ' un.</span></span></div>'; }).join('') : LP.empty({ compact: true, ill: 'box', title: 'Sem vendas no período', text: 'Escolha outro período.' })) + '</section>';

    // margem por produto
    var c3 = '<section class="card pad-0"><div class="card-head" style="padding:20px 24px 0"><h2>' + ic('percent', 20) + ' Lucro e margem por produto</h2>' + tag('est') + '</div><div class="table-wrap"><table class="table"><thead><tr><th>Produto</th><th class="right">Custo</th><th class="right">Preço</th><th class="right">Lucro/un.</th><th style="min-width:170px">Margem (meta ' + LP.pct(LP.settings.marginGoal, 0) + ')</th></tr></thead><tbody>' + LP.products.filter(function (p) { return p.active; }).map(function (pr) { var c = LP.productCost(pr); return '<tr><td><a class="name" href="#/produtos/' + pr.id + '" style="color:inherit">' + LP.esc(pr.name) + '</a></td><td class="right num">' + LP.money(c.total) + '</td><td class="right num">' + LP.money(pr.price) + '</td><td class="right num ' + (c.profit < 0 ? 'neg' : 'pos') + '"><b>' + LP.money(c.profit) + '</b></td><td><div class="row"><div class="bar ' + (c.state === 'ok' ? '' : c.state === 'low' ? 'warn' : 'err') + ' grow" style="height:8px"><i style="width:' + Math.max(0, Math.min(100, c.margin / 50 * 100)) + '%"></i><span class="mark" style="left:' + (LP.settings.marginGoal / 50 * 100) + '%"></span></div><b class="num small" style="min-width:48px;text-align:right">' + LP.pct(c.margin) + '</b></div></td></tr>'; }).join('') + '</tbody></table></div><p class="small muted" style="padding:12px 24px 20px">Estimativa: usa o custo médio atual dos materiais, o tempo cadastrado e o preço de tabela.</p></section>';

    // pedidos concluídos x pendentes
    var done = LP.orders.filter(function (o) { return o.status === 'Entregue'; }).length, open = LP.orders.filter(LP.isOpen).length, canc = LP.orders.filter(function (o) { return o.status === 'Cancelado'; }).length, tot = done + open + canc;
    var c4 = '<section class="card"><div class="card-head"><h2>' + ic('checks', 20) + ' Pedidos concluídos e pendentes</h2>' + tag('real') + '</div><div class="compbar tall"><i style="width:' + done / tot * 100 + '%;background:var(--color-success)"></i><i style="width:' + open / tot * 100 + '%;background:var(--color-primary)"></i><i style="width:' + canc / tot * 100 + '%;background:var(--color-text-muted)"></i></div><div class="grid g-3 keep2 mt-16" style="gap:10px"><div><span class="small muted">Entregues</span><div class="display-num" style="font-size:28px">' + done + '</div></div><div><span class="small muted">Em andamento</span><div class="display-num" style="font-size:28px">' + open + '</div></div><div><span class="small muted">Cancelados</span><div class="display-num" style="font-size:28px">' + canc + '</div></div></div></section>';

    // consumo de materiais
    var cons = LP.materials.map(function (m) { var inP = m.moves.filter(function (v) { var d = LP.D(v.d); return v.t === 'consumo' && d >= p.start && d <= p.end; }).reduce(function (a, v) { return a - v.qty; }, 0); return [m.name, inP * LP.matStats(m).avg, inP, m.unit]; }).filter(function (x) { return x[2] > 0; }).sort(function (a, b) { return b[1] - a[1]; });
    var c5 = '<section class="card"><div class="card-head"><h2>' + ic('yarn', 20) + ' Consumo de materiais</h2>' + tag('real') + '</div>' + (cons.length ? hbars(cons.map(function (x) { return [x[0], x[1]]; }), 'var(--color-secondary)') + '<p class="small muted mt-8">Custo do que saiu do estoque para as peças, pelo custo médio.</p>' : LP.empty({ compact: true, ill: 'yarn', title: 'Sem consumo no período', text: 'O consumo aparece quando pedidos entram em produção.' })) + '</section>';

    // compras de insumos
    var buys = []; LP.materials.forEach(function (m) { m.lots.forEach(function (l) { var d = LP.D(l.d); if (d >= p.start && d <= p.end) buys.push([m.name, l.paid, l.qty + ' ' + m.unit, l.d]); }); });
    var c6 = '<section class="card pad-0"><div class="card-head" style="padding:20px 24px 0"><h2>' + ic('cart', 20) + ' Compras de insumos</h2>' + tag('real') + '</div>' + (buys.length ? '<div class="table-wrap"><table class="table"><tbody>' + buys.sort(function (a, b) { return a[3] < b[3] ? 1 : -1; }).map(function (b) { return '<tr><td class="nowrap faint">' + LP.dshort(b[3]) + '</td><td>' + LP.esc(b[0]) + '</td><td class="right num muted">' + b[2] + '</td><td class="right num"><b>' + LP.money(b[1]) + '</b></td></tr>'; }).join('') + '</tbody><tfoot><tr><td colspan="3">Total comprado</td><td class="right num">' + LP.money(cash.buy) + '</td></tr></tfoot></table></div>' : '<div style="padding:20px 24px">' + LP.empty({ compact: true, ill: 'box', title: 'Sem compras no período', text: 'Nenhuma compra de material registrada.' }) + '</div>') + '</section>';

    // evolução do caixa e resultado
    var pts = LP.cashSeries(p);
    var c7 = '<section class="card"><div class="card-head"><h2>' + ic('trending-up', 20) + ' Evolução do caixa</h2>' + tag('real') + '</div>' + (pts.length > 2 ? LP.lineChart(pts, { label: 'Saldo de caixa', h: 190 }) : '') + '<a class="link-btn mt-8" href="#/financeiro">Ver no Financeiro' + ic('arrow-right', 16) + '</a></section>';
    var c8 = '<section class="card"><div class="card-head"><h2>' + ic('scale', 20) + ' Resultado financeiro</h2>' + tag('real') + '</div><div class="stack-sm"><div class="kv"><span class="k">Receita reconhecida</span><span class="v">' + LP.money(res.rev) + '</span></div><div class="kv"><span class="k">Custos das peças</span><span class="v">−' + LP.money(res.cogs) + '</span></div><div class="kv"><span class="k">Despesas operacionais</span><span class="v">−' + LP.money(res.opx) + '</span></div><div class="kv total"><span class="k"><b>Lucro do período</b></span><span class="v ' + (res.profit < 0 ? 'neg' : 'pos') + '"><b>' + LP.money(res.profit) + '</b></span></div></div><a class="link-btn mt-16" href="#/financeiro">Abrir resultado completo' + ic('arrow-right', 16) + '</a></section>';

    // indicador que ainda não pode ser calculado
    var c9 = '<section class="card sand flat"><div class="card-head"><h2>' + ic('sparkle', 20) + ' Tendência de vendas</h2>' + tag('none') + '</div>' + LP.empty({ compact: true, ill: 'chart', title: 'Ainda não dá para prever', text: 'Precisamos de pelo menos 3 meses completos de pedidos entregues. O ateliê tem 2 meses registrados.' }) + '</section>';

    return head + '<div class="grid g-2">' + c1 + c2 + '</div><div class="mt-16">' + c3 + '</div><div class="grid g-2 mt-16">' + c4 + c5 + '</div><div class="grid g-2 mt-16">' + c6 + c7 + '</div><div class="grid g-2 mt-16">' + c8 + c9 + '</div>';
  };
  LP.act['export-report'] = function () { LP.toast('Relatório exportado', { type: 'info', sub: 'No app, salvaria uma planilha CSV neste aparelho.' }); };

  /* ------------------------------------------------------------------
     CONFIGURAÇÕES E BACKUP
     ------------------------------------------------------------------ */
  LP.screens.settings = function () {
    var s = S(), st = LP.settings, days = LP.daysBetween(st.lastBackup, LP.TODAY), due = days >= st.backupEveryDays;
    var head = LP.pageHead('Configurações e backup', 'Os valores que o LaPoli usa nos cálculos e a segurança dos seus dados.', '<button class="btn btn-primary" data-action="save-settings">' + ic('check', 18) + 'Salvar alterações</button>');
    var sw = function (id, t, d, on) { return '<div class="set-row"><div class="grow"><b>' + t + '</b><p class="small muted">' + d + '</p></div><button class="switch" role="switch" aria-checked="' + on + '" aria-label="' + t + '" data-action="toggle-switch"></button></div>'; };
    var chips = function (arr, key) { return '<div class="chips">' + arr.map(function (x) { return '<span class="chip on-soft">' + LP.esc(x) + '<button aria-label="Remover ' + LP.esc(x) + '" data-action="chip-del">' + ic('x', 14) + '</button></span>'; }).join('') + '<button class="chip dashed" data-action="chip-add">' + ic('plus', 14) + 'Adicionar</button></div>'; };
    var values = '<section class="card"><div class="card-head"><h2>' + ic('calculator', 20) + ' Valores padrão</h2></div><div class="form-grid">' +
      LP.field('Valor da sua hora de trabalho', '<div class="input-group"><span class="prefix">R$</span><input id="s-rate" class="input money" type="number" step="0.5" value="' + st.hourlyRate + '"/><span class="suffix">/ hora</span></div>', { for: 's-rate', help: 'Usado em todos os produtos novos. Cada produto pode ter o seu.' }) +
      LP.field('Meta de margem de lucro', '<div class="input-group"><input id="s-goal" class="input num-in" type="number" value="' + st.marginGoal + '"/><span class="suffix">%</span></div>', { for: 's-goal', help: 'Margem = lucro ÷ preço de venda. Abaixo disso o produto recebe alerta.' }) +
      LP.field('Percentual do sinal', '<div class="input-group"><input id="s-sig" class="input num-in" type="number" value="' + st.signalPercent + '"/><span class="suffix">%</span></div>', { for: 's-sig', help: 'Sugerido ao criar um pedido.' }) +
      LP.field('Horas de crochê por dia', '<div class="input-group"><input id="s-hpd" class="input num-in" type="number" value="3"/><span class="suffix">h/dia</span></div>', { for: 's-hpd', help: 'Novo: usado para sugerir a data de entrega.' }) +
      LP.field('Saldo inicial do caixa', '<div class="input-group"><span class="prefix">R$</span><input id="s-cash" class="input money" type="number" value="' + st.openingCash + '"/></div>', { for: 's-cash', help: 'Novo: ponto de partida do Financeiro. Dado de demonstração.' }) + '</div></section>';
    var alerts = '<section class="card"><div class="card-head"><h2>' + ic('bell', 20) + ' Alertas</h2></div>' + sw('a1', 'Estoque baixo', 'Avisar quando um material ficar abaixo do mínimo.', true) + sw('a2', 'Entrega próxima', 'Avisar 3 dias antes do prazo de cada pedido.', true) + sw('a3', 'Margem abaixo da meta', 'Mostrar alerta em produtos com margem menor que a meta.', true) + sw('a4', 'Pagamento pendente', 'Lembrar de cobrar saldos após a entrega.', false) + '</section>';
    var cats = '<section class="card"><div class="card-head"><h2>' + ic('tag', 20) + ' Categorias e unidades</h2></div><div class="stack"><div><span class="label">Categorias de produto</span><div class="mt-8">' + chips(LP.categories) + '</div></div><div><span class="label">Tipos de material</span><div class="mt-8">' + chips(LP.matTypes) + '</div></div><div><span class="label">Unidades de medida</span><div class="mt-8">' + chips(['g', 'm', 'un', 'cm']) + '</div></div><div><span class="label">Formas de pagamento</span><div class="mt-8">' + chips(['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência']) + '</div></div></div></section>';

    var priv = '<div class="alert alert-info">' + ic('shield', 22) + '<div class="a-body"><div class="a-title">Seus dados ficam apenas neste aparelho</div><p>O LaPoli não tem conta, servidor nem nuvem. Por isso <b>você é a responsável pelas cópias de segurança</b>. Se o navegador limpar os dados do site ou o aparelho for trocado, só um arquivo de backup traz tudo de volta. Não existe recuperação automática.</p></div></div>';
    var bk = '<section class="card backup-card"><div class="card-head"><h2>' + ic('shield', 20) + ' Backup</h2>' + (due ? LP.badge('Backup atrasado', 'b-warning', 'alert') : LP.badge('Em dia', 'b-success', 'check')) + '</div>' +
      '<div class="backup-last ' + (due ? 'due' : '') + '"><span class="dot-ic ' + (due ? 'w' : 's') + '">' + ic('history', 22) + '</span><div><div class="small muted">Último backup</div><b style="font-size:17px">' + LP.dfull(st.lastBackup) + '</b><span class="muted"> · há ' + days + ' dias</span></div></div>' +
      '<div class="grid g-2 mt-16"><button class="btn btn-primary btn-lg" data-action="do-export">' + ic('download', 20) + 'Exportar todos os dados (JSON)</button><button class="btn btn-secondary btn-lg" data-action="open-import">' + ic('upload', 20) + 'Importar backup…</button></div>' +
      '<div class="field mt-16" style="max-width:340px"><label for="s-rem">Lembrete periódico</label><select id="s-rem" class="select"><option>A cada 7 dias</option><option>A cada 14 dias</option><option>A cada 30 dias</option><option>Nunca</option></select><span class="help">O lembrete aparece aqui e no Painel, sem notificações insistentes.</span></div>' +
      '<p class="small muted mt-16">' + ic('info', 14) + ' Dica: salve o arquivo em um pendrive ou envie para você mesma por e-mail. O arquivo contém dados de clientes — guarde com cuidado.</p></section>';
    var about = '<section class="card sand flat pad-sm"><b>' + ic('device', 16) + ' Sobre este protótipo</b><p class="small muted mt-8">Dados demonstrativos e fictícios. Nada aqui é informação real da LaPoli. Os botões de backup apenas simulam o fluxo.</p></section>';
    return head + priv + '<div class="grid g-main-side mt-16"><div class="stack">' + bk + values + cats + '</div><div class="stack">' + alerts + about + '</div></div>';
  };
  LP.act['save-settings'] = function () { LP.toast('Configurações salvas', { sub: 'Valem para novos produtos e pedidos. Os existentes não mudam.' }); };
  LP.act['toggle-switch'] = function (el) { el.setAttribute('aria-checked', el.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); };
  LP.act['chip-del'] = function (el) { el.parentNode.remove(); };
  LP.act['chip-add'] = function (el) { var v = prompt ? null : null; LP.toast('No app, abriria um campo para digitar o novo item', { type: 'info' }); };
  LP.act['do-export'] = function () { LP.settings.lastBackup = LP.TODAY; LP.render(); LP.toast('Backup exportado', { sub: 'lapoli-backup-2026-10-22.json salvo na pasta Downloads (simulado).' }); };
  LP.act['open-import'] = function () {
    LP.openModal({ title: 'Importar backup', body: '<p class="muted">Escolha um arquivo <b>.json</b> exportado pelo LaPoli. Antes de qualquer troca, o sistema confere o arquivo.</p><div class="drop mt-16" tabindex="0">' + ic('upload', 28) + '<b>Arraste o arquivo aqui</b><span class="small muted">ou</span><button class="btn btn-secondary btn-sm" data-action="import-validate">Usar arquivo de exemplo</button><span class="small faint">lapoli-backup-2026-10-14.json</span></div>', foot: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button>' });
  };
  LP.act['import-validate'] = function () {
    var ok = function (t) { return '<div class="li" style="padding:8px 0"><span class="dot-ic s" style="width:28px;height:28px">' + ic('check', 16) + '</span><span>' + t + '</span></div>'; };
    LP.openModal({ title: 'Arquivo validado', body: '<div class="alert alert-success">' + ic('check-circle', 20) + '<div class="a-body"><div class="a-title">lapoli-backup-2026-10-14.json está íntegro</div></div></div><div class="mt-16">' + ok('Formato e versão compatíveis') + ok('<b>' + LP.products.length + '</b> produtos') + ok('<b>' + LP.materials.length + '</b> materiais e compras') + ok('<b>' + LP.orders.length + '</b> pedidos e <b>' + LP.clients.length + '</b> clientes') + ok('Configurações e categorias') + '</div><div class="alert alert-warning mt-16">' + ic('alert', 20) + '<div class="a-body"><div class="a-title">Isto substitui os dados atuais</div><p>Tudo o que está neste aparelho será trocado pelo conteúdo do arquivo.</p></div></div><button class="check" role="checkbox" aria-checked="true" data-action="toggle-check-simple"><span class="box">' + ic('check', 14) + '</span><span><b class="t" style="text-decoration:none">Criar backup de segurança antes de substituir</b><span class="small muted" style="display:block">Recomendado: baixa um arquivo com os dados de agora.</span></span></button>', foot: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-danger-solid" data-action="import-run">Substituir meus dados</button>' });
  };
  LP.act['toggle-check-simple'] = function (el) { el.setAttribute('aria-checked', el.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); };
  LP.act['import-run'] = function () { LP.closeModal(); LP.toast('Dados restaurados', { sub: 'Backup de segurança salvo antes da troca (simulado).' }); };
})();
