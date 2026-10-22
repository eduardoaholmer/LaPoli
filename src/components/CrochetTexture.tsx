import React from 'react';

interface CrochetTextureProps {
  opacity?: number;
  style?: React.CSSProperties;
}

/**
 * Textura sutil de trama/ponto de crochê em SVG
 * Opacidade deve ser muito baixa (3-6%) para não interferir na legibilidade
 */
export const CrochetTexture: React.FC<CrochetTextureProps> = ({
  opacity = 0.04,
  style
}) => {
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    opacity,
    ...style
  };

  return (
    <div style={containerStyle}>
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="crochetPattern"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            {/* Círculos pequenos representando pontos de crochê */}
            <circle
              cx="10"
              cy="10"
              r="1.5"
              fill="#C97B5F"
              opacity="0.3"
            />
            {/* Linhas sutis conectando os pontos */}
            <line
              x1="10"
              y1="10"
              x2="20"
              y2="10"
              stroke="#C97B5F"
              strokeWidth="0.5"
              opacity="0.2"
            />
            <line
              x1="10"
              y1="10"
              x2="10"
              y2="20"
              stroke="#C97B5F"
              strokeWidth="0.5"
              opacity="0.2"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#crochetPattern)" />
      </svg>
    </div>
  );
};
