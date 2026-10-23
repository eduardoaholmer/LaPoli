export const colors = {
  // Paleta Primary - Terracota (escala 50-900)
  primaryScale: {
    50: '#FEF6F3',
    100: '#FDE8E0',
    200: '#F9D1C1',
    300: '#F4B5A0',
    400: '#E8A68D',
    500: '#C97B5F', // base
    600: '#A85D42',
    700: '#8B4630',
    800: '#6F3826',
    900: '#5A2E1F'
  },

  // Paleta Secondary - Verde Sálvia (escala 50-900)
  secondaryScale: {
    50: '#F2F7F4',
    100: '#E3F0E8',
    200: '#C8E0D4',
    300: '#A8C4B3',
    400: '#8CB88B',
    500: '#7B9E87', // base
    600: '#5D7A68',
    700: '#4A6353',
    800: '#3E5145',
    900: '#35453C'
  },

  // Cores principais (compatibilidade com código existente)
  primary: '#C97B5F',
  primaryDark: '#A85D42',
  primaryLight: '#E8A68D',
  secondary: '#7B9E87',
  secondaryDark: '#5D7A68',
  secondaryLight: '#A8C4B3',

  // Fundos e superfícies
  background: '#FAF8F5', // Off-white creme - neutro e elegante
  surface: '#FFFFFF',
  surfaceAlt: '#F5F3F0',

  // Textos - Grafite em 3 níveis
  text: '#2D2D2D', // 100% - principal
  textLight: '#6B6B6B', // 60% - secundário
  textMuted: '#9B9B9B', // 40% - terciário

  // Bordas e divisores
  border: '#E0DDD9',
  borderLight: '#EBE8E4',

  // Cores funcionais - semânticas suaves
  success: '#5B8C5A', // Verde sálvia escuro
  successLight: '#8CB88B',
  warning: '#D4A04A', // Mel/dourado suave
  warningLight: '#E8C48A',
  error: '#B85C5C', // Terracota escura/rosa antigo
  errorLight: '#D88C8C',
  info: '#5C7CB8', // Azul petróleo suave
  infoLight: '#8CA8D8',

  // Acentos
  accent: '#E8B4A0', // Coral claro
  accentLight: '#F5D4C8',

  // Versoes seguras para texto (contraste AA >= 4,5:1 sobre branco e creme)
  primaryText: '#8B4630', // terracota-700
  primaryAction: '#A85D42', // fundo de botao primario com texto branco (4,9:1)
  primaryActionHover: '#8B4630',
  successText: '#3A6B39',
  warningText: '#7D5A12',
  errorText: '#9B3F3F',
  infoText: '#3F5F9A',
  textFaint: '#7A7570', // placeholders e legendas

  // Tintas de fundo para alertas e badges
  tintPrimary: '#FBEEE8',
  tintSuccess: '#EAF2EA',
  tintWarning: '#FBF1DC',
  tintError: '#F8E9E7',
  tintInfo: '#E9EEF8',
  tintSand: '#F1ECE4'
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  xxxl: '48px'
};

export const borderRadius = {
  xs: '4px', // Elementos muito pequenos
  sm: '8px', // Elementos pequenos
  md: '12px', // Inputs, botões (padrão)
  lg: '20px', // Cards
  xl: '28px', // Modais, bottom sheets
  full: '9999px' // Círculos, badges
};

export const shadows = {
  sm: '0 1px 3px rgba(45, 45, 45, 0.04)', // Elementos sutis
  md: '0 2px 8px rgba(45, 45, 45, 0.06)', // Cards
  lg: '0 4px 12px rgba(45, 45, 45, 0.08)', // Modais, FABs
  xl: '0 8px 24px rgba(45, 45, 45, 0.12)', // Elementos elevados
  // Sombras tingidas com terracota para destaque
  primary: '0 4px 12px rgba(201, 123, 95, 0.15)',
  primaryHover: '0 6px 16px rgba(201, 123, 95, 0.25)'
};

export const breakpoints = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px'
};

// Movimento e transições
export const transitions = {
  fast: '150ms ease-out',
  normal: '200ms ease-out',
  slow: '250ms ease-out'
};

// Tipografia especial para números
export const fontFeatures = {
  tabular: 'tnum', // Números tabulares para alinhamento
  liga: 'liga' // Ligaduras para fontes serifadas
};

export const typography = {
  // Fontes
  fontFamily: {
    sans: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: '"Fraunces", Georgia, serif', // Para títulos e números grandes
    display: '"Fraunces", Georgia, serif' // Mesmo que serif, para clareza
  },

  // Escala de tamanhos expandida
  fontSize: {
    caption: '11px', // Captions, labels pequenos
    small: '12px', // Labels pequenos, badges
    body: '14px', // Texto base, labels
    bodyLarge: '16px', // Texto base, inputs
    subheading: '18px', // Subtítulos
    h3: '20px', // Títulos de seção pequenos
    h2: '24px', // Títulos de seção
    h1: '32px', // Títulos grandes
    display: '40px', // Títulos hero
    displayLarge: '48px' // Títulos hero extra
  },

  // Pesos
  fontWeight: {
    normal: 400, // Texto base
    medium: 500, // Labels, textos secundários
    semibold: 600, // Títulos, textos importantes
    bold: 700 // Títulos principais
  },

  // Line heights
  lineHeight: {
    tight: 1.2, // Títulos
    normal: 1.5, // Texto base
    relaxed: 1.75 // Textos longos
  },

  // Letter spacing
  letterSpacing: {
    tight: '-0.02em', // Títulos grandes
    normal: '-0.01em', // Títulos
    wide: '0.01em', // Labels
    wider: '0.02em' // Botões, badges
  }
};
