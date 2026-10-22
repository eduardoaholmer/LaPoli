import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  detail?: string;
  type: ToastType;
  duration?: number;
  onUndo?: () => void;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  error: <AlertCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />
};

const ToastItem: React.FC<{ toast: Toast; onClose: (id: string) => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = window.setTimeout(() => onClose(toast.id), toast.duration || 5000);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const tone = toast.type === 'success' ? '' : toast.type === 'error' ? 'err' : toast.type === 'warning' ? 'warn' : 'info';

  return (
    <div className={`toast ${tone}`} role={toast.type === 'error' ? 'alert' : 'status'}>
      {ICONS[toast.type]}
      <div>
        <b>{toast.message}</b>
        {toast.detail && <span className="muted small">{toast.detail}</span>}
      </div>
      {toast.onUndo && (
        <button
          type="button"
          className="undo"
          onClick={() => {
            toast.onUndo?.();
            onClose(toast.id);
          }}
        >
          Desfazer
        </button>
      )}
    </div>
  );
};

/**
 * Notificações. Continua exposto em `window.toast.add(...)`, como as telas já usam.
 * Novos campos opcionais: `detail` (linha de apoio).
 */
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const add = (toast: Omit<Toast, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts(prev => [...prev, { ...toast, id }]);
    };
    (window as unknown as { toast: unknown }).toast = { add, remove: removeToast };
  }, [removeToast]);

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onClose={removeToast} />
      ))}
    </div>
  );
};
