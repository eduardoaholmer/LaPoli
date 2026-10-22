import React from 'react';
import { colors, borderRadius, spacing } from '../utils/theme';

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
    padding: size === 'sm' ? `${spacing.xs} ${spacing.sm}` :
            `${spacing.xs} ${spacing.md}`,
    borderRadius: borderRadius.full,
    fontSize: size === 'sm' ? '12px' : '14px',
    fontWeight: 500
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    success: {
      backgroundColor: `${colors.success}20`,
      color: colors.success
    },
    warning: {
      backgroundColor: `${colors.warning}20`,
      color: colors.warning
    },
    error: {
      backgroundColor: `${colors.error}20`,
      color: colors.error
    },
    info: {
      backgroundColor: `${colors.info}20`,
      color: colors.info
    },
    default: {
      backgroundColor: `${colors.border}`,
      color: colors.text
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
