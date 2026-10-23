import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Formulário com dados: tocar fora, no X ou em Esc pergunta antes de descartar. */
  confirmClose?: boolean;
}

const FOCUSABLE = 'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])';

/**
 * Modal no desktop; no celular vira uma folha que sobe da base (bottom sheet).
 * Esc fecha, o foco vai para dentro ao abrir e volta para onde estava ao fechar.
 */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md', confirmClose = false }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const [asking, setAsking] = useState(false);
  // O pai costuma passar uma função nova a cada render. Se ela entrasse nas dependências do efeito, a cada
  // tecla digitada o foco voltaria ao botão que abriu o modal e depois ao primeiro campo.
  const onCloseRef = useRef(onClose);
  const askingRef = useRef(false);
  const confirmCloseRef = useRef(confirmClose);
  useEffect(() => {
    onCloseRef.current = onClose;
    askingRef.current = asking;
    confirmCloseRef.current = confirmClose;
  });
  // fechar sem querer (toque fora da folha, Esc) não pode apagar um formulário preenchido
  const requestClose = useCallback(() => {
    if (confirmCloseRef.current) setAsking(true);
    else onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (askingRef.current) setAsking(false);
        else requestClose();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          el => !el.hasAttribute('disabled')
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);

    const t = window.setTimeout(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>('input, select, textarea');
      (target ?? dialogRef.current?.querySelector<HTMLElement>('button.btn-primary'))?.focus();
    }, 30);

    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      document.body.style.overflow = '';
      setAsking(false);
      returnTo.current?.focus?.();
    };
  }, [isOpen, requestClose]);

  if (!isOpen) return null;

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && requestClose()}>
      <div
        ref={dialogRef}
        className={`modal ${size === 'lg' || size === 'full' ? 'wide' : size === 'sm' ? 'narrow' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="grab" />
        {title && (
          <div className="modal-head">
            <h3>{title}</h3>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={requestClose} aria-label="Fechar">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
        {asking && (
          <div className="modal-ask" role="alertdialog" aria-label="Sair sem salvar?">
            <b>Sair sem salvar?</b>
            <p className="small muted">O que você preencheu será perdido.</p>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" autoFocus onClick={() => setAsking(false)}>
                Continuar preenchendo
              </button>
              <button
                type="button"
                className="btn btn-danger-solid"
                onClick={() => {
                  setAsking(false);
                  onCloseRef.current();
                }}
              >
                Sair sem salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirmação com o nome do que será afetado (substitui window.confirm nas telas novas). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  danger,
  onConfirm,
  onClose
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {cancelLabel}
        </button>
        <button type="button" className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </>
    }
  >
    <div className="muted" style={{ lineHeight: 1.7 }}>
      {children}
    </div>
  </Modal>
);
