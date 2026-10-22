/* ==========================================================================
   Fase 1 — Guia visual / design system (o que existe, o que muda, o que entra)
   ========================================================================== */
(function () {
  var LP = window.LP, ic = LP.icon;
  LP.screens = LP.screens || {};

  var sw = function (name, hex, use, o) {
    o = o || {};
    return '<div class="swatch-card"><div class="sw-chip" style="background:' + hex + ';' + (o.border ? 'border:1px solid var(--color-border);' : '') + '"><span style="color:' + (o.light ? '#fff' : '#2D2D2D') + '">' + (o.ratio || '') + '</span></div><b>' + name + '</b><code>' + hex + '</code><span class="small muted">' + use + '</span>' + (o.tag ? '<span class="badge ' + o.tag[1] + '">' + o.tag[0] + '</span>' : '') + '</div>';
  };
  var NEW = ['Novo', 'b-primary'], KEEP = ['Mantido', 'b-neutral'], FIX = ['Ajustado', 'b-warning'];

  LP.screens.guide = function () {
    var head = LP.pageHead('Guia visual', 'Fase 1 · A identidade “Ateliê Aconchegante” que já existe no app, consolidada, com os poucos ajustes propostos.',
      '<span class="badge b-neutral">Mantido</span><span class="badge b-warning">Ajustado</span><span class="badge b-primary">Novo</span>');

    var principle = '<div class="grid g-3 mb-16">' + [['Grafite é a voz', 'O texto principal continua #2D2D2D, como no app hoje. Terracota e sálvia entram com intenção: ação e estados.'], ['Números em Fraunces', 'Valores, totais e preços em serifada com algarismos tabulares. Todo o resto em DM Sans.'], ['Nunca misturar dinheiro', 'Faturamento, caixa e lucro têm rótulo próprio ao lado de cada valor. Nada de “receita” solta.']].map(function (x, i) { return '<div class="card"><span class="step-n sm">' + (i + 1) + '</span><h3 class="mt-8" style="font-family:var(--font-serif);font-size:20px">' + x[0] + '</h3><p class="muted mt-8">' + x[1] + '</p></div>'; }).join('') + '</div>';

    var colors = '<section class="card"><div class="card-head"><h2>Cores</h2><span class="small muted">Valores idênticos aos de <code>src/utils/theme.ts</code></span></div>' +
      '<h3 class="label">Marca e superfícies</h3><div class="sw-grid mt-8">' +
      sw('Terracota', '#C97B5F', 'Marca, ícones, gráficos. Texto branco aqui dá só 3,2:1.', { light: true, ratio: '3,2:1', tag: KEEP }) +
      sw('Terracota ação', '#A85D42', 'Fundo de botão primário (branco → 4,9:1).', { light: true, ratio: '4,9:1', tag: FIX }) +
      sw('Terracota texto', '#8B4630', 'Links e texto terracota (6,6:1).', { light: true, ratio: '6,6:1', tag: NEW }) +
      sw('Verde-sálvia', '#7B9E87', 'Caixa, progresso, estados positivos suaves.', { light: true, ratio: '3,0:1', tag: KEEP }) +
      sw('Sálvia escuro', '#4A6353', 'Texto sobre sálvia claro (6,2:1).', { light: true, ratio: '6,2:1', tag: KEEP }) +
      sw('Grafite', '#2D2D2D', 'Texto principal e botão “lucro”. Identidade preservada.', { light: true, ratio: '13:1', tag: KEEP }) +
      sw('Grafite 60%', '#6B6B6B', 'Texto secundário (5,0:1 no creme).', { light: true, ratio: '5,0:1', tag: KEEP }) +
      sw('Creme', '#FAF8F5', 'Fundo do app.', { border: true, tag: KEEP }) +
      sw('Branco quente', '#FFFFFF', 'Cards, modais.', { border: true, tag: KEEP }) +
      sw('Areia', '#F5F3F0', 'Superfícies de apoio.', { border: true, tag: KEEP }) +
      sw('Borda', '#E0DDD9', 'Bordas e divisores.', { tag: KEEP }) +
      sw('Cinza claro', '#9B9B9B', 'Só ícones inativos. Como texto dá 2,6:1.', { light: true, ratio: '2,6:1', tag: FIX }) + '</div>' +
      '<h3 class="label mt-24">Semânticas</h3><div class="sw-grid mt-8">' +
      sw('Sucesso', '#5B8C5A', 'Barras e ícones.', { light: true, tag: KEEP }) + sw('Sucesso texto', '#3A6B39', 'Texto em alertas (5,9:1).', { light: true, tag: NEW }) +
      sw('Atenção', '#D4A04A', 'Barras e ícones. Nunca para texto.', { tag: KEEP }) + sw('Atenção texto', '#7D5A12', 'Texto em alertas (5,9:1).', { light: true, tag: NEW }) +
      sw('Erro', '#B85C5C', 'Barras e ícones.', { light: true, tag: KEEP }) + sw('Erro texto', '#9B3F3F', 'Texto em alertas (6,2:1).', { light: true, tag: NEW }) +
      sw('Informação', '#5C7CB8', 'Orçamentos e dicas.', { light: true, tag: KEEP }) + sw('Info texto', '#3F5F9A', 'Texto (6,0:1).', { light: true, tag: NEW }) + '</div>' +
      '<h3 class="label mt-24">Tintas de fundo <span class="badge b-primary">Novo</span></h3><p class="small muted">Substituem o improviso <code>${cor}12</code> do código atual por valores fixos e testados.</p><div class="sw-grid mt-8">' +
      [['Terracota', '#FBEEE8'], ['Sucesso', '#EAF2EA'], ['Atenção', '#FBF1DC'], ['Erro', '#F8E9E7'], ['Info', '#E9EEF8'], ['Areia', '#F1ECE4']].map(function (t) { return sw(t[0], t[1], 'Fundo de alerta e badge.', { border: true }); }).join('') + '</div>' +
      '<div class="alert alert-warning mt-16">' + ic('alert', 20) + '<div class="a-body"><div class="a-title">O que mudaria de verdade</div><p>Só o fundo do botão primário (de #C97B5F para #A85D42) e o cinza de apoio usado como texto. A terracota de marca continua em todos os ícones, gráficos e detalhes — a aparência geral não muda.</p></div></div></section>';

    var type = '<section class="card mt-16"><div class="card-head"><h2>Tipografia</h2><span class="small muted">Fraunces + DM Sans, como hoje</span></div><div class="type-specimen">' +
      '<div><span class="eyebrow">Display · Fraunces 600 · 34/40</span><div class="serif" style="font-size:34px;font-weight:600;letter-spacing:-.02em">Boa tarde! Seu ateliê hoje</div></div>' +
      '<div><span class="eyebrow">Número destaque · Fraunces 600, tabular</span><div class="display-num" style="font-size:44px">R$ 1.234,56</div></div>' +
      '<div><span class="eyebrow">Título de seção · DM Sans 600 · 18</span><div style="font-size:18px;font-weight:600">Pedidos em andamento</div></div>' +
      '<div><span class="eyebrow">Corpo · DM Sans 400 · 14–15</span><div style="font-size:15px">Capivara sentada com focinho bordado, ideal para presente. Pode levar laço ou nome bordado.</div></div>' +
      '<div><span class="eyebrow">Apoio · DM Sans 400 · 12,5–13 (mínimo)</span><div class="small muted" style="font-size:13px">Atualizado hoje às 15:42 · dados apenas neste aparelho</div></div></div>' +
      '<p class="small muted mt-16">Escala do app: 11 · 12 · 14 · 16 · 18 · 20 · 24 · 32 · 40 · 48. O protótipo evita 11px em texto de leitura (só em rótulos de menu), por legibilidade.</p></section>';

    var shape = '<section class="card mt-16"><div class="card-head"><h2>Espaços, bordas e sombras</h2></div><div class="grid g-3"><div><span class="label">Espaçamento (base 4px)</span><div class="space-demo mt-8">' + [4, 8, 12, 16, 24, 32, 48].map(function (n) { return '<div><i style="width:' + n + 'px"></i><span class="small muted">' + n + '</span></div>'; }).join('') + '</div></div>' +
      '<div><span class="label">Raios</span><div class="radius-demo mt-8">' + [['xs', 4], ['sm', 8], ['md', 12], ['lg', 20], ['xl', 28]].map(function (r) { return '<div><i style="border-radius:' + r[1] + 'px"></i><span class="small muted">' + r[0] + ' · ' + r[1] + '</span></div>'; }).join('') + '</div></div>' +
      '<div><span class="label">Sombras (tingidas de grafite)</span><div class="shadow-demo mt-8">' + [['sm', 'var(--shadow-sm)'], ['md', 'var(--shadow-md)'], ['lg', 'var(--shadow-lg)'], ['xl', 'var(--shadow-xl)']].map(function (r) { return '<div style="box-shadow:' + r[1] + '">' + r[0] + '</div>'; }).join('') + '</div></div></div></section>';

    var btns = '<section class="card mt-16"><div class="card-head"><h2>Botões e ações</h2><span class="small muted">44px no desktop · 48px no celular</span></div><div class="row-wrap">' +
      '<button class="btn btn-primary">' + ic('plus', 18) + 'Primário</button><button class="btn btn-secondary">Secundário</button><button class="btn btn-ghost">Discreto</button><button class="btn btn-danger">' + ic('trash', 18) + 'Perigo</button><button class="btn btn-danger-solid">Confirmar exclusão</button><button class="btn btn-primary" disabled>Desabilitado</button><button class="btn btn-secondary btn-sm">Pequeno</button><button class="btn btn-secondary btn-icon" aria-label="Mais">' + ic('more', 20) + '</button></div>' +
      '<p class="small muted mt-16">Uma ação primária (terracota) por tela. Ações destrutivas sempre pedem confirmação com o nome do que será afetado.</p></section>';

    var forms = '<section class="card mt-16"><div class="card-head"><h2>Campos de formulário</h2></div><div class="form-grid">' +
      LP.field('Texto', '<input class="input" placeholder="Nome da peça"/>') + LP.field('Valor em reais', '<div class="input-group"><span class="prefix">R$</span><input class="input money" value="189,90"/></div>', { help: 'Algarismos tabulares alinham os valores.' }) +
      LP.field('Quantidade com unidade', '<div class="input-group"><input class="input num-in" value="230"/><span class="suffix">g</span></div>') + LP.field('Seleção', '<select class="select"><option>Amigurumi</option></select>') +
      LP.field('Data', '<input class="input" type="date" value="2026-10-22"/>') + LP.field('Com erro', '<input class="input is-error" value=""/><span class="help neg">' + 'Informe o nome da peça.' + '</span>') +
      '<div class="field"><label>Controle segmentado</label><div class="seg"><button class="on" aria-pressed="true">Grade</button><button aria-pressed="false">Lista</button></div></div>' +
      '<div class="field"><label>Interruptor</label><div class="row"><button class="switch" role="switch" aria-checked="true" aria-label="Exemplo" data-action="toggle-switch"></button><span class="muted">Avisar estoque baixo</span></div></div>' +
      '<div class="field"><label>Quantidade</label><div class="stepper"><button aria-label="Diminuir">' + ic('minus', 18) + '</button><span class="v">2</span><button aria-label="Aumentar">' + ic('plus', 18) + '</button></div></div></div></section>';

    var status = '<section class="card mt-16"><div class="card-head"><h2>Selos de situação</h2></div><div class="row-wrap">' +
      LP.marginBadge('ok') + LP.marginBadge('low') + LP.marginBadge('loss') + LP.stockBadge('ok') + LP.stockBadge('near') + LP.stockBadge('low') + LP.statusBadge('Orçamento enviado') + LP.statusBadge('Em produção') + LP.statusBadge('Aguardando compra de materiais') + LP.statusBadge('Entregue') + LP.badge('Atrasado 2 dias', 'b-error', 'clock') + LP.badge('Sinal pendente', 'b-warning', 'wallet') + '</div>' +
      '<p class="small muted mt-16">Cor nunca vem sozinha: todo selo tem texto e quase todos têm ícone.</p>' +
      '<h3 class="label mt-24">Lentes financeiras <span class="badge b-primary">Novo</span></h3><div class="row-wrap mt-8">' + LP.lens('fat') + LP.lens('caixa') + LP.lens('lucro') + LP.lens('prev') + '</div><p class="small muted mt-8">Aparecem ao lado de todo valor em R$ no Painel e no Financeiro, para nunca confundir faturamento, caixa e lucro.</p></section>';

    var alerts = '<section class="card mt-16"><div class="card-head"><h2>Alertas</h2><span class="small muted">explicam o problema e indicam a ação</span></div><div class="stack-sm">' +
      '<div class="alert alert-error">' + ic('alert', 20) + '<div class="a-body"><div class="a-title">Fio Caramelo abaixo do mínimo</div><p>Restam 180 g e o mínimo é 250 g. O pedido #1046 precisa de 460 g.</p><div class="a-act"><a class="link-btn" href="#/estoque">Ver lista de compras</a></div></div></div>' +
      '<div class="alert alert-warning">' + ic('alert', 20) + '<div class="a-body"><div class="a-title">Margem abaixo da meta</div><p>Naninha de coelho está com 24,2%. Preço sugerido: R$ 129,86.</p></div></div>' +
      '<div class="alert alert-success">' + ic('check-circle', 20) + '<div class="a-body"><div class="a-title">Backup concluído</div><p>Arquivo salvo neste aparelho.</p></div></div>' +
      '<div class="alert alert-info">' + ic('info', 20) + '<div class="a-body"><div class="a-title">Dica</div><p>Seus dados ficam só neste aparelho. Faça backup de vez em quando.</p></div></div></div></section>';

    var price = '<section class="card mt-16"><div class="card-head"><h2>Elementos de precificação <span class="badge b-primary">Novo</span></h2></div><div class="grid g-2"><div>' + '<div class="marginmeter"><div class="row between small"><span class="muted">Margem</span><b class="num pos">33,1%</b></div><div class="bar mt-8"><i style="width:66%"></i><span class="mark" style="left:60%"></span></div><div class="small muted mt-8">Meta: 30% (a marca preta)</div></div>' + '<div class="compbar mt-16"><i style="width:27%;background:var(--color-secondary)"></i><i style="width:71%;background:var(--color-primary)"></i><i style="width:2%;background:var(--color-warning-light)"></i></div><div class="legend mt-8"><span><i style="background:var(--color-secondary)"></i>Materiais</span><span><i style="background:var(--color-primary)"></i>Mão de obra</span><span><i style="background:var(--color-warning-light)"></i>Outros</span></div></div>' +
      '<div class="card sand flat pad-sm"><span class="eyebrow">Preço recomendado</span><div class="display-num" style="font-size:38px">R$ 181,53</div><p class="small muted">custo R$ 127,07 ÷ (1 − 30%)</p></div></div></section>';

    var empty = '<section class="card mt-16"><div class="card-head"><h2>Estados vazios, carregando e confirmações</h2></div><div class="grid g-2">' + LP.empty({ compact: true, ill: 'bear', title: 'Nenhum produto cadastrado', text: 'Cadastre sua primeira peça e descubra quanto cobrar.', actions: '<button class="btn btn-primary btn-sm">Cadastrar produto</button>' }) + '<div class="stack-sm">' + LP.skeletonCards(1) + '</div></div>' +
      '<div class="row-wrap mt-16"><button class="btn btn-secondary" data-action="demo-toast">Mostrar notificação</button><button class="btn btn-secondary" data-action="demo-toast-err">Mostrar erro</button><button class="btn btn-danger" data-action="demo-confirm">Confirmar exclusão…</button><button class="btn btn-secondary" data-action="open-buy">Abrir formulário em modal</button></div><p class="small muted mt-8">No celular, modais viram folhas que sobem da base (como no app atual).</p></section>';

    var art = '<section class="card mt-16"><div class="card-head"><h2>Ilustrações, textura e fotografia</h2></div><div class="grid g-4 keep2">' + ['capivara', 'coelho', 'chaveiro', 'bolsa', 'kitcha', 'boneca', 'leao', 'novelo'].map(function (a) { return LP.art(a, ''); }).join('') + '</div><p class="small muted mt-16">As imagens acima são ilustrações-placeholder desenhadas para o protótipo. No app real entram as fotos tiradas pela usuária (guardadas só neste aparelho). Ilustrações lineares de novelo, agulha e urso seguem nos estados vazios; a textura de pontos de crochê fica entre 3% e 6% de opacidade, só em cabeçalhos e vazios.</p><div class="textured card sand flat mt-16" style="height:90px;display:flex;align-items:center;justify-content:center"><b class="serif" style="font-size:20px">Textura de crochê a 5%</b></div></section>';

    var nav = '<section class="card mt-16"><div class="card-head"><h2>Navegação e responsividade</h2></div><div class="grid g-3">' + [['Desktop ≥ 1024', 'Menu lateral de 264 px, agrupado em Dia a dia e Gestão. Cabeçalho com trilha de navegação e botão “Novo”.'], ['Tablet 768–1023', 'Menu vira trilho de ícones com rótulo (92 px). Grades caem para 2 colunas; painéis laterais descem para baixo do conteúdo.'], ['Celular < 768', 'Barra inferior com Início, Pedidos, Produtos, Estoque e Mais. Clientes, Financeiro, Relatórios e Configurações ficam em “Mais”.']].map(function (x) { return '<div class="card sand flat pad-sm"><b>' + x[0] + '</b><p class="small muted mt-8">' + x[1] + '</p></div>'; }).join('') + '</div></section>';

    var scope = '<section class="card mt-16"><div class="card-head"><h2>O que isto muda no app atual</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Área</th><th>Hoje</th><th>Proposta</th></tr></thead><tbody>' + [
      ['Identidade', 'Terracota, sálvia, creme, grafite, Fraunces + DM Sans', '<b>Mantida</b>, sem troca de paleta'],
      ['Contraste', 'Botão branco sobre #C97B5F (3,2:1); cinza #9B9B9B como texto', 'Botão em #A85D42 (4,9:1); novos tons “texto” para alertas'],
      ['Emojis', 'Saudações e vazios com emoji (☀️ 🧶)', 'Ícones de traço e ilustrações; tom caloroso nas palavras'],
      ['Menu', '5 itens; “Mais” = Configurações', '8 módulos; os 3 novos entram marcados como proposta'],
      ['Painel', '9 cartões iguais + 2 gráficos', 'Tira financeira com 3 lentes + só o que exige ação'],
      ['Produtos', 'Cartões sem foto, form longo em modal', 'Grade com foto e margem; form em página com resumo ao vivo'],
      ['Pedidos', 'Kanban com 11 colunas de 300 px', '3 fases com subetapas (as 11 etapas continuam existindo)'],
      ['Estoque', 'Uma linha por compra', 'Uma linha por material; compras e consumo no detalhe']
    ].map(function (r) { return '<tr><td><b>' + r[0] + '</b></td><td class="muted">' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') + '</tbody></table></div></section>';

    return head + principle + colors + type + shape + btns + forms + status + alerts + price + empty + art + nav + scope;
  };
  LP.act = LP.act || {};
  LP.act['demo-toast'] = function () { LP.toast('Produto salvo', { sub: 'Capivara atualizada no catálogo.', undo: true }); };
  LP.act['demo-toast-err'] = function () { LP.toast('Não foi possível salvar', { type: 'err', sub: 'Confira o nome da peça e tente de novo.' }); };
  LP.act['demo-confirm'] = function () { LP.confirm({ title: 'Arquivar “Amigurumi de leão”?', danger: true, ok: 'Arquivar produto', text: 'O produto some do catálogo ativo, mas os pedidos antigos e o histórico continuam. Você pode reativar quando quiser.', onOk: function () { LP.closeModal(); LP.toast('Produto arquivado', { type: 'info', undo: true }); } }); };
})();
