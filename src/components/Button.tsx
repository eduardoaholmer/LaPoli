import React from 'react';
import { colors, borderRadius, spacing } from '../utils/theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: size === 'sm' ? `${spacing.sm} ${spacing.md}` :
            size === 'lg' ? `${spacing.md} ${spacing.xl}` :
            `${spacing.sm} ${spacing.lg}`,
    borderRadius: borderRadius.md,
    border: 'none',
    cursor: 'pointer',
    fontSize: size === 'sm' ? '14px' : size === 'lg' ? '18px' : '16px',
    fontWeight: 500,
    transition: 'all 0.2s',
    minWidth: '44px',
    minHeight: '44px',
    width: fullWidth ? '100%' : 'auto',
    ...style
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: colors.primary,
      color: colors.text
    },
    secondary: {
      backgroundColor: colors.secondary,
      color: colors.text
    },
    danger: {
      backgroundColor: colors.error,
      color: 'white'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.text,
      border: `1px solid ${colors.border}`
    }
  };

  return (
    <button
      style={{ ...baseStyle, ...variantStyles[variant] }}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
