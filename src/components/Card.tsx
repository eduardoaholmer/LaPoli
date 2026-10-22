import React from 'react';
import { colors, borderRadius, spacing, shadows, transitions, typography } from '../utils/theme';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onClick }) => {
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, // 20px
    padding: spacing.xl, // 24px
    boxShadow: shadows.sm,
    border: `1px solid ${colors.border}`,
    cursor: onClick ? 'pointer' : 'default',
    transition: `all ${transitions.normal}`,
    ...style
  };

  return (
    <div style={cardStyle} onClick={onClick}>
      {children}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  trend?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color = colors.primary,
  trend
}) => {
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, // 20px
    padding: spacing.xl, // 24px
    boxShadow: shadows.sm,
    border: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    transition: `all ${transitions.normal}`
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.body, // 14px
    color: colors.textLight,
    fontWeight: typography.fontWeight.medium, // 500
    letterSpacing: typography.letterSpacing.wide // 0.01em
  };

  const iconWrapperStyle: React.CSSProperties = {
    width: '44px',
    height: '44px',
    borderRadius: borderRadius.full,
    backgroundColor: `${color}15`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: color
  };

  const valueStyle: React.CSSProperties = {
    fontSize: typography.fontSize.h1, // 32px
    fontWeight: typography.fontWeight.bold, // 700
    color: colors.text,
    fontFamily: typography.fontFamily.serif, // Fonte serifada para números grandes
    letterSpacing: typography.letterSpacing.tight, // -0.02em
    fontFeatureSettings: '"tnum"' // Números tabulares
  };

  const trendStyle: React.CSSProperties = {
    fontSize: typography.fontSize.small, // 12px
    color: trend?.startsWith('+') ? colors.success : colors.error,
    fontWeight: typography.fontWeight.medium // 500
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>{title}</span>
        {icon && <div style={iconWrapperStyle}>{icon}</div>}
      </div>
      <div style={valueStyle}>{value}</div>
      {trend && <span style={trendStyle}>{trend}</span>}
    </div>
  );
};
