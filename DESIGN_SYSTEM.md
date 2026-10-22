# Design System LaPoli Crochet - Ateliê Aconchegante

## Visão Geral

Este documento descreve o design system expandido para o aplicativo de gestão da LaPoli Crochet, seguindo a direção de arte "Ateliê Aconchegante". O objetivo é transmitir: artesanal premium, acolhedor, delicado e profissional. Referências de sensação: Aesop (elegância calma), Notion (clareza), Etsy (calor artesanal).

## Atualização v2 (outubro/2026)

A identidade não mudou: terracota, verde-sálvia, creme, Fraunces + DM Sans, raios e sombras são os mesmos, e o **grafite `#2D2D2D` continua sendo a cor do texto**. A proposta visual foi validada no protótipo em `design/` (abrir `design/index.html`) e adaptada ao React.

**Onde fica cada coisa**
- `src/styles/tokens.css`, `base.css`, `components.css`, `screens.css`, `app.css`: tokens, estrutura, componentes e telas (importados por `src/index.css`).
- `src/utils/theme.ts`: os mesmos tokens para uso em TypeScript.
- `src/components/`: `Button`, `Badge`, `Card`, `Input`, `Modal`, `Toast`, `EmptyState`, `Skeleton`, `ScreenLayout` (mesma API de antes) e novos `ui.tsx` (Alert, Lens, Tabs, Chips, Bar, DropdownMenu…), `ProductArt`, `Navigation` (menu lateral, trilho de ícones no tablet, barra inferior no celular).

**Ajustes de contraste (medidos)**
- Botão primário: fundo `#A85D42` (branco sobre `#C97B5F` dá 3,2:1; sobre `#A85D42`, 4,9:1). `#C97B5F` segue como cor de marca em ícones, gráficos e detalhes.
- `#9B9B9B` deixa de ser texto (2,6:1): vale só para ícones inativos. Texto de apoio usa `#6B6B6B` (ou `#7A7570` em legendas).
- Novos tons "texto" para alertas: `--color-primary-text`, `--color-success-text`, `--color-warning-text`, `--color-error-text`, `--color-info-text` (todos ≥ 5,9:1) e tintas de fundo fixas (`--tint-*`) no lugar de `${cor}12`.

**Padrões novos**
- **Lentes financeiras** (`Lens`): *Faturamento*, *Caixa*, *Lucro* e *Previsto* aparecem ao lado de todo valor em R$ para nunca misturar os conceitos.
- **Precificação**: barra de margem com a meta marcada, composição do custo e preço recomendado (margem = lucro ÷ preço de venda, não markup).
- **Emojis fora da interface**: ícones de traço (1,5 px) e ilustrações; o tom caloroso fica nas palavras.
- **Quantidade em embalagens**: "1,8 novelo · 180 g". O custo e o consumo continuam em gramas.
- **Responsivo**: celular < 768 (barra inferior), tablet 768–1023 (trilho de ícones), desktop ≥ 1024 (menu lateral de 264 px); painéis laterais descem abaixo de 1180.

## Paleta de Cores

### Cores Primary - Terracota (escala 50-900)

- **50**: `#FEF6F3` - Background muito claro
- **100**: `#FDE8E0` - Background sutil
- **200**: `#F9D1C1` - Background de destaque
- **300**: `#F4B5A0` - Hover states leves
- **400**: `#E8A68D` - Primary Light
- **500**: `#C97B5F` - **Primary base** - Terracota suave
- **600**: `#A85D42` - Primary Dark
- **700**: `#8B4630` - Texto em terracota
- **800**: `#6F3826` - Terracota muito escuro
- **900**: `#5A2E1F` - Terracota quase preto

### Cores Secondary - Verde Sálvia (escala 50-900)

- **50**: `#F2F7F4` - Background muito claro
- **100**: `#E3F0E8` - Background sutil
- **200**: `#C8E0D4` - Background de destaque
- **300**: `#A8C4B3` - Secondary Light
- **400**: `#8CB88B` - Verde suave
- **500**: `#7B9E87` - **Secondary base** - Verde sálvia
- **600**: `#5D7A68` - Secondary Dark
- **700**: `#4A6353` - Texto em verde
- **800**: `#3E5145` - Verde muito escuro
- **900**: `#35453C` - Verde quase preto

### Fundos e Superfícies

- **Background (Off-white Creme)**: `#FAF8F5`
  - Neutro e elegante
  - Base para toda a aplicação

- **Surface (Branco Quente)**: `#FFFFFF`
  - Cards, modais e componentes
  - Branco puro com leve toque quente

- **Surface Alt**: `#F5F3F0`
  - Variação sutil para diferenciar seções

### Textos - Grafite em 3 níveis

- **Text (Grafite 100%)**: `#2D2D2D`
  - Texto principal e títulos
  - Melhor legibilidade e profissionalismo

- **Text Light (Grafite 60%)**: `#6B6B6B`
  - Textos secundários e descrições

- **Text Muted (Grafite 40%)**: `#9B9B9B`
  - Textos de apoio e placeholders

### Bordas e Divisores

- **Border (Bege Suave)**: `#E0DDD9`
  - Bordas sutis e elegantes

- **Border Light**: `#EBE8E4`
  - Divisores mais sutis

### Cores Funcionais - Semânticas Suaves

- **Success (Verde Sálvia Escuro)**: `#5B8C5A`
  - Estados de sucesso e lucro
  - Semântica: sálvia (não verde berrante)

- **Success Light**: `#8CB88B`
  - Backgrounds sutis de sucesso

- **Warning (Mel/Dourado Suave)**: `#D4A04A`
  - Avisos e alertas
  - Menos agressivo que laranja/amarelo

- **Warning Light**: `#E8C48A`
  - Backgrounds sutis de warning

- **Error (Terracota Escura/Rosa Antigo)**: `#B85C5C`
  - Erros e estados críticos
  - Harmoniza com a paleta principal

- **Error Light**: `#D88C8C`
  - Backgrounds sutis de erro

- **Info (Azul Petróleo Suave)**: `#5C7CB8`
  - Informações neutras
  - Complementa a paleta

- **Info Light**: `#8CA8D8`
  - Backgrounds sutis de info

### Acentos

- **Accent (Coral Claro)**: `#E8B4A0`
  - Destaques especiais
  - Harmoniza com terracota

- **Accent Light**: `#F5D4C8`
  - Backgrounds sutis de acento

## Tipografia

### Fontes

- **Sans-serif (corpo, labels, botões)**: DM Sans
  - Limpa, legível e moderna
  - Substitui fontes do sistema para consistência
  - Google Fonts com cache offline

- **Serifada (títulos, números grandes)**: Fraunces
  - Elegante e artesanal
  - Usada em títulos e métricas importantes
  - Google Fonts com cache offline

### Escala de Tamanhos

- **caption**: 11px - Captions, labels muito pequenos
- **small**: 12px - Labels pequenos, badges
- **body**: 14px - Texto base, labels
- **bodyLarge**: 16px - Texto base, inputs
- **subheading**: 18px - Subtítulos
- **h3**: 20px - Títulos de seção pequenos
- **h2**: 24px - Títulos de seção
- **h1**: 32px - Títulos grandes
- **display**: 40px - Títulos hero
- **displayLarge**: 48px - Títulos hero extra

### Pesos

- **Normal**: 400 - Texto base
- **Medium**: 500 - Labels, textos secundários
- **Semibold**: 600 - Títulos, textos importantes
- **Bold**: 700 - Títulos principais

### Line Height

- **Tight**: 1.2 - Títulos
- **Normal**: 1.5 - Texto base
- **Relaxed**: 1.75 - Textos longos

### Letter Spacing

- **Tight**: -0.02em - Títulos grandes
- **Normal**: -0.01em - Títulos
- **Wide**: 0.01em - Labels
- **Wider**: 0.02em - Botões, badges

### Font Features

- **Tabular Nums**: `tnum` - Números tabulares para alinhamento em métricas
- **Ligaduras**: `liga` - Ligaduras para fontes serifadas

## Espaçamento

Escala de 4px:

- **xs**: 4px - Espaçamentos mínimos
- **sm**: 8px - Espaçamentos pequenos
- **md**: 12px - Espaçamentos médios
- **lg**: 16px - Espaçamentos padrão
- **xl**: 24px - Espaçamentos grandes
- **xxl**: 32px - Espaçamentos muito grandes
- **xxxl**: 48px - Espaçamentos hero

## Bordas Arredondadas

- **xs**: 4px - Elementos muito pequenos
- **sm**: 8px - Elementos pequenos
- **md**: 12px - **Inputs, botões (padrão)**
- **lg**: 20px - **Cards**
- **xl**: 28px - **Modais, bottom sheets**
- **full**: 9999px - Círculos, badges

## Sombras

Sombras suaves e difusas em 3 níveis, tingidas de terracota/grafite com baixa opacidade:

- **sm**: `0 1px 3px rgba(45, 45, 45, 0.04)` - Elementos sutis
- **md**: `0 2px 8px rgba(45, 45, 45, 0.06)` - Cards
- **lg**: `0 4px 12px rgba(45, 45, 45, 0.08)` - Modais, FABs
- **xl**: `0 8px 24px rgba(45, 45, 45, 0.12)` - Elementos elevados
- **primary**: `0 4px 12px rgba(201, 123, 95, 0.15)` - Sombras tingidas com terracota
- **primaryHover**: `0 6px 16px rgba(201, 123, 95, 0.25)` - Sombras tingidas para hover

## Movimento e Transições

- **Fast**: 150ms ease-out - Micro-interações rápidas
- **Normal**: 200ms ease-out - Transições padrão
- **Slow**: 250ms ease-out - Transições mais lentas

## Componentes Base

### Botões

### Botões

- **Tamanhos**: sm (48px), md (48px), lg (56px)
- **Tamanho mínimo de toque**: 48px
- **Variantes**: primary, secondary, danger, ghost
- **Border Radius**: 12px (md)
- **Transições**: 200ms ease-out
- **Hover**: Leve elevação e mudança de cor
- **Active**: Leve depressão (translateY)
- **Primary**: Sombra tingida com terracota

### Cards

- **Padding**: 24px (xl)
- **Border Radius**: 20px (lg)
- **Shadow**: sm
- **Border**: 1px solid #E0DDD9
- **Transição**: 200ms ease-out

### MetricCard

- **Valor**: 32px, fontWeight 700, fonte serifada (Fraunces)
- **Font Feature**: Tabular nums para alinhamento
- **Ícone**: Círculo de 44px com 15% de opacidade da cor
- **Título**: 14px, fontWeight 500
- **Trend**: 12px, fontWeight 500

### Inputs/Select/Textarea

- **Padding**: 12px 16px
- **Border Radius**: 12px (md)
- **Min Height**: 48px
- **Focus**: Border color primary + ring terracota suave (3px)
- **Label**: 14px, fontWeight 600, acima do input
- **Transição**: 200ms ease-out

### Badges/Chips de Status

- **Padding**: 4px 12px (sm) ou 8px 16px (md)
- **Border Radius**: 12px (md)
- **Border**: 1px solid com 30% de opacidade
- **Background**: 15% de opacidade da cor
- **Font Size**: 12px (sm) ou 14px (md)
- **Font Weight**: 600

### Navegação

#### Bottom Navigation (Mobile)
- **Height**: 64px + safe area
- **Padding**: 8px 0
- **Box Shadow**: Top shadow sutil
- **Active Color**: Primary
- **Inactive Color**: Text Muted
- **Icon Size**: 24px
- **Label Size**: 12px, fontWeight 600
- **Item Ativo**: Pílula terracota suave (12% de opacidade) + border radius 12px
- **Transition**: 200ms ease-out

#### Side Navigation (Desktop/Tablet)
- **Width**: 260px
- **Padding**: 24px (xl)
- **Active Background**: Primary com 12% de opacidade
- **Active Color**: Primary
- **Inactive Color**: Text Light
- **Item Height**: 48px
- **Border Radius**: 12px (md)
- **Transition**: 200ms ease-out

#### Header (App)
- **Logo**: 44px, border radius full, borda 2px
- **Título**: "LaPoli" em serifada (Fraunces), 24px, cor primary
- **Sticky**: Top 0, z-index 50
- **Shadow**: sm
- **Padding**: 16px 24px

### Modal

- **Border Radius**: 28px (xl)
- **Vira bottom sheet no mobile** (media query)
  - Mobile: bordas arredondadas só no topo, animação slideUp
  - Desktop: bordas arredondadas completas, animação fadeIn
- **Shadow**: xl
- **Header**: Sticky com borda inferior
- **Close Button**: 48px mínimo de toque
- **Content Padding**: 24px (xl)
- **Animações**: slideUp (mobile) e fadeIn (desktop)

### Toast

- **Position**: Canto superior direito
- **Border Radius**: 12px (md)
- **Shadow**: lg
- **Auto-dismiss**: 5 segundos
- **Botão de desfazer**: Quando aplicável
- **Transição**: Fade/slide suave

### EmptyState

- **Título**: Fonte serifada (Fraunces), 24px
- **Descrição**: 14px, line-height 1.75
- **Ícone**: SVG inline em linha (novelo, agulha, amigurumi)
- **Ação**: Botão terracota quando aplicável
- **Textura**: Trama de crochê MUITO discreta (3-6% opacidade)

### Skeleton

- **Animation**: Pulse 1.5s ease-in-out infinite
- **Variantes**: text, circular, rectangular
- **SkeletonCard**: Para cards de métricas em carregamento

### ScreenLayout

- **Layout padrão** para telas do app
- **Padding responsivo**: 16px (mobile) / 24px (tablet+)
- **Max-width**: 1400px com margin auto
- **Header opcional**: título, subtítulo e ação
- **Estrutura base consistente** para todas as telas

### CrochetTexture

- **Textura SVG** de trama/ponto de crochê
- **Opacidade**: 3-6% (MUITO discreta)
- **Uso**: header do dashboard e estados vazios
- **Não interfere** na legibilidade
- **Cor**: Terracota (#C97B5F)

### Illustrations

- **Ilustrações SVG inline** em linha simples
- **Temas**: YarnIllustration (novelo), HookIllustration (agulha), AmigurumiIllustration (urso), EmptyBoxIllustration (caixa vazia)
- **Cores**: da paleta (terracota, sálvia, grafite)
- **Uso**: estados vazios
- **Tamanho personalizável**

## Novos Componentes Criados

### CrochetTexture
- **Arquivo**: `src/components/CrochetTexture.tsx`
- **Descrição**: Textura sutil de trama/ponto de crochê em SVG
- **Opacidade**: 3-6% (configurável)
- **Uso**: Header do dashboard e estados vazios
- **Cor**: Terracota (#C97B5F)
- **Pattern**: Círculos pequenos + linhas conectando

### Illustrations
- **Arquivo**: `src/components/Illustrations.tsx`
- **Descrição**: Ilustrações em linha simples para estados vazios
- **Componentes**:
  - `YarnIllustration`: Novelo de fio
  - `HookIllustration`: Agulha de crochê
  - `AmigurumiIllustration`: Urso amigurumi
  - `EmptyBoxIllustration`: Caixa vazia
- **Props**: size, color, style
- **Cores**: Da paleta (terracota, sálvia, grafite)

### ScreenLayout
- **Arquivo**: `src/components/ScreenLayout.tsx`
- **Descrição**: Layout padrão para telas do app
- **Props**: children, title, subtitle, action
- **Features**:
  - Padding responsivo (16px mobile / 24px tablet+)
  - Max-width 1400px com margin auto
  - Header opcional com título, subtítulo e ação
  - Estrutura base consistente

### EmptyState (Atualizado)
- **Arquivo**: `src/components/EmptyState.tsx`
- **Novo prop**: `showTexture` (boolean)
- **Features**:
  - Textura de crochê opcional
  - Título em serifada (Fraunces)
  - Descrição com line-height 1.75
  - Botão de ação quando aplicável
  - Espaçamento generoso

### Skeleton (Novo)
- **Arquivo**: `src/components/Skeleton.tsx`
- **Descrição**: Componentes de loading
- **Componentes**:
  - `Skeleton`: Base com variantes (text, circular, rectangular)
  - `SkeletonCard`: Para cards de métricas
- **Animation**: Pulse 1.5s ease-in-out infinite

## Atualizações na Navegação e Layout Geral

### App.tsx
- **Header atualizado**:
  - Título "LaPoli" em serifada (Fraunces)
  - Font size: 24px (h2)
  - Letter spacing: -0.02em (tight)
  - Cor: Primary (Terracota)
- **Font family**: DM Sans (sans-serif)
- **Container**: minHeight 100vh, background creme

### BottomNavigation
- **Item ativo**: Pílula terracota suave (12% de opacidade)
- **Border radius**: 12px (md) nos itens
- **Transition**: 200ms ease-out
- **Position**: Relative para suportar background

### Modal
- **Bottom sheet no mobile**:
  - Border radius: 28px apenas no topo
  - Align: flex-end
  - Animation: slideUp (0.3s)
- **Modal no desktop**:
  - Border radius: 28px completo
  - Align: center
  - Animation: fadeIn (0.2s)
- **Media query**: Tablet (768px)

## Arquivos Alterados - ETAPA 2

### Arquivos Modificados:
1. **`src/App.tsx`**
   - Header atualizado com título em serifada (Fraunces)
   - Font family: DM Sans
   - Import de typography, shadows, borderRadius

2. **`src/components/Navigation.tsx`**
   - BottomNavigation com item ativo em pílula terracota
   - Border radius 12px nos itens
   - Import de borderRadius

3. **`src/components/Modal.tsx`**
   - Bottom sheet no mobile (media query)
   - Animações: slideUp (mobile) e fadeIn (desktop)
   - Import de breakpoints e useMediaQuery

4. **`src/components/EmptyState.tsx`**
   - Novo prop: showTexture
   - Import de CrochetTexture
   - Border radius e transitions do theme

### Arquivos Novos:
1. **`src/components/CrochetTexture.tsx`**
   - Textura SVG de trama/ponto de crochê
   - Opacidade configurável (3-6%)
   - Pattern com círculos e linhas

2. **`src/components/Illustrations.tsx`**
   - 4 ilustrações em linha simples
   - YarnIllustration, HookIllustration, AmigurumiIllustration, EmptyBoxIllustration
   - Cores da paleta

3. **`src/components/ScreenLayout.tsx`**
   - Layout padrão para telas
   - Padding responsivo
   - Header opcional

4. **`src/components/Skeleton.tsx`**
   - Componentes de loading
   - Skeleton base + SkeletonCard
   - Animação pulse

## Atualizações no Dashboard - ETAPA 3

### Dashboard.tsx
- **Saudação personalizada**: "Bom dia! ☀️", "Boa tarde! 🌤️", "Boa noite! 🌙"
- **Título em serifada**: Fraunces
- **Subtítulo**: Descrição calorosa e curta
- **ScreenLayout**: Usa o novo componente de layout
- **CrochetTexture**: Textura sutil no header (4% de opacidade)
- **EmptyState**: Estado de carregamento com ilustração de novelo
- **Tipografia expandida**: Todos os textos usam tokens do theme
- **Transições**: 200ms ease-out em elementos interativos
- **Border radius**: 12px (md) nos itens da lista
- **Cards de métricas**: Valores em serifada com tabular nums

### Componentes Utilizados:
- **ScreenLayout**: Layout base com padding responsivo
- **CrochetTexture**: Textura de crochê no header
- **EmptyState**: Estado vazio/carregando
- **YarnIllustration**: Ilustração de novelo
- **MetricCard**: Cards de métricas atualizados
- **Card**: Cards padrão

### Estilização:
- **Select/Inputs**: Border radius 12px, transições 200ms
- **Listas**: Background surfaceAlt, border radius 12px
- **Alertas**: Background error 12%, border error 30%
- **Títulos de cards**: 20px, fontWeight 600, letterSpacing -0.01em
- **Valores**: 16px, fontWeight 700

### Arquivo Alterado:
1. **`src/screens/Dashboard.tsx`**
   - Import de ScreenLayout, CrochetTexture, EmptyState, YarnIllustration
   - Saudação personalizada baseada no horário
   - Uso de ScreenLayout em vez de container manual
   - Textura de crochê no header
   - EmptyState com ilustração durante carregamento
   - Tipografia expandida em todos os elementos
   - Transições e border radius do theme

## Atualizações em Produtos - ETAPA 4

### Products.tsx
- **ScreenLayout**: Usa o novo componente de layout
- **EmptyState**: Estado vazio com ilustração de amigurumi
- **Tipografia expandida**: Todos os textos usam tokens do theme
- **Transições**: 200ms ease-out em elementos interativos
- **Border radius**: 12px (md) nos elementos
- **FAB**: Sombra tingida com terracota (shadows.primary)
- **Cards de produtos**: Valores em serifada com tabular nums
- **Alertas**: Background warning/error 12%, border 30%
- **Cronômetro**: Estilizado com typography tokens
- **Formulário**: Seções com border radius 20px (lg)

### Componentes Utilizados:
- **ScreenLayout**: Layout base com padding responsivo
- **EmptyState**: Estado vazio com ilustração
- **AmigurumiIllustration**: Ilustração de urso
- **Card**: Cards padrão
- **Modal**: Modal atualizado (bottom sheet no mobile)

### Estilização:
- **Nome do produto**: 18px, fontWeight 600, letterSpacing -0.01em
- **Categoria**: 14px, color textLight
- **Descrição**: 14px, line-height 1.5
- **Preço/Custo**: 14px, fontWeight 600
- **Lucro**: 16px, fontWeight 700, serifada, tabular nums
- **Alertas**: 12px, fontWeight 500, background 12%, border 30%
- **Cronômetro**: 24px, fontWeight 700, monospace, letterSpacing -0.02em
- **Seções do form**: Border radius 20px (lg)
- **FAB**: Sombra primary (tingida com terracota)

### Estado Vazio:
- **Ilustração**: AmigurumiIllustration (urso)
- **Título**: "Nenhum produto cadastrado"
- **Descrição**: "Que tal cadastrar seu primeiro produto? 🧶"
- **Ação**: Botão "Adicionar Produto"
- **Tom caloroso**: Emoji e tom de voz acolhedor

### Arquivo Alterado:
1. **`src/screens/Products.tsx`**
   - Import de ScreenLayout, EmptyState, AmigurumiIllustration
   - Import de typography, transitions, shadows
   - Uso de ScreenLayout em vez de container manual
   - EmptyState com ilustração quando não há produtos
   - Tipografia expandida em todos os elementos
   - Transições e border radius do theme
   - FAB com sombra tingida de terracota
   - Valores em serifada com tabular nums
   - Cronômetro estilizado com typography tokens
   - Seções do form com border radius 20px

## Atualizações em Estoque - ETAPA 5

### Stock.tsx
- **ScreenLayout**: Usa o novo componente de layout
- **EmptyState**: Estado vazio com ilustração de agulha de crochê
- **Tipografia expandida**: Todos os textos usam tokens do theme
- **Transições**: 200ms ease-out em elementos interativos
- **Border radius**: 12px (md) nos elementos, 20px (lg) nas seções do form
- **FAB**: Sombra tingida com terracota (shadows.primary)
- **Cards de estoque**: Informações com tipografia consistente
- **Alertas**: Background error 12%, border error
- **Lista de compras**: Modal com tipografia expandida

### Componentes Utilizados:
- **ScreenLayout**: Layout base com padding responsivo
- **EmptyState**: Estado vazio com ilustração
- **HookIllustration**: Ilustração de agulha de crochê
- **Card**: Cards padrão
- **Modal**: Modal atualizado (bottom sheet no mobile)

### Estilização:
- **Nome do material**: 18px, fontWeight 600
- **Marca/tipo**: 14px, color textLight
- **Info rows**: 14px, fontWeight 600 nos valores
- **Alertas**: 12px, color error, com ícone
- **Seções do form**: Border radius 20px (lg), background surfaceAlt
- **Títulos de seção**: 20px, fontWeight 600
- **FAB**: Sombra primary (tingida com terracota)
- **Lista de compras**: 16px nos valores, 12px nos subtítulos

### Estado Vazio:
- **Ilustração**: HookIllustration (agulha de crochê)
- **Título**: "Nenhum material cadastrado"
- **Descrição**: "Que tal cadastrar sua primeira compra de materiais? 🧶"
- **Ação**: Botão "Adicionar Material"
- **Tom caloroso**: Emoji e tom de voz acolhedor

### Alerta de Estoque Baixo:
- **Card separado**: Background error 12%, border error
- **Ícone**: AlertTriangle
- **Texto**: "X materiais com estoque baixo"
- **Alerta no card**: Ícone + texto em 12px

### Arquivo Alterado:
1. **`src/screens/Stock.tsx`**
   - Import de ScreenLayout, EmptyState, HookIllustration
   - Import de typography, transitions, shadows, borderRadius
   - Uso de ScreenLayout em vez de container manual
   - EmptyState com ilustração quando não há materiais
   - Tipografia expandida em todos os elementos
   - Transições e border radius do theme
   - FAB com sombra tingida de terracota
   - Seções do form com border radius 20px
   - Lista de compras com tipografia expandida

## Atualizações em Pedidos - ETAPA 6

### Orders.tsx
- **ScreenLayout**: Usa o novo componente de layout
- **EmptyState**: Estado vazio com ilustração de novelo
- **Tipografia expandida**: Todos os textos usam tokens do theme
- **Transições**: 200ms ease-out em elementos interativos
- **Border radius**: 20px (lg) nas colunas do Kanban e seções do form
- **FAB**: Sombra tingida com terracota (shadows.primary)
- **Cards de pedidos**: Informações com tipografia consistente
- **Alertas**: Background error/warning 12%, border
- **Kanban**: Colunas com border radius 20px
- **Lista e Kanban**: Views alternáveis com botão

### Componentes Utilizados:
- **ScreenLayout**: Layout base com padding responsivo
- **EmptyState**: Estado vazio com ilustração
- **YarnIllustration**: Ilustração de novelo
- **Card**: Cards padrão
- **Modal**: Modal atualizado (bottom sheet no mobile)

### Estilização:
- **Nome do cliente**: 16px (compact) / 18px (normal), fontWeight 600
- **Produto**: 14px, color textLight
- **Info rows**: 14px, fontWeight 600 nos valores
- **Alertas**: 12px, color error, com ícone
- **Seções do form**: Border radius 20px (lg), background surfaceAlt
- **Títulos de seção**: 20px, fontWeight 600
- **Colunas Kanban**: Border radius 20px (lg), background surfaceAlt
- **Títulos de coluna**: 14px, fontWeight 600, letterSpacing 0.01em
- **FAB**: Sombra primary (tingida com terracota)
- **Labels**: 14px, fontWeight 500

### Estado Vazio:
- **Ilustração**: YarnIllustration (novelo)
- **Título**: "Nenhum pedido cadastrado"
- **Descrição**: "Que tal cadastrar seu primeiro pedido? 🧶"
- **Ação**: Botão "Adicionar Pedido"
- **Tom caloroso**: Emoji e tom de voz acolhedor

### Alertas:
- **Pedidos atrasados**: Card separado, background error 12%, border error
- **Pedidos próximos do prazo**: Card separado, background warning 12%, border warning
- **Alerta no card**: Ícone + texto em 12px, border 2px

### Views:
- **Lista**: Grid de cards com informações completas
- **Kanban**: Colunas horizontais com cards compactos
- **Toggle**: Botão para alternar entre views

### Arquivo Alterado:
1. **`src/screens/Orders.tsx`**
   - Import de ScreenLayout, EmptyState, YarnIllustration
   - Import de typography, transitions, shadows, borderRadius
   - Uso de ScreenLayout em vez de container manual
   - EmptyState com ilustração quando não há pedidos
   - Tipografia expandida em todos os elementos
   - Transições e border radius do theme
   - FAB com sombra tingida de terracota
   - Seções do form com border radius 20px
   - Colunas Kanban com border radius 20px
   - Labels com tipografia expandida

## Atualizações em Configurações e Boas-vindas - ETAPA 7

### Settings.tsx
- **ScreenLayout**: Usa o novo componente de layout
- **Tipografia expandida**: Todos os textos usam tokens do theme
- **Border radius**: 12px (md) nos alertas
- **Títulos de seção**: 24px, fontWeight 600, letterSpacing -0.02em
- **Alertas**: Background warning 12%, border warning
- **Modais**: Tipografia expandida nas mensagens

### Welcome.tsx
- **Tipografia expandida**: Todos os textos usam tokens do theme
- **Fonte serifada**: Título e números em Fraunces
- **Border radius**: full nos círculos (step number, dots)
- **Transições**: 200ms ease-out nos dots de progresso
- **Título**: 32px, fontWeight 700, serifada, letterSpacing -0.02em
- **Step number**: 24px, fontWeight 700, serifada
- **Step title**: 24px, fontWeight 600, letterSpacing -0.02em
- **Step description**: 16px, line-height 1.75

### Componentes Utilizados:
- **ScreenLayout**: Layout base com padding responsivo
- **Card**: Cards padrão
- **Modal**: Modal atualizado (bottom sheet no mobile)

### Estilização Settings:
- **Títulos de seção**: 24px, fontWeight 600, letterSpacing -0.02em
- **Alertas**: 14px, color warning, background warning 12%, border warning
- **Modais**: 14px, color textLight, line-height 1.75
- **Border radius**: 12px (md) nos alertas

### Estilização Welcome:
- **Título**: 32px, fontWeight 700, serifada, color primary
- **Step number**: 40px círculo, 24px, fontWeight 700, serifada
- **Step title**: 24px, fontWeight 600, letterSpacing -0.02em
- **Step description**: 16px, line-height 1.75
- **Dots**: 12px círculo, transição 200ms
- **Border radius**: full nos círculos

### Arquivos Alterados:
1. **`src/screens/Settings.tsx`**
   - Import de ScreenLayout
   - Import de typography, borderRadius
   - Uso de ScreenLayout em vez de container manual
   - Tipografia expandida em todos os elementos
   - Border radius 12px nos alertas
   - Títulos de seção com letterSpacing -0.02em
   - Modais com tipografia expandida

2. **`src/screens/Welcome.tsx`**
   - Import de typography, borderRadius, transitions
   - Tipografia expandida em todos os elementos
   - Fonte serifada (Fraunces) para título e números
   - Border radius full nos círculos
   - Transições 200ms nos dots
   - Título: 32px, fontWeight 700, serifada
   - Step number: 24px, fontWeight 700, serifada
   - Step title: 24px, fontWeight 600, letterSpacing -0.02em
   - Step description: 16px, line-height 1.75

## Ajustes Pós-Redesign

### 1. Notificação de Backup
- **Problema**: Notificação chata toda vez que entra no site
- **Solução**: Removido o alert automático do App.tsx. O lembrete de backup agora aparece apenas na tela de Settings, e apenas se:
  - Nunca fez backup E já tem dados no sistema
  - Passou 7 dias desde o último backup
- **Arquivo alterado**: `src/App.tsx`, `src/screens/Settings.tsx`

### 2. Botão Home
- **Problema**: Não tinha como voltar para o painel quando estava em outras telas
- **Solução**: Adicionado botão "Painel" no header que aparece quando não está na tela inicial
  - Ícone Home + texto "Painel"
  - Clicável (logo e título também são clicáveis)
  - Apenas visível quando não está em `/`
- **Arquivo alterado**: `src/App.tsx`

### 3. Navegação em Configurações
- **Problema**: Quando entra na aba de configurações, não tem como voltar para as outras abas no desktop
- **Solução**: Removida a condição que escondia a SideNavigation na tela de settings
  - Agora a SideNavigation aparece em todas as telas no desktop/tablet
  - Botão "Painel" também funciona como alternativa
- **Arquivo alterado**: `src/App.tsx`

### 4. Kanban Drag and Drop
- **Problema**: Kanban não arrasta
- **Solução**: Implementado drag and drop usando @hello-pangea/dnd
  - Cards podem ser arrastados entre colunas
  - Status do pedido é atualizado automaticamente ao soltar
  - Feedback visual durante o drag (opacidade, background color)
  - Placeholder durante o drag
- **Arquivo alterado**: `src/screens/Orders.tsx`
- **Dependência adicionada**: @hello-pangea/dnd

## Detalhes que Dão Personalidade

### Textura de Crochê

- SVG inline com trama/ponto de crochê
- Opacidade: 3 a 6% (MUITO discreta)
- Usada no header do dashboard e estados vazios
- Não interfere na legibilidade

### Ilustrações em Linha

- SVG inline simples
- Temas: novelo, agulha de crochê, amigurumi
- Cores: da paleta (terracota, sálvia, grafite)
- Usadas em estados vazios

### Saudação Personalizada

- Dashboard: "Bom dia! ☀️", "Boa tarde! 🌤️", "Boa noite! 🌙"
- Título em serifada (Fraunces)
- Tom caloroso e curto

### Tom de Voz

- Caloroso e curto nos textos de interface
- Exemplo: "Nenhum pedido por aqui ainda. Que tal cadastrar o primeiro? 🧶"
- Evita linguagem fria/empresarial

### Ícones Lucide

- Traço fino: 1.5px
- Consistentes em toda a aplicação
- Cores: da paleta

## Regras de UX

### Mobile-First

- Pensado para uso com uma mão no celular
- Confortável em tablet
- Tamanhos de toque mínimos: 48px

### Hierarquia Visual

- Em cada tela, UMA ação principal em destaque (botão terracota)
- O resto é secundário
- Números importantes (faturamento, lucro, margem) GRANDES e em serifada
- Labels pequenos em cinza

### Alertas

- Estoque baixo, margem abaixo da meta, prazo
- Ícone + cor semântica suave
- Nunca só cor
- Ícone ajuda na identificação rápida

### Acessibilidade

- Contraste mínimo WCAG AA em todo texto
- Tamanhos de texto mínimos: 14px para leitura
- Áreas de toque mínimas: 48px
- Labels sempre presentes em inputs
- ARIA attributes para screen readers
- Focus visible claro

## Responsividade

### Breakpoints

- **Mobile**: < 640px
- **Tablet**: 768px - 1023px
- **Desktop**: ≥ 1024px

### Adaptações

- **Mobile**:
  - Navegação inferior fixa
  - Grids com 1 coluna
  - Espaçamentos reduzidos
  - Modais viram bottom sheets
  - Tamanhos de toque mínimos (48px)

- **Tablet**:
  - Navegação inferior ou lateral
  - Grids com 2 colunas
  - Espaçamentos médios

- **Desktop**:
  - Navegação lateral fixa (260px)
  - Grids com 3-4 colunas
  - Espaçamentos completos
  - Conteúdo com margem esquerda para navegação

## CSS Variables

Todas as cores, espaçamentos, bordas, sombras, transições e fontes estão disponíveis como CSS variables em `:root`:

```css
--color-primary-50 a --color-primary-900
--color-secondary-50 a --color-secondary-900
--color-primary, --color-primary-dark, --color-primary-light
--color-secondary, --color-secondary-dark, --color-secondary-light
--color-background, --color-surface, --color-surface-alt
--color-text, --color-text-light, --color-text-muted
--color-border, --color-border-light
--color-success, --color-success-light
--color-warning, --color-warning-light
--color-error, --color-error-light
--color-info, --color-info-light
--color-accent, --color-accent-light
--spacing-xs a --spacing-xxxl
--radius-xs a --radius-full
--shadow-sm a --shadow-primary-hover
--transition-fast, --transition-normal, --transition-slow
--font-sans, --font-serif
```

## Conclusão

O design system expandido "Ateliê Aconchegante" transforma a interface do aplicativo LaPoli Crochet em uma experiência que transmite artesanato premium, acolhimento e profissionalismo. A paleta de cores sofisticada com escalas completas, tipografia elegante com fontes serifadas e sans-serif, espaçamentos generosos, sombras sutis tingidas e componentes bem definidos criam uma identidade visual única que não parece um sistema empresarial frio nem um template genérico.

Todas as funcionalidades, regras de negócio e dados foram preservados. A modernização focou exclusivamente na experiência visual e de usabilidade, mantendo a integridade do sistema.
