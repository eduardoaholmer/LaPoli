# LaPoli · Protótipo de design (Fases 1 e 2 + módulos complementares)

Protótipo HTML navegável, **independente do app React**. Não altera `src/`, não usa Dexie, não migra dados e não implementa o módulo financeiro real. Serve de referência visual para a etapa seguinte (adaptação ao React).

## Como abrir

Dê dois cliques em [`index.html`](index.html). Funciona direto no navegador, sem build nem servidor (as fontes Fraunces e DM Sans vêm do Google Fonts; sem internet cai para Georgia e fontes do sistema).

Para testar em tablet e celular, use o modo responsivo do navegador (F12) ou abra no aparelho.

> Dados **demonstrativos e fictícios**. Nomes, telefones, preços e datas são inventados (hoje = 22/10/2026). Nada é informação real da LaPoli. As ilustrações de produto são *placeholders* desenhados para o protótipo; no app entram as fotos da usuária.

## O que tem

| Módulo | Telas | Situação no app atual |
| --- | --- | --- |
| Guia visual | cores, tipografia, componentes, estados | `DESIGN_SYSTEM.md` consolidado |
| Visão geral | tira financeira (faturamento · caixa · lucro), “precisa de atenção”, tarefas, atalhos, atividade, 1º uso | existe (Painel), reorganizado |
| Produtos | catálogo grade/lista, filtros, cadastro/edição com resumo ao vivo, **precificação detalhada** com simulador | existe; precificação é nova |
| Estoque | materiais, lista de compras, histórico, **detalhe do material**, compra/perda/ajuste | existe; detalhe é novo |
| Pedidos | lista, quadro em 3 fases, **novo pedido em 6 etapas**, **detalhe do pedido**, WhatsApp, pagamento | existe; fluxo e detalhe reorganizados |
| Clientes | lista e detalhe | novo |
| Financeiro | caixa × resultado, ponte entre os dois, movimentações | novo (planejado em `FINANCEIRO_PLAN.md`) |
| Relatórios | 9 relatórios com selo “dados reais / estimativa / sem dados” | novo |
| Configurações | valores padrão, alertas, categorias, backup e importação em passos | existe, refinado |

Em **“Protótipo”** (barra superior) dá para ligar o *primeiro uso* (estados vazios), ver o *carregamento* e esconder ou mostrar as **notas de design** que aparecem no fim de cada tela (o que foi mantido, aprimorado e acrescentado).

## Fluxos que funcionam (em memória; recarregar restaura)

- **Novo pedido → detalhe → avançar etapa → entregar**: sinal em %, prazo sugerido pelas horas da peça, aviso de material faltando, lucro estimado.
- **Baixa de estoque única**: o material sai do estoque quando o pedido entra em “Em produção”, uma só vez. Se faltar material, o sistema avisa e oferece registrar a compra.
- **Registrar compra / perda / ajuste**: atualiza estoque, custo médio e lista de compras.
- **Quantidade em novelos**: ao comprar fio, informe *quantos novelos* e *quanto cada um tem* (ex.: 2 × 100 g = 200 g). O sistema mostra o custo por novelo e por grama, e o estoque aparece nas duas medidas (“1,8 novelo · 180 g”), também na lista de compras (“6 novelos de 100 g”) e no cadastro do produto (“≈ 2,3 novelos de 100 g”). Rolos (fio de malha) e pacotes (fibra, olhos, botões) seguem a mesma ideia.
- **Registrar pagamento**: entra no caixa na hora, mas só vira faturamento na entrega. Não duplica em Movimentações.
- **Entregar com saldo**: recebe o saldo e reconhece a venda no resultado.
- **Cadastrar produto**: resumo de custo, lucro e margem a cada valor digitado; alerta de prejuízo ou margem abaixo da meta.
- **Precificação**: arraste preço, horas e valor da hora e veja lucro e margem mudarem.
- **Quadro de pedidos**: arrastar cartão entre fases ou usar “Avançar”.
- **Backup**: exportar (simulado) e importar em 3 passos (escolher, validar, confirmar com backup de segurança).

## Decisões desta proposta (para você aprovar)

1. **Grafite `#2D2D2D` continua sendo a cor do texto e a voz da interface.** Nenhuma cor da paleta atual foi trocada. Mudam apenas dois usos, por contraste (medido):
   - botão primário: fundo `#A85D42` em vez de `#C97B5F` (branco sobre `#C97B5F` dá 3,2:1; sobre `#A85D42` dá 4,9:1);
   - `#9B9B9B` deixa de ser usado como texto (2,6:1); passa a valer só para ícones inativos.
   Foram acrescentadas versões “texto” de sucesso, atenção, erro e info (todas ≥ 5,9:1) e tintas fixas de fundo, no lugar de `${cor}12`.
2. **Emojis saem da interface** (saudação, vazios). O tom caloroso fica nas palavras.
3. **As 11 etapas de pedido continuam existindo**, agrupadas em 3 fases no quadro: Orçamento · Produção · Entrega. Concluídos e cancelados ficam à parte. Hoje são 11 colunas de 300 px.
4. **Faturamento, caixa e lucro sempre com rótulo próprio** (“lentes”). Receita só na entrega; sinais entram no caixa.
5. **Lucro desconta “seu trabalho” (horas × valor da hora)**, como o app faz hoje. Isso não sai do caixa, e a tela “Por que o caixa não é igual ao lucro?” mostra a ponte passo a passo.
6. **Custo unitário com 3 casas abaixo de R$ 1** (R$ 0,119/g) para a conta fechar à vista.
7. **Navegação**: 8 módulos. Desktop com menu lateral de 264 px; tablet com trilho de ícones; celular com barra inferior de 4 itens + “Mais”. Clientes, Financeiro e Relatórios aparecem marcados como *Proposta*.

## O que isto exigiria no React (não feito)

- Produto: campo de **foto** (Blob no IndexedDB).
- Material: **embalagem** (nome, plural e peso padrão: novelo de 100 g, rolo de 500 g…) e, em cada compra, o nº de embalagens e o conteúdo de cada uma. O custo e o consumo continuam em gramas.
- Material: histórico de **perdas e ajustes** como movimentações próprias (hoje o estoque deriva das compras e dos produtos).
- Pedido: **checklist**, **histórico**, **notas internas**, flag de “material já baixado”.
- Configurações: **horas de crochê por dia** e **saldo inicial do caixa**.
- Clientes: tela sobre o tipo `Client` que já existe em `src/types`.
- Financeiro: tabela de movimentações e regras de reconhecimento (ver `FINANCEIRO_PLAN.md`).

## Pontos para sua decisão

- **Valor da hora no demo é R$ 15**, só para os preços ficarem realistas (o padrão do app é R$ 30, o que tornaria uma capivara de 6 h bem mais cara).
- **“Outros custos” do produto** (embalagem, etiqueta) entram no resultado como estimativa e não como compra. No app real, convém decidir se viram compras de material ou se continuam como custo por peça.
- **Cancelar um pedido já em produção** não devolve o material ao estoque no protótipo.

## Estrutura

```
design/
  index.html           shell + carregamento dos scripts
  css/tokens.css       tokens (nomes e valores do app + [novo] marcados)
  css/base.css         tipografia, shell, breakpoints 768 / 1024 / 1180
  css/components.css   botões, cards, campos, badges, alertas, modais…
  css/screens.css      estilos por tela
  js/data.js           dados demonstrativos + cálculos (mesmas fórmulas de src/calculations)
  js/ui.js             formatação, badges, ilustrações, gráficos, modais
  js/screens-*.js      telas
  js/app.js            rotas, estado, ações, notas de design
  assets/logo.jpg      cópia de public/logo.jpg
```
