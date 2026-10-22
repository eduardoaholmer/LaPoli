import React from 'react';
import { colors, borderRadius, spacing, typography } from '../utils/theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md'
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: size === 'sm' ? `${spacing.xs} ${spacing.md}` :
            `${spacing.sm} ${spacing.lg}`,
    borderRadius: borderRadius.md, // 12px
    fontSize: size === 'sm' ? typography.fontSize.small : typography.fontSize.body, // 12px ou 14px
    fontWeight: typography.fontWeight.semibold, // 600
    letterSpacing: typography.letterSpacing.wide // 0.01em
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    success: {
      backgroundColor: `${colors.success}15`,
      color: colors.success,
      border: `1px solid ${colors.success}30`
    },
    warning: {
      backgroundColor: `${colors.warning}15`,
      color: colors.warning,
      border: `1px solid ${colors.warning}30`
    },
    error: {
      backgroundColor: `${colors.error}15`,
      color: colors.error,
      border: `1px solid ${colors.error}30`
    },
    info: {
      backgroundColor: `${colors.info}15`,
      color: colors.info,
      border: `1px solid ${colors.info}30`
    },
    default: {
      backgroundColor: colors.surfaceAlt,
      color: colors.textLight,
      border: `1px solid ${colors.border}`
    }
  };

  return (
    <span style={{ ...baseStyle, ...variantStyles[variant] }}>
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('entregue') || lowerStatus.includes('concluído') || lowerStatus.includes('quitado')) {
      return 'success';
    }
    if (lowerStatus.includes('atrasado') || lowerStatus.includes('cancelado') || lowerStatus.includes('esgotado')) {
      return 'error';
    }
    if (lowerStatus.includes('aguardando') || lowerStatus.includes('parcial') || lowerStatus.includes('reservado')) {
      return 'warning';
    }
    return 'info';
  };

  return <Badge variant={getStatusVariant(status)}>{status}</Badge>;
};
