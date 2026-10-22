import React from 'react';
import { colors, borderRadius } from '../utils/theme';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '100%',
  variant = 'rectangular',
  style
}) => {
  const baseStyle: React.CSSProperties = {
    width,
    height,
    backgroundColor: colors.surfaceAlt,
    borderRadius: variant === 'circular' ? borderRadius.full :
                  variant === 'text' ? borderRadius.sm :
                  borderRadius.md,
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    ...style
  };

  return <div style={baseStyle} />;
};

// Componente SkeletonCard para cards de métricas
interface SkeletonCardProps {
  style?: React.CSSProperties;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ style }) => {
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, // 20px
    padding: '24px',
    border: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    ...style
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <Skeleton width="120px" height="16px" variant="text" />
        <Skeleton width="44px" height="44px" variant="circular" />
      </div>
      <Skeleton width="80%" height="32px" variant="text" />
      <Skeleton width="60px" height="14px" variant="text" />
    </div>
  );
};

// Adicionar keyframes para animação de pulse
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes skeleton-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;
if (!document.head.querySelector('style[data-skeleton]')) {
  styleSheet.setAttribute('data-skeleton', 'true');
  document.head.appendChild(styleSheet);
}
