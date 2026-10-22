/* ==========================================================================
   LaPoli · protótipo — DADOS DEMONSTRATIVOS (fictícios) e cálculos
   Hoje (fixo no protótipo): quinta-feira, 22/10/2026.
   Nada aqui é informação real da LaPoli. Telefones e nomes são inventados.
   As fórmulas seguem src/calculations/index.ts:
     preço sugerido = custo ÷ (1 − margem)   ·   margem = lucro ÷ preço de venda  (NÃO é markup)
   ========================================================================== */
(function () {
  var LP = (window.LP = window.LP || {});

  var D = function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  LP.D = D;
  LP.TODAY = D('2026-10-22');
  var DAY = 86400000;
  LP.daysBetween = function (a, b) { return Math.round((b - a) / DAY); };

  /* ---------- Configurações (valores de demonstração) ---------- */
  LP.settings = {
    hourlyRate: 15,        // R$/h — no app real o padrão é R$ 30; aqui R$ 15 para preços realistas na demo
    marginGoal: 30,        // meta de margem (%)
    signalPercent: 50,     // sinal padrão (%)
    lowStockRatio: 1.15,   // "quase no mínimo" quando estoque ≤ mínimo × 1,15
    openingCash: 900.0,    // saldo inicial informado (1º de agosto) — dado de demonstração
    lastBackup: D('2026-10-14'),
    backupEveryDays: 7
  };

  /* ---------- Materiais: compras (lotes) + movimentações de estoque ---------- */
  LP.materials = [
    { id: 'm1', name: 'Fio Amigurumi Círculo · Caramelo', type: 'fio', unit: 'g', min: 250, pack: 500, pkg: { name: 'novelo', plural: 'novelos', size: 100 }, color: '#C99A6B',
      lots: [
        { d: '2026-08-15', qty: 400, paid: 46.0, store: 'Mercado dos Fios', pay: 'Pix' },
        { d: '2026-09-12', qty: 500, paid: 58.5, store: 'Mercado dos Fios', pay: 'Pix' },
        { d: '2026-10-04', qty: 500, paid: 62.0, store: 'Mercado dos Fios', pay: 'Cartão de crédito' }],
      moves: [
        { d: '2026-08-28', t: 'consumo', qty: -230, ref: 'Pedido #1028', note: 'Amigurumi de capivara × 1' },
        { d: '2026-09-20', t: 'consumo', qty: -460, ref: 'Pedido #1033', note: 'Amigurumi de capivara × 2' },
        { d: '2026-09-22', t: 'perda', qty: -40, ref: '', note: 'Fio emaranhado, não aproveitável' },
        { d: '2026-10-08', t: 'consumo', qty: -230, ref: 'Pedido #1038', note: 'Amigurumi de capivara × 1' },
        { d: '2026-10-10', t: 'ajuste', qty: -30, ref: '', note: 'Contagem física das prateleiras' },
        { d: '2026-10-18', t: 'consumo', qty: -230, ref: 'Pedido #1041', note: 'Amigurumi de capivara × 1' }] },
    { id: 'm2', name: 'Fio Amigurumi Círculo · Cru', type: 'fio', unit: 'g', min: 300, pack: 500, pkg: { name: 'novelo', plural: 'novelos', size: 100 }, color: '#E9DFCB',
      lots: [
        { d: '2026-08-20', qty: 600, paid: 66.0, store: 'Mercado dos Fios', pay: 'Pix' },
        { d: '2026-10-05', qty: 500, paid: 55.0, store: 'Mercado dos Fios', pay: 'Pix' }],
      moves: [
        { d: '2026-09-03', t: 'consumo', qty: -30, ref: 'Pedido #1028', note: 'Barriga da capivara' },
        { d: '2026-09-15', t: 'consumo', qty: -280, ref: 'Pedido #1030', note: 'Kit de chá × 2' },
        { d: '2026-09-20', t: 'consumo', qty: -60, ref: 'Pedido #1033', note: 'Amigurumi de capivara × 2' },
        { d: '2026-09-22', t: 'consumo', qty: -40, ref: 'Pedido #1035', note: 'Naninha de coelho' },
        { d: '2026-09-25', t: 'perda', qty: -10, ref: '', note: 'Sobra muito curta' },
        { d: '2026-10-03', t: 'consumo', qty: -40, ref: 'Pedido #1039', note: 'Naninha de coelho' },
        { d: '2026-10-08', t: 'consumo', qty: -30, ref: 'Pedido #1038', note: 'Amigurumi de capivara' },
        { d: '2026-10-18', t: 'consumo', qty: -30, ref: 'Pedido #1041', note: 'Amigurumi de capivara' }] },
    { id: 'm3', name: 'Fio Amigurumi Círculo · Rosa Bebê', type: 'fio', unit: 'g', min: 200, pack: 400, pkg: { name: 'novelo', plural: 'novelos', size: 100 }, color: '#EFC4C4',
      lots: [
        { d: '2026-09-10', qty: 300, paid: 36.0, store: 'Armarinho Central', pay: 'Pix' },
        { d: '2026-10-02', qty: 400, paid: 48.0, store: 'Armarinho Central', pay: 'Pix' }],
      moves: [
        { d: '2026-09-15', t: 'consumo', qty: -80, ref: 'Pedido #1030', note: 'Kit de chá × 2' },
        { d: '2026-09-22', t: 'consumo', qty: -120, ref: 'Pedido #1035', note: 'Naninha de coelho' },
        { d: '2026-10-03', t: 'consumo', qty: -120, ref: 'Pedido #1039', note: 'Naninha de coelho' },
        { d: '2026-10-13', t: 'consumo', qty: -120, ref: 'Pedido #1042', note: 'Naninha de coelho personalizada' },
        { d: '2026-10-16', t: 'ajuste', qty: -40, ref: '', note: 'Contagem física das prateleiras' }] },
    { id: 'm4', name: 'Fio de malha · Cru', type: 'fio', unit: 'g', min: 600, pack: 1000, pkg: { name: 'rolo', plural: 'rolos', size: 500 }, color: '#D9CBB0',
      lots: [
        { d: '2026-08-28', qty: 1500, paid: 87.0, store: 'Casa do Tecido', pay: 'Cartão de débito' },
        { d: '2026-10-10', qty: 1000, paid: 58.0, store: 'Casa do Tecido', pay: 'Pix' }],
      moves: [
        { d: '2026-09-20', t: 'consumo', qty: -380, ref: 'Pedido #1034', note: 'Bolsa de crochê' },
        { d: '2026-09-25', t: 'consumo', qty: -380, ref: 'Pedido #1027', note: 'Bolsa de crochê' },
        { d: '2026-10-14', t: 'consumo', qty: -380, ref: 'Pedido #1040', note: 'Bolsa de crochê' }] },
    { id: 'm5', name: 'Fibra siliconada', type: 'enchimento', unit: 'g', min: 500, pack: 1000, pkg: { name: 'pacote', plural: 'pacotes', size: 1000 }, color: '#F2EEE8',
      lots: [
        { d: '2026-08-20', qty: 1000, paid: 26.0, store: 'Armarinho Central', pay: 'Pix' },
        { d: '2026-10-05', qty: 1000, paid: 26.0, store: 'Armarinho Central', pay: 'Pix' }],
      moves: [
        { d: '2026-08-28', t: 'consumo', qty: -120, ref: 'Pedido #1028', note: 'Capivara' },
        { d: '2026-09-20', t: 'consumo', qty: -240, ref: 'Pedido #1033', note: 'Capivara × 2' },
        { d: '2026-09-22', t: 'consumo', qty: -50, ref: 'Pedido #1035', note: 'Naninha' },
        { d: '2026-09-24', t: 'consumo', qty: -96, ref: 'Pedido #1031', note: 'Chaveiros × 8' },
        { d: '2026-10-03', t: 'consumo', qty: -50, ref: 'Pedido #1039', note: 'Naninha' },
        { d: '2026-10-08', t: 'consumo', qty: -120, ref: 'Pedido #1038', note: 'Capivara' },
        { d: '2026-10-13', t: 'consumo', qty: -50, ref: 'Pedido #1042', note: 'Naninha' },
        { d: '2026-10-18', t: 'consumo', qty: -120, ref: 'Pedido #1041', note: 'Capivara' }] },
    { id: 'm6', name: 'Olhos de segurança 8 mm', type: 'olhos', unit: 'un', min: 20, pack: 50, pkg: { name: 'pacote', plural: 'pacotes', size: 50 }, color: '#2D2D2D',
      lots: [{ d: '2026-08-20', qty: 50, paid: 20.0, store: 'Armarinho Central', pay: 'Pix' }],
      moves: [
        { d: '2026-08-28', t: 'consumo', qty: -2, ref: 'Pedido #1028', note: 'Capivara' },
        { d: '2026-09-13', t: 'perda', qty: -4, ref: '', note: 'Quebraram na prensa' },
        { d: '2026-09-20', t: 'consumo', qty: -4, ref: 'Pedido #1033', note: 'Capivara × 2' },
        { d: '2026-09-22', t: 'consumo', qty: -2, ref: 'Pedido #1035', note: 'Naninha' },
        { d: '2026-09-24', t: 'consumo', qty: -16, ref: 'Pedido #1031', note: 'Chaveiros × 8' },
        { d: '2026-10-03', t: 'consumo', qty: -2, ref: 'Pedido #1039', note: 'Naninha' },
        { d: '2026-10-08', t: 'consumo', qty: -2, ref: 'Pedido #1038', note: 'Capivara' },
        { d: '2026-10-13', t: 'consumo', qty: -2, ref: 'Pedido #1042', note: 'Naninha' },
        { d: '2026-10-18', t: 'consumo', qty: -2, ref: 'Pedido #1041', note: 'Capivara' }] },
    { id: 'm7', name: 'Argola de chaveiro', type: 'argola', unit: 'un', min: 20, pack: 50, pkg: { name: 'pacote', plural: 'pacotes', size: 50 }, color: '#C8B28A',
      lots: [{ d: '2026-08-20', qty: 50, paid: 45.0, store: 'Armarinho Central', pay: 'Pix' }],
      moves: [{ d: '2026-09-24', t: 'consumo', qty: -8, ref: 'Pedido #1031', note: 'Chaveiros × 8' }] },
    { id: 'm8', name: 'Alça de bambu (par)', type: 'acessório', unit: 'un', min: 2, pack: 6, color: '#B89B6A',
      lots: [{ d: '2026-09-01', qty: 6, paid: 108.0, store: 'Casa do Tecido', pay: 'Cartão de crédito' }],
      moves: [
        { d: '2026-09-20', t: 'consumo', qty: -1, ref: 'Pedido #1034', note: 'Bolsa' },
        { d: '2026-09-25', t: 'consumo', qty: -1, ref: 'Pedido #1027', note: 'Bolsa' },
        { d: '2026-10-14', t: 'consumo', qty: -1, ref: 'Pedido #1040', note: 'Bolsa' }] },
    { id: 'm9', name: 'Botão de madeira 15 mm', type: 'botão', unit: 'un', min: 30, pack: 100, pkg: { name: 'pacote', plural: 'pacotes', size: 100 }, color: '#CDA877',
      lots: [{ d: '2026-09-01', qty: 100, paid: 45.0, store: 'Armarinho Central', pay: 'Pix' }],
      moves: [
        { d: '2026-09-15', t: 'consumo', qty: -4, ref: 'Pedido #1030', note: 'Kit de chá × 2' },
        { d: '2026-09-20', t: 'consumo', qty: -1, ref: 'Pedido #1034', note: 'Bolsa' },
        { d: '2026-09-25', t: 'consumo', qty: -1, ref: 'Pedido #1027', note: 'Bolsa' },
        { d: '2026-10-14', t: 'consumo', qty: -1, ref: 'Pedido #1040', note: 'Bolsa' }] }
  ];

  LP.mat = function (id) { return LP.materials.filter(function (m) { return m.id === id; })[0]; };
  LP.matStats = function (m) {
    var bought = 0, paid = 0, moved = 0, cons = 0, lost = 0, adj = 0;
    m.lots.forEach(function (l) { bought += l.qty; paid += l.paid; });
    m.moves.forEach(function (v) {
      moved += v.qty;
      if (v.t === 'consumo') cons += -v.qty; else if (v.t === 'perda') lost += -v.qty; else adj += -v.qty;
    });
    var stock = bought + moved;
    var avg = bought ? paid / bought : 0;
    var last = m.lots[m.lots.length - 1];
    var lastCost = last.paid / last.qty;
    var level = stock < m.min ? 'low' : (stock <= m.min * LP.settings.lowStockRatio ? 'near' : 'ok');
    // previsão só com dados suficientes: ≥ 3 consumos ao longo de ≥ 30 dias
    var cs = m.moves.filter(function (v) { return v.t === 'consumo' || v.t === 'perda'; });
    var forecast = null;
    if (cs.length >= 3) {
      var first = LP.D(cs[0].d);
      var span = LP.daysBetween(first, LP.TODAY);
      if (span >= 30) {
        var used = cs.reduce(function (s, v) { return s - v.qty; }, 0);
        var perDay = used / span;
        var daysLeft = perDay > 0 ? stock / perDay : null;
        forecast = { perDay: perDay, daysLeft: daysLeft, span: span, date: daysLeft != null ? new Date(LP.TODAY.getTime() + daysLeft * DAY) : null };
      }
    }
    return { bought: bought, paid: paid, stock: stock, avg: avg, lastCost: lastCost, value: stock * avg, cons: cons, lost: lost, adj: adj, level: level, forecast: forecast };
  };

  /* ---------- Produtos ---------- */
  LP.products = [
    { id: 'p1', name: 'Amigurumi de capivara', cat: 'Amigurumi', size: '22 cm', needle: '2,5 mm', hours: 6, other: 2.5, otherNote: 'Embalagem kraft e etiqueta', price: 189.9, art: 'capivara', active: true,
      desc: 'Capivara sentada com focinho bordado, ideal para presente. Pode levar laço ou nome bordado.', notes: 'Costurar as orelhas depois de encher a cabeça. Bordar o focinho com fio cru dobrado.',
      mats: [['m1', 230], ['m2', 30], ['m5', 120], ['m6', 2]] },
    { id: 'p2', name: 'Naninha de coelho', cat: 'Infantil', size: '30 × 30 cm', needle: '3,0 mm', hours: 4.5, other: 2.5, otherNote: 'Embalagem e etiqueta', price: 119.9, art: 'coelho', active: true,
      desc: 'Naninha macia com cabecinha de coelho, em algodão. Aceita nome bordado.', notes: 'Lavar o fio antes se a cor for muito intensa. Segurança: olhos presos com trava dupla.',
      mats: [['m3', 120], ['m2', 40], ['m5', 50], ['m6', 2]] },
    { id: 'p3', name: 'Chaveiro de amigurumi', cat: 'Chaveiro', size: '7 cm', needle: '2,0 mm', hours: 1.5, other: 1.2, otherNote: 'Saquinho e etiqueta', price: 42.0, art: 'chaveiro', active: true,
      desc: 'Mini capivara com argola. Muito pedido como lembrancinha.', notes: 'Fazer em lotes de 4 para ganhar tempo.',
      mats: [['m1', 25], ['m5', 12], ['m6', 2], ['m7', 1]] },
    { id: 'p4', name: 'Bolsa de crochê', cat: 'Bolsa', size: '30 × 26 cm', needle: '4,0 mm', hours: 9, other: 14.5, otherNote: 'Forro de tecido e embalagem', price: 279.9, art: 'bolsa', active: true,
      desc: 'Bolsa estruturada com forro e alça de bambu. Disponível em cru e areia.', notes: 'Forro costurado à parte. Conferir tamanho da alça antes de fixar.',
      mats: [['m4', 380], ['m8', 1], ['m9', 1]] },
    { id: 'p5', name: 'Kit de chá', cat: 'Presente', size: '3 peças', needle: '2,5 mm', hours: 5, other: 6.5, otherNote: 'Caixa de presente', price: 99.9, art: 'kitcha', active: true,
      desc: 'Porta-sachê, porta-copo e sousplat combinando, em caixinha de presente.', notes: 'Preço de tabela está abaixo do custo — revisar.',
      mats: [['m2', 140], ['m3', 40], ['m9', 2]] },
    { id: 'p6', name: 'Amigurumi de leão', cat: 'Amigurumi', size: '20 cm', needle: '3,0 mm', hours: 8, other: 2.5, otherNote: 'Embalagem e etiqueta', price: 239.9, art: 'leao', active: false,
      desc: 'Leão com juba em fio mesclado. Arquivado fora de temporada.', notes: '',
      mats: [['m1', 200], ['m2', 40], ['m5', 130], ['m6', 2]] }
  ];
  LP.prod = function (id) { return LP.products.filter(function (p) { return p.id === id; })[0]; };

  LP.productCost = function (p, over) {
    over = over || {};
    var hours = over.hours != null ? over.hours : p.hours;
    var rate = over.rate != null ? over.rate : LP.settings.hourlyRate;
    var other = over.other != null ? over.other : p.other;
    var price = over.price != null ? over.price : p.price;
    var mats = over.mats || p.mats;
    var lines = mats.map(function (r) {
      var m = LP.mat(r[0]); var st = LP.matStats(m);
      return { m: m, qty: r[1], unit: m.unit, unitCost: st.avg, cost: r[1] * st.avg };
    });
    var mat = lines.reduce(function (s, l) { return s + l.cost; }, 0);
    var labor = hours * rate;
    var total = mat + labor + other;
    var profit = price - total;
    var margin = price > 0 ? (profit / price) * 100 : 0;
    var goal = over.goal != null ? over.goal : LP.settings.marginGoal;
    var suggested = goal > 0 && goal < 100 ? total / (1 - goal / 100) : total;
    var state = profit < 0 ? 'loss' : (margin < goal ? 'low' : 'ok');
    return { lines: lines, mat: mat, labor: labor, other: other, total: total, price: price, profit: profit, margin: margin, suggested: suggested, goal: goal, hours: hours, rate: rate, state: state };
  };

  /* ---------- Pedidos ---------- */
  var PH = {
    orcamento: ['Cliente escolhendo o produto', 'Orçamento enviado', 'Aguardando pagamento do sinal'],
    producao: ['Sinal recebido', 'Aguardando compra de materiais', 'Materiais comprados', 'Em produção', 'Produção concluída'],
    entrega: ['Aguardando entrega']
  };
  LP.phases = [
    { id: 'orcamento', name: 'Orçamento', hint: 'Combinando detalhes e sinal', statuses: PH.orcamento },
    { id: 'producao', name: 'Produção', hint: 'Do sinal até a peça pronta', statuses: PH.producao },
    { id: 'entrega', name: 'Entrega', hint: 'Pronto, aguardando retirada', statuses: PH.entrega }
  ];
  LP.allStatuses = [].concat(PH.orcamento, PH.producao, PH.entrega, ['Entregue', 'Cancelado']);
  LP.phaseOf = function (status) {
    if (status === 'Entregue') return 'done';
    if (status === 'Cancelado') return 'cancel';
    for (var k in PH) if (PH[k].indexOf(status) > -1) return k;
    return 'orcamento';
  };
  LP.nextStatus = function (status) {
    var i = LP.allStatuses.indexOf(status);
    if (status === 'Entregue' || status === 'Cancelado') return null;
    return LP.allStatuses[i + 1] && LP.allStatuses[i + 1] !== 'Cancelado' ? LP.allStatuses[i + 1] : null;
  };

  function pay(d, a, kind, method) { return { d: d, amount: a, kind: kind, method: method || 'Pix' }; }

  LP.orders = [
    { id: 1028, client: 'Aline Souza', pid: 'p1', qty: 1, total: 189.9, status: 'Entregue', created: '2026-08-20', deadline: '2026-09-05', delivered: '2026-09-05', details: 'Capivara com laço verde-sálvia.', pays: [pay('2026-08-22', 94.95, 'sinal'), pay('2026-09-05', 94.95, 'saldo')] },
    { id: 1030, client: 'Bianca Ribeiro', pid: 'p5', qty: 2, total: 199.8, status: 'Entregue', created: '2026-09-05', deadline: '2026-09-22', delivered: '2026-09-22', details: 'Dois kits de chá, um em rosa e um em cru.', pays: [pay('2026-09-07', 99.9, 'sinal'), pay('2026-09-22', 99.9, 'saldo')] },
    { id: 1031, client: 'Patrícia Gomes', pid: 'p3', qty: 8, total: 336.0, status: 'Entregue', created: '2026-09-10', deadline: '2026-09-26', delivered: '2026-09-26', details: 'Lembrancinha de aniversário, cores variadas.', pays: [pay('2026-09-12', 168.0, 'sinal'), pay('2026-09-26', 168.0, 'saldo')] },
    { id: 1033, client: 'Larissa Nunes', pid: 'p1', qty: 2, total: 379.8, status: 'Entregue', created: '2026-09-08', deadline: '2026-09-28', delivered: '2026-09-28', details: 'Duas capivaras, uma para cada gêmea.', pays: [pay('2026-09-10', 189.9, 'sinal'), pay('2026-09-28', 189.9, 'saldo')] },
    { id: 1034, client: 'Marina Castro', pid: 'p4', qty: 1, total: 279.9, status: 'Entregue', created: '2026-09-14', deadline: '2026-10-02', delivered: '2026-10-02', details: 'Bolsa cru com alça de bambu.', pays: [pay('2026-09-14', 139.95, 'sinal'), pay('2026-10-02', 139.95, 'saldo')] },
    { id: 1027, client: 'Camila Duarte', pid: 'p4', qty: 1, total: 279.9, status: 'Entregue', created: '2026-09-18', deadline: '2026-10-05', delivered: '2026-10-05', details: 'Bolsa areia.', pays: [pay('2026-09-20', 139.95, 'sinal'), pay('2026-10-05', 139.95, 'saldo')] },
    { id: 1035, client: 'Fernanda Lopes', pid: 'p2', qty: 1, total: 119.9, status: 'Entregue', created: '2026-09-18', deadline: '2026-10-06', delivered: '2026-10-06', details: 'Naninha para chá de bebê.', pays: [pay('2026-09-22', 59.95, 'sinal'), pay('2026-10-06', 59.95, 'saldo')] },
    { id: 1038, client: 'Juliana Prado', pid: 'p1', qty: 1, total: 189.9, status: 'Entregue', created: '2026-09-25', deadline: '2026-10-15', delivered: '2026-10-15', details: 'Capivara tamanho padrão.', pays: [pay('2026-09-27', 94.95, 'sinal'), pay('2026-10-15', 94.95, 'saldo')] },
    { id: 1039, client: 'Fernanda Lopes', pid: 'p2', qty: 1, total: 119.9, status: 'Entregue', created: '2026-09-30', deadline: '2026-10-16', delivered: '2026-10-16', details: 'Naninha rosa.', pays: [pay('2026-10-03', 59.95, 'sinal'), pay('2026-10-16', 59.95, 'saldo')] },
    { id: 1036, client: 'Tatiane Rocha', pid: 'p2', qty: 1, total: 119.9, status: 'Cancelado', created: '2026-09-28', deadline: '2026-10-18', details: 'Cliente desistiu antes do sinal.', pays: [] },
    // em andamento
    { id: 1040, client: 'Camila Duarte', pid: 'p4', qty: 1, total: 279.9, status: 'Aguardando entrega', created: '2026-10-05', deadline: '2026-10-23', details: 'Bolsa cru, alça de bambu. Pronta desde ontem.', pays: [pay('2026-10-05', 139.95, 'sinal')],
      checklist: [['Corpo da bolsa', 1], ['Alças', 1], ['Forro', 1], ['Acabamento', 1], ['Embalagem', 1]] },
    { id: 1041, client: 'Juliana Prado', pid: 'p1', qty: 1, total: 189.9, status: 'Em produção', created: '2026-10-10', deadline: '2026-10-24', details: 'Capivara com laço rosa. Nome “Lia” bordado na barriga.', pays: [pay('2026-10-10', 94.95, 'sinal')],
      checklist: [['Cabeça', 1], ['Corpo', 1], ['Orelhas e patas', 1], ['Montagem', 1], ['Bordados do rosto e nome', 0], ['Acabamento e embalagem', 0]] },
    { id: 1042, client: 'Renata Mello', pid: 'p2', qty: 1, total: 129.9, status: 'Em produção', created: '2026-10-12', deadline: '2026-10-20', details: 'Naninha de coelho com nome “Helena” bordado em lilás (+ R$ 10,00).', custom: true, pays: [pay('2026-10-12', 64.95, 'sinal')],
      checklist: [['Cabeça', 1], ['Corpo', 1], ['Orelhas', 1], ['Bordado do nome', 0], ['Embalagem', 0]] },
    { id: 1043, client: 'Marcos Tavares', pid: null, product: 'Boneca de crochê da Helena (peça personalizada)', qty: 1, total: 260.0, signalPlanned: 130.0, status: 'Orçamento enviado', created: '2026-10-20', deadline: '2026-11-14', details: 'Réplica da filha: vestido azul, cabelo castanho com tranças, 30 cm. Orçamento enviado, aguardando resposta.', custom: true, pays: [] },
    { id: 1044, client: 'Patrícia Gomes', pid: 'p3', qty: 10, total: 420.0, signalPlanned: 210.0, status: 'Aguardando pagamento do sinal', created: '2026-10-19', deadline: '2026-11-20', details: 'Lembrancinhas de casamento, tons terrosos.', pays: [] },
    { id: 1045, client: 'Bianca Ribeiro', pid: 'p5', qty: 1, total: 99.9, status: 'Sinal recebido', created: '2026-10-18', deadline: '2026-11-30', details: 'Kit de chá para presente de Natal.', pays: [pay('2026-10-21', 49.95, 'sinal')] },
    { id: 1046, client: 'Aline Souza', pid: 'p1', qty: 2, total: 379.8, status: 'Aguardando compra de materiais', created: '2026-10-17', deadline: '2026-11-12', details: 'Duas capivaras, uma com laço e uma sem.', pays: [pay('2026-10-20', 189.9, 'sinal')] }
  ];
  LP.order = function (id) { return LP.orders.filter(function (o) { return o.id === +id; })[0]; };
  LP.orderName = function (o) { return o.pid ? LP.prod(o.pid).name : o.product; };
  LP.orderPaid = function (o) { return o.pays.reduce(function (s, p) { return s + p.amount; }, 0); };
  LP.orderBalance = function (o) { return o.status === 'Cancelado' ? 0 : o.total - LP.orderPaid(o); };
  LP.isOpen = function (o) { return o.status !== 'Entregue' && o.status !== 'Cancelado'; };
  LP.orderDays = function (o) { return LP.daysBetween(LP.TODAY, LP.D(o.deadline)); };
  LP.isLate = function (o) { return LP.isOpen(o) && LP.orderDays(o) < 0; };
  LP.isNear = function (o) { var d = LP.orderDays(o); return LP.isOpen(o) && d >= 0 && d <= 3; };
  LP.orderCost = function (o) {
    if (!o.pid) return null;
    return LP.productCost(LP.prod(o.pid)).total * o.qty;
  };

  /* ---------- Clientes ---------- */
  LP.clients = [
    { name: 'Juliana Prado', phone: '(51) 99999-0101', first: '2026-09-25', prefs: 'Gosta de tons terrosos. Compra presentes para a filha, Lia.' },
    { name: 'Renata Mello', phone: '(51) 99999-0102', first: '2026-10-12', prefs: 'Sempre pede nome bordado. Paga no Pix.' },
    { name: 'Marcos Tavares', phone: '(51) 99999-0103', first: '2026-10-20', prefs: 'Cliente novo, veio por indicação da Camila.' },
    { name: 'Camila Duarte', phone: '(51) 99999-0104', first: '2026-09-18', prefs: 'Prefere retirar pessoalmente. Gosta de bolsas em tons neutros.' },
    { name: 'Fernanda Lopes', phone: '(51) 99999-0105', first: '2026-09-18', prefs: 'Compra naninhas para chás de bebê. Pede embalagem de presente.' },
    { name: 'Patrícia Gomes', phone: '(51) 99999-0106', first: '2026-09-10', prefs: 'Lembrancinhas de festa. Encomenda com 1 mês de antecedência.' },
    { name: 'Aline Souza', phone: '(51) 99999-0107', first: '2026-08-20', prefs: 'Cliente desde o início. Gosta de verde-sálvia.' },
    { name: 'Larissa Nunes', phone: '(51) 99999-0108', first: '2026-09-08', prefs: 'Mãe de gêmeas, costuma comprar em dobro.' },
    { name: 'Bianca Ribeiro', phone: '(51) 99999-0109', first: '2026-09-05', prefs: 'Presentes de fim de ano. Prefere cores suaves.' },
    { name: 'Marina Castro', phone: '(51) 99999-0110', first: '2026-09-14', prefs: '' },
    { name: 'Tatiane Rocha', phone: '(51) 99999-0111', first: '2026-09-28', prefs: 'Cancelou um pedido; retomar contato em novembro.' }
  ];
  LP.clientOrders = function (name) { return LP.orders.filter(function (o) { return o.client === name; }).sort(function (a, b) { return b.id - a.id; }); };
  LP.clientStats = function (name) {
    var os = LP.clientOrders(name);
    var bought = os.filter(function (o) { return o.status === 'Entregue'; }).reduce(function (s, o) { return s + o.total; }, 0);
    var open = os.filter(LP.isOpen);
    var pending = open.reduce(function (s, o) { return s + LP.orderBalance(o); }, 0);
    return { orders: os, bought: bought, open: open, pending: pending, count: os.length };
  };

  /* ---------- Financeiro ---------- */
  // Despesas operacionais lançadas manualmente (não vinculadas a pedido ou compra)
  LP.extras = []; // lançamentos manuais feitos no protótipo
  LP.expenses = [
    { d: '2026-09-19', desc: 'Frete / entrega', cat: 'Entrega', amount: 19.0, method: 'Dinheiro' },
    { d: '2026-09-20', desc: 'DAS-MEI setembro', cat: 'Impostos', amount: 81.9, method: 'Pix' },
    { d: '2026-10-08', desc: 'Cartões de visita e adesivos de divulgação', cat: 'Divulgação', amount: 24.0, method: 'Cartão de débito' },
    { d: '2026-10-16', desc: 'Frete / entrega', cat: 'Entrega', amount: 28.5, method: 'Dinheiro' },
    { d: '2026-10-20', desc: 'DAS-MEI outubro', cat: 'Impostos', amount: 81.9, method: 'Pix' }
  ];

  // Livro-caixa unificado: pagamentos de pedidos + compras de material + despesas. Cada evento aparece UMA vez.
  LP.ledger = function () {
    var L = [];
    LP.orders.forEach(function (o) {
      o.pays.forEach(function (p) {
        L.push({ d: p.d, type: 'in', amount: p.amount, cat: p.kind === 'sinal' ? 'Sinal de pedido' : 'Saldo de pedido', desc: o.client + ' · ' + LP.orderName(o), method: p.method, link: { kind: 'order', id: o.id }, done: true });
      });
    });
    LP.materials.forEach(function (m) {
      m.lots.forEach(function (l) {
        L.push({ d: l.d, type: 'out', amount: l.paid, cat: 'Compra de material', desc: m.name + ' · ' + l.qty + ' ' + m.unit, method: l.pay, link: { kind: 'mat', id: m.id }, done: true });
      });
    });
    LP.expenses.forEach(function (e) {
      L.push({ d: e.d, type: 'out', amount: e.amount, cat: e.cat, desc: e.desc, method: e.method, link: null, done: true });
    });
    (LP.extras || []).forEach(function (e) {
      L.push({ d: e.d, type: e.type, amount: e.amount, cat: e.cat, desc: e.desc, method: e.method, link: null, done: true });
    });
    L.sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; });
    return L;
  };
  // Previstos (ainda não realizados): saldos e sinais a receber de pedidos em andamento
  LP.forecastIn = function () {
    var F = [];
    LP.orders.filter(LP.isOpen).forEach(function (o) {
      var bal = LP.orderBalance(o);
      if (bal > 0.005) {
        var isSignal = o.pays.length === 0;
        F.push({ d: isSignal ? o.deadline : o.deadline, type: 'in', amount: isSignal ? (o.signalPlanned || o.total * LP.settings.signalPercent / 100) : bal, cat: isSignal ? 'Sinal previsto' : 'Saldo a receber', desc: o.client + ' · ' + LP.orderName(o), link: { kind: 'order', id: o.id }, done: false, late: LP.isLate(o) });
      }
    });
    F.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    return F;
  };

  LP.period = function (key) {
    var t = LP.TODAY;
    if (key === 'month') return { key: key, label: 'Outubro (1 a 22)', start: D('2026-10-01'), end: t, prevLabel: 'Setembro' };
    if (key === 'last') return { key: key, label: 'Setembro', start: D('2026-09-01'), end: D('2026-09-30'), prevLabel: 'Agosto' };
    if (key === '7d') return { key: key, label: 'Últimos 7 dias', start: new Date(t.getTime() - 6 * DAY), end: t, prevLabel: '7 dias anteriores' };
    return { key: 'all', label: 'Tudo desde agosto', start: D('2026-08-01'), end: t, prevLabel: '' };
  };
  function inP(dstr, p) { var d = D(dstr); return d >= p.start && d <= p.end; }

  // Camada A — fluxo de caixa (dinheiro que entrou e saiu)
  LP.cash = function (p) {
    var L = LP.ledger().filter(function (e) { return inP(e.d, p); });
    var inn = 0, out = 0, buy = 0, op = 0, recv = 0;
    L.forEach(function (e) {
      if (e.type === 'in') { inn += e.amount; recv += e.amount; }
      else { out += e.amount; if (e.cat === 'Compra de material') buy += e.amount; else op += e.amount; }
    });
    var all = LP.ledger();
    var before = all.filter(function (e) { return D(e.d) < p.start; }).reduce(function (s, e) { return s + (e.type === 'in' ? e.amount : -e.amount); }, LP.settings.openingCash);
    var upto = all.filter(function (e) { return D(e.d) <= p.end; }).reduce(function (s, e) { return s + (e.type === 'in' ? e.amount : -e.amount); }, LP.settings.openingCash);
    return { entries: L, inn: inn, out: out, buy: buy, op: op, net: inn - out, opening: before, balance: upto };
  };
  // Saldo de caixa dia a dia (para o gráfico)
  LP.cashSeries = function (p) {
    var all = LP.ledger().sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    var bal = LP.settings.openingCash;
    all.forEach(function (e) { if (D(e.d) < p.start) bal += e.type === 'in' ? e.amount : -e.amount; });
    var pts = [];
    for (var t = p.start.getTime(); t <= p.end.getTime(); t += DAY) {
      var day = new Date(t);
      all.forEach(function (e) { if (D(e.d).getTime() === t) bal += e.type === 'in' ? e.amount : -e.amount; });
      pts.push({ d: day, v: bal });
    }
    return pts;
  };

  // Camada B — resultado do negócio (receita reconhecida na ENTREGA; custo reconhecido pelo consumo da peça vendida)
  LP.result = function (p) {
    var sold = LP.orders.filter(function (o) { return o.status === 'Entregue' && inP(o.delivered, p); });
    var rev = 0, mat = 0, labor = 0, other = 0, units = 0, hours = 0;
    sold.forEach(function (o) {
      rev += o.total;
      if (o.pid) {
        var c = LP.productCost(LP.prod(o.pid));
        mat += c.mat * o.qty; labor += c.labor * o.qty; other += c.other * o.qty; units += o.qty; hours += c.hours * o.qty;
      }
    });
    var opx = LP.expenses.filter(function (e) { return inP(e.d, p); }).reduce(function (s, e) { return s + e.amount; }, 0);
    var cogs = mat + other;
    var gross = rev - cogs - labor;
    var profit = gross - opx;
    return { sold: sold, rev: rev, mat: mat, other: other, labor: labor, opx: opx, cogs: cogs + labor, gross: gross, profit: profit, margin: rev > 0 ? profit / rev * 100 : 0, units: units, hours: hours };
  };

  /* ---------- Atividade recente (Visão geral) ---------- */
  LP.activity = [
    { d: '2026-10-21', ic: 'banknote', tone: 's', t: 'Sinal recebido de Bianca Ribeiro', s: 'Pedido #1045 · R$ 49,95 via Pix' },
    { d: '2026-10-20', ic: 'banknote', tone: 's', t: 'Sinal recebido de Aline Souza', s: 'Pedido #1046 · R$ 189,90 via Pix' },
    { d: '2026-10-20', ic: 'clipboard', tone: 'p', t: 'Novo orçamento enviado a Marcos Tavares', s: 'Pedido #1043 · Boneca personalizada · R$ 260,00' },
    { d: '2026-10-18', ic: 'layers', tone: 'w', t: 'Estoque baixou de Fio Caramelo', s: 'Consumo de 230 g no pedido #1041 · restam 180 g' },
    { d: '2026-10-16', ic: 'truck', tone: 's', t: 'Pedido #1039 entregue a Fernanda Lopes', s: 'Naninha de coelho · saldo de R$ 59,95 recebido' },
    { d: '2026-10-15', ic: 'truck', tone: 's', t: 'Pedido #1038 entregue a Juliana Prado', s: 'Amigurumi de capivara · saldo de R$ 94,95 recebido' }
  ];

  /* ---------- Mensagens de WhatsApp (sugestões editáveis; nunca enviadas sozinhas) ---------- */
  LP.msgTemplates = [
    { id: 'orc', label: 'Orçamento', text: 'Oi, {nome}! Tudo bem? Aqui é da LaPoli Crochê 🧶\nSegue o orçamento: {produto} ({qtd}) por {total}. O prazo de entrega é {prazo}. Para reservar, peço um sinal de {sinal}. Posso confirmar?' },
    { id: 'conf', label: 'Confirmação', text: 'Oi, {nome}! Recebi o sinal de {sinal}, obrigada! Seu pedido #{num} ({produto}) está confirmado para {prazo}. Qualquer detalhe novo é só me avisar.' },
    { id: 'prod', label: 'Em produção', text: 'Oi, {nome}! Passando para contar que seu pedido #{num} já está em produção. Previsão de entrega: {prazo}. Se quiser ver o andamento, mando uma foto!' },
    { id: 'pronto', label: 'Pronto', text: 'Oi, {nome}! Seu pedido #{num} ({produto}) ficou pronto! 💛 O saldo de {saldo} pode ser pago na retirada. Qual o melhor horário para você?' }
  ];

  /* ---------- Categorias (configuráveis; no app atual: Amigurumi, Chaveiro, Bolsa, Acessório, Outro) ---------- */
  LP.categories = ['Amigurumi', 'Infantil', 'Chaveiro', 'Bolsa', 'Presente'];
  LP.matTypes = ['fio', 'enchimento', 'olhos', 'argola', 'botão', 'acessório', 'embalagem', 'outro'];
})();
