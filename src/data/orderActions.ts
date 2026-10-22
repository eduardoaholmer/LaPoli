import { orderService } from './services';
import type { HistoryEntry, Order, OrderStatus } from '../types';
import { generateId } from '../types';
import { formatCurrency } from '../calculations';

/**
 * Ações de pedido que mexem em vários campos de uma vez (datas, pagamento, histórico).
 * Usam o mesmo orderService e os mesmos campos que o pedido já tinha.
 */

const entry = (text: string): HistoryEntry => ({ id: generateId(), date: new Date(), text });

const at = (date: Date | string, text: string): HistoryEntry => ({ id: generateId(), date: new Date(date), text });

/** Pedidos antigos não têm histórico: monta um a partir das datas que o pedido já guarda. */
export const baselineHistory = (order: Order): HistoryEntry[] => {
  const list: HistoryEntry[] = [at(order.date, 'Pedido criado')];
  if (order.signalPaymentDate) list.push(at(order.signalPaymentDate, 'Sinal recebido'));
  if (order.productionStartDate) list.push(at(order.productionStartDate, 'Produção iniciada'));
  if (order.completionDate) list.push(at(order.completionDate, 'Produção concluída'));
  if (order.finalPaymentDate) list.push(at(order.finalPaymentDate, 'Saldo recebido'));
  if (order.deliveryDate) list.push(at(order.deliveryDate, 'Pedido entregue'));
  return list.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const appendHistory = (order: Order, text: string): HistoryEntry[] => [...(order.history ?? baselineHistory(order)), entry(text)];

/** Muda a etapa e preenche as datas de produção/entrega que já existem no pedido. */
export const changeOrderStatus = async (order: Order, status: OrderStatus, extra: Partial<Order> = {}): Promise<void> => {
  const patch: Partial<Order> = { status, ...extra };
  const now = new Date();
  if (status === 'Em produção' && !order.productionStartDate) patch.productionStartDate = now;
  if (status === 'Produção concluída' && !order.completionDate) patch.completionDate = now;
  if (status === 'Entregue') patch.deliveryDate = now;
  patch.history = appendHistory({ ...order, ...extra }, `Etapa: ${order.status} → ${status}`);
  await orderService.update(order.id, patch);
};

export type PaymentKind = 'sinal' | 'saldo';

/** Registra o recebimento do sinal ou do saldo usando os campos e status de pagamento que já existem. */
export const registerPayment = async (order: Order, kind: PaymentKind, method?: string): Promise<Partial<Order>> => {
  const now = new Date();
  const patch: Partial<Order> =
    kind === 'sinal'
      ? { paymentStatus: 'sinal pago', signalPaymentDate: now }
      : { paymentStatus: 'pago', finalPaymentDate: now, ...(order.signalPaymentDate ? {} : { signalPaymentDate: now }) };
  if (method) patch.paymentMethod = method;
  const value = kind === 'sinal' ? order.signalAmount : Math.max(0, order.agreedPrice - order.signalAmount);
  patch.history = appendHistory(order, `${kind === 'sinal' ? 'Sinal' : 'Saldo'} de ${formatCurrency(value)} recebido${method ? ` (${method})` : ''}`);
  await orderService.update(order.id, patch);
  return patch;
};

export const cancelOrder = async (order: Order): Promise<void> => {
  await orderService.update(order.id, { status: 'Cancelado', history: appendHistory(order, 'Pedido cancelado') });
};
