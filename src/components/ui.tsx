import React, { useEffect, useRef, useState } from 'react';
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menu-wrap" ref={ref} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen(o => !o)}
      >
        {trigger}
      </button>
      {open && (
        <div className={`menu ${align === 'left' ? 'left' : ''}`} role="menu">
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
        </div>
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
