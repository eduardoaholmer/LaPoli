import React, { useEffect, useState } from 'react';
import { Clock, Layers, NotebookPen, Pause, Play, Receipt, StickyNote, Trash2 } from 'lucide-react';
import type { Order, OrderLogEntry } from '../types';
import { generateId } from '../types';
import { formatCurrency, formatDate } from '../calculations';
import { formatQuantity, materialKey, type MaterialGroup } from '../calculations/materials';
import { logTotals } from '../calculations/settlement';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';

type Kind = OrderLogEntry['type'];

const KINDS: { value: Kind; label: string; icon: React.ReactNode }[] = [
  { value: 'material', label: 'Material', icon: <Layers size={16} /> },
  { value: 'horas', label: 'Horas', icon: <Clock size={16} /> },
  { value: 'gasto', label: 'Gasto', icon: <Receipt size={16} /> },
  { value: 'nota', label: 'Nota', icon: <StickyNote size={16} /> }
];

const num = (v: string) => parseFloat(v.replace(',', '.'));
const hoursText = (h: number) => `${h.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h`;

/** Horas e minutos desde que o cronômetro foi ligado. */
const elapsed = (since: Date | string, now: number) => {
  const min = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
};

const describeEntry = (e: OrderLogEntry, groups: MaterialGroup[]): string => {
  if (e.type === 'horas') return `${hoursText(e.quantity ?? 0)} de trabalho`;
  if (e.type === 'gasto') return `${e.text || 'Gasto extra'}: ${formatCurrency(e.amount ?? 0)}`;
  if (e.type === 'material') {
    const unit = groups.find(g => g.key === materialKey(e.material ?? ''))?.unit ?? 'gramas';
    const q = e.quantity ?? 0;
    return `${q >= 0 ? '+' : '−'}${formatQuantity(Math.abs(q), unit)} de ${e.material} ${q >= 0 ? 'a mais' : 'a menos'} que a receita`;
  }
  return e.text ?? '';
};

/**
 * Diário do pedido: material a mais ou a menos, horas trabalhadas (digitadas ou no cronômetro), gastos extras
 * e notas. Tudo isso entra no acerto dos números quando a peça fica pronta.
 */
export const OrderLog: React.FC<{ order: Order; groups: MaterialGroup[]; onSave: (patch: Partial<Order>) => Promise<void> }> = ({ order, groups, onSave }) => {
  const [kind, setKind] = useState<Kind>('material');
  const [material, setMaterial] = useState('');
  const [direction, setDirection] = useState<'mais' | 'menos'>('mais');
  const [value, setValue] = useState('');
  const [text, setText] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const log = order.log ?? [];
  const totals = logTotals(log);

  // o tempo do cronômetro na tela anda de minuto em minuto
  useEffect(() => {
    if (!order.timerStartedAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, [order.timerStartedAt]);

  const add = async (entry: Omit<OrderLogEntry, 'id' | 'date'>, extra: Partial<Order> = {}) => {
    await onSave({ ...extra, log: [...log, { ...entry, id: generateId(), date: new Date() }] });
    setValue('');
    setText('');
  };

  const canAdd =
    kind === 'material' ? !!material.trim() && num(value) > 0
      : kind === 'horas' ? num(value) > 0
      : kind === 'gasto' ? num(value) > 0
      : !!text.trim();

  const submit = () => {
    if (!canAdd) return;
    if (kind === 'material') return add({ type: 'material', material: material.trim(), quantity: direction === 'mais' ? num(value) : -num(value) });
    if (kind === 'horas') return add({ type: 'horas', quantity: num(value) });
    if (kind === 'gasto') return add({ type: 'gasto', amount: num(value), text: text.trim() || undefined });
    return add({ type: 'nota', text: text.trim() });
  };

  const stopTimer = () => {
    const hours = Math.max(0.05, Math.round(((Date.now() - new Date(order.timerStartedAt!).getTime()) / 3600000) * 20) / 20);
    return add({ type: 'horas', quantity: hours, text: 'Cronômetro' }, { timerStartedAt: undefined });
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2><NotebookPen size={20} /> Anotações da produção</h2>
        {(totals.hours > 0 || totals.extras > 0) && (
          <span className="small muted">{hoursText(totals.hours)}{totals.extras > 0 ? ` · ${formatCurrency(totals.extras)} em gastos` : ''}</span>
        )}
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>Vá anotando enquanto faz a peça. No fim, isso entra no acerto dos números.</p>

      <div className="timer-row">
        {order.timerStartedAt ? (
          <>
            <span><Clock size={16} /> Trabalhando há <b>{elapsed(order.timerStartedAt, now)}</b></span>
            <Button size="sm" icon={<Pause size={16} />} onClick={stopTimer}>Pausar e anotar</Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" icon={<Play size={16} />} onClick={() => onSave({ timerStartedAt: new Date() })}>Começar a contar as horas</Button>
        )}
      </div>

      <div className="chips mt-16" role="group" aria-label="Tipo de anotação">
        {KINDS.map(k => (
          <button key={k.value} type="button" className="chip" aria-pressed={kind === k.value} onClick={() => setKind(k.value)}>
            {k.icon}
            {k.label}
          </button>
        ))}
      </div>

      <form className="form-grid mt-16" onSubmit={e => { e.preventDefault(); void submit(); }}>
        {kind === 'material' && (
          <>
            <div className="full">
              <Input label="Material" list="log-materials" value={material} onChange={e => setMaterial(e.target.value)} placeholder="Ex.: Fio rosa" fullWidth />
              <datalist id="log-materials">
                {groups.map(g => <option key={g.key} value={g.name} />)}
              </datalist>
            </div>
            <Select label="Comparado com a receita" value={direction} onChange={e => setDirection(e.target.value as 'mais' | 'menos')} fullWidth>
              <option value="mais">Usei a mais</option>
              <option value="menos">Usei a menos</option>
            </Select>
            <Input label="Quanto" type="number" min={0} step="any" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} suffix="g" fullWidth />
          </>
        )}
        {kind === 'horas' && (
          <Input label="Horas trabalhadas" type="number" min={0} step="0.25" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} suffix="h" help="Ex.: 1,5 para uma hora e meia." fullWidth />
        )}
        {kind === 'gasto' && (
          <>
            <Input label="O que foi" value={text} onChange={e => setText(e.target.value)} placeholder="Ex.: laço, embalagem, frete" fullWidth />
            <Input label="Valor" type="number" min={0} step="0.01" inputMode="decimal" prefix="R$" value={value} onChange={e => setValue(e.target.value)} fullWidth />
          </>
        )}
        {kind === 'nota' && (
          <div className="full">
            <Input label="Nota" value={text} onChange={e => setText(e.target.value)} placeholder="Ex.: cliente pediu o olho maior" fullWidth />
          </div>
        )}
        <div className="full">
          <Button type="submit" variant="secondary" disabled={!canAdd} fullWidth>Anotar</Button>
        </div>
      </form>

      {log.length > 0 && (
        <div className="rows mt-16">
          {[...log].reverse().map(e => (
            <div key={e.id} className="li log-li">
              <span className="small faint nowrap">{formatDate(e.date).slice(0, 5)}</span>
              <span className="grow">{describeEntry(e, groups)}</span>
              <Button variant="ghost" size="sm" className="btn-icon" aria-label="Apagar anotação" onClick={() => onSave({ log: log.filter(x => x.id !== e.id) })}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
