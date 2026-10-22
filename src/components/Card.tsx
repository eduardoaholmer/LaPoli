import React from 'react';
import { colors, borderRadius, spacing, shadows } from '../utils/theme';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onClick }) => {
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.border}`,
    cursor: onClick ? 'pointer' : 'default',
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
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: colors.textLight,
    fontWeight: 500
  };

  const iconWrapperStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: borderRadius.full,
    backgroundColor: `${color}20`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: color
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.text
  };

  const trendStyle: React.CSSProperties = {
    fontSize: '12px',
    color: trend?.startsWith('+') ? colors.success : colors.error
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
