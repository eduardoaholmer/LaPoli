# Design System LaPoli Crochet

## Visão Geral

Este documento descreve o design system moderno e elegante implementado para o aplicativo de gestão da LaPoli Crochet. O objetivo foi criar uma interface profissional, bonita, clara e confiável que transmita artesanato premium, organização, criatividade, acolhimento e profissionalismo.

## Paleta de Cores

### Cores Principais

- **Primary (Terracota Suave)**: `#C97B5F`
  - Remete a artesanato, terra e fios
  - Sofisticado e acolhedor
  - Usado em botões principais, links e destaques

- **Primary Dark**: `#A85D42`
  - Variação mais escura para hover states

- **Primary Light**: `#E8A68D`
  - Variação mais clara para backgrounds sutis

- **Secondary (Verde Sálvia)**: `#7B9E87`
  - Acolhedor e natural
  - Menos vibrante que o verde anterior
  - Usado em ações secundárias e informações

- **Secondary Dark**: `#5D7A68`
  - Variação mais escura para hover states

- **Secondary Light**: `#A8C4B3`
  - Variação mais clara para backgrounds sutis

### Fundos e Superfícies

- **Background (Off-white Creme)**: `#FAF8F5`
  - Neutro e elegante
  - Mais sofisticado que o rosado anterior
  - Base para toda a aplicação

- **Surface (Branco Puro)**: `#FFFFFF`
  - Cards, modais e componentes

- **Surface Alt**: `#F5F3F0`
  - Variação sutil para diferenciar seções

### Textos

- **Text (Grafite Escuro)**: `#2D2D2D`
  - Melhor legibilidade e profissionalismo
  - Texto principal e títulos

- **Text Light**: `#6B6B6B`
  - Textos secundários e descrições

- **Text Muted**: `#9B9B9B`
  - Textos de apoio e placeholders

### Bordas e Divisores

- **Border**: `#E0DDD9`
  - Bordas sutis e elegantes

- **Border Light**: `#EBE8E4`
  - Divisores mais sutis

### Cores Funcionais

- **Success (Verde Sofisticado)**: `#5B8C5A`
  - Menos saturado, mais profissional
  - Estados de sucesso e lucro

- **Success Light**: `#8CB88B`
  - Backgrounds sutis de sucesso

- **Warning (Mostarda Elegante)**: `#D4A04A`
  - Avisos e alertas
  - Menos agressivo que laranja

- **Warning Light**: `#E8C48A`
  - Backgrounds sutis de warning

- **Error (Vermelho Terracota)**: `#B85C5C`
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

### Fonte

- **Font Family**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
  - Limpa, legível e moderna
  - Sistema nativo para melhor performance

### Tamanhos

- **xs**: 12px - Labels pequenos, badges
- **sm**: 14px - Textos secundários, labels
- **md**: 16px - Texto base, inputs
- **lg**: 18px - Subtítulos
- **xl**: 24px - Títulos de seção
- **xxl**: 32px - Títulos grandes
- **xxxl**: 48px - Títulos hero

### Pesos

- **Normal**: 400 - Texto base
- **Medium**: 500 - Labels, textos secundários
- **Semibold**: 600 - Títulos, textos importantes
- **Bold**: 700 - Títulos principais

### Line Height

- **Tight**: 1.2 - Títulos
- **Normal**: 1.5 - Texto base
- **Relaxed**: 1.75 - Textos longos

## Espaçamento

- **xs**: 4px - Espaçamentos mínimos
- **sm**: 8px - Espaçamentos pequenos
- **md**: 12px - Espaçamentos médios
- **lg**: 16px - Espaçamentos padrão
- **xl**: 24px - Espaçamentos grandes
- **xxl**: 32px - Espaçamentos muito grandes
- **xxxl**: 48px - Espaçamentos hero

## Bordas Arredondadas

- **sm**: 6px - Elementos pequenos
- **md**: 8px - Padrão para inputs, botões
- **lg**: 12px - Cards, modais
- **xl**: 16px - Elementos grandes
- **full**: 9999px - Círculos, badges

## Sombras

- **sm**: `0 1px 3px rgba(45, 45, 45, 0.04)` - Elementos sutis
- **md**: `0 2px 8px rgba(45, 45, 45, 0.06)` - Cards
- **lg**: `0 4px 12px rgba(45, 45, 45, 0.08)` - Modais, FABs
- **xl**: `0 8px 24px rgba(45, 45, 45, 0.12)` - Elementos elevados

## Componentes

### Botões

- **Tamanhos**: sm (44px), md (48px), lg (56px)
- **Variantes**: primary, secondary, danger, ghost
- **Transições**: 0.2s ease
- **Hover**: Leve elevação e mudança de cor
- **Active**: Leve depressão (translateY)

### Cards

- **Padding**: 24px (xl)
- **Border Radius**: 12px (lg)
- **Shadow**: sm
- **Border**: 1px solid #E0DDD9
- **Transição**: 0.2s ease

### Inputs

- **Padding**: 12px 16px (md, lg)
- **Border Radius**: 8px (md)
- **Min Height**: 48px
- **Focus**: Border color primary + shadow
- **Label**: 14px, fontWeight 600

### Badges

- **Padding**: 4px 12px (xs, md) ou 8px 16px (sm, lg)
- **Border Radius**: 8px (md)
- **Border**: 1px solid com 30% de opacidade
- **Background**: 15% de opacidade da cor
- **Font Size**: 12px (sm) ou 13px (md)
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

#### Side Navigation (Desktop)
- **Width**: 260px
- **Padding**: 24px (xl)
- **Active Background**: Primary com 12% de opacidade
- **Active Color**: Primary
- **Inactive Color**: Text Light
- **Item Height**: 48px
- **Border Radius**: 8px (md)

## Telas Prioritárias

### Dashboard

- **Título**: 28px, fontWeight 700, letterSpacing -0.02em
- **Grid de Métricas**: minmax(240px, 1fr)
- **Grid de Gráficos**: minmax(380px, 1fr)
- **Spacing**: xl (24px) entre elementos
- **Cards de Métricas**:
  - Ícone em círculo de 44px
  - Background do ícone: 15% de opacidade
  - Valor: 28px, fontWeight 700
  - Título: 14px, fontWeight 500

### Pedidos

- **Título**: 28px, fontWeight 700
- **Grid de Cards**: minmax(320px, 1fr)
- **Spacing**: lg (16px) entre cards
- **Card de Pedido**:
  - Nome: 18px, fontWeight 600
  - Produto: 14px, text light
  - Valores: 14px, fontWeight 600
  - Badges: Com bordas sutis
  - Ações: 5 botões ghost

### Produtos

- **Título**: 28px, fontWeight 700
- **Grid de Cards**: minmax(320px, 1fr)
- **Spacing**: lg (16px) entre cards
- **Card de Produto**:
  - Nome: 18px, fontWeight 600
  - Categoria: 14px, text light
  - Descrição: 14px, lineHeight 1.5
  - Valores: 14px, fontWeight 600
  - Lucro: 15px, fontWeight 700
  - Alertas: Com bordas e backgrounds sutis

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
  - Tamanhos de toque mínimos (44px)

- **Tablet**:
  - Navegação inferior ou lateral
  - Grids com 2 colunas
  - Espaçamentos médios

- **Desktop**:
  - Navegação lateral fixa (260px)
  - Grids com 3-4 colunas
  - Espaçamentos completos
  - Conteúdo com margem esquerda para navegação

## Melhorias de Usabilidade

### Ações Principais

- **Botão FAB (Floating Action Button)**:
  - Posicionado fixo no canto inferior direito
  - 56px de diâmetro
  - Sombra destacada
  - Ação principal de cada tela

- **Botões de Ação**:
  - Tamanhos adequados para toque (mínimo 44px)
  - Estados de hover e active claros
  - Ícones para identificação rápida

### Hierarquia Visual

- **Títulos**: Tamanhos e pesos bem definidos
- **Textos Secundários**: Cor mais clara e peso menor
- **Informações Importantes**: Destaque com cor ou peso
- **Ações Secundárias**: Variantes ghost ou secondary

### Feedback Visual

- **Focus States**: Borda colorida + shadow em inputs
- **Hover States**: Elevação e mudança de cor em cards e botões
- **Active States**: Leve depressão em botões
- **Loading States**: Indicadores visuais (quando aplicável)

### Estados Vazios

- **Mensagens Claras**: Texto explicativo
- **Ícones Ilustrativos**: Quando apropriado
- **Ações Sugeridas**: Botões para criar conteúdo

### Mensagens de Sucesso/Erro

- **Toasts**:
  - Posicionados no canto superior direito
  - Background colorido com contraste adequado
  - Ícones para identificação rápida
  - Botão de desfazer quando aplicável
  - Auto-dismiss após 5 segundos

### Acessibilidade

- **Contraste**: Cores com contraste WCAG AA
- **Tamanhos de Texto**: Mínimo 14px para leitura
- **Áreas de Toque**: Mínimo 44px
- **Labels**: Sempre presentes em inputs
- **ARIA**: Atributos para screen readers
- **Focus Visible**: Estados de foco claros

## Decisões de Design

### Por que Terracota e Verde Sálvia?

1. **Terracota (#C97B5F)**:
   - Remete a artesanato, terra e fios
   - Sofisticado e acolhedor
   - Diferencia de rosa avermelhado (mais comum)
   - Harmoniza com a identidade de crochê

2. **Verde Sálvia (#7B9E87)**:
   - Acolhedor e natural
   - Menos vibrante que verde anterior
   - Complementa terracota sem competir
   - Transmite calma e organização

### Por que Off-white Creme?

- **Neutro e elegante**: Base sofisticada
- **Menos cansativo que branco puro**: Mais confortável visualmente
- **Diferencia de apps comuns**: Identidade própria
- **Harmoniza com paleta terrosa**: Coerência visual

### Por que Bordas Arredondadas Moderadas?

- **6-12px**: Equilíbrio entre moderno e profissional
- **Não excessivamente arredondado**: Evita parecer infantil
- **Não totalmente quadrado**: Evita parecer datado
- **Consistência**: Mesmo padrão em todos os componentes

### Por que Sombras Sutis?

- **Menos agressivas**: Mais elegantes
- **Profissionais**: Remetem a produtos SaaS
- **Hierarquia**: Cria profundidade sem exagero
- **Performance**: Sombras CSS são leves

### Por que Espaçamentos Generosos?

- **Respiro Visual**: Interface menos poluída
- **Hierarquia**: Separação clara entre elementos
- **Leitura**: Melhor compreensão do conteúdo
- **Toque**: Áreas adequadas em mobile

## Próximas Melhorias Sugeridas

1. **Catálogo Digital**:
   - Fotos grandes dos produtos
   - Layout grid elegante
   - Botão de pedido pelo WhatsApp

2. **Área Financeira**:
   - Gráficos de fluxo de caixa
   - Resumo mensal detalhado
   - Categorização de despesas

3. **Cadastro de Clientes**:
   - Histórico de pedidos
   - Preferências e medidas
   - Observações personalizadas

4. **Animações**:
   - Transições entre telas
   - Micro-interações em botões
   - Loading states elegantes

5. **Dark Mode**:
   - Versão noturna da paleta
   - Preservar contraste e legibilidade
   - Transição suave entre modos

## Conclusão

O novo design system transforma a interface do aplicativo LaPoli Crochet em uma experiência profissional, elegante e confiável. A paleta de cores sofisticada, tipografia clara, espaçamentos generosos e componentes bem definidos criam uma identidade visual que transmite artesanato premium sem parecer infantil ou excessivamente decorado.

Todas as funcionalidades, regras de negócio e dados foram preservados. A modernização focou exclusivamente na experiência visual e de usabilidade, mantendo a integridade do sistema.
