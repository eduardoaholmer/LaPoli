import React, { useState } from 'react';
import type { Order, Product, Settings } from '../types';
import { calculateRemainingBalance, formatCurrency } from '../calculations';
import { Button } from '../components/Button';
import { Checkbox, Input, Select, TextArea } from '../components/Input';
import { DateField } from './OrderDialogs';

type OrderData = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;

interface Props {
  order: Order;
  products: Product[];
  settings: Settings | null;
  onSave: (data: OrderData) => void;
  onCancel: () => void;
}

/** Edição de todos os campos do pedido (os mesmos de antes). O dia a dia usa a tela de detalhes. */
export const OrderEditForm: React.FC<Props> = ({ order, products, settings, onSave, onCancel }) => {
  const [form, setForm] = useState<Partial<Order>>(order);
  const [submitted, setSubmitted] = useState(false);

  const set = (patch: Partial<Order>) => setForm(f => ({ ...f, ...patch }));
  const setPrice = (field: 'agreedPrice' | 'signalAmount', value: number) => {
    const next = { ...form, [field]: value };
    next.remainingBalance = calculateRemainingBalance(next.agreedPrice || 0, next.signalAmount || 0);
    setForm(next);
  };

  const deadlineBeforeOrder = !!form.deadline && !!form.date && new Date(new Date(form.deadline).setHours(0, 0, 0, 0)) < new Date(new Date(form.date).setHours(0, 0, 0, 0));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!form.clientName?.trim() || !form.product?.trim() || deadlineBeforeOrder) return;
    onSave(form as OrderData);
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="stack">
        <div className="form-grid">
          <Input label="Nome da cliente *" value={form.clientName ?? ''} onChange={e => set({ clientName: e.target.value })} error={submitted && !form.clientName?.trim() ? 'Informe o nome.' : undefined} fullWidth />
          <Input label="Telefone/WhatsApp *" type="tel" inputMode="tel" value={form.clientPhone ?? ''} onChange={e => set({ clientPhone: e.target.value })} fullWidth />
          <Select
            label="Produto do catálogo"
            value={form.productId ?? ''}
            onChange={e => {
              const p = products.find(x => x.id === e.target.value);
              if (p) setForm(f => ({ ...f, productId: p.id, product: p.name }));
              else set({ productId: '' });
            }}
            fullWidth
          >
            <option value="">Peça personalizada (fora do catálogo)</option>
            {products.filter(p => p.active || p.id === form.productId).map(p => (
              <option key={p.id} value={p.id}>{p.name} · {formatCurrency(p.usualPrice)}</option>
            ))}
          </Select>
          <Input label="Nome da peça *" value={form.product ?? ''} onChange={e => set({ product: e.target.value })} error={submitted && !form.product?.trim() ? 'Informe a peça.' : undefined} fullWidth />
          <Input label="Personalizações" optional value={form.customizations ?? ''} onChange={e => set({ customizations: e.target.value })} fullWidth />
          <Input label="Tamanho" optional value={form.size ?? ''} onChange={e => set({ size: e.target.value })} fullWidth />
          <Input label="Quantidade" type="number" min={1} value={form.quantity ?? 1} onChange={e => set({ quantity: parseInt(e.target.value) || 1 })} fullWidth />
          <DateField label="Prazo de entrega *" value={form.deadline} onChange={d => set({ deadline: d })} />
        </div>
        {deadlineBeforeOrder && <p className="help neg" role="alert">A data de entrega não pode ser anterior à data do pedido.</p>}

        <div className="form-grid">
          <Input label="Preço combinado *" type="number" min={0} step="0.01" inputMode="decimal" prefix="R$" value={form.agreedPrice ?? 0} onChange={e => setPrice('agreedPrice', parseFloat(e.target.value) || 0)} fullWidth />
          <Input label="Valor do sinal" type="number" min={0} step="0.01" inputMode="decimal" prefix="R$" value={form.signalAmount ?? 0} onChange={e => setPrice('signalAmount', parseFloat(e.target.value) || 0)} fullWidth />
          <Input label="Saldo restante" readOnly prefix="R$" value={(form.remainingBalance ?? 0).toFixed(2)} fullWidth />
          {settings && (
            <Select label="Forma de pagamento" value={form.paymentMethod ?? ''} onChange={e => set({ paymentMethod: e.target.value })} fullWidth>
              <option value="">Selecione…</option>
              {settings.paymentMethods.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          )}
          {settings && (
            <Select label="Etapa do pedido" value={form.status} onChange={e => set({ status: e.target.value as Order['status'] })} fullWidth>
              {settings.orderStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          )}
          <Select label="Status do pagamento" value={form.paymentStatus} onChange={e => set({ paymentStatus: e.target.value as Order['paymentStatus'] })} fullWidth>
            <option value="pendente">Pendente</option>
            <option value="sinal pago">Sinal pago</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </Select>
          <DateField label="Data do pagamento do sinal" optional value={form.signalPaymentDate} onChange={d => set({ signalPaymentDate: d })} />
          <DateField label="Data do pagamento final" optional value={form.finalPaymentDate} onChange={d => set({ finalPaymentDate: d })} />
          <DateField label="Início da produção" optional value={form.productionStartDate} onChange={d => set({ productionStartDate: d })} />
          <DateField label="Conclusão da produção" optional value={form.completionDate} onChange={d => set({ completionDate: d })} />
          <DateField label="Data de entrega" optional value={form.deliveryDate} onChange={d => set({ deliveryDate: d })} />
        </div>
        <div className="row-wrap">
          <Checkbox checked={!!form.needsMaterialPurchase} onChange={v => set({ needsMaterialPurchase: v })} label="Precisa comprar materiais?" />
          <Checkbox checked={!!form.materialsPurchased} onChange={v => set({ materialsPurchased: v })} label="Materiais comprados?" />
        </div>
        <TextArea label="Observações" optional value={form.observations ?? ''} onChange={e => set({ observations: e.target.value })} fullWidth />
      </div>
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
};
