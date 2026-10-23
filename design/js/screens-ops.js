/* ==========================================================================
   Operação: Estoque · Detalhe do material · Pedidos (lista/quadro) · Novo pedido · Detalhe do pedido
   ========================================================================== */
(function () {
  var LP = window.LP, ic = LP.icon, S = function () { return LP.S; };
  LP.screens = LP.screens || {}; LP.hooks = LP.hooks || {}; LP.act = LP.act || {};
  var iso = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  LP.iso = iso;

  /* ---------- Regras de negócio da demonstração ---------- */
  var IDX_PROD = LP.allStatuses.indexOf('Em produção');
  LP.isConsumed = function (o) {
    if (o.consumed != null) return o.consumed;
    if (o.status === 'Cancelado') return false;
    return LP.allStatuses.indexOf(o.status) >= IDX_PROD;
  };
  // Baixa de materiais: acontece UMA vez, quando o pedido entra em "Em produção"
  LP.consumeOrder = function (o) {
    if (o.consumed || !o.pid) { o.consumed = true; return []; }
    var p = LP.prod(o.pid), out = [];
    p.mats.forEach(function (r) {
      var m = LP.mat(r[0]);
      m.moves.push({ d: iso(LP.TODAY), t: 'consumo', qty: -(r[1] * o.qty), ref: 'Pedido #' + o.id, note: p.name + (o.qty > 1 ? ' × ' + o.qty : '') });
      out.push(m.name);
    });
    o.consumed = true;
    return out;
  };
  LP.setStatus = function (o, st) {
    var before = o.status, was = LP.isConsumed(o);
    if (o.consumed == null) o.consumed = was; // fixa o estado "já baixou?" antes de mudar a etapa
    o.status = st;
    var msgs = [];
    if (st === 'Em produção' && !was) { var ms = LP.consumeOrder(o); if (ms.length) msgs.push('Materiais baixados do estoque (uma única vez)'); }
    if (st === 'Entregue') { o.delivered = iso(LP.TODAY); }
    o.log = o.log || []; o.log.push({ d: iso(LP.TODAY), t: 'Etapa: ' + before + ' → ' + st });
    return msgs;
  };
  LP.addPayment = function (o, amount, method) {
    var kind = o.pays.length === 0 ? 'sinal' : 'saldo';
    o.pays.push({ d: iso(LP.TODAY), amount: amount, kind: kind, method: method });
    o.log = o.log || []; o.log.push({ d: iso(LP.TODAY), t: 'Pagamento de ' + LP.money(amount) + ' registrado (' + method + ')' });
  };

  // Lista de compras sugerida: demanda dos pedidos confirmados que ainda não consumiram + reposição do mínimo
  LP.shopping = function () {
    var need = {}, who = {};
    LP.orders.filter(function (o) { return o.pid && ['Sinal recebido', 'Aguardando compra de materiais'].indexOf(o.status) > -1 && !LP.isConsumed(o); }).forEach(function (o) {
      LP.prod(o.pid).mats.forEach(function (r) { need[r[0]] = (need[r[0]] || 0) + r[1] * o.qty; (who[r[0]] = who[r[0]] || []).push(o.id); });
    });
    var items = [];
    LP.materials.forEach(function (m) {
      var st = LP.matStats(m), n = need[m.id] || 0, after = st.stock - n;
      if (after < m.min) {
        var psize = m.pkg ? m.pkg.size : m.pack, buy = m.min - after, packs = Math.ceil(buy / psize), qty = packs * psize;
        items.push({ m: m, need: n, stock: st.stock, after: after, packs: packs, psize: psize, qty: qty, cost: qty * st.lastCost, orders: who[m.id] || [], reason: n > 0 ? 'Pedido' + (who[m.id].length > 1 ? 's' : '') + ' ' + who[m.id].map(function (i) { return '#' + i; }).join(', ') + ' ' + (who[m.id].length > 1 ? 'precisam' : 'precisa') + ' de ' + LP.qtyP(n, m) + ' e você tem ' + LP.qtyP(st.stock, m) : 'Abaixo do mínimo de ' + LP.qtyP(m.min, m) });
      }
    });
    return items;
  };

  /* ------------------------------------------------------------------
     ESTOQUE
     ------------------------------------------------------------------ */
  LP.screens.stock = function () {
    var s = S();
    var head = LP.pageHead('Materiais e estoque', 'O que você tem no armário, quanto custou e o que precisa comprar.',
      LP.menu('stock-more', ic('more', 20) + 'Perda ou ajuste', [{ icon: 'trending-down', label: 'Registrar perda', action: 'open-loss' }, { icon: 'refresh', label: 'Ajustar contagem', action: 'open-adjust' }], { btnClass: 'btn btn-secondary' }) +
      '<button class="btn btn-primary" data-action="open-buy">' + ic('plus', 18) + 'Registrar compra</button>');
    if (s.loading) return head + '<div class="grid g-3">' + LP.skeletonCards(3) + '</div>';
    if (s.empty) return head + LP.empty({ ill: 'hook', title: 'Nenhum material cadastrado', text: 'Registre sua primeira compra de fio ou enchimento. Assim o sistema sabe quanto custa cada grama e avisa quando estiver acabando.', actions: '<button class="btn btn-primary" data-action="open-buy">' + ic('plus', 18) + 'Registrar compra</button>' });

    var stats = LP.materials.map(function (m) { return [m, LP.matStats(m)]; });
    var totalValue = stats.reduce(function (a, x) { return a + x[1].value; }, 0);
    var low = stats.filter(function (x) { return x[1].level !== 'ok'; });
    var shop = LP.shopping(), shopTotal = shop.reduce(function (a, i) { return a + i.cost; }, 0);

    var summary = '<div class="grid g-3 keep2 mt-0">' +
      '<div class="card metric"><div class="m-top"><span class="m-label">Valor parado em estoque</span>' + LP.lens('caixa') + '</div><div class="m-val">' + LP.money(totalValue) + '</div><div class="m-note">Já foi pago; vira custo quando o material é usado numa peça vendida.</div></div>' +
      '<div class="card metric ' + (low.length ? 'metric-alert' : '') + '"><div class="m-top"><span class="m-label">Materiais para repor</span>' + ic('alert', 20, 'prim') + '</div><div class="m-val">' + low.length + ' <span class="small muted" style="font-family:var(--font-sans);font-weight:500">de ' + stats.length + '</span></div><div class="m-note">' + (low.length ? low.map(function (x) { return LP.esc(x[0].name.split(' · ').pop()); }).join(', ') : 'Tudo acima do mínimo.') + '</div></div>' +
      '<div class="card metric"><div class="m-top"><span class="m-label">Compra sugerida</span>' + ic('cart', 20, 'prim') + '</div><div class="m-val">' + LP.money(shopTotal) + '</div><div class="m-note">' + shop.length + ' ite' + (shop.length === 1 ? 'm' : 'ns') + ' na lista de compras.</div></div></div>';

    var tabs = '<div class="tabs mt-24" role="tablist">' + [['materiais', 'Materiais', stats.length], ['compras', 'Lista de compras', shop.length], ['historico', 'Histórico', null]].map(function (t) {
      return '<button role="tab" aria-selected="' + (s.stockTab === t[0]) + '" data-action="set-stocktab" data-arg="' + t[0] + '">' + t[1] + (t[2] != null ? ' <span class="badge b-neutral">' + t[2] + '</span>' : '') + '</button>';
    }).join('') + '</div>';

    var body = '';
    if (s.stockTab === 'materiais') {
      var f = s.stockFilter;
      var list = stats.filter(function (x) {
        if (s.stockQ && x[0].name.toLowerCase().indexOf(s.stockQ.toLowerCase()) < 0) return false;
        if (f === 'low') return x[1].level !== 'ok';
        if (f !== 'all' && f !== 'low' && x[0].type !== f) return false;
        return true;
      });
      var types = ['all', 'low'].concat(LP.matTypes.filter(function (t) { return LP.materials.some(function (m) { return m.type === t; }); }));
      var tl = { all: 'Todos', low: 'Para repor' };
      var bar = '<div class="toolbar"><div class="search">' + ic('search', 18) + '<input class="input" type="search" placeholder="Buscar material ou cor" value="' + LP.esc(s.stockQ) + '" data-input="stock-q" aria-label="Buscar material"/></div></div><div class="chips scroll mt-8" role="group" aria-label="Filtrar">' +
        types.map(function (t) { return '<button class="chip" aria-pressed="' + (f === t) + '" data-action="set-stockfilter" data-arg="' + t + '">' + (tl[t] || t.charAt(0).toUpperCase() + t.slice(1)) + '</button>'; }).join('') + '</div>';
      var table = '<div class="card pad-0 mt-16 hide-sm"><div class="table-wrap"><table class="table"><thead><tr><th class="mw">Material</th><th>Disponível</th><th class="right">Mínimo</th><th class="right">Custo médio</th><th class="right">Valor em estoque</th><th>Situação</th></tr></thead><tbody>' + list.map(function (x) {
        var m = x[0], t = x[1], pctv = Math.max(0, Math.min(100, t.stock / (m.min * 2) * 100));
        return '<tr class="click" data-href="#/estoque/' + m.id + '"><td><div class="row"><span class="swatch" style="background:' + m.color + '"></span><div><div class="name">' + LP.esc(m.name) + '</div><div class="sub">' + m.type + ' · ' + m.unit + '</div></div></div></td><td style="min-width:190px"><div class="num"><b>' + LP.qty(t.stock, m.unit) + '</b>' + (LP.pkgEq(m, t.stock) ? ' <span class="small muted">≈ ' + LP.pkgEq(m, t.stock) + '</span>' : '') + '</div><div class="bar ' + (t.level === 'low' ? 'err' : t.level === 'near' ? 'warn' : '') + ' mt-8" style="height:6px"><i style="width:' + pctv + '%"></i><span class="mark" style="left:50%"></span></div></td><td class="right num">' + LP.qty(m.min, m.unit) + '</td><td class="right num">' + LP.moneyU(t.avg) + ' / ' + m.unit + '</td><td class="right num">' + LP.money(t.value) + '</td><td>' + LP.stockBadge(t.level) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
      var cards = '<div class="stack-sm mt-16 only-sm">' + list.map(function (x) {
        var m = x[0], t = x[1], pctv = Math.max(0, Math.min(100, t.stock / (m.min * 2) * 100));
        return '<a class="card pad-sm clickable mat-card" href="#/estoque/' + m.id + '"><div class="row between"><div class="row"><span class="swatch" style="background:' + m.color + '"></span><b>' + LP.esc(m.name) + '</b></div></div><div class="row between mt-8"><span class="display-num" style="font-size:24px">' + LP.qty(t.stock, m.unit) + (LP.pkgEq(m, t.stock) ? ' <span class="small muted" style="font-family:var(--font-sans);font-weight:500">≈ ' + LP.pkgEq(m, t.stock) + '</span>' : '') + '</span>' + LP.stockBadge(t.level) + '</div><div class="bar ' + (t.level === 'low' ? 'err' : t.level === 'near' ? 'warn' : '') + ' mt-8" style="height:6px"><i style="width:' + pctv + '%"></i><span class="mark" style="left:50%"></span></div><div class="row between small muted mt-8"><span>mín. ' + LP.qty(m.min, m.unit) + '</span><span>' + LP.money(t.value) + ' em estoque</span></div></a>';
      }).join('') + '</div>';
      body = bar + (list.length ? table + cards : '<div class="mt-16">' + LP.empty({ compact: true, ill: 'box', title: 'Nada encontrado', text: 'Tente outro termo ou limpe o filtro.' }) + '</div>');
    } else if (s.stockTab === 'compras') {
      if (!shop.length) body = LP.empty({ ill: 'box', title: 'Nada para comprar agora', text: 'Todos os materiais estão acima do mínimo e os pedidos confirmados têm material suficiente.' });
      else {
        body = '<div class="alert alert-info">' + ic('info', 20) + '<div class="a-body"><div class="a-title">Como a lista é montada</div><p>Pedidos confirmados que ainda não entraram em produção + reposição até o estoque mínimo. Os pacotes seguem o tamanho em que você costuma comprar.</p></div></div>' +
          '<div class="card pad-0 mt-16"><div class="rows">' + shop.map(function (i) {
            return '<div class="li shop-li" style="padding:18px 24px"><span class="swatch lg" style="background:' + i.m.color + '"></span><div class="grow"><div class="t">' + LP.esc(i.m.name) + '</div><div class="s">' + LP.esc(i.reason) + '</div>' + (i.need > i.stock ? '<div class="small mt-8"><span class="badge b-warning">Faltam ' + LP.qtyP(Math.max(0, i.need - i.stock), i.m) + ' para os pedidos</span></div>' : '') + '</div><div class="right"><div class="num"><b>' + (i.m.pkg ? LP.num(i.packs) + ' ' + LP.pkgName(i.m, i.packs) + ' de ' + LP.qty(i.psize, i.m.unit) : LP.num(i.packs) + ' × ' + LP.qty(i.psize, i.m.unit)) + '</b></div><div class="small muted">' + LP.qty(i.qty, i.m.unit) + ' · ≈ ' + LP.money(i.cost) + '</div></div></div>';
          }).join('') + '</div><div class="row between" style="padding:18px 24px;background:var(--color-surface-alt)"><span class="muted">Total estimado (último preço pago)</span><b class="num" style="font-size:18px">' + LP.money(shopTotal) + '</b></div></div>' +
          '<div class="row-wrap mt-16"><button class="btn btn-secondary" data-action="copy-shop">' + ic('copy', 18) + 'Copiar lista</button><button class="btn btn-primary" data-action="open-buy">' + ic('cart', 18) + 'Registrar compra</button></div>';
      }
    } else {
      var all = [];
      LP.materials.forEach(function (m) {
        m.lots.forEach(function (l) { all.push({ d: l.d, t: 'compra', m: m, qty: l.qty, note: l.store + ' · ' + LP.money(l.paid) }); });
        m.moves.forEach(function (v) { all.push({ d: v.d, t: v.t, m: m, qty: v.qty, note: (v.ref ? v.ref + ' · ' : '') + v.note }); });
      });
      all.sort(function (a, b) { return a.d < b.d ? 1 : -1; });
      var tmap = { compra: ['b-success', 'Compra', 'arrow-down-left'], consumo: ['b-primary', 'Consumo', 'yarn'], perda: ['b-error', 'Perda', 'trending-down'], ajuste: ['b-neutral', 'Ajuste', 'refresh'] };
      body = '<div class="card pad-0"><div class="rows">' + all.slice(0, 24).map(function (e) {
        var t = tmap[e.t];
        return '<a class="li click" href="#/estoque/' + e.m.id + '" style="padding:14px 24px;margin:0;border-radius:0"><span class="small faint nowrap" style="width:44px">' + LP.dshort(e.d) + '</span><div class="grow"><div class="t" style="font-weight:500">' + LP.esc(e.m.name) + '</div><div class="s">' + LP.esc(e.note) + '</div></div>' + LP.badge(t[1], t[0]) + '<b class="num nowrap ' + (e.qty > 0 ? 'pos' : '') + '" style="min-width:76px;text-align:right">' + (e.qty > 0 ? '+' : '−') + LP.qty(Math.abs(e.qty), e.m.unit) + '</b></a>';
      }).join('') + '</div></div><p class="small muted mt-8">Mostrando as 24 movimentações mais recentes.</p>';
    }
    return head + summary + tabs + body;
  };

  /* ------------------------------------------------------------------
     DETALHE DO MATERIAL
     ------------------------------------------------------------------ */
  LP.screens.material = function (id) {
    var m = LP.mat(id); if (!m) return LP.pageHead('Material não encontrado', '');
    var st = LP.matStats(m), s = S();
    var head = LP.pageHead(LP.esc(m.name), m.type.charAt(0).toUpperCase() + m.type.slice(1) + ' · medido em ' + (m.unit === 'g' ? 'gramas' : 'unidades'),
      '<button class="btn btn-secondary" data-action="open-loss" data-arg="' + m.id + '">' + ic('trending-down', 18) + 'Perda</button><button class="btn btn-secondary" data-action="open-adjust" data-arg="' + m.id + '">' + ic('refresh', 18) + 'Ajustar</button><button class="btn btn-primary" data-action="open-buy" data-arg="' + m.id + '">' + ic('plus', 18) + 'Registrar compra</button>');

    var pctv = Math.max(0, Math.min(100, st.stock / (m.min * 2) * 100));
    var phys = '<div class="card"><div class="row between"><span class="eyebrow">' + ic('package', 14) + ' No armário (físico)</span>' + LP.stockBadge(st.level) + '</div>' +
      '<div class="display-num mt-8" style="font-size:44px">' + LP.num(st.stock) + ' <span style="font-size:20px;font-family:var(--font-sans);font-weight:500" class="muted">' + m.unit + '</span></div>' + (LP.pkgNote(m, st.stock) ? '<div class="muted">' + LP.pkgNote(m, st.stock) + '</div>' : '') +
      '<div class="bar ' + (st.level === 'low' ? 'err' : st.level === 'near' ? 'warn' : '') + ' mt-16"><i style="width:' + pctv + '%"></i><span class="mark" style="left:50%"></span></div><div class="row between small muted mt-8"><span>0</span><span>mínimo ' + LP.qtyP(m.min, m) + '</span><span>' + LP.qty(m.min * 2, m.unit) + '</span></div>' +
      (st.level !== 'ok' ? '<div class="alert ' + (st.level === 'low' ? 'alert-error' : 'alert-warning') + ' mt-16">' + ic('alert', 20) + '<div class="a-body"><div class="a-title">' + (st.level === 'low' ? 'Abaixo do estoque mínimo' : 'Perto do estoque mínimo') + '</div><p>Faltam ' + LP.qtyP(Math.max(0, m.min - st.stock), m) + ' para o mínimo. <a href="#/estoque" data-tab="compras">Ver lista de compras</a>.</p></div></div>' : '') + '</div>';

    var fin = '<div class="card"><div class="row between"><span class="eyebrow">' + ic('wallet', 14) + ' Em dinheiro (financeiro)</span></div>' +
      '<div class="stack-sm mt-8"><div class="kv"><span class="k">Custo médio por ' + m.unit + ' ' + LP.tip('Média ponderada de todas as compras: total pago ÷ total comprado. É o custo usado na precificação.') + '</span><span class="v">' + LP.moneyU(st.avg) + '</span></div>' +
      '<div class="kv"><span class="k">Última compra, por ' + m.unit + '</span><span class="v">' + LP.moneyU(st.lastCost) + ' <span class="small ' + (st.lastCost > st.avg ? 'neg' : 'pos') + '">' + (st.lastCost > st.avg ? '▲' : '▼') + '</span></span></div>' +
      '<div class="kv"><span class="k">Valor parado em estoque</span><span class="v">' + LP.money(st.value) + '</span></div>' +
      '<div class="kv"><span class="k">Total já investido</span><span class="v">' + LP.money(st.paid) + '</span></div></div>' +
      '<p class="small muted mt-16">' + ic('info', 14) + ' Quantidade e valor são coisas diferentes: o estoque físico diminui quando você usa o material, e o dinheiro só vira custo na venda da peça.</p></div>';

    var f = st.forecast;
    var forecast = '<div class="card sand flat">' + (f && f.daysLeft != null ?
      '<span class="eyebrow">' + ic('calendar', 14) + ' Quando comprar de novo</span><div class="display-num mt-8" style="font-size:28px">por volta de ' + LP.dshort(f.date) + '</div><p class="muted mt-8">Você usa em média <b>' + LP.num(f.perDay, 1) + ' ' + m.unit + '/dia</b> (base: últimos ' + f.span + ' dias). Com ' + LP.qty(st.stock, m.unit) + ', dura cerca de <b>' + Math.round(f.daysLeft) + ' dias</b>.</p>' :
      '<span class="eyebrow">' + ic('calendar', 14) + ' Quando comprar de novo</span><p class="mt-8"><b>Ainda sem dados suficientes.</b></p><p class="muted">Precisamos de pelo menos 3 usos ao longo de 30 dias para estimar. Até lá, confie no estoque mínimo.</p>') + '</div>';

    var used = LP.products.filter(function (p) { return p.mats.some(function (r) { return r[0] === m.id; }); });
    var usedCard = '<div class="card"><div class="card-head"><h3>' + ic('package', 18) + ' Usado nestes produtos</h3></div><div class="rows">' + used.map(function (p) {
      var r = p.mats.filter(function (x) { return x[0] === m.id; })[0];
      return '<a class="li click" href="#/produtos/' + p.id + '" style="padding:10px 12px">' + LP.art(p.art, 'sm') + '<div class="grow"><div class="t" style="font-weight:500">' + LP.esc(p.name) + '</div><div class="s">' + LP.qty(r[1], m.unit) + ' por peça · ' + LP.money(r[1] * st.avg) + '</div></div></a>';
    }).join('') + '</div></div>';

    var tab = s.matTab || 'compras';
    var tabs = '<div class="tabs" role="tablist">' + [['compras', 'Compras', m.lots.length], ['consumo', 'Consumo em peças', m.moves.filter(function (v) { return v.t === 'consumo'; }).length], ['perdas', 'Perdas e ajustes', m.moves.filter(function (v) { return v.t !== 'consumo'; }).length]].map(function (t) { return '<button role="tab" aria-selected="' + (tab === t[0]) + '" data-action="set-mattab" data-arg="' + t[0] + '">' + t[1] + ' <span class="badge b-neutral">' + t[2] + '</span></button>'; }).join('') + '</div>';
    var tbody;
    if (tab === 'compras') {
      tbody = '<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Loja</th><th class="right">Quantidade</th><th class="right">Total pago</th><th class="right">Custo / ' + m.unit + '</th></tr></thead><tbody>' + m.lots.slice().reverse().map(function (l) { return '<tr><td>' + LP.dfull(l.d) + '</td><td>' + LP.esc(l.store) + '<div class="sub">' + l.pay + '</div></td><td class="right num">' + (m.pkg ? '<b>' + LP.num(l.u != null ? l.u : l.qty / m.pkg.size, 0) + ' ' + LP.pkgName(m, l.u != null ? l.u : l.qty / m.pkg.size) + '</b><div class="sub">de ' + LP.qty(l.size || m.pkg.size, m.unit) + ' = ' + LP.qty(l.qty, m.unit) + '</div>' : LP.qty(l.qty, m.unit)) + '</td><td class="right num">' + LP.money(l.paid) + '</td><td class="right num"><b>' + LP.moneyU(l.paid / l.qty) + '</b></td></tr>'; }).join('') + '</tbody><tfoot><tr><td colspan="2">Total</td><td class="right num">' + LP.qtyP(st.bought, m) + '</td><td class="right num">' + LP.money(st.paid) + '</td><td class="right num">' + LP.moneyU(st.avg) + ' <span class="small muted">(média)</span></td></tr></tfoot></table></div>';
    } else if (tab === 'consumo') {
      var cs = m.moves.filter(function (v) { return v.t === 'consumo'; }).reverse();
      tbody = cs.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Pedido / peça</th><th class="right">Quantidade</th><th class="right">Custo</th></tr></thead><tbody>' + cs.map(function (v) { return '<tr><td>' + LP.dfull(v.d) + '</td><td><b>' + LP.esc(v.ref) + '</b><div class="sub">' + LP.esc(v.note) + '</div></td><td class="right num">−' + LP.qty(-v.qty, m.unit) + '</td><td class="right num">' + LP.money(-v.qty * st.avg) + '</td></tr>'; }).join('') + '</tbody><tfoot><tr><td colspan="2">Total consumido em peças</td><td class="right num">−' + LP.qty(st.cons, m.unit) + '</td><td class="right num">' + LP.money(st.cons * st.avg) + '</td></tr></tfoot></table></div>' : LP.empty({ compact: true, ill: 'yarn', title: 'Sem consumo registrado', text: 'O consumo aparece quando um pedido entra em produção.' });
    } else {
      var pl = m.moves.filter(function (v) { return v.t !== 'consumo'; }).reverse();
      tbody = pl.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Tipo</th><th>Motivo</th><th class="right">Quantidade</th></tr></thead><tbody>' + pl.map(function (v) { return '<tr><td>' + LP.dfull(v.d) + '</td><td>' + (v.t === 'perda' ? LP.badge('Perda', 'b-error') : LP.badge('Ajuste', 'b-neutral')) + '</td><td>' + LP.esc(v.note) + '</td><td class="right num">−' + LP.qty(-v.qty, m.unit) + '</td></tr>'; }).join('') + '</tbody></table></div>' : LP.empty({ compact: true, ill: 'box', title: 'Nenhuma perda ou ajuste', text: 'Registre aqui sobras inutilizáveis ou correções de contagem.' });
    }
    var rule = '<div class="card sand flat pad-sm"><b>' + ic('calculator', 16) + ' Como o estoque é calculado</b><p class="mt-8 muted"><b class="num">' + LP.qty(st.bought, m.unit) + '</b> comprado − <b class="num">' + LP.qty(st.cons, m.unit) + '</b> usado em peças − <b class="num">' + LP.qty(st.lost, m.unit) + '</b> de perdas − <b class="num">' + LP.qty(st.adj, m.unit) + '</b> de ajustes = <b class="num">' + LP.qty(st.stock, m.unit) + '</b>. O consumo é baixado <u>uma só vez</u>, quando o pedido entra em “Em produção”.</p></div>';

    return head + '<div class="grid g-2">' + phys + fin + '</div><div class="grid g-main-side mt-16"><div class="stack"><div class="card pad-0"><div style="padding:20px 24px 0">' + tabs + '</div>' + tbody + '</div>' + rule + '</div><div class="stack">' + forecast + usedCard + '</div></div>';
  };

  /* ---------- Modais de estoque ---------- */
  // Campos de quantidade: material em novelo/rolo/pacote => "quantos" x "quanto tem cada"; senão, quantidade simples
  function buyQtyFields(m) {
    if (m.pkg) {
      return LP.field('Quantos ' + m.pkg.plural + ' comprou', '<div class="stepper" style="width:100%;justify-content:space-between"><button type="button" data-action="buy-step" data-arg="-1" aria-label="Diminuir">' + ic('minus', 18) + '</button><input id="b-units" class="input num-in" style="border:0;text-align:center;min-height:46px;max-width:90px" type="number" min="0" step="1" inputmode="numeric" value="2" data-input="buy-calc" aria-label="Quantidade de ' + m.pkg.plural + '"/><button type="button" data-action="buy-step" data-arg="1" aria-label="Aumentar">' + ic('plus', 18) + '</button></div>', { for: 'b-units' }) +
        LP.field('Cada ' + m.pkg.name + ' tem', '<div class="input-group"><input id="b-size" class="input num-in" type="number" min="0" step="1" inputmode="decimal" value="' + m.pkg.size + '" data-input="buy-calc"/><span class="suffix">' + m.unit + '</span></div>', { for: 'b-size', help: 'Está no rótulo. Ex.: 100 g.' });
    }
    return LP.field('Quantidade comprada', '<div class="input-group"><input id="b-qty" class="input num-in" type="number" min="0" step="1" inputmode="decimal" placeholder="10" data-input="buy-calc"/><span class="suffix">' + m.unit + '</span></div>', { for: 'b-qty', cls: 'full' });
  }
  function buyQty() {
    var m = LP.mat(document.getElementById('b-mat').value), uEl = document.getElementById('b-units');
    if (m.pkg && uEl) { var u = +uEl.value || 0, sz = +document.getElementById('b-size').value || 0; return { m: m, units: u, size: sz, q: u * sz }; }
    return { m: m, units: null, size: null, q: +(document.getElementById('b-qty') || {}).value || 0 };
  }
  LP.act['open-buy'] = function (el) {
    var pre = el && el.dataset.arg, first = LP.mat(pre) || LP.materials[0];
    LP.openModal({
      title: 'Registrar compra de material',
      body: '<div class="form-grid">' +
        LP.field('Material', '<select id="b-mat" class="select" data-input="buy-mat">' + LP.materials.map(function (m) { return '<option value="' + m.id + '"' + (first.id === m.id ? ' selected' : '') + '>' + LP.esc(m.name) + '</option>'; }).join('') + '</select>', { cls: 'full', for: 'b-mat' }) +
        '<div class="full form-grid" id="b-qtyfields" style="gap:16px">' + buyQtyFields(first) + '</div>' +
        '<div class="full" id="b-total" aria-live="polite"></div>' +
        LP.field('Total pago', '<div class="input-group"><span class="prefix">R$</span><input id="b-paid" class="input money" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" data-input="buy-calc"/></div>', { for: 'b-paid', cls: 'full', help: 'O valor de tudo junto, como no cupom.' }) +
        '<div class="full alert alert-neutral" id="b-calc" aria-live="polite">' + ic('calculator', 20) + '<div class="a-body">Informe quantidade e valor para ver o custo.</div></div>' +
        LP.field('Loja', '<input id="b-store" class="input" placeholder="Ex.: Mercado dos Fios"/>', { for: 'b-store', opt: true }) +
        LP.field('Forma de pagamento', '<select id="b-pay" class="select"><option>Pix</option><option>Cartão de crédito</option><option>Cartão de débito</option><option>Dinheiro</option></select>', { for: 'b-pay' }) +
        '</div><p class="help mt-16">A compra entra no <b>caixa</b> como saída hoje e soma ao estoque. Ela só vira <b>custo</b> quando o material for usado em uma peça vendida.</p>',
      foot: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-buy">' + ic('check', 18) + 'Salvar compra</button>'
    });
    LP.hooks.buyCalc();
  };
  LP.hooks.buyMat = function () { var m = LP.mat(document.getElementById('b-mat').value); document.getElementById('b-qtyfields').innerHTML = buyQtyFields(m); LP.hooks.buyCalc(); };
  LP.act['buy-step'] = function (el) { var i = document.getElementById('b-units'); i.value = Math.max(1, (+i.value || 0) + (+el.dataset.arg)); LP.hooks.buyCalc(); };
  LP.hooks.buyCalc = function () {
    var x = buyQty(), m = x.m, p = +document.getElementById('b-paid').value, q = x.q;
    var st = LP.matStats(m), el = document.getElementById('b-calc'), tot = document.getElementById('b-total');
    tot.innerHTML = m.pkg && q > 0 ? '<div class="pkg-total">' + ic('package', 18) + '<span><b>' + LP.num(x.units) + ' ' + LP.pkgName(m, x.units) + ' × ' + LP.qty(x.size, m.unit) + ' = ' + LP.qty(q, m.unit) + '</b> no total</span></div>' : '';
    if (q > 0 && p > 0) {
      var u = p / q, d = (u - st.avg) / st.avg * 100;
      el.className = 'full alert ' + (d > 5 ? 'alert-warning' : 'alert-success');
      el.innerHTML = ic('calculator', 20) + '<div class="a-body"><div class="a-title">' + LP.moneyU(u) + ' por ' + m.unit + (m.pkg ? ' · ' + LP.money(p / x.units) + ' por ' + m.pkg.name : '') + '</div><p>' + (Math.abs(d) < 1 ? 'Igual' : LP.pct(Math.abs(d), 0) + (d > 0 ? ' mais caro' : ' mais barato')) + ' que seu custo médio de ' + LP.moneyU(st.avg) + '/' + m.unit + '. Estoque passa de ' + LP.qtyP(st.stock, m) + ' para <b>' + LP.qtyP(st.stock + q, m) + '</b>.</p></div>';
    } else { el.className = 'full alert alert-neutral'; el.innerHTML = ic('calculator', 20) + '<div class="a-body">Informe quantidade e valor para ver o custo.</div>'; }
  };
  LP.act['save-buy'] = function () {
    var x = buyQty(), m = x.m, q = x.q, p = +document.getElementById('b-paid').value;
    if (!(q > 0 && p > 0)) { LP.toast('Preencha quantidade e valor', { type: 'err', sub: 'Os dois precisam ser maiores que zero.' }); return; }
    var lot = { d: iso(LP.TODAY), qty: q, paid: p, store: document.getElementById('b-store').value || '—', pay: document.getElementById('b-pay').value };
    if (m.pkg) { lot.u = x.units; lot.size = x.size; }
    m.lots.push(lot);
    LP.closeModal(); LP.render();
    LP.toast('Compra registrada', { sub: m.name + ': ' + LP.qtyP(q, m) + ' somados. Agora são ' + LP.qtyP(LP.matStats(m).stock, m) + '. Saída de ' + LP.money(p) + ' no caixa.' });
  };
  function moveModal(kind, el) {
    var pre = el && el.dataset.arg, isLoss = kind === 'perda';
    LP.openModal({
      title: isLoss ? 'Registrar perda' : 'Ajustar contagem',
      body: '<div class="form-grid">' + LP.field('Material', '<select id="mv-mat" class="select">' + LP.materials.map(function (m) { return '<option value="' + m.id + '"' + (pre === m.id ? ' selected' : '') + '>' + LP.esc(m.name) + ' (' + LP.qty(LP.matStats(m).stock, m.unit) + ')</option>'; }).join('') + '</select>', { cls: 'full', for: 'mv-mat' }) +
        LP.field(isLoss ? 'Quantidade perdida' : 'Quantidade a retirar', '<input id="mv-qty" class="input num-in" type="number" min="0" step="1" inputmode="decimal" placeholder="0"/>', { for: 'mv-qty', help: isLoss ? '' : 'Para aumentar o estoque, registre uma compra.' }) +
        LP.field('Motivo', '<input id="mv-note" class="input" placeholder="' + (isLoss ? 'Ex.: fio emaranhado' : 'Ex.: contagem física') + '"/>', { for: 'mv-note' }) + '</div>' +
        '<div class="alert alert-info mt-16">' + ic('info', 20) + '<div class="a-body">Perdas e ajustes diminuem o estoque, mas <b>não entram no caixa</b>. ' + (isLoss ? 'O custo da perda é reconhecido como despesa do ateliê.' : '') + '</div></div>',
      foot: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-move" data-arg="' + kind + '">Salvar</button>'
    });
  }
  LP.act['open-loss'] = function (el) { moveModal('perda', el); };
  LP.act['open-adjust'] = function (el) { moveModal('ajuste', el); };
  LP.act['save-move'] = function (el) {
    var m = LP.mat(document.getElementById('mv-mat').value), q = +document.getElementById('mv-qty').value;
    if (!(q > 0)) { LP.toast('Informe a quantidade', { type: 'err' }); return; }
    m.moves.push({ d: iso(LP.TODAY), t: el.dataset.arg, qty: -q, ref: '', note: document.getElementById('mv-note').value || (el.dataset.arg === 'perda' ? 'Perda' : 'Ajuste de contagem') });
    LP.closeModal(); LP.render(); LP.toast(el.dataset.arg === 'perda' ? 'Perda registrada' : 'Contagem ajustada', { sub: m.name + ': ' + LP.qty(LP.matStats(m).stock, m.unit) + ' em estoque.', undo: true });
  };

  /* ------------------------------------------------------------------
     PEDIDOS — lista e quadro
     ------------------------------------------------------------------ */
  LP.screens.orders = function () {
    var s = S();
    var head = LP.pageHead('Pedidos e produção', 'Do orçamento à entrega: o que está em andamento, o que atrasou e quanto falta receber.',
      '<div class="seg" role="group" aria-label="Visualização"><button aria-pressed="' + (s.orderView === 'list') + '" data-action="set-orderview" data-arg="list">' + ic('list', 18) + 'Lista</button><button aria-pressed="' + (s.orderView === 'board') + '" data-action="set-orderview" data-arg="board">' + ic('kanban', 18) + 'Quadro</button></div>' +
      '<a class="btn btn-primary" href="#/pedidos/novo">' + ic('plus', 18) + 'Novo pedido</a>');
    if (s.loading) return head + '<div class="grid g-3">' + LP.skeletonCards(3) + '</div>';
    if (s.empty) return head + LP.empty({ ill: 'yarn', title: 'Nenhum pedido por aqui ainda', text: 'Quando uma cliente pedir uma peça, anote aqui: prazo, sinal e detalhes ficam organizados.', actions: '<a class="btn btn-primary" href="#/pedidos/novo">' + ic('plus', 18) + 'Novo pedido</a>' });

    var open = LP.orders.filter(LP.isOpen), late = open.filter(LP.isLate);
    var recv = open.reduce(function (a, o) { return a + LP.orderBalance(o); }, 0);
    var strip = '<div class="grid g-4 keep2 mini-metrics">' +
      '<div class="card metric"><div class="m-label">Em andamento</div><div class="m-val">' + open.length + '</div></div>' +
      '<div class="card metric ' + (late.length ? 'metric-alert' : '') + '"><div class="m-label">Atrasados</div><div class="m-val ' + (late.length ? 'neg' : '') + '">' + late.length + '</div></div>' +
      '<div class="card metric"><div class="m-label">Aguardando sinal</div><div class="m-val">' + open.filter(function (o) { return o.pays.length === 0; }).length + '</div></div>' +
      '<div class="card metric"><div class="m-label">Saldo a receber</div><div class="m-val">' + LP.money(recv) + '</div></div></div>';

    var f = s.orderFilter;
    var fl = [['open', 'Em andamento', open.length], ['orcamento', 'Orçamento', null], ['producao', 'Produção', null], ['entrega', 'Entrega', null], ['done', 'Concluídos', LP.orders.filter(function (o) { return o.status === 'Entregue'; }).length], ['cancel', 'Cancelados', LP.orders.filter(function (o) { return o.status === 'Cancelado'; }).length], ['all', 'Todos', LP.orders.length]];
    var list = LP.orders.filter(function (o) {
      var ph = LP.phaseOf(o.status);
      if (f === 'open' && !LP.isOpen(o)) return false;
      if (['orcamento', 'producao', 'entrega', 'done', 'cancel'].indexOf(f) > -1 && ph !== f) return false;
      if (s.orderQ) { var q = s.orderQ.toLowerCase(); if ((o.client + ' ' + LP.orderName(o) + ' ' + o.id).toLowerCase().indexOf(q) < 0) return false; }
      return true;
    });
    list.sort(function (a, b) {
      if (s.orderSort === 'recent') return b.id - a.id;
      if (s.orderSort === 'value') return b.total - a.total;
      return a.deadline < b.deadline ? -1 : 1;
    });

    var bar = '<div class="toolbar mt-16"><div class="search">' + ic('search', 18) + '<input class="input" type="search" placeholder="Buscar cliente, peça ou nº" value="' + LP.esc(s.orderQ) + '" data-input="order-q" aria-label="Buscar pedido"/></div>' +
      '<select class="select tb-select" data-input="order-sort" aria-label="Ordenar"><option value="deadline"' + (s.orderSort === 'deadline' ? ' selected' : '') + '>Prazo mais próximo</option><option value="recent"' + (s.orderSort === 'recent' ? ' selected' : '') + '>Mais recentes</option><option value="value"' + (s.orderSort === 'value' ? ' selected' : '') + '>Maior valor</option></select></div>' +
      (s.orderView === 'list' ? '<div class="chips scroll mt-8" role="group" aria-label="Filtrar por situação">' + fl.map(function (x) { return '<button class="chip" aria-pressed="' + (f === x[0]) + '" data-action="set-orderfilter" data-arg="' + x[0] + '">' + x[1] + (x[2] != null ? ' <span class="cnt">' + x[2] + '</span>' : '') + '</button>'; }).join('') + '</div>' : '');

    var body = s.orderView === 'board' ? board(s) : (list.length ? ordersList(list) : '<div class="mt-16">' + LP.empty({ compact: true, ill: 'box', title: 'Nenhum pedido neste filtro', text: 'Mude o filtro ou a busca para ver outros pedidos.' }) + '</div>');
    return head + strip + bar + body;
  };

  function qa(o) { // ação rápida contextual
    var nx = LP.nextStatus(o.status);
    if (!nx) return '';
    return '<button class="btn btn-secondary btn-sm" data-action="advance-order" data-arg="' + o.id + '" title="Avançar para: ' + nx + '">' + ic('arrow-right', 16) + '<span class="hide-md">' + (o.status === 'Aguardando entrega' ? 'Concluir entrega' : 'Avançar') + '</span></button>';
  }
  function ordersList(list) {
    var rows = list.map(function (o) {
      var n = LP.orderDays(o), bal = LP.orderBalance(o);
      return '<tr class="click" data-href="#/pedidos/' + o.id + '"><td class="nowrap"><b>#' + o.id + '</b></td><td><div class="row">' + LP.art(LP.orderArt(o), 'sm') + '<div><div class="name">' + LP.esc(o.client) + '</div><div class="sub">' + LP.esc(LP.orderName(o)) + (o.qty > 1 ? ' × ' + o.qty : '') + (o.custom ? ' · personalizada' : '') + '</div></div></div></td>' +
        '<td class="right num">' + LP.money(o.total) + '</td><td class="right num">' + (o.status === 'Cancelado' ? '—' : (bal > 0.01 ? '<span class="warn"><b>' + LP.money(bal) + '</b></span>' : '<span class="pos">Pago</span>')) + '</td>' +
        '<td class="nowrap">' + (LP.isOpen(o) ? LP.dshort(o.deadline) + '<div class="sub ' + (n < 0 ? 'neg' : '') + '">' + LP.rel(n) + '</div>' : (o.delivered ? LP.dshort(o.delivered) + '<div class="sub">entregue</div>' : '—')) + '</td>' +
        '<td>' + LP.statusBadge(o.status) + (LP.deadlineBadge(o) ? '<div class="mt-8">' + LP.deadlineBadge(o) + '</div>' : '') + '</td>' +
        '<td class="right nowrap" onclick="event.stopPropagation()">' + qa(o) + LP.menu('om' + o.id, ic('more', 20), [{ icon: 'eye', label: 'Abrir detalhes', action: 'go', arg: '#/pedidos/' + o.id }, { icon: 'chat', label: 'Mensagem no WhatsApp', action: 'open-wa', arg: o.id }, { icon: 'wallet', label: 'Registrar pagamento', action: 'open-pay', arg: o.id }], { btnClass: 'btn btn-ghost btn-icon btn-sm', aria: 'Mais ações do pedido ' + o.id }) + '</td></tr>';
    }).join('');
    var cards = list.map(function (o) {
      var n = LP.orderDays(o), bal = LP.orderBalance(o);
      return '<a class="card pad-sm clickable ord-card" href="#/pedidos/' + o.id + '"><div class="row">' + LP.art(LP.orderArt(o), 'md') + '<div class="grow"><div class="row between"><b>#' + o.id + ' · ' + LP.esc(o.client) + '</b></div><div class="small muted">' + LP.esc(LP.orderName(o)) + (o.qty > 1 ? ' × ' + o.qty : '') + '</div><div class="mt-8">' + LP.statusBadge(o.status) + '</div></div></div><div class="row between mt-16 small"><span class="muted">' + (LP.isOpen(o) ? 'Prazo ' + LP.dshort(o.deadline) + ' · <b class="' + (n < 0 ? 'neg' : '') + '">' + LP.rel(n) + '</b>' : (o.delivered ? 'Entregue ' + LP.dshort(o.delivered) : '—')) + '</span><span class="num"><b>' + LP.money(o.total) + '</b>' + (bal > 0.01 && o.status !== 'Cancelado' ? ' · <span class="warn">saldo ' + LP.money(bal) + '</span>' : '') + '</span></div></a>';
    }).join('');
    return '<div class="card pad-0 mt-16 hide-sm"><div class="table-wrap"><table class="table"><thead><tr><th>Nº</th><th class="mw">Cliente e peça</th><th class="right">Total</th><th class="right">A receber</th><th>Prazo</th><th>Etapa</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div><div class="stack-sm mt-16 only-sm">' + cards + '</div>';
  }

  function board(s) {
    var open = LP.orders.filter(LP.isOpen);
    var tabs = '<div class="seg block only-sm mt-16" role="tablist">' + LP.phases.map(function (ph) { return '<button role="tab" aria-pressed="' + (s.kPhase === ph.id) + '" data-action="set-kphase" data-arg="' + ph.id + '">' + ph.name + ' <span class="cnt">' + open.filter(function (o) { return ph.statuses.indexOf(o.status) > -1; }).length + '</span></button>'; }).join('') + '</div>';
    var cols = LP.phases.map(function (ph) {
      var os = open.filter(function (o) { return ph.statuses.indexOf(o.status) > -1; });
      var groups = ph.statuses.map(function (st) {
        var g = os.filter(function (o) { return o.status === st; }).sort(function (a, b) { return a.deadline < b.deadline ? -1 : 1; });
        if (!g.length) return '';
        return '<div class="k-sub">' + LP.esc(st) + ' <span>' + g.length + '</span></div>' + g.map(kcard).join('');
      }).join('');
      return '<section class="kcol ' + (s.kPhase === ph.id ? 'active' : '') + '" data-phase="' + ph.id + '" aria-label="' + ph.name + '"><header class="k-head"><div><h2>' + ph.name + '</h2><span class="small muted">' + ph.hint + '</span></div><span class="badge b-neutral">' + os.length + '</span></header><div class="k-body" data-drop="' + ph.id + '">' + (groups || '<div class="k-empty">' + ic('yarn', 22) + '<span>Nenhum pedido aqui</span></div>') + '</div></section>';
    }).join('');
    var done = LP.orders.filter(function (o) { return o.status === 'Entregue'; }), canc = LP.orders.filter(function (o) { return o.status === 'Cancelado'; });
    var closed = '<details class="card pad-sm mt-16 closed-box"><summary>' + ic('check-circle', 20) + '<b>Concluídos e cancelados</b><span class="badge b-success">' + done.length + ' entregues</span><span class="badge b-neutral">' + canc.length + ' cancelado' + (canc.length === 1 ? '' : 's') + '</span>' + ic('chevron-down', 18, 'chev') + '</summary><div class="rows mt-16">' + done.concat(canc).sort(function (a, b) { return b.id - a.id; }).map(function (o) {
      return '<a class="li click" href="#/pedidos/' + o.id + '" style="padding:10px 12px">' + LP.art(LP.orderArt(o), 'sm') + '<div class="grow"><div class="t" style="font-weight:500">#' + o.id + ' · ' + LP.esc(o.client) + '</div><div class="s">' + LP.esc(LP.orderName(o)) + '</div></div>' + LP.statusBadge(o.status) + '<b class="num hide-sm" style="min-width:80px;text-align:right">' + LP.money(o.total) + '</b></a>';
    }).join('') + '</div></details>';
    return tabs + '<div class="board mt-16">' + cols + '</div><p class="small muted mt-8 hide-sm">' + ic('info', 14) + ' Arraste um cartão para outra coluna ou use “Avançar”. Cada coluna agrupa as 11 etapas atuais do sistema em três fases.</p>' + closed;
  }
  function kcard(o) {
    var n = LP.orderDays(o), bal = LP.orderBalance(o), nx = LP.nextStatus(o.status);
    return '<article class="kcard ' + (LP.isLate(o) ? 'late' : '') + '" draggable="true" data-drag="' + o.id + '" tabindex="0">' +
      '<a class="kc-top" href="#/pedidos/' + o.id + '">' + LP.art(LP.orderArt(o), 'sm') + '<div class="grow"><div class="row between"><b>' + LP.esc(o.client) + '</b><span class="small faint">#' + o.id + '</span></div><div class="small muted">' + LP.esc(LP.orderName(o)) + (o.qty > 1 ? ' × ' + o.qty : '') + '</div></div></a>' +
      '<div class="kc-mid"><span class="small ' + (n < 0 ? 'neg' : n <= 3 ? 'warn' : 'muted') + '">' + ic('clock', 13) + ' ' + LP.dshort(o.deadline) + ' · ' + LP.rel(n) + '</span><span class="num small"><b>' + LP.money(o.total) + '</b></span></div>' +
      '<div class="kc-bot">' + (o.pays.length === 0 ? LP.badge('Sinal pendente', 'b-warning', 'wallet') : bal > 0.01 ? LP.badge('Saldo ' + LP.money(bal), 'b-neutral') : LP.badge('Pago', 'b-success', 'check')) +
      (nx ? '<button class="btn btn-ghost btn-sm" data-action="advance-order" data-arg="' + o.id + '" aria-label="Avançar pedido ' + o.id + ' para ' + nx + '">' + (o.status === 'Aguardando entrega' ? 'Entregar' : 'Avançar') + ic('arrow-right', 16) + '</button>' : '') + '</div></article>';
  }

  LP.act['advance-order'] = function (el) {
    var o = LP.order(el.dataset.arg), nx = LP.nextStatus(o.status);
    if (!nx) return;
    if (nx === 'Entregue' && LP.orderBalance(o) > 0.01) {
      LP.confirm({ title: 'Concluir entrega do pedido #' + o.id, text: 'Ainda há <b>' + LP.money(LP.orderBalance(o)) + '</b> a receber de ' + LP.esc(o.client) + '. Ao concluir, o saldo é registrado como recebido hoje e a venda passa a contar no faturamento.', ok: 'Entregar e receber saldo', onOk: function () { LP.addPayment(o, LP.orderBalance(o), 'Pix'); LP.setStatus(o, 'Entregue'); LP.closeModal(); LP.render(); LP.toast('Pedido #' + o.id + ' entregue', { sub: 'Saldo recebido e venda reconhecida no resultado.', undo: true }); } });
      return;
    }
    if (nx === 'Em produção' && o.pid && !LP.isConsumed(o)) {
      var miss = [];
      LP.prod(o.pid).mats.forEach(function (r) { var mm = LP.mat(r[0]), st = LP.matStats(mm), need = r[1] * o.qty; if (st.stock < need) miss.push({ m: mm, need: need, stock: st.stock }); });
      if (miss.length) {
        LP.openModal({ title: 'Faltam materiais para começar', body: '<div class="alert alert-warning">' + ic('alert', 20) + '<div class="a-body"><div class="a-title">O pedido #' + o.id + ' precisa de mais material do que você tem</div><p>' + miss.map(function (x) { return LP.esc(x.m.name) + ': precisa de ' + LP.qty(x.need, x.m.unit) + ', tem ' + LP.qty(Math.max(0, x.stock), x.m.unit); }).join('<br>') + '</p></div></div><p class="muted mt-16">Ao iniciar, o material é baixado do estoque <b>uma única vez</b>. Se continuar agora, o estoque fica negativo até você registrar a compra.</p>', foot: '<button class="btn btn-secondary" data-action="open-buy" data-arg="' + miss[0].m.id + '">' + ic('cart', 18) + 'Registrar compra</button><button class="btn btn-primary" data-action="start-anyway" data-arg="' + o.id + '">Iniciar mesmo assim</button>' });
        return;
      }
    }
    var m = LP.setStatus(o, nx); LP.render();
    LP.toast('Pedido #' + o.id + ' → ' + nx, { sub: m.join('. ') || undefined, undo: true });
  };
  LP.act['start-anyway'] = function (el) {
    var o = LP.order(el.dataset.arg), m = LP.setStatus(o, 'Em produção'); LP.closeModal(); LP.render();
    LP.toast('Produção iniciada', { type: 'warn', sub: 'Estoque negativo até registrar a compra. ' + m.join('. ') });
  };

  /* ------------------------------------------------------------------
     NOVO PEDIDO — fluxo em 6 etapas
     ------------------------------------------------------------------ */
  var STEPS = ['Cliente', 'Peça', 'Detalhes', 'Preço e prazo', 'Sinal', 'Revisão'];
  function wizInit(arg) {
    var s = S(), w = s.wiz;
    if (!w || w.done) w = s.wiz = { step: 1, client: '', newClient: false, nName: '', nPhone: '', pid: arg && arg.produto || null, custom: false, cName: '', qty: 1, details: '', color: '', size: '', price: 0, priceTouched: false, deadline: '', deadTouched: false, pct: LP.settings.signalPercent, received: false, method: 'Pix' };
    if (w.pid && !w.priceTouched) { w.price = LP.prod(w.pid).price; }
    if (arg && arg.produto && w.step === 1 && !w._pre) { w._pre = true; }
    return w;
  }
  LP.wizCalc = function (w) {
    var total = (+w.price || 0) * (+w.qty || 0), sig = total * (+w.pct || 0) / 100;
    var p = w.pid ? LP.prod(w.pid) : null;
    var hours = p ? p.hours * w.qty : 0;
    var days = p ? Math.ceil(hours / 3) + 5 : 14; // 3 h de crochê por dia + 5 dias de folga
    var sug = new Date(LP.TODAY.getTime() + days * 86400000);
    var cost = p ? LP.productCost(p).total * w.qty : null;
    // materiais que faltam (sem considerar outros pedidos)
    var miss = [];
    if (p) p.mats.forEach(function (r) { var m = LP.mat(r[0]), st = LP.matStats(m), need = r[1] * w.qty; if (st.stock < need) miss.push({ m: m, need: need, stock: st.stock }); });
    return { total: total, sig: sig, bal: total - sig, p: p, hours: hours, days: days, sug: sug, cost: cost, profit: cost != null ? total - cost : null, miss: miss };
  };
  LP.screens.newOrder = function (q) {
    var w = wizInit(q), s = S(), c = LP.wizCalc(w);
    if (!w.deadTouched) w.deadline = iso(c.sug);
    var head = LP.pageHead('Novo pedido', 'Etapa ' + w.step + ' de 6 · ' + STEPS[w.step - 1], '<a class="btn btn-ghost" href="#/pedidos">Cancelar</a>');
    var prog = '<ol class="wiz-prog" aria-label="Progresso">' + STEPS.map(function (t, i) { var n = i + 1; return '<li class="' + (n < w.step ? 'done' : n === w.step ? 'cur' : '') + '" ' + (n === w.step ? 'aria-current="step"' : '') + '><span class="dot">' + (n < w.step ? ic('check', 14) : n) + '</span><span class="lbl">' + t + '</span></li>'; }).join('') + '</ol>';
    var body = '';
    if (w.step === 1) {
      var clients = LP.clients.slice(0, 8);
      body = '<div class="card"><h2 class="step-title">Para quem é o pedido?</h2><div class="seg block mt-16"><button aria-pressed="' + !w.newClient + '" data-action="wiz-set" data-k="newClient" data-v="0">Cliente cadastrada</button><button aria-pressed="' + w.newClient + '" data-action="wiz-set" data-k="newClient" data-v="1">' + ic('user-plus', 16) + 'Nova cliente</button></div>' +
        (w.newClient ? '<div class="form-grid mt-16">' + LP.field('Nome', '<input class="input" id="w-n" data-input="wiz-nName" value="' + LP.esc(w.nName) + '" placeholder="Nome e sobrenome"/>', { for: 'w-n' }) + LP.field('WhatsApp', '<input class="input" id="w-p" data-input="wiz-nPhone" value="' + LP.esc(w.nPhone) + '" inputmode="tel" placeholder="(00) 90000-0000"/>', { for: 'w-p' }) + '</div>' :
          '<div class="stack-sm mt-16" role="radiogroup" aria-label="Clientes">' + clients.map(function (cl) { var on = w.client === cl.name; return '<button class="pick ' + (on ? 'on' : '') + '" role="radio" aria-checked="' + on + '" data-action="wiz-set" data-k="client" data-v="' + LP.esc(cl.name) + '"><span class="avatar">' + LP.initials(cl.name) + '</span><span class="grow"><b>' + LP.esc(cl.name) + '</b><span class="small muted" style="display:block">' + cl.phone + ' · ' + LP.clientStats(cl.name).count + ' pedido(s)</span></span>' + (on ? ic('check-circle', 22, 'prim') : '') + '</button>'; }).join('') + '</div>') + '</div>';
    } else if (w.step === 2) {
      body = '<div class="card"><h2 class="step-title">Qual peça ela quer?</h2><div class="seg block mt-16"><button aria-pressed="' + !w.custom + '" data-action="wiz-set" data-k="custom" data-v="0">Do catálogo</button><button aria-pressed="' + w.custom + '" data-action="wiz-set" data-k="custom" data-v="1">' + ic('sparkle', 16) + 'Peça personalizada</button></div>' +
        (w.custom ? '<div class="mt-16">' + LP.field('Descreva a peça', '<input class="input" id="w-cn" data-input="wiz-cName" value="' + LP.esc(w.cName) + '" placeholder="Ex.: Boneca da Helena, vestido azul"/>', { for: 'w-cn', help: 'Não precisa estar no catálogo. Você define o preço na etapa 4.' }) + '</div>' :
          '<div class="grid g-2 mt-16 keep2 pick-grid">' + LP.products.filter(function (p) { return p.active; }).map(function (p) { var on = w.pid === p.id; return '<button class="pick-prod ' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-action="wiz-pick-prod" data-arg="' + p.id + '">' + LP.art(p.art, 'wide') + '<b>' + LP.esc(p.name) + '</b><span class="small muted num">' + LP.money(p.price) + '</span>' + (on ? '<span class="tick">' + ic('check', 16) + '</span>' : '') + '</button>'; }).join('') + '</div>') + '</div>';
    } else if (w.step === 3) {
      body = '<div class="card"><h2 class="step-title">Detalhes da encomenda</h2><div class="form-grid mt-16">' +
        '<div class="field"><label>Quantidade</label><div class="stepper"><button data-action="wiz-qty" data-arg="-1" aria-label="Diminuir">' + ic('minus', 18) + '</button><span class="v num" id="w-qty">' + w.qty + '</span><button data-action="wiz-qty" data-arg="1" aria-label="Aumentar">' + ic('plus', 18) + '</button></div></div>' +
        LP.field('Cores', '<input class="input" id="w-col" data-input="wiz-color" value="' + LP.esc(w.color) + '" placeholder="Ex.: caramelo com laço rosa"/>', { for: 'w-col', opt: true }) +
        LP.field('Tamanho', '<input class="input" id="w-sz" data-input="wiz-size" value="' + LP.esc(w.size) + '" placeholder="' + (c.p ? c.p.size : 'Ex.: 25 cm') + '"/>', { for: 'w-sz', opt: true }) +
        LP.field('Personalização e observações', '<textarea class="textarea" id="w-det" data-input="wiz-details" placeholder="Nome bordado, fita, referência de foto, restrições…">' + LP.esc(w.details) + '</textarea>', { for: 'w-det', cls: 'full', opt: true }) + '</div>' +
        '<div id="w-miss"></div></div>';
    } else if (w.step === 4) {
      body = '<div class="card"><h2 class="step-title">Preço e prazo</h2><div class="form-grid mt-16">' +
        LP.field('Preço por unidade', '<div class="input-group"><span class="prefix">R$</span><input class="input money" id="w-pr" type="number" step="0.1" min="0" inputmode="decimal" data-input="wiz-price" value="' + (w.price || '') + '"/></div>', { for: 'w-pr', help: c.p ? 'Preço de tabela: ' + LP.money(c.p.price) + ' · sugerido: ' + LP.money(LP.productCost(c.p).suggested) : 'Peça personalizada: calcule horas × valor da hora + materiais.' }) +
        LP.field('Data prevista de entrega', '<input class="input" id="w-dl" type="date" data-input="wiz-deadline" value="' + w.deadline + '"/>', { for: 'w-dl', help: c.p ? 'Sugestão: ' + LP.dfull(c.sug) + ' (' + LP.num(c.hours, 1) + ' h de crochê ÷ 3 h por dia + 5 dias de folga).' : 'Sem catálogo: sugestão padrão de 14 dias.' }) + '</div>' +
        '<div class="alert alert-neutral mt-16" id="w-profit"></div></div>';
    } else if (w.step === 5) {
      body = '<div class="card"><h2 class="step-title">Sinal e pagamento</h2><div class="stack mt-16">' +
        '<div class="field"><label for="w-pct">Percentual do sinal <output class="prim num" id="o-pct">' + w.pct + '%</output></label><input type="range" id="w-pct" min="0" max="100" step="5" value="' + w.pct + '" data-input="wiz-pct"/><span class="help">Padrão das Configurações: ' + LP.settings.signalPercent + '%.</span></div>' +
        '<div class="grid g-3 keep2" id="w-sig"></div>' +
        LP.field('Forma de pagamento do sinal', '<select class="select" id="w-m" data-input="wiz-method"><option' + (w.method === 'Pix' ? ' selected' : '') + '>Pix</option><option' + (w.method === 'Dinheiro' ? ' selected' : '') + '>Dinheiro</option><option' + (w.method === 'Cartão de crédito' ? ' selected' : '') + '>Cartão de crédito</option><option' + (w.method === 'Transferência' ? ' selected' : '') + '>Transferência</option></select>', { for: 'w-m' }) +
        '<button class="check" role="checkbox" aria-checked="' + w.received + '" data-action="wiz-toggle-received"><span class="box">' + ic('check', 14) + '</span><span><b class="t" style="text-decoration:none">O sinal já foi recebido</b><span class="small muted" style="display:block">Marque para lançar a entrada no caixa agora e já colocar o pedido em “Sinal recebido”.</span></span></button></div></div>';
    } else {
      var cl = w.newClient ? { name: w.nName || 'Nova cliente', phone: w.nPhone } : LP.clients.filter(function (x) { return x.name === w.client; })[0] || { name: '—', phone: '' };
      body = '<div class="card"><h2 class="step-title">Revise e salve</h2><div class="stack-sm mt-16">' +
        '<div class="kv"><span class="k">Cliente</span><span class="v">' + LP.esc(cl.name) + '</span></div><div class="kv"><span class="k">Peça</span><span class="v">' + LP.esc(w.custom ? w.cName : c.p ? c.p.name : '—') + ' × ' + w.qty + '</span></div>' +
        (w.color || w.size || w.details ? '<div class="kv"><span class="k">Detalhes</span><span class="v" style="max-width:60%;font-weight:500">' + LP.esc([w.color, w.size, w.details].filter(Boolean).join(' · ')) + '</span></div>' : '') +
        '<div class="kv"><span class="k">Entrega prevista</span><span class="v">' + LP.dfull(w.deadline) + '</span></div><div class="kv"><span class="k">Valor total</span><span class="v">' + LP.money(c.total) + '</span></div><div class="kv"><span class="k">Sinal (' + w.pct + '%)</span><span class="v">' + LP.money(c.sig) + (w.received ? ' <span class="badge b-success">recebido</span>' : ' <span class="badge b-warning">a receber</span>') + '</span></div><div class="kv"><span class="k"><b>Saldo na entrega</b></span><span class="v"><b>' + LP.money(c.bal) + '</b></span></div></div>' +
        '<div class="alert alert-info mt-16">' + ic('chat', 20) + '<div class="a-body"><div class="a-title">Depois de salvar</div><p>Você poderá abrir uma mensagem de orçamento pronta para o WhatsApp. Nada é enviado automaticamente.</p></div></div></div>';
    }
    var valid = wizValid(w, c);
    var nav = '<div class="wiz-nav">' + (w.step > 1 ? '<button class="btn btn-secondary" data-action="wiz-back">' + ic('arrow-left', 18) + 'Voltar</button>' : '<span></span>') + (w.step < 6 ? '<button class="btn btn-primary" data-action="wiz-next" ' + (valid ? '' : 'disabled') + ' id="w-next">Continuar' + ic('arrow-right', 18) + '</button>' : '<button class="btn btn-primary btn-lg" data-action="wiz-save">' + ic('check', 18) + 'Salvar pedido</button>') + '</div>';
    var side = '<aside class="card summary sticky" id="w-side" aria-label="Resumo do pedido"></aside>';
    return head + prog + '<div class="grid g-main-side mt-16"><div>' + body + nav + '</div>' + side + '</div>';
  };
  function wizValid(w, c) {
    if (w.step === 1) return w.newClient ? w.nName.trim().length > 1 : !!w.client;
    if (w.step === 2) return w.custom ? w.cName.trim().length > 2 : !!w.pid;
    if (w.step === 4) return +w.price > 0 && !!w.deadline;
    return true;
  }
  LP.hooks.wizUpdate = function () {
    var w = S().wiz, c = LP.wizCalc(w);
    var side = document.getElementById('w-side');
    if (side) {
      var cl = w.newClient ? w.nName : w.client;
      side.innerHTML = '<div class="card-head"><h3>Resumo do pedido</h3></div>' + (c.p ? LP.art(c.p.art, 'wide') : (w.custom ? LP.art('boneca', 'wide') : '<div class="pic wide"></div>')) +
        '<div class="mt-16"><b>' + LP.esc(c.p ? c.p.name : (w.cName || 'Peça ainda não escolhida')) + '</b><div class="small muted">' + (cl ? LP.esc(cl) + ' · ' : '') + w.qty + ' un.</div></div>' +
        '<div class="stack-sm mt-16"><div class="kv"><span class="k">Valor total</span><span class="v">' + LP.money(c.total) + '</span></div><div class="kv"><span class="k">Sinal (' + w.pct + '%)</span><span class="v">' + LP.money(c.sig) + '</span></div><div class="kv"><span class="k">Saldo na entrega</span><span class="v">' + LP.money(c.bal) + '</span></div><div class="kv"><span class="k">Entrega prevista</span><span class="v">' + (w.deadline ? LP.dshort(w.deadline) : '—') + '</span></div></div>' +
        (c.profit != null && w.price > 0 ? '<div class="alert ' + (c.profit < 0 ? 'alert-error' : (c.profit / c.total * 100 < LP.settings.marginGoal ? 'alert-warning' : 'alert-success')) + ' mt-16">' + ic(c.profit < 0 ? 'alert' : 'check-circle', 18) + '<div class="a-body"><b>Lucro estimado ' + LP.money(c.profit) + '</b><p>Margem de ' + LP.pct(c.profit / c.total * 100) + ' sobre o custo de ' + LP.money(c.cost) + '.</p></div></div>' : '');
    }
    var miss = document.getElementById('w-miss');
    if (miss) miss.innerHTML = c.miss.length ? '<div class="alert alert-warning mt-16">' + ic('alert', 20) + '<div class="a-body"><div class="a-title">Faltam materiais para esta encomenda</div><p>' + c.miss.map(function (x) { return LP.esc(x.m.name) + ': precisa de ' + LP.qty(x.need, x.m.unit) + ', tem ' + LP.qty(x.stock, x.m.unit); }).join('; ') + '. Eles entram na lista de compras.</p></div></div>' : (c.p ? '<div class="alert alert-success mt-16">' + ic('check-circle', 20) + '<div class="a-body">Há material em estoque para produzir esta encomenda.</div></div>' : '');
    var pf = document.getElementById('w-profit');
    if (pf) pf.innerHTML = c.p ? ic('calculator', 20) + '<div class="a-body">Custo de produção: <b>' + LP.money(c.cost) + '</b> · lucro estimado: <b class="' + (c.profit < 0 ? 'neg' : 'pos') + '">' + LP.money(c.profit) + '</b></div>' : ic('info', 20) + '<div class="a-body">Para peça personalizada o sistema não conhece o custo. Considere materiais + horas × valor da hora.</div>';
    var sg = document.getElementById('w-sig');
    if (sg) sg.innerHTML = '<div class="card sand flat pad-sm"><span class="small muted">Total</span><div class="display-num" style="font-size:24px">' + LP.money(c.total) + '</div></div><div class="card sand flat pad-sm"><span class="small muted">Sinal</span><div class="display-num prim" style="font-size:24px">' + LP.money(c.sig) + '</div></div><div class="card sand flat pad-sm"><span class="small muted">Saldo</span><div class="display-num" style="font-size:24px">' + LP.money(c.bal) + '</div></div>';
    var nx = document.getElementById('w-next'); if (nx) nx.disabled = !wizValid(w, c);
    var o = document.getElementById('o-pct'); if (o) { o.textContent = w.pct + '%'; var r = document.getElementById('w-pct'); r.style.setProperty('--p', w.pct + '%'); }
    var q = document.getElementById('w-qty'); if (q) q.textContent = w.qty;
  };
  LP.act['wiz-set'] = function (el) { var w = S().wiz, k = el.dataset.k, v = el.dataset.v; w[k] = (k === 'newClient' || k === 'custom') ? v === '1' : v; if (k === 'custom' && w.custom) { w.pid = null; } LP.render(); };
  LP.act['wiz-pick-prod'] = function (el) { var w = S().wiz; w.pid = el.dataset.arg; w.priceTouched = false; w.price = LP.prod(w.pid).price; w.deadTouched = false; LP.render(); };
  LP.act['wiz-qty'] = function (el) { var w = S().wiz; w.qty = Math.max(1, w.qty + (+el.dataset.arg)); if (!w.deadTouched) { w.deadline = iso(LP.wizCalc(w).sug); } LP.hooks.wizUpdate(); };
  LP.act['wiz-next'] = function () { var w = S().wiz; if (w.step < 6) { w.step++; window.scrollTo({ top: 0 }); LP.render(); } };
  LP.act['wiz-back'] = function () { var w = S().wiz; if (w.step > 1) { w.step--; window.scrollTo({ top: 0 }); LP.render(); } };
  LP.act['wiz-toggle-received'] = function () { var w = S().wiz; w.received = !w.received; LP.render(); };
  LP.act['wiz-save'] = function () {
    var w = S().wiz, c = LP.wizCalc(w);
    var id = Math.max.apply(null, LP.orders.map(function (o) { return o.id; })) + 1;
    var name = w.newClient ? w.nName : w.client;
    if (w.newClient && !LP.clients.some(function (x) { return x.name === name; })) LP.clients.push({ name: name, phone: w.nPhone || '(00) 90000-0000', first: iso(LP.TODAY), prefs: '' });
    var o = { id: id, client: name, pid: w.custom ? null : w.pid, product: w.custom ? w.cName : null, qty: w.qty, total: c.total, signalPlanned: c.sig, status: w.received ? 'Sinal recebido' : 'Orçamento enviado', created: iso(LP.TODAY), deadline: w.deadline, details: [w.color, w.size, w.details].filter(Boolean).join(' · '), custom: w.custom, pays: [], log: [{ d: iso(LP.TODAY), t: 'Pedido criado' }] };
    if (w.received && c.sig > 0) LP.addPayment(o, c.sig, w.method);
    LP.orders.push(o); w.done = true; LP.S.wiz = null;
    LP.toast('Pedido #' + id + ' criado', { sub: name + ' · ' + LP.money(c.total) }); location.hash = '#/pedidos/' + id;
  };

  /* ------------------------------------------------------------------
     DETALHE DO PEDIDO
     ------------------------------------------------------------------ */
  LP.screens.orderDetail = function (id) {
    var o = LP.order(id); if (!o) return LP.pageHead('Pedido não encontrado', '');
    var cl = LP.clients.filter(function (c) { return c.name === o.client; })[0] || { name: o.client, phone: '' };
    var paid = LP.orderPaid(o), bal = LP.orderBalance(o), n = LP.orderDays(o), nx = LP.nextStatus(o.status);
    var p = o.pid ? LP.prod(o.pid) : null;
    var head = LP.pageHead('Pedido #' + o.id + ' ' + LP.statusBadge(o.status) + ' ' + LP.deadlineBadge(o), LP.esc(o.client) + ' · criado em ' + LP.dfull(o.created),
      '<button class="btn btn-secondary" data-action="open-wa" data-arg="' + o.id + '">' + ic('chat', 18) + 'WhatsApp</button>' + (LP.isOpen(o) ? '<button class="btn btn-secondary" data-action="open-pay" data-arg="' + o.id + '">' + ic('wallet', 18) + 'Registrar pagamento</button>' : '') +
      (nx ? '<button class="btn btn-primary" data-action="advance-order" data-arg="' + o.id + '">' + (nx === 'Entregue' ? 'Concluir entrega' : 'Avançar: ' + nx) + ic('arrow-right', 18) + '</button>' : ''));

    // trilha de fases
    var ph = LP.phaseOf(o.status);
    var order = ['orcamento', 'producao', 'entrega', 'done'], cur = order.indexOf(ph);
    var track = ph === 'cancel' ? '<div class="alert alert-neutral">' + ic('x-circle', 20) + '<div class="a-body"><b>Pedido cancelado.</b> Nenhum valor entra no faturamento.</div></div>' :
      '<ol class="track" aria-label="Fase do pedido">' + [['orcamento', 'Orçamento'], ['producao', 'Produção'], ['entrega', 'Entrega']].map(function (x, i) { var cls = i < cur ? 'done' : i === cur ? 'cur' : ''; return '<li class="' + cls + '"><span class="dot">' + (i < cur ? ic('check', 14) : i + 1) + '</span><span class="tt"><b>' + x[1] + '</b>' + (i === cur ? '<span class="small muted">' + LP.esc(o.status) + '</span>' : '') + '</span></li>'; }).join('') + '</ol>';

    var piece = '<div class="card"><div class="row" style="align-items:flex-start;gap:18px">' + LP.art(LP.orderArt(o), 'md-lg') + '<div class="grow"><span class="eyebrow">' + (o.custom ? 'Peça personalizada' : p ? p.cat : '') + '</span><h2 style="font-family:var(--font-serif);font-size:24px;margin:4px 0">' + LP.esc(LP.orderName(o)) + '</h2><div class="muted">' + o.qty + ' ' + (o.qty > 1 ? 'unidades' : 'unidade') + (p ? ' · ' + p.size : '') + '</div>' +
      (o.details ? '<div class="spec mt-16"><span class="eyebrow">Especificações</span><p class="mt-8">' + LP.esc(o.details) + '</p></div>' : '') + '</div></div>' +
      (p ? '<div class="row-wrap mt-16"><a class="link-btn" href="#/produtos/' + p.id + '">' + ic('calculator', 16) + 'Ver precificação da peça</a></div>' : '') + '</div>';

    var ck = '';
    if (o.checklist) {
      var done = o.checklist.filter(function (x) { return x[1]; }).length;
      ck = '<div class="card"><div class="card-head"><h2>' + ic('checks', 20) + ' Checklist de produção</h2><span class="badge b-neutral">' + done + ' de ' + o.checklist.length + '</span></div><div class="bar prim" style="height:6px"><i style="width:' + (done / o.checklist.length * 100) + '%"></i></div><div class="mt-16">' + o.checklist.map(function (x, i) { return '<button class="check" role="checkbox" aria-checked="' + !!x[1] + '" data-action="toggle-check" data-arg="' + o.id + ':' + i + '"><span class="box">' + ic('check', 14) + '</span><span class="t">' + LP.esc(x[0]) + '</span></button>'; }).join('') + '</div></div>';
    }
    var notes = '<div class="card"><div class="card-head"><h2>' + ic('file', 20) + ' Notas internas</h2><span class="small muted">só você vê</span></div><textarea class="textarea" data-input="order-note" placeholder="Anotações de produção, combinados com a cliente…">' + LP.esc(o.note || '') + '</textarea></div>';

    var log = [{ d: o.created, t: 'Pedido criado' }].concat(o.pays.map(function (x) { return { d: x.d, t: 'Pagamento de ' + LP.money(x.amount) + ' (' + x.kind + ', ' + x.method + ')' }; }), (o.log || []), o.delivered ? [{ d: o.delivered, t: 'Pedido entregue' }] : []);
    var seen = {}; log = log.filter(function (x) { var k = x.d + x.t; if (seen[k]) return false; seen[k] = 1; return true; }).sort(function (a, b) { return a.d < b.d ? 1 : -1; });
    var hist = '<div class="card"><div class="card-head"><h2>' + ic('history', 20) + ' Histórico</h2></div><div class="timeline">' + log.map(function (x, i) { return '<div class="tl-item ' + (i === 0 ? 'now' : '') + '"><div class="t">' + LP.esc(x.t) + '</div><div class="s">' + LP.dfull(x.d) + '</div></div>'; }).join('') + '</div></div>';

    var client = '<div class="card"><div class="row"><span class="avatar lg">' + LP.initials(cl.name) + '</span><div class="grow"><b style="font-size:17px">' + LP.esc(cl.name) + '</b><div class="small muted">' + cl.phone + '</div></div></div><div class="row-wrap mt-16"><button class="btn btn-secondary btn-sm" data-action="open-wa" data-arg="' + o.id + '">' + ic('chat', 16) + 'WhatsApp</button><a class="btn btn-ghost btn-sm" href="#/clientes/' + encodeURIComponent(cl.name) + '">Ver cliente' + ic('chevron-right', 16) + '</a></div>' + (cl.prefs ? '<p class="small muted mt-16">' + ic('heart', 14) + ' ' + LP.esc(cl.prefs) + '</p>' : '') + '</div>';

    var payCard = '<div class="card"><div class="card-head"><h2>' + ic('wallet', 20) + ' Pagamento</h2></div><div class="stack-sm"><div class="kv"><span class="k">Valor total</span><span class="v">' + LP.money(o.total) + '</span></div><div class="kv"><span class="k">Recebido</span><span class="v pos">' + LP.money(paid) + '</span></div><div class="kv"><span class="k"><b>Saldo pendente</b></span><span class="v ' + (bal > 0.01 ? 'warn' : 'pos') + '"><b>' + LP.money(Math.max(0, bal)) + '</b></span></div></div><div class="bar mt-16"><i style="width:' + Math.min(100, paid / o.total * 100) + '%"></i></div>' +
      (o.pays.length ? '<div class="rows mt-16">' + o.pays.map(function (x) { return '<div class="li" style="padding:10px 0"><span class="dot-ic s">' + ic('arrow-down-left', 18) + '</span><div class="grow"><div class="t" style="font-weight:500">' + (x.kind === 'sinal' ? 'Sinal' : 'Saldo') + ' · ' + x.method + '</div><div class="s">' + LP.dfull(x.d) + '</div></div><b class="num">' + LP.money(x.amount) + '</b></div>'; }).join('') + '</div>' : '<p class="small muted mt-16">Nenhum pagamento registrado' + (o.signalPlanned ? '. Sinal combinado: ' + LP.money(o.signalPlanned) + '.' : '.') + '</p>') + '</div>';

    var dead = LP.isOpen(o) ? '<div class="card ' + (n < 0 ? 'edge-error' : n <= 3 ? 'edge-warn' : '') + '"><span class="eyebrow">' + ic('calendar', 14) + ' Prazo de entrega</span><div class="display-num mt-8" style="font-size:30px">' + LP.dfull(o.deadline) + '</div><p class="' + (n < 0 ? 'neg' : 'muted') + ' mt-8"><b>' + LP.rel(n).charAt(0).toUpperCase() + LP.rel(n).slice(1) + '</b>' + (n < 0 ? ' — avise a cliente e combine nova data.' : '') + '</p></div>' : '';
    var cost = LP.orderCost(o);
    var prof = cost != null && o.status !== 'Cancelado' ? '<div class="card sand flat pad-sm"><span class="eyebrow">Rentabilidade estimada</span><div class="kv mt-8"><span class="k">Custo de produção</span><span class="v">' + LP.money(cost) + '</span></div><div class="kv"><span class="k">Lucro estimado</span><span class="v ' + (o.total - cost < 0 ? 'neg' : 'pos') + '">' + LP.money(o.total - cost) + ' <span class="small">(' + LP.pct((o.total - cost) / o.total * 100) + ')</span></span></div></div>' : '';
    var danger = LP.isOpen(o) ? '<button class="btn btn-danger btn-block" data-action="cancel-order" data-arg="' + o.id + '">' + ic('x-circle', 18) + 'Cancelar pedido</button>' : '';

    return head + '<div class="crumb-mobile only-sm"></div>' + '<div class="card pad-sm track-card">' + track + '</div><div class="grid g-main-side mt-16"><div class="stack">' + piece + ck + notes + hist + '</div><div class="stack">' + payCard + dead + client + prof + danger + '</div></div>';
  };
  LP.act['toggle-check'] = function (el) { var a = el.dataset.arg.split(':'), o = LP.order(a[0]); o.checklist[+a[1]][1] = o.checklist[+a[1]][1] ? 0 : 1; LP.render(); };
  LP.act['cancel-order'] = function (el) {
    var o = LP.order(el.dataset.arg);
    LP.confirm({ title: 'Cancelar o pedido #' + o.id + '?', danger: true, ok: 'Cancelar pedido', cancel: 'Voltar', text: 'O pedido de <b>' + LP.esc(o.client) + '</b> sairá do quadro de produção e não contará no faturamento.' + (LP.orderPaid(o) > 0 ? ' Os <b>' + LP.money(LP.orderPaid(o)) + '</b> já recebidos continuam no caixa até você lançar a devolução.' : ''), onOk: function () { LP.setStatus(o, 'Cancelado'); LP.closeModal(); LP.render(); LP.toast('Pedido #' + o.id + ' cancelado', { type: 'info', undo: true }); } });
  };
  LP.act['open-pay'] = function (el) {
    var o = LP.order(el.dataset.arg), bal = LP.orderBalance(o);
    LP.openModal({ title: 'Registrar pagamento · #' + o.id, body: '<p class="muted">Saldo pendente de <b>' + LP.money(bal) + '</b> de ' + LP.esc(o.client) + '.</p><div class="form-grid mt-16">' + LP.field('Valor recebido', '<div class="input-group"><span class="prefix">R$</span><input id="pay-v" class="input money" type="number" step="0.01" value="' + (o.pays.length ? bal.toFixed(2) : (o.signalPlanned || o.total * .5).toFixed(2)) + '"/></div>', { for: 'pay-v' }) + LP.field('Forma', '<select id="pay-m" class="select"><option>Pix</option><option>Dinheiro</option><option>Cartão de crédito</option><option>Transferência</option></select>', { for: 'pay-m' }) + '</div><div class="alert alert-info mt-16">' + ic('info', 20) + '<div class="a-body">Este pagamento entra no <b>caixa</b> hoje. Ele <b>não</b> vira faturamento até a entrega do pedido, e não é lançado de novo em Movimentações.</div></div>', foot: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-pay" data-arg="' + o.id + '">Registrar</button>' });
  };
  LP.act['save-pay'] = function (el) {
    var o = LP.order(el.dataset.arg), v = +document.getElementById('pay-v').value;
    if (!(v > 0)) { LP.toast('Informe um valor', { type: 'err' }); return; }
    var first = o.pays.length === 0; LP.addPayment(o, v, document.getElementById('pay-m').value);
    if (first && o.status === 'Aguardando pagamento do sinal') LP.setStatus(o, 'Sinal recebido');
    LP.closeModal(); LP.render(); LP.toast('Pagamento de ' + LP.money(v) + ' registrado', { sub: 'Pedido #' + o.id + ' · entrada lançada no caixa.', undo: true });
  };

  /* ---------- WhatsApp: mensagens prontas e editáveis ---------- */
  function fillMsg(t, o) {
    var p = o.pid ? LP.prod(o.pid) : null, sig = o.signalPlanned || o.total * LP.settings.signalPercent / 100;
    return t.replace(/\{nome\}/g, o.client.split(' ')[0]).replace(/\{produto\}/g, LP.orderName(o)).replace(/\{qtd\}/g, o.qty + (o.qty > 1 ? ' unidades' : ' unidade')).replace(/\{total\}/g, LP.money(o.total)).replace(/\{sinal\}/g, LP.money(sig)).replace(/\{saldo\}/g, LP.money(Math.max(0, LP.orderBalance(o)))).replace(/\{prazo\}/g, LP.dfull(o.deadline)).replace(/\{num\}/g, o.id);
  }
  LP.act['open-wa'] = function (el) {
    var o = LP.order(el.dataset.arg), sugg = { 'Cliente escolhendo o produto': 'orc', 'Orçamento enviado': 'orc', 'Aguardando pagamento do sinal': 'orc', 'Sinal recebido': 'conf', 'Aguardando compra de materiais': 'prod', 'Materiais comprados': 'prod', 'Em produção': 'prod', 'Produção concluída': 'pronto', 'Aguardando entrega': 'pronto' }[o.status] || 'prod';
    S().wa = { id: o.id, tpl: sugg };
    LP.openModal({ title: 'Mensagem para ' + LP.esc(o.client.split(' ')[0]), wide: true, body: waBody(o) , foot: '<button class="btn btn-secondary" data-action="close-modal">Fechar</button><button class="btn btn-secondary" data-action="wa-copy">' + ic('copy', 18) + 'Copiar texto</button><button class="btn btn-primary" data-action="wa-open">' + ic('chat', 18) + 'Abrir no WhatsApp</button>' });
  };
  function waBody(o) {
    var w = S().wa, t = LP.msgTemplates.filter(function (x) { return x.id === w.tpl; })[0];
    return '<div class="chips" role="group" aria-label="Tipo de mensagem">' + LP.msgTemplates.map(function (x) { return '<button class="chip" aria-pressed="' + (x.id === w.tpl) + '" data-action="wa-tpl" data-arg="' + x.id + '">' + x.label + '</button>'; }).join('') + '</div>' +
      '<div class="field mt-16"><label for="wa-text">Texto da mensagem <span class="opt">(edite à vontade)</span></label><textarea id="wa-text" class="textarea" style="min-height:170px">' + LP.esc(fillMsg(t.text, o)) + '</textarea></div>' +
      '<div class="alert alert-neutral mt-16">' + ic('cloud-off', 20) + '<div class="a-body"><p>O LaPoli <b>nunca envia</b> a mensagem sozinho. “Abrir no WhatsApp” só abre a conversa com o texto preenchido e precisa de internet. O resto do sistema funciona offline.</p></div></div>';
  }
  LP.act['wa-tpl'] = function (el) { var w = S().wa; w.tpl = el.dataset.arg; document.querySelector('.modal-body').innerHTML = waBody(LP.order(w.id)); };
  LP.act['wa-copy'] = function () { var t = document.getElementById('wa-text'); try { navigator.clipboard.writeText(t.value); } catch (e) {} LP.toast('Mensagem copiada', { type: 'info' }); };
  LP.act['wa-open'] = function () { LP.toast('No app, abriria o WhatsApp com este texto', { type: 'info', sub: 'No protótipo nenhuma mensagem é enviada nem aberta.' }); };
})();
