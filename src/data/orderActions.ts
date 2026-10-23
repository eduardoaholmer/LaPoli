import { orderService } from './services';
import type { HistoryEntry, Order, OrderStatus } from '../types';
import { generateId } from '../types';
import { formatCurrency } from '../calculations';
import { isDoneStatus, returnOrderMaterials } from './stockUsage';

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

/**
 * Pedido que volta para antes de "peça pronta" (por engano, ou para refazer) devolve ao estoque o material
 * que tinha sido descontado. Cancelar não devolve: a peça pronta já gastou o material.
 */
const reopenPatch = async (order: Order, status: OrderStatus): Promise<Partial<Order>> => {
  if (!order.stockUsedAt || isDoneStatus(status) || status === 'Cancelado') return {};
  await returnOrderMaterials(order.id);
  return { stockUsedAt: undefined, history: appendHistory(order, 'Material devolvido ao estoque') };
};

/** Salva o formulário "Editar pedido" (que também pode mudar a etapa). */
export const saveOrderEdit = async (order: Order, data: Partial<Order>): Promise<void> => {
  const reopen = data.status ? await reopenPatch(order, data.status) : {};
  await orderService.update(order.id, { ...data, ...reopen, history: appendHistory({ ...order, ...reopen }, 'Detalhes do pedido editados') });
};

/** Muda a etapa e preenche as datas de produção/entrega que já existem no pedido. */
export const changeOrderStatus = async (order: Order, status: OrderStatus, extra: Partial<Order> = {}): Promise<void> => {
  const reopen = await reopenPatch({ ...order, ...extra }, status);
  extra = { ...extra, ...reopen };
  const patch: Partial<Order> = { status, ...extra };
  const now = new Date();
  if (status === 'Em produção' && !order.productionStartDate) patch.productionStartDate = now;
  // "Peça pronta" pula "Produção concluída": a data de conclusão vale para qualquer etapa depois da produção
  if (['Produção concluída', 'Aguardando entrega', 'Entregue'].includes(status) && !order.completionDate) patch.completionDate = now;
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
