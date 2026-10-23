import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  style?: React.CSSProperties;
}

/** Bloco de carregamento (respeita prefers-reduced-motion pelo CSS). */
export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = '100%', variant = 'rectangular', style }) => (
  <div
    className="skel"
    aria-hidden="true"
    style={{ width, height, borderRadius: variant === 'circular' ? '9999px' : variant === 'text' ? 8 : 12, ...style }}
  />
);

export const SkeletonCard: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div className="card" style={style} aria-hidden="true">
    <Skeleton width="40%" height="14px" variant="text" style={{ marginBottom: 14 }} />
    <Skeleton width="65%" height="30px" variant="text" style={{ marginBottom: 12 }} />
    <Skeleton width="80%" height="12px" variant="text" />
  </div>
);

/** Grade de cartões em carregamento. */
export const SkeletonGrid: React.FC<{ count?: number; columns?: 2 | 3 }> = ({ count = 3, columns = 3 }) => (
  <div className={`grid ${columns === 2 ? 'g-2' : 'g-3'}`} role="status" aria-label="Carregando">
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);
