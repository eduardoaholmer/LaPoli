import { describe, it, expect } from 'vitest';
import { periodRange, calculatePeriodResult, calculateCash, cashByDay, greetingFor, inRange } from './period';
import type { Order, Product, Purchase, Settings } from '../types';

const settings = { hourlyRate: 15, desiredProfitMargin: 30, defaultSignalPercent: 50 } as Settings;
const now = new Date(2026, 9, 22, 15, 0); // 22/10/2026

const product = {
  id: 'p1',
  name: 'Capivara',
  usualPrice: 189.9,
  estimatedTime: 6,
  otherCosts: 2.5,
  materials: [{ id: 'm', material: 'Fio', quantityUsed: 200, unit: 'gramas', purchaseId: undefined }]
} as unknown as Product;

const purchases = [
  { id: 'a', material: 'Fio', unitCost: 0.1, quantityPurchased: 500, totalPaid: 50, date: new Date(2026, 9, 5) } as Purchase
];

const order = (o: Partial<Order>): Order =>
  ({
    id: 'o',
    productId: 'p1',
    clientName: 'Ana',
    quantity: 1,
    agreedPrice: 189.9,
    signalAmount: 94.95,
    paymentStatus: 'pendente',
    status: 'Em produção',
    date: new Date(2026, 9, 1),
    ...o
  }) as Order;

describe('Períodos', () => {
  it('mês atual vai do dia 1 até hoje', () => {
    const r = periodRange('month', now);
    expect(r.start.getDate()).toBe(1);
    expect(inRange(new Date(2026, 9, 22, 23, 0), r)).toBe(true);
    expect(inRange(new Date(2026, 9, 23), r)).toBe(false);
  });

  it('mês passado cobre o mês inteiro anterior', () => {
    const r = periodRange('lastMonth', now);
    expect(r.start.getMonth()).toBe(8);
    expect(inRange(new Date(2026, 8, 30, 12), r)).toBe(true);
    expect(inRange(new Date(2026, 9, 1), r)).toBe(false);
  });

  it('saúda conforme a hora', () => {
    expect(greetingFor(new Date(2026, 0, 1, 8))).toBe('Bom dia');
    expect(greetingFor(new Date(2026, 0, 1, 15))).toBe('Boa tarde');
    expect(greetingFor(new Date(2026, 0, 1, 21))).toBe('Boa noite');
  });
});

describe('Faturamento e lucro', () => {
  it('reconhece a venda na entrega, não no dia do pedido', () => {
    const delivered = order({ status: 'Entregue', date: new Date(2026, 8, 20), deliveryDate: new Date(2026, 9, 10) });
    const r = calculatePeriodResult([delivered], [product], purchases, settings, periodRange('month', now));
    expect(r.revenue).toBe(189.9);
    const prev = calculatePeriodResult([delivered], [product], purchases, settings, periodRange('lastMonth', now));
    expect(prev.revenue).toBe(0);
  });

  it('lucro = faturamento − materiais − outros custos − mão de obra', () => {
    const delivered = order({ status: 'Entregue', deliveryDate: new Date(2026, 9, 10) });
    const r = calculatePeriodResult([delivered], [product], purchases, settings, periodRange('month', now));
    expect(r.materialCost).toBeCloseTo(20, 6); // 200 g × 0,10
    expect(r.otherCosts).toBe(2.5);
    expect(r.laborCost).toBe(90); // 6 h × 15
    expect(r.profit).toBeCloseTo(189.9 - 20 - 2.5 - 90, 6);
    expect(r.margin).toBeCloseTo(((189.9 - 112.5) / 189.9) * 100, 6);
  });

  it('pedidos em andamento ou cancelados não entram no faturamento', () => {
    const r = calculatePeriodResult(
      [order({ status: 'Em produção' }), order({ status: 'Cancelado' })],
      [product],
      purchases,
      settings,
      periodRange('month', now)
    );
    expect(r.revenue).toBe(0);
    expect(r.deliveredCount).toBe(0);
  });
});

describe('Caixa', () => {
  it('conta sinal e saldo recebidos e compras pagas, cada um uma vez', () => {
    const paid = order({
      paymentStatus: 'pago',
      status: 'Entregue',
      signalPaymentDate: new Date(2026, 9, 3),
      finalPaymentDate: new Date(2026, 9, 15)
    });
    const cash = calculateCash([paid], purchases, periodRange('month', now));
    expect(cash.received).toBeCloseTo(189.9, 6); // sinal 94,95 + saldo 94,95
    expect(cash.spent).toBe(50);
    expect(cash.net).toBeCloseTo(139.9, 6);
  });

  it('sinal de pedido ainda em andamento entra no caixa, mas não no faturamento', () => {
    const o = order({ paymentStatus: 'sinal pago', signalPaymentDate: new Date(2026, 9, 10) });
    const range = periodRange('month', now);
    expect(calculateCash([o], [], range).received).toBe(94.95);
    expect(calculatePeriodResult([o], [product], purchases, settings, range).revenue).toBe(0);
  });

  it('agrupa por dia', () => {
    const o = order({ paymentStatus: 'sinal pago', signalPaymentDate: new Date(2026, 9, 21) });
    const days = cashByDay([o], purchases, 14, now);
    expect(days).toHaveLength(14);
    expect(days[days.length - 2].in).toBe(94.95);
  });
});
