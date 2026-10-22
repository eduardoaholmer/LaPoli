import React, { useEffect } from 'react';
import { colors, borderRadius, spacing, shadows, transitions, typography, breakpoints } from '../utils/theme';
import { X } from 'lucide-react';
import { useMediaQuery } from '../utils/hooks';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  const isMobile = !useMediaQuery(`(min-width: ${breakpoints.tablet})`);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(45, 45, 45, 0.6)',
    display: 'flex',
    alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: isMobile ? 0 : spacing.lg,
    backdropFilter: 'blur(4px)'
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    borderRadius: isMobile ? `${borderRadius.xl} ${borderRadius.xl} 0 0` : borderRadius.xl, // 28px, bottom sheet no mobile
    maxHeight: isMobile ? '85vh' : '90vh',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    width: isMobile ? '100%' :
            size === 'full' ? '100%' :
            size === 'lg' ? '800px' :
            size === 'sm' ? '400px' :
            '600px',
    maxWidth: '100%',
    boxShadow: shadows.xl,
    animation: isMobile ? 'slideUp 0.3s ease-out' : 'fadeIn 0.2s ease-out'
  };

  const headerStyle: React.CSSProperties = {
    padding: `${spacing.lg} ${spacing.xl}`,
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    backgroundColor: colors.surface,
    zIndex: 1
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.h3, // 20px
    fontWeight: typography.fontWeight.bold, // 700
    color: colors.text,
    margin: 0,
    letterSpacing: typography.letterSpacing.normal // -0.01em
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.textLight,
    padding: spacing.sm,
    minWidth: '48px',
    minHeight: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm, // 8px
    transition: `all ${transitions.normal}`
  };

  const contentStyle: React.CSSProperties = {
    padding: spacing.xl, // 24px
    overflowY: 'auto'
  };

  return (
    <>
      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}
      </style>
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          {title && (
            <div style={headerStyle}>
              <h2 style={titleStyle}>{title}</h2>
              <button style={closeButtonStyle} onClick={onClose}>
                <X size={24} />
              </button>
            </div>
          )}
          <div style={contentStyle}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};
