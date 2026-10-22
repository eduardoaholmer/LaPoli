import React from 'react';
import { colors, spacing, typography, borderRadius, transitions } from '../utils/theme';
import { CrochetTexture } from './CrochetTexture';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  showTexture?: boolean; // Mostrar textura de crochê
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  showTexture = true
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: `${spacing.xxl} ${spacing.xl}`,
    gap: spacing.lg,
    position: 'relative',
    minHeight: '300px'
  };

  const iconStyle: React.CSSProperties = {
    color: colors.textMuted,
    marginBottom: spacing.sm
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.h2, // 24px
    fontWeight: typography.fontWeight.semibold, // 600
    color: colors.text,
    fontFamily: typography.fontFamily.serif, // Fonte serifada para títulos
    letterSpacing: typography.letterSpacing.tight, // -0.02em
    margin: 0
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: typography.fontSize.body, // 14px
    color: colors.textLight,
    lineHeight: typography.lineHeight.relaxed, // 1.75
    maxWidth: '400px',
    margin: 0
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    padding: `${spacing.md} ${spacing.xl}`,
    borderRadius: borderRadius.md, // 12px
    border: 'none',
    fontSize: typography.fontSize.bodyLarge, // 16px
    fontWeight: typography.fontWeight.semibold, // 600
    cursor: 'pointer',
    minHeight: '48px',
    minWidth: '48px',
    transition: `all ${transitions.normal}`
  };

  return (
    <div style={containerStyle}>
      {showTexture && <CrochetTexture opacity={0.04} />}
      {icon && <div style={iconStyle}>{icon}</div>}
      <h3 style={titleStyle}>{title}</h3>
      {description && <p style={descriptionStyle}>{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          style={buttonStyle}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
