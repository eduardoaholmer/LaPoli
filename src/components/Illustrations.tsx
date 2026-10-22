import React from 'react';
import { colors } from '../utils/theme';

/**
 * Ilustrações simples em linha para estados vazios
 * Cores: da paleta (terracota, sálvia, grafite)
 */

interface IllustrationProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

/**
 * Ilustração de novelo de fio
 */
export const YarnIllustration: React.FC<IllustrationProps> = ({
  size = 120,
  color = colors.primary,
  style
}) => {
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    ...style
  };

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={containerStyle}
    >
      {/* Novelo principal */}
      <ellipse
        cx="60"
        cy="60"
        rx="35"
        ry="40"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      {/* Linhas do fio enrolado */}
      <path
        d="M35 60 Q60 40 85 60"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M35 60 Q60 80 85 60"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M40 45 Q60 35 80 45"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M40 75 Q60 85 80 75"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.4"
      />
      {/* Ponta do fio */}
      <path
        d="M85 60 Q95 55 100 65"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Ilustração de agulha de crochê
 */
export const HookIllustration: React.FC<IllustrationProps> = ({
  size = 120,
  color = colors.secondary,
  style
}) => {
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    ...style
  };

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={containerStyle}
    >
      {/* Cabo da agulha */}
      <path
        d="M50 100 L50 50"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Ponta da agulha curvada */}
      <path
        d="M50 50 Q50 30 70 30 Q90 30 90 50 Q90 70 70 70 Q50 70 50 50"
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Detalhe no cabo */}
      <circle
        cx="50"
        cy="85"
        r="3"
        fill={color}
        opacity="0.5"
      />
    </svg>
  );
};

/**
 * Ilustração de amigurumi (urso simples)
 */
export const AmigurumiIllustration: React.FC<IllustrationProps> = ({
  size = 120,
  color = colors.primary,
  style
}) => {
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    ...style
  };

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={containerStyle}
    >
      {/* Cabeça */}
      <circle
        cx="60"
        cy="60"
        r="30"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      {/* Orelhas */}
      <circle
        cx="40"
        cy="35"
        r="10"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx="80"
        cy="35"
        r="10"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      {/* Olhos */}
      <circle
        cx="50"
        cy="55"
        r="4"
        fill={color}
        opacity="0.7"
      />
      <circle
        cx="70"
        cy="55"
        r="4"
        fill={color}
        opacity="0.7"
      />
      {/* Nariz */}
      <ellipse
        cx="60"
        cy="68"
        rx="5"
        ry="3"
        fill={color}
        opacity="0.5"
      />
      {/* Boca */}
      <path
        d="M55 75 Q60 80 65 75"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Ilustração de caixa vazio
 */
export const EmptyBoxIllustration: React.FC<IllustrationProps> = ({
  size = 120,
  color = colors.textMuted,
  style
}) => {
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    ...style
  };

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={containerStyle}
    >
      {/* Caixa principal */}
      <rect
        x="30"
        y="50"
        width="60"
        height="50"
        stroke={color}
        strokeWidth="2"
        fill="none"
        rx="4"
      />
      {/* Tampa da caixa */}
      <path
        d="M30 50 L30 40 L90 40 L90 50"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Linha de abertura */}
      <line
        x1="60"
        y1="40"
        x2="60"
        y2="50"
        stroke={color}
        strokeWidth="2"
      />
      {/* Detalhes da caixa */}
      <line
        x1="30"
        y1="65"
        x2="90"
        y2="65"
        stroke={color}
        strokeWidth="1"
        opacity="0.3"
      />
      <line
        x1="30"
        y1="80"
        x2="90"
        y2="80"
        stroke={color}
        strokeWidth="1"
        opacity="0.3"
      />
    </svg>
  );
};
