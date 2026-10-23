/* ==========================================================================
   LaPoli · protótipo — componentes de UI reutilizáveis (HTML em string)
   ========================================================================== */
(function () {
  var LP = window.LP;
  var ic = LP.icon;

  /* ---------- Formatação (pt-BR) ---------- */
  var nf = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  LP.money = function (v) { return nf.format(v || 0).replace(/ /g, ' ').replace('-R$', '−R$'); };
  LP.moneyShort = function (v) { return nf.format(Math.round(v)).replace(/ /g, ' ').replace(',00', ''); };
  // custo unitário: 3 casas quando < R$ 1 (R$ 0,119/g), para a conta fechar à vista
  LP.moneyU = function (v) { return v < 1 ? 'R$ ' + (v || 0).toFixed(3).replace('.', ',') : LP.money(v); };
  LP.num = function (v, d) { return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }).format(v); };
  LP.pct = function (v, d) { return LP.num(v, d == null ? 1 : d) + '%'; };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  LP.dshort = function (d) { d = typeof d === 'string' ? LP.D(d) : d; return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
  LP.dfull = function (d) { d = typeof d === 'string' ? LP.D(d) : d; return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  LP.dlong = function (d) { return DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); };
  LP.mes = function (i) { return MESES[i]; };
  LP.rel = function (n) {
    if (n === 0) return 'hoje';
    if (n === 1) return 'amanhã';
    if (n === -1) return 'ontem';
    return n > 0 ? 'em ' + n + ' dias' : 'há ' + Math.abs(n) + ' dias';
  };
  LP.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  LP.initials = function (n) { var p = n.split(' '); return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase(); };
  LP.qty = function (v, unit) { return LP.num(v, v % 1 ? 1 : 0) + ' ' + unit; };
  // Embalagem (novelo, rolo, pacote): a quantidade física continua em g/un, mas também aparece em embalagens
  LP.pkgName = function (m, n) { return Math.abs(n) < 2 ? m.pkg.name : m.pkg.plural; };
  LP.pkgUnits = function (m, q) { var u = q / m.pkg.size; return LP.num(u, Math.abs(u - Math.round(u)) < 0.05 ? 0 : 1) + ' ' + LP.pkgName(m, u); };
  // só mostra a equivalência quando passa de meia embalagem (evita "0,1 pacote" em itens pequenos)
  LP.pkgEq = function (m, q) { return m.pkg && Math.abs(q) / m.pkg.size >= 0.5 ? LP.pkgUnits(m, q) : ''; };
  // "1,8 novelo · 180 g"
  LP.qtyP = function (q, m) { var e = LP.pkgEq(m, q); return e ? e + ' · ' + LP.qty(q, m.unit) : LP.qty(q, m.unit); };
  LP.pkgNote = function (m, q) { var e = LP.pkgEq(m, q); return e ? '≈ ' + e + ' de ' + LP.qty(m.pkg.size, m.unit) : ''; };

  /* ---------- Badges ---------- */
  LP.badge = function (txt, cls, icon) { return '<span class="badge ' + cls + '">' + (icon ? ic(icon, 13) : '') + LP.esc(txt) + '</span>'; };
  LP.marginBadge = function (state, margin) {
    if (state === 'loss') return LP.badge('Prejuízo', 'b-error', 'trending-down');
    if (state === 'low') return LP.badge('Abaixo da meta', 'b-warning', 'alert');
    return LP.badge('Margem saudável', 'b-success', 'check-circle');
  };
  LP.stockBadge = function (level) {
    if (level === 'low') return LP.badge('Estoque baixo', 'b-error', 'alert');
    if (level === 'near') return LP.badge('Quase no mínimo', 'b-warning', 'alert');
    return LP.badge('Em dia', 'b-success', 'check');
  };
  LP.statusBadge = function (s) {
    var ph = LP.phaseOf(s);
    var map = { orcamento: 'b-info', producao: 'b-primary', entrega: 'b-success', done: 'b-neutral', cancel: 'b-neutral' };
    var cls = map[ph];
    if (s === 'Aguardando compra de materiais') cls = 'b-warning';
    if (s === 'Entregue') cls = 'b-success';
    return '<span class="badge ' + cls + '">' + LP.esc(s) + '</span>';
  };
  LP.deadlineBadge = function (o) {
    if (!LP.isOpen(o)) return '';
    var n = LP.orderDays(o);
    if (n < 0) return LP.badge('Atrasado ' + Math.abs(n) + (Math.abs(n) === 1 ? ' dia' : ' dias'), 'b-error', 'clock');
    if (n <= 3) return LP.badge('Entrega ' + LP.rel(n), 'b-warning', 'clock');
    return '';
  };
  LP.payBadge = function (o) {
    if (o.status === 'Cancelado') return LP.badge('Cancelado', 'b-neutral');
    var bal = LP.orderBalance(o);
    if (o.status === 'Entregue' && bal < 0.01) return LP.badge('Pago', 'b-success', 'check');
    if (o.pays.length === 0) return LP.badge('Sinal pendente', 'b-warning', 'wallet');
    if (bal > 0.01) return LP.badge('Saldo ' + LP.money(bal), 'b-neutral', 'wallet');
    return LP.badge('Pago', 'b-success', 'check');
  };
  LP.lens = function (kind) {
    var m = { fat: ['Faturamento', 'lens-fat', 'tag'], caixa: ['Caixa', 'lens-caixa', 'wallet'], lucro: ['Lucro', 'lens-lucro', 'chart'], prev: ['Previsto', 'lens-prev', 'clock'] }[kind];
    return '<span class="lens ' + m[1] + '">' + ic(m[2], 13) + m[0] + '</span>';
  };
  LP.tip = function (txt) { return '<span class="tip-ic" tabindex="0" data-tip="' + LP.esc(txt) + '">' + ic('info', 15) + '</span>'; };

  /* ---------- Fotos de produto: ilustrações-placeholder (no app real entram as fotos da usuária) ---------- */
  var st = 'stroke-linecap="round" stroke-linejoin="round"';
  var ART = {
    capivara: '<rect width="200" height="200" fill="#F1E4D3"/><ellipse cx="100" cy="170" rx="56" ry="8" fill="#000" opacity=".07"/><ellipse cx="100" cy="124" rx="54" ry="44" fill="#C99A6B"/><ellipse cx="100" cy="138" rx="30" ry="26" fill="#E9D3B4"/><ellipse cx="72" cy="164" rx="15" ry="8" fill="#B98655"/><ellipse cx="128" cy="164" rx="15" ry="8" fill="#B98655"/><ellipse cx="100" cy="80" rx="42" ry="35" fill="#C99A6B"/><circle cx="66" cy="50" r="10" fill="#B98655"/><circle cx="66" cy="50" r="5" fill="#E9D3B4"/><circle cx="134" cy="50" r="10" fill="#B98655"/><circle cx="134" cy="50" r="5" fill="#E9D3B4"/><rect x="74" y="82" width="52" height="30" rx="16" fill="#D6AE80"/><ellipse cx="100" cy="88" rx="9" ry="5.5" fill="#5B3F2B"/><path d="M100 93v7M94 102q6 4 12 0" stroke="#5B3F2B" stroke-width="2" fill="none" ' + st + '/><circle cx="82" cy="70" r="4.2" fill="#2D2D2D"/><circle cx="118" cy="70" r="4.2" fill="#2D2D2D"/><path d="M52 122q48-26 96 0M58 140q42-18 84 0" stroke="#A87B4F" stroke-width="1.6" stroke-dasharray="2 5" fill="none" ' + st + '/><path d="M70 48q30-14 60 0" stroke="#A87B4F" stroke-width="1.4" stroke-dasharray="2 5" fill="none" ' + st + '/>',
    coelho: '<rect width="200" height="200" fill="#F6E3E3"/><rect x="38" y="62" width="124" height="104" rx="22" fill="#F2C9CC"/><rect x="46" y="70" width="108" height="88" rx="16" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 5" opacity=".8"/><g fill="#F2C9CC"><circle cx="54" cy="168" r="9"/><circle cx="72" cy="168" r="9"/><circle cx="90" cy="168" r="9"/><circle cx="108" cy="168" r="9"/><circle cx="126" cy="168" r="9"/><circle cx="144" cy="168" r="9"/></g><ellipse cx="84" cy="44" rx="10" ry="27" fill="#FBF2EE" transform="rotate(-8 84 44)"/><ellipse cx="116" cy="44" rx="10" ry="27" fill="#FBF2EE" transform="rotate(8 116 44)"/><ellipse cx="84" cy="46" rx="4.5" ry="19" fill="#F2C9CC" transform="rotate(-8 84 46)"/><ellipse cx="116" cy="46" rx="4.5" ry="19" fill="#F2C9CC" transform="rotate(8 116 46)"/><circle cx="100" cy="98" r="33" fill="#FBF2EE"/><circle cx="88" cy="94" r="3.8" fill="#2D2D2D"/><circle cx="112" cy="94" r="3.8" fill="#2D2D2D"/><ellipse cx="100" cy="104" rx="5" ry="3.5" fill="#E8A68D"/><path d="M100 107v4M94 112q6 4 12 0" stroke="#B87A6A" stroke-width="1.8" fill="none" ' + st + '/><circle cx="80" cy="106" r="5.5" fill="#F2C9CC" opacity=".8"/><circle cx="120" cy="106" r="5.5" fill="#F2C9CC" opacity=".8"/>',
    chaveiro: '<rect width="200" height="200" fill="#EDE6D8"/><circle cx="100" cy="36" r="17" fill="none" stroke="#8F8A85" stroke-width="4"/><path d="M100 53v16" stroke="#8F8A85" stroke-width="4" ' + st + '/><ellipse cx="100" cy="116" rx="50" ry="44" fill="#C99A6B"/><circle cx="68" cy="82" r="11" fill="#B98655"/><circle cx="68" cy="82" r="5.5" fill="#E9D3B4"/><circle cx="132" cy="82" r="11" fill="#B98655"/><circle cx="132" cy="82" r="5.5" fill="#E9D3B4"/><rect x="72" y="112" width="56" height="32" rx="17" fill="#D6AE80"/><ellipse cx="100" cy="119" rx="9.5" ry="6" fill="#5B3F2B"/><circle cx="80" cy="104" r="4.6" fill="#2D2D2D"/><circle cx="120" cy="104" r="4.6" fill="#2D2D2D"/><path d="M62 98q38-22 76 0" stroke="#A87B4F" stroke-width="1.5" stroke-dasharray="2 5" fill="none" ' + st + '/>',
    bolsa: '<rect width="200" height="200" fill="#E9E1D3"/><ellipse cx="100" cy="176" rx="62" ry="7" fill="#000" opacity=".07"/><path d="M62 90C62 22 138 22 138 90" fill="none" stroke="#B89B6A" stroke-width="8" ' + st + '/><path d="M46 88h108l-8 76q-1 8-9 8H63q-8 0-9-8z" fill="#DCCBA8"/><path d="M52 102h96M52 116h96M52 130h96M52 144h96M52 158h96" stroke="#BFA97F" stroke-width="2" stroke-dasharray="3 4" ' + st + '/><path d="M46 88h108" stroke="#C8B48C" stroke-width="5" ' + st + '/><circle cx="100" cy="96" r="6" fill="#CDA877"/><circle cx="100" cy="96" r="2" fill="#8B6B3F"/>',
    kitcha: '<rect width="200" height="200" fill="#E4EEE7"/><circle cx="100" cy="112" r="68" fill="#F4F0E8"/><circle cx="100" cy="112" r="60" fill="none" stroke="#A8C4B3" stroke-width="2" stroke-dasharray="3 5"/><circle cx="100" cy="112" r="46" fill="#C8E0D4"/><circle cx="100" cy="112" r="46" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="2 5" opacity=".9"/><path d="M76 98h48v12a24 24 0 0 1-48 0z" fill="#fff" stroke="#7B9E87" stroke-width="2"/><path d="M124 102q14 0 14 9t-14 9" fill="none" stroke="#7B9E87" stroke-width="2.5" ' + st + '/><path d="M90 88q-5-7 0-13M102 90q-5-9 0-16M114 88q-5-7 0-13" stroke="#7B9E87" stroke-width="1.8" fill="none" ' + st + '/><rect x="42" y="38" width="30" height="30" rx="8" fill="#EFC4C4"/><circle cx="57" cy="53" r="8" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="2 3"/>',
    leao: '<rect width="200" height="200" fill="#F3E6C8"/><circle cx="100" cy="104" r="62" fill="#D9A441"/><circle cx="100" cy="104" r="54" fill="none" stroke="#F3E6C8" stroke-width="2" stroke-dasharray="3 5"/><circle cx="68" cy="58" r="10" fill="#EBC77A"/><circle cx="132" cy="58" r="10" fill="#EBC77A"/><circle cx="100" cy="106" r="38" fill="#EBC77A"/><circle cx="86" cy="98" r="4.4" fill="#2D2D2D"/><circle cx="114" cy="98" r="4.4" fill="#2D2D2D"/><path d="M93 110h14l-7 8z" fill="#8B5A2B"/><path d="M100 118v6M92 126q8 5 16 0" stroke="#8B5A2B" stroke-width="2" fill="none" ' + st + '/>',
    boneca: '<rect width="200" height="200" fill="#EFE3E0"/><path d="M72 108h56l16 62H56z" fill="#7C9CC4"/><path d="M72 108h56l16 62H56z" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="2 5" opacity=".85"/><rect x="40" y="112" width="34" height="14" rx="7" fill="#F0D5BC" transform="rotate(18 57 119)"/><rect x="126" y="112" width="34" height="14" rx="7" fill="#F0D5BC" transform="rotate(-18 143 119)"/><circle cx="100" cy="72" r="32" fill="#F0D5BC"/><path d="M66 72a34 34 0 0 1 68 0c-6-14-22-20-34-20s-28 6-34 20z" fill="#6B4A32"/><ellipse cx="62" cy="96" rx="9" ry="24" fill="#6B4A32"/><ellipse cx="138" cy="96" rx="9" ry="24" fill="#6B4A32"/><circle cx="88" cy="76" r="3.6" fill="#2D2D2D"/><circle cx="112" cy="76" r="3.6" fill="#2D2D2D"/><path d="M93 88q7 5 14 0" stroke="#B87A6A" stroke-width="2" fill="none" ' + st + '/><circle cx="80" cy="86" r="5" fill="#EFB7A6" opacity=".7"/><circle cx="120" cy="86" r="5" fill="#EFB7A6" opacity=".7"/>',
    novelo: '<rect width="200" height="200" fill="#F1E4D3"/><circle cx="100" cy="100" r="54" fill="#EFC4C4"/><path d="M52 84q48 26 96 0M48 104q52 28 104 0M60 128q40 20 80 0M76 52q10 48 0 96M104 48q16 52 0 104" stroke="#C97B5F" stroke-width="2.2" fill="none" opacity=".75" ' + st + '/>'
  };
  LP.art = function (name, cls, ph) {
    return '<div class="pic ' + (cls || '') + '"><svg viewBox="0 0 200 200" role="img" aria-label="Ilustração do produto" preserveAspectRatio="xMidYMid slice">' + (ART[name] || ART.novelo) + '</svg>' + (ph ? '<span class="ph">Foto ilustrativa</span>' : '') + '</div>';
  };
  LP.orderArt = function (o) { return o.pid ? LP.prod(o.pid).art : 'boneca'; };

  /* ---------- Ilustrações lineares (estados vazios) ---------- */
  LP.ill = function (kind) {
    var s = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    var m = {
      yarn: '<ellipse cx="60" cy="62" rx="34" ry="38" ' + s + '/><path d="M30 60q30-22 60 0M30 60q30 22 60 0M38 42q22-10 44 0M38 80q22 10 44 0" ' + s + ' opacity=".55"/><path d="M92 62q12-6 18 6t-6 22" ' + s + '/>',
      hook: '<path d="M30 92 84 38" ' + s + '/><path d="M84 38a9 9 0 1 0-11-6l4 3" ' + s + '/><ellipse cx="40" cy="96" rx="22" ry="8" transform="rotate(-45 40 96)" ' + s + ' opacity=".55"/><path d="M22 78q18-8 30 4M16 92q22-6 38 6" ' + s + ' opacity=".45"/>',
      bear: '<circle cx="60" cy="48" r="26" ' + s + '/><circle cx="40" cy="26" r="9" ' + s + '/><circle cx="80" cy="26" r="9" ' + s + '/><ellipse cx="60" cy="90" rx="26" ry="24" ' + s + '/><circle cx="51" cy="46" r="2.5" fill="currentColor"/><circle cx="69" cy="46" r="2.5" fill="currentColor"/><ellipse cx="60" cy="56" rx="7" ry="5" ' + s + '/><path d="M44 78q16-10 32 0" ' + s + ' opacity=".5"/>',
      box: '<path d="M18 44 60 24l42 20v44L60 108 18 88z" ' + s + '/><path d="M18 44l42 20 42-20M60 64v44" ' + s + ' opacity=".6"/><path d="M82 34 40 54" ' + s + ' opacity=".4"/>',
      wallet: '<rect x="18" y="34" width="84" height="60" rx="12" ' + s + '/><path d="M18 52h84" ' + s + ' opacity=".5"/><rect x="74" y="64" width="28" height="16" rx="8" ' + s + '/><path d="M30 34l40-14 6 14" ' + s + ' opacity=".6"/>',
      chart: '<path d="M20 24v70h82" ' + s + '/><path d="M36 82l20-24 18 12 24-32" ' + s + '/><circle cx="98" cy="38" r="3" fill="currentColor"/>',
      users: '<circle cx="46" cy="44" r="16" ' + s + '/><path d="M18 96c0-18 12-28 28-28s28 10 28 28" ' + s + '/><circle cx="86" cy="50" r="11" ' + s + ' opacity=".55"/><path d="M82 72c14 0 22 8 22 22" ' + s + ' opacity=".55"/>'
    };
    return '<svg class="ill" viewBox="0 0 120 120" aria-hidden="true">' + (m[kind] || m.yarn) + '</svg>';
  };
  LP.empty = function (o) {
    return '<div class="empty ' + (o.compact ? 'compact' : '') + '">' + LP.ill(o.ill || 'yarn') + '<h3>' + o.title + '</h3><p>' + o.text + '</p>' +
      (o.actions ? '<div class="acts">' + o.actions + '</div>' : '') + '</div>';
  };

  /* ---------- Gráficos simples (SVG) ---------- */
  LP.lineChart = function (pts, o) {
    o = o || {};
    var W = 680, H = o.h || 220, L = 52, R = 14, T = 14, B = 28;
    var vs = pts.map(function (p) { return p.v; });
    var min = Math.min.apply(null, vs), max = Math.max.apply(null, vs);
    var span = max - min || 1; min -= span * .12; max += span * .12;
    var x = function (i) { return L + (pts.length === 1 ? 0 : i / (pts.length - 1)) * (W - L - R); };
    var y = function (v) { return T + (1 - (v - min) / (max - min)) * (H - T - B); };
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join(' ');
    var area = d + ' L' + x(pts.length - 1).toFixed(1) + ' ' + (H - B) + ' L' + x(0).toFixed(1) + ' ' + (H - B) + ' Z';
    var g = '';
    for (var i = 0; i <= 3; i++) {
      var v = min + (max - min) * i / 3, yy = y(v);
      g += '<line class="grid-l" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + LP.moneyShort(v) + '</text>';
    }
    var ticks = '';
    var step = Math.max(1, Math.floor(pts.length / 6));
    pts.forEach(function (p, i) { if (i % step === 0 || i === pts.length - 1) ticks += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + LP.dshort(p.d) + '</text>'; });
    var col = o.color || 'var(--color-secondary-scale-600)';
    var last = pts[pts.length - 1];
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + LP.esc(o.label || 'Gráfico de linha') + '">' + g + ticks +
      '<path d="' + area + '" fill="' + col + '" opacity=".12"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + x(pts.length - 1) + '" cy="' + y(last.v) + '" r="5" fill="#fff" stroke="' + col + '" stroke-width="2.5"/></svg>';
  };
  // Barras agrupadas. groups: [{label, bars:[{v, color, name}]}]
  LP.barChart = function (groups, o) {
    o = o || {};
    var W = 680, H = o.h || 230, L = 52, R = 10, T = 12, B = 30;
    var max = 0; groups.forEach(function (g) { g.bars.forEach(function (b) { max = Math.max(max, b.v); }); });
    max = max * 1.12 || 1;
    var gw = (W - L - R) / groups.length;
    var bw = Math.min(46, (gw - 28) / Math.max(1, groups[0].bars.length));
    var s = '';
    for (var i = 0; i <= 3; i++) { var v = max * i / 3, yy = T + (1 - v / max) * (H - T - B); s += '<line class="grid-l" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + LP.moneyShort(v) + '</text>'; }
    groups.forEach(function (g, gi) {
      var cx = L + gi * gw + gw / 2, total = g.bars.length * bw + (g.bars.length - 1) * 6, x0 = cx - total / 2;
      g.bars.forEach(function (b, bi) {
        var h = Math.max(b.v > 0 ? 2 : 0, (b.v / max) * (H - T - B)), bx = x0 + bi * (bw + 6), by = H - B - h;
        s += '<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + h + '" rx="6" fill="' + b.color + '"><title>' + LP.esc((b.name || '') + ': ' + LP.money(b.v)) + '</title></rect>';
        if (b.v > 0 && o.labels !== false) s += '<text x="' + (bx + bw / 2) + '" y="' + (by - 6) + '" text-anchor="middle" style="font-weight:600;fill:var(--color-text)">' + LP.moneyShort(b.v) + '</text>';
      });
      s += '<text x="' + cx + '" y="' + (H - 9) + '" text-anchor="middle">' + LP.esc(g.label) + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + LP.esc(o.label || 'Gráfico de barras') + '">' + s + '</svg>';
  };
  // Mini barras (atividade dos últimos dias)
  LP.miniBars = function (days) {
    var max = Math.max.apply(null, days.map(function (d) { return Math.max(d.in, d.out); })) || 1;
    var W = 300, H = 80, bw = 7, gap = (W - days.length * bw * 2) / days.length;
    var s = '';
    days.forEach(function (d, i) {
      var x = i * (bw * 2 + gap) + gap / 2;
      var h1 = d.in / max * (H - 16), h2 = d.out / max * (H - 16);
      s += '<rect x="' + x + '" y="' + (H - 14 - h1) + '" width="' + bw + '" height="' + Math.max(h1, d.in ? 2 : 0) + '" rx="3" fill="var(--color-secondary)"/><rect x="' + (x + bw + 1) + '" y="' + (H - 14 - h2) + '" width="' + bw + '" height="' + Math.max(h2, d.out ? 2 : 0) + '" rx="3" fill="var(--color-primary-light)"/>';
      if (i % 3 === 0) s += '<text x="' + (x + bw) + '" y="' + (H - 1) + '" text-anchor="middle" style="font-size:10px">' + LP.dshort(d.d) + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Entradas e saídas dos últimos 14 dias">' + s + '</svg>';
  };

  /* ---------- Overlays ---------- */
  var lastFocus = null;
  LP.openModal = function (o) {
    var root = document.getElementById('overlay-root');
    lastFocus = document.activeElement;
    root.innerHTML = '<div class="overlay" data-overlay><div class="modal ' + (o.wide ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + LP.esc(o.title) + '"><div class="grab"></div><div class="modal-head"><h3>' + o.title + '</h3><button class="btn btn-ghost btn-icon btn-sm" data-action="close-modal" aria-label="Fechar">' + ic('x', 20) + '</button></div><div class="modal-body">' + o.body + '</div>' + (o.foot ? '<div class="modal-foot">' + o.foot + '</div>' : '') + '</div></div>';
    var f = root.querySelector('input, select, textarea, button.btn-primary, .modal-body button');
    if (f) setTimeout(function () { f.focus(); }, 30);
    document.body.style.overflow = 'hidden';
  };
  LP.closeModal = function () {
    document.getElementById('overlay-root').innerHTML = '';
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
  LP.confirm = function (o) {
    LP.openModal({
      title: o.title,
      body: '<p class="muted" style="line-height:1.7">' + o.text + '</p>' + (o.extra || ''),
      foot: '<button class="btn btn-secondary" data-action="close-modal">' + (o.cancel || 'Cancelar') + '</button><button class="btn ' + (o.danger ? 'btn-danger-solid' : 'btn-primary') + '" data-action="confirm-ok">' + o.ok + '</button>'
    });
    LP._confirm = o.onOk;
  };
  LP.toast = function (msg, o) {
    o = o || {};
    var box = document.getElementById('toasts'); if (!box) return;
    var el = document.createElement('div');
    var icn = { ok: 'check-circle', err: 'x-circle', info: 'info', warn: 'alert' }[o.type || 'ok'];
    el.className = 'toast ' + (o.type && o.type !== 'ok' ? o.type : '');
    el.setAttribute('role', 'status');
    el.innerHTML = ic(icn, 20) + '<div><b>' + msg + '</b>' + (o.sub ? '<span class="muted small">' + o.sub + '</span>' : '') + '</div>' + (o.undo ? '<button class="undo" data-action="toast-undo">Desfazer</button>' : '');
    box.appendChild(el);
    el.querySelector('.undo') && el.querySelector('.undo').addEventListener('click', function () { el.remove(); LP.toast('Ação desfeita', { type: 'info' }); });
    setTimeout(function () { el.style.opacity = 0; el.style.transition = 'opacity .3s'; setTimeout(function () { el.remove(); }, 300); }, o.ms || 4800);
  };
  LP.menu = function (id, label, items, o) {
    o = o || {};
    return '<div class="menu-wrap"><button class="' + (o.btnClass || 'btn btn-secondary btn-sm') + '" data-action="menu" aria-haspopup="true" aria-expanded="false" ' + (o.aria ? 'aria-label="' + o.aria + '"' : '') + '>' + label + '</button><div class="menu ' + (o.left ? 'left' : '') + '" role="menu" hidden>' +
      items.map(function (it) {
        if (it === '-') return '<hr/>';
        return '<button role="menuitem" class="' + (it.danger ? 'danger' : '') + '" data-action="' + it.action + '"' + (it.arg ? ' data-arg="' + LP.esc(it.arg) + '"' : '') + '>' + (it.icon ? ic(it.icon, 18) : '') + it.label + '</button>';
      }).join('') + '</div></div>';
  };

  /* ---------- Cabeçalho de página ---------- */
  LP.pageHead = function (title, sub, actions) {
    return '<div class="page-head"><div class="head-main"><h1>' + title + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="actions">' + actions + '</div>' : '') + '</div>';
  };
  LP.field = function (label, control, o) {
    o = o || {};
    return '<div class="field ' + (o.cls || '') + '"><label' + (o.for ? ' for="' + o.for + '"' : '') + '>' + label + (o.opt ? ' <span class="opt">(opcional)</span>' : '') + '</label>' + control + (o.help ? '<span class="help">' + o.help + '</span>' : '') + '</div>';
  };
  LP.skeletonCards = function (n) {
    var s = '';
    for (var i = 0; i < n; i++) s += '<div class="card"><div class="skel" style="height:14px;width:40%;margin-bottom:14px"></div><div class="skel" style="height:30px;width:65%;margin-bottom:12px"></div><div class="skel" style="height:12px;width:80%"></div></div>';
    return s;
  };
})();
