import type { Order, Product, Purchase, Settings } from '../types';
import type { Transaction, TransactionType } from '../types/financial';
import { calculateProductCost } from './index';
import { inRange, type PeriodRange } from './period';

const realized = (transactions: Transaction[]): Transaction[] => transactions.filter(t => !!t.paymentDate);

export interface CashFlowMetrics {
  opening: number;
  balance: number;
  inflow: number;
  outflow: number;
  purchases: number; // saídas com origin === 'compra'
  expenses: number; // saídas manuais
  net: number;
}

/** Camada A — fluxo de caixa: dinheiro que de fato entrou e saiu, pela data de pagamento. */
export const calculateCashFlow = (transactions: Transaction[], settings: Settings, range: PeriodRange): CashFlowMetrics => {
  const done = realized(transactions);
  const inPeriod = done.filter(t => inRange(t.paymentDate, range));

  let inflow = 0;
  let outflow = 0;
  let purchases = 0;
  let expenses = 0;
  inPeriod.forEach(t => {
    if (t.type === 'receita') {
      inflow += t.amount;
    } else {
      outflow += t.amount;
      if (t.origin === 'compra') purchases += t.amount;
      else expenses += t.amount;
    }
  });

  const before = done.filter(t => new Date(t.paymentDate as Date) < range.start);
  const opening = (settings.openingCash ?? 0) + before.reduce((s, t) => s + (t.type === 'receita' ? t.amount : -t.amount), 0);

  return { opening, balance: opening + inflow - outflow, inflow, outflow, purchases, expenses, net: inflow - outflow };
};

/** Saldo de caixa dia a dia dentro do período (gráfico de evolução). */
export const cashSeries = (transactions: Transaction[], settings: Settings, range: PeriodRange): { date: Date; balance: number }[] => {
  const done = realized(transactions);
  const before = done.filter(t => new Date(t.paymentDate as Date) < range.start);
  let balance = (settings.openingCash ?? 0) + before.reduce((s, t) => s + (t.type === 'receita' ? t.amount : -t.amount), 0);

  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const points: { date: Date; balance: number }[] = [];
  const DAY = 86400000;
  for (let time = range.start.getTime(); time <= range.end.getTime(); time += DAY) {
    const day = new Date(time);
    done.forEach(t => {
      if (sameDay(new Date(t.paymentDate as Date), day)) balance += t.type === 'receita' ? t.amount : -t.amount;
    });
    points.push({ date: day, balance });
  }
  return points;
};

/** Entradas e saídas realizadas por dia, para o gráfico compacto do Dashboard. */
export const cashByDay = (transactions: Transaction[], days: number, now: Date = new Date()): { date: Date; in: number; out: number }[] => {
  const done = realized(transactions);
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const out: { date: Date; in: number; out: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = startOfDay(new Date(now.getTime() - i * 86400000));
    let inn = 0;
    let outt = 0;
    done.forEach(t => {
      if (startOfDay(t.paymentDate as Date).getTime() === day.getTime()) {
        if (t.type === 'receita') inn += t.amount;
        else outt += t.amount;
      }
    });
    out.push({ date: day, in: inn, out: outt });
  }
  return out;
};

export interface ForecastEntry {
  transaction: Transaction;
  late: boolean;
}

/** Lançamentos ainda sem pagamento (previstos), do tipo pedido — ordenados pela data mais próxima. */
export const forecastEntries = (transactions: Transaction[], type: TransactionType, today: Date = new Date()): ForecastEntry[] => {
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);
  return transactions
    .filter(t => t.type === type && !t.paymentDate)
    .map(t => ({ transaction: t, late: new Date(t.date) < now }))
    .sort((a, b) => new Date(a.transaction.date).getTime() - new Date(b.transaction.date).getTime());
};

export interface PeriodResultV2 {
  revenue: number;
  materialCost: number;
  otherCosts: number;
  laborCost: number;
  grossProfit: number; // receita − materiais − outros custos − mão de obra
  opEx: number; // despesas manuais realizadas no período (compras de material não entram aqui: só pelo consumo, acima)
  profit: number;
  margin: number; // % sobre a receita
  deliveredCount: number;
}

const recognitionDate = (o: Order): Date => new Date(o.deliveryDate ?? o.date);

/** Camada B — resultado do negócio: receita na entrega, custo pelo consumo da peça vendida. */
export const calculatePeriodResult = (
  orders: Order[],
  products: Product[],
  purchases: Purchase[],
  transactions: Transaction[],
  settings: Settings,
  range: PeriodRange
): PeriodResultV2 => {
  const delivered = orders.filter(o => o.status === 'Entregue' && inRange(recognitionDate(o), range));

  let revenue = 0;
  let materialCost = 0;
  let otherCosts = 0;
  let laborCost = 0;
  delivered.forEach(o => {
    revenue += o.agreedPrice;
    const product = products.find(p => p.id === o.productId);
    if (product) {
      const c = calculateProductCost(product, settings, purchases);
      materialCost += c.materialCost * o.quantity;
      otherCosts += c.otherCosts * o.quantity;
      laborCost += c.laborCost * o.quantity;
    }
  });

  const opEx = transactions
    .filter(t => t.type === 'despesa' && t.origin === 'manual' && !!t.paymentDate && inRange(t.paymentDate, range))
    .reduce((s, t) => s + t.amount, 0);

  const grossProfit = revenue - materialCost - otherCosts - laborCost;
  const profit = grossProfit - opEx;

  return {
    revenue,
    materialCost,
    otherCosts,
    laborCost,
    grossProfit,
    opEx,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    deliveredCount: delivered.length
  };
};
