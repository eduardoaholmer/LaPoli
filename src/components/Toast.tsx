import React, { useEffect, useState } from 'react';
import { colors, spacing, borderRadius, shadows, transitions, typography } from '../utils/theme';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onUndo?: () => void;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertCircle size={20} />;
      case 'info':
      default:
        return <Info size={20} />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'info':
      default:
        return colors.primary;
    }
  };

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: `${spacing.md} ${spacing.lg}`,
    backgroundColor: getBackgroundColor(),
    color: '#FFFFFF',
    borderRadius: borderRadius.md, // 12px
    boxShadow: shadows.lg,
    minWidth: '320px',
    maxWidth: '420px',
    transition: `opacity 300ms, transform 300ms`,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(-20px)'
  };

  const iconStyle: React.CSSProperties = {
    flexShrink: 0
  };

  const messageStyle: React.CSSProperties = {
    flex: 1,
    fontSize: typography.fontSize.body, // 14px
    fontWeight: typography.fontWeight.medium, // 500
    lineHeight: typography.lineHeight.normal // 1.5
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.15)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: spacing.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm, // 8px
    flexShrink: 0,
    transition: `background ${transitions.normal}`
  };

  const undoButtonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: `${spacing.sm} ${spacing.lg}`,
    borderRadius: borderRadius.sm, // 8px
    fontSize: typography.fontSize.small, // 12px
    fontWeight: typography.fontWeight.semibold, // 600
    flexShrink: 0,
    transition: `background ${transitions.normal}`
  };

  return (
    <div style={style}>
      <div style={iconStyle}>{getIcon()}</div>
      <div style={messageStyle}>{toast.message}</div>
      {toast.onUndo && (
        <button style={undoButtonStyle} onClick={toast.onUndo}>
          Desfazer
        </button>
      )}
      <button style={closeButtonStyle} onClick={() => onClose(toast.id)}>
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: spacing.xl,
    right: spacing.xl,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md
  };

  // Expor função globalmente para uso em outros componentes
  useEffect(() => {
    (window as any).toast = { add: addToast, remove: removeToast };
  }, []);

  return (
    <div style={containerStyle}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
};
