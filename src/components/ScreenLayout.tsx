import React from 'react';
import { spacing, breakpoints } from '../utils/theme';
import { useMediaQuery } from '../utils/hooks';

interface ScreenLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/**
 * Layout padrão para telas do app
 * Fornece padding consistente e estrutura base
 */
export const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  title,
  subtitle,
  action
}) => {
  const isTabletOrDesktop = useMediaQuery(`(min-width: ${breakpoints.tablet})`);

  const containerStyle: React.CSSProperties = {
    padding: isTabletOrDesktop ? spacing.xl : spacing.lg,
    maxWidth: '1400px',
    margin: '0 auto',
    position: 'relative'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: spacing.xl,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg
  };

  const titleContainerStyle: React.CSSProperties = {
    flex: 1
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isTabletOrDesktop ? '32px' : '28px',
    fontWeight: 700,
    margin: '0 0 spacing.sm 0',
    letterSpacing: '-0.02em'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6B6B6B',
    margin: 0,
    lineHeight: 1.5
  };

  const actionStyle: React.CSSProperties = {
    flexShrink: 0
  };

  return (
    <div style={containerStyle}>
      {(title || subtitle || action) && (
        <div style={headerStyle}>
          <div style={titleContainerStyle}>
            {title && <h1 style={titleStyle}>{title}</h1>}
            {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
          </div>
          {action && <div style={actionStyle}>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
