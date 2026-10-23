import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, Wallet, Tag, BarChart3, Clock } from 'lucide-react';

/* ---------- Alerta: explica o problema e indica a ação ---------- */
type AlertTone = 'error' | 'warning' | 'success' | 'info' | 'neutral';

export const Alert: React.FC<{
  tone: AlertTone;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}> = ({ tone, icon, title, children, actions, className = '' }) => (
  <div className={`alert alert-${tone} ${className}`} role={tone === 'error' ? 'alert' : undefined}>
    {icon}
    <div className="a-body">
      {title && <div className="a-title">{title}</div>}
      {children && <p>{children}</p>}
      {actions && <div className="a-act">{actions}</div>}
    </div>
  </div>
);

/* ---------- Lentes financeiras: faturamento, caixa, lucro, previsto ---------- */
const LENSES = {
  fat: { label: 'Faturamento', cls: 'lens-fat', icon: <Tag size={13} /> },
  caixa: { label: 'Caixa', cls: 'lens-caixa', icon: <Wallet size={13} /> },
  lucro: { label: 'Lucro', cls: 'lens-lucro', icon: <BarChart3 size={13} /> },
  prev: { label: 'Previsto', cls: 'lens-prev', icon: <Clock size={13} /> }
};

export const Lens: React.FC<{ kind: keyof typeof LENSES }> = ({ kind }) => (
  <span className={`lens ${LENSES[kind].cls}`}>
    {LENSES[kind].icon}
    {LENSES[kind].label}
  </span>
);

/* ---------- Dica ao passar o mouse / focar ---------- */
export const Tip: React.FC<{ text: string }> = ({ text }) => (
  <span className="tip-ic" tabIndex={0} data-tip={text} aria-label={text}>
    <Info size={15} />
  </span>
);

/* ---------- Controle segmentado (Grade | Lista, Este mês | Mês passado) ---------- */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  block
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  block?: boolean;
}) {
  return (
    <div className={`seg ${block ? 'block' : ''}`} role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Abas ---------- */
export function Tabs<T extends string>({
  value,
  tabs,
  onChange
}: {
  value: T;
  tabs: { value: T; label: React.ReactNode; count?: number }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(t => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count !== undefined && <span className="badge b-neutral">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Chips de filtro ---------- */
export function Chips<T extends string>({
  value,
  options,
  onChange,
  label
}: {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="chips scroll" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" className="chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className="cnt">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Barra de progresso / estoque (com marca opcional, ex.: meta ou mínimo) ---------- */
export const Bar: React.FC<{
  percent: number;
  tone?: 'default' | 'warn' | 'err' | 'prim';
  markAt?: number; // 0–100
  height?: number;
  label?: string;
}> = ({ percent, tone = 'default', markAt, height, label }) => (
  <div
    className={`bar ${tone === 'default' ? '' : tone}`}
    style={height ? { height } : undefined}
    role="img"
    aria-label={label}
  >
    <i style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    {markAt !== undefined && <span className="mark" style={{ left: `${markAt}%` }} />}
  </div>
);

/* ---------- Menu de contexto (⋯) ---------- */
export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  divider?: boolean;
}

export const DropdownMenu: React.FC<{
  trigger: React.ReactNode;
  items: MenuItem[];
  label: string;
  align?: 'left' | 'right';
  triggerClassName?: string;
}> = ({ trigger, items, label, align = 'right', triggerClassName = 'btn btn-secondary btn-icon btn-sm' }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /** O menu sai do card (fixed, no body) para não ser cortado por overflow de tabelas e listas; abre para cima se faltar espaço. */
  const place = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const gap = 6;
    const margin = 8;
    const below = window.innerHeight - trigger.bottom - gap - margin;
    const above = trigger.top - gap - margin;
    const top = menu.offsetHeight > below && above > below ? Math.max(margin, trigger.top - gap - menu.offsetHeight) : trigger.bottom + gap;
    const wanted = align === 'left' ? trigger.left : trigger.right - menu.offsetWidth;
    const left = Math.min(Math.max(margin, wanted), window.innerWidth - menu.offsetWidth - margin);
    setPos({ top, left });
  }, [align]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) place();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  return (
    <div className="menu-wrap" onClick={e => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => {
          setPos(null);
          setOpen(o => !o);
        }}
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="menu"
            role="menu"
            style={{ position: 'fixed', right: 'auto', top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
          >
            {items.map((it, i) =>
              it.divider ? (
                <hr key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  className={it.danger ? 'danger' : ''}
                  onClick={() => {
                    setOpen(false);
                    it.onSelect();
                  }}
                >
                  {it.icon}
                  {it.label}
                </button>
              )
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

/* ---------- Linha chave/valor ---------- */
export const KV: React.FC<{ k: React.ReactNode; v: React.ReactNode; total?: boolean }> = ({ k, v, total }) => (
  <div className={`kv ${total ? 'total' : ''}`}>
    <span className="k">{k}</span>
    <span className="v">{v}</span>
  </div>
);
