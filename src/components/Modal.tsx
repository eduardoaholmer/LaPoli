import React, { useEffect } from 'react';
import { colors, borderRadius, spacing } from '../utils/theme';

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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing.md
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    maxHeight: '90vh',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    width: size === 'full' ? '100%' :
            size === 'lg' ? '800px' :
            size === 'sm' ? '400px' :
            '600px',
    maxWidth: '100%'
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
    fontSize: '20px',
    fontWeight: 600,
    color: colors.text,
    margin: 0
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: colors.textLight,
    padding: spacing.xs,
    minWidth: '44px',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const contentStyle: React.CSSProperties = {
    padding: spacing.xl,
    overflowY: 'auto'
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div style={headerStyle}>
            <h2 style={titleStyle}>{title}</h2>
            <button style={closeButtonStyle} onClick={onClose}>
              ×
            </button>
          </div>
        )}
        <div style={contentStyle}>
          {children}
        </div>
      </div>
    </div>
  );
};
