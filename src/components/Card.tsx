import React from 'react';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
  tone?: 'default' | 'sand' | 'flat';
  padded?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  className = '',
  onClick,
  tone = 'default',
  padded = true,
  as: Tag = 'div'
}) => {
  const cls = [
    'card',
    tone === 'sand' ? 'sand' : tone === 'flat' ? 'flat' : '',
    padded ? '' : 'pad-0',
    onClick ? 'clickable' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const interactive = onClick
    ? {
        onClick,
        role: 'button' as const,
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }
      }
    : {};

  return (
    <Tag className={cls} style={style} {...interactive}>
      {children}
    </Tag>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  note?: string;
  trend?: string;
  alert?: boolean;
  lens?: React.ReactNode;
}

/** Indicador: rótulo pequeno, número grande em Fraunces. */
export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, note, trend, alert, lens }) => (
  <div className={`card metric ${alert ? 'metric-alert' : ''}`}>
    <div className="m-top">
      <span className="m-label">{title}</span>
      {lens ?? (icon && <span className="prim">{icon}</span>)}
    </div>
    <div className="m-val">{value}</div>
    {note && <div className="m-note">{note}</div>}
    {trend && <div className="m-note">{trend}</div>}
  </div>
);
