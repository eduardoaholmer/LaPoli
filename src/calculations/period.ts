import type { Order, Product, Purchase, Settings } from '../types';
import { calculateProductCost } from './index';
import { orderReceived } from './orders';

/**
 * Faturamento, caixa e lucro são coisas diferentes:
 * - Faturamento (receita reconhecida): pedidos ENTREGUES no período, pelo valor combinado.
 * - Caixa: dinheiro que de fato entrou (sinal e saldo recebidos) e saiu (compras de material) no período.
 * - Lucro: faturamento menos o custo das peças vendidas (materiais, outros custos e mão de obra).
 */

export type PeriodKey = 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom';

export interface PeriodRange {
  start: Date;
  end: Date; // inclusive
  label: string;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const periodRange = (key: PeriodKey, now: Date = new Date(), custom?: { start: Date; end: Date }): PeriodRange => {
  const today = startOfDay(now);
  switch (key) {
    case 'today':
      return { start: today, end: endOfDay(now), label: 'Hoje' };
    case 'week':
      return { start: new Date(today.getTime() - 6 * 86400000), end: endOfDay(now), label: 'Últimos 7 dias' };
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return { start, end, label: MESES[start.getMonth()].replace(/^./, c => c.toUpperCase()) };
    }
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now), label: `${now.getFullYear()} até hoje` };
    case 'custom':
      return {
        start: startOfDay(custom?.start ?? today),
        end: endOfDay(custom?.end ?? now),
        label: 'Período personalizado'
      };
    case 'month':
    default:
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfDay(now),
        label: `${MESES[now.getMonth()].replace(/^./, c => c.toUpperCase())} (1 a ${now.getDate()})`
      };
  }
};

export const inRange = (d: Date | string | undefined, r: PeriodRange): boolean => {
  if (!d) return false;
  const t = new Date(d).getTime();
  return t >= r.start.getTime() && t <= r.end.getTime();
};

/** Quando a venda conta: na entrega (se a data não foi preenchida, usa a data do pedido). */
const recognitionDate = (o: Order): Date => new Date(o.deliveryDate ?? o.date);

export interface PeriodResult {
  revenue: number; // faturamento
  materialCost: number;
  otherCosts: number;
  laborCost: number;
  productCosts: number; // materiais + outros + mão de obra
  profit: number;
  margin: number; // % sobre o faturamento
  deliveredCount: number;
  hours: number;
  profitPerHour: number;
}

export const calculatePeriodResult = (
  orders: Order[],
  products: Product[],
  purchases: Purchase[],
  settings: Settings,
  range: PeriodRange
): PeriodResult => {
  const delivered = orders.filter(o => o.status === 'Entregue' && inRange(recognitionDate(o), range));
  let revenue = 0;
  let materialCost = 0;
  let otherCosts = 0;
  let laborCost = 0;
  let hours = 0;

  delivered.forEach(o => {
    revenue += o.agreedPrice;
    const product = products.find(p => p.id === o.productId);
    if (product) {
      const c = calculateProductCost(product, settings, purchases);
      materialCost += c.materialCost * o.quantity;
      otherCosts += c.otherCosts * o.quantity;
      laborCost += c.laborCost * o.quantity;
      hours += (product.actualTime || product.estimatedTime || 0) * o.quantity;
    }
  });

  const productCosts = materialCost + otherCosts + laborCost;
  const profit = revenue - productCosts;
  return {
    revenue,
    materialCost,
    otherCosts,
    laborCost,
    productCosts,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    deliveredCount: delivered.length,
    hours,
    profitPerHour: hours > 0 ? profit / hours : 0
  };
};

export interface CashEvent {
  date: Date;
  amount: number;
  kind: 'in' | 'out';
  label: string;
}

/**
 * Entradas e saídas a partir do que o app já registra: datas de pagamento do sinal e do saldo
 * nos pedidos, e a data das compras de material. (O módulo Financeiro completo virá depois.)
 */
export const cashEvents = (orders: Order[], purchases: Purchase[]): CashEvent[] => {
  const events: CashEvent[] = [];
  orders.forEach(o => {
    if (o.status === 'Cancelado') return;
    const received = orderReceived(o);
    if (o.paymentStatus === 'sinal pago' || o.paymentStatus === 'pago') {
      events.push({
        date: new Date(o.signalPaymentDate ?? o.date),
        amount: Math.min(o.signalAmount, received),
        kind: 'in',
        label: `Sinal de ${o.clientName}`
      });
    }
    if (o.paymentStatus === 'pago') {
      events.push({
        date: new Date(o.finalPaymentDate ?? o.deliveryDate ?? o.date),
        amount: Math.max(0, o.agreedPrice - o.signalAmount),
        kind: 'in',
        label: `Saldo de ${o.clientName}`
      });
    }
  });
  purchases.forEach(p => {
    events.push({ date: new Date(p.date), amount: p.totalPaid, kind: 'out', label: `Compra: ${p.material}` });
  });
  return events;
};

export interface CashResult {
  received: number;
  spent: number;
  net: number;
}

export const calculateCash = (orders: Order[], purchases: Purchase[], range: PeriodRange): CashResult => {
  const events = cashEvents(orders, purchases).filter(e => inRange(e.date, range));
  const received = events.filter(e => e.kind === 'in').reduce((s, e) => s + e.amount, 0);
  const spent = events.filter(e => e.kind === 'out').reduce((s, e) => s + e.amount, 0);
  return { received, spent, net: received - spent };
};

/** Entradas e saídas dia a dia (para o gráfico de atividade recente). */
export const cashByDay = (
  orders: Order[],
  purchases: Purchase[],
  days: number,
  now: Date = new Date()
): { date: Date; in: number; out: number }[] => {
  const events = cashEvents(orders, purchases);
  const out: { date: Date; in: number; out: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(new Date(now.getTime() - i * 86400000));
    const key = d.getTime();
    let inn = 0;
    let outt = 0;
    events.forEach(e => {
      if (startOfDay(e.date).getTime() === key) {
        if (e.kind === 'in') inn += e.amount;
        else outt += e.amount;
      }
    });
    out.push({ date: d, in: inn, out: outt });
  }
  return out;
};

export const greetingFor = (now: Date = new Date()): string => {
  const h = now.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};
