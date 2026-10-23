import { describe, it, expect } from 'vitest';
import { calculateCashFlow, calculatePeriodResult, forecastEntries } from './finance';
import { periodRange } from './period';
import type { Order, Product, Purchase, Settings } from '../types';
import type { Transaction } from '../types/financial';

const settings = { hourlyRate: 20, openingCash: 0 } as Settings;

const tx = (t: Partial<Transaction> & Pick<Transaction, 'id' | 'amount' | 'date' | 'origin' | 'category'>): Transaction => ({
  type: 'despesa',
  description: '',
  account: 'Pix',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...t
});

const purchaseFio = { id: 'fio', material: 'Fio', unitCost: 0.05 } as Purchase;
const purchaseEnchimento = { id: 'ench', material: 'Enchimento', unitCost: 0.15 } as Purchase;
const purchaseOlhos = { id: 'olhos', material: 'Olhos', unitCost: 1.4 } as Purchase;

const product: Product = {
  id: 'leao',
  name: 'Leão Amigurumi',
  category: 'Amigurumi',
  description: '',
  size: '20cm',
  active: true,
  estimatedTime: 5,
  otherCosts: 3,
  suggestedPrice: 150,
  usualPrice: 180,
  materials: [
    { id: 'm1', materialId: 'fio', material: 'Fio', type: 'fio', unit: 'gramas', quantityUsed: 120, purchaseId: 'fio', unitCost: 0.05, totalCost: 6 },
    { id: 'm2', materialId: 'ench', material: 'Enchimento', type: 'enchimento', unit: 'gramas', quantityUsed: 40, purchaseId: 'ench', unitCost: 0.15, totalCost: 6 },
    { id: 'm3', materialId: 'olhos', material: 'Olhos', type: 'olhos', unit: 'unidades', quantityUsed: 2, purchaseId: 'olhos', unitCost: 1.4, totalCost: 2.8 }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
} as Product;

const order: Order = {
  id: 'pedido1',
  clientName: 'Maria',
  clientPhone: '',
  product: 'Leão Amigurumi',
  productId: 'leao',
  quantity: 1,
  deadline: new Date(2026, 10, 1),
  agreedPrice: 180,
  signalAmount: 90,
  remainingBalance: 90,
  status: 'Em produção',
  paymentStatus: 'sinal pago',
  needsMaterialPurchase: false,
  materialsPurchased: true,
  date: new Date(2026, 9, 1),
  createdAt: new Date(),
  updatedAt: new Date()
} as Order;

const range = periodRange('custom', new Date(2026, 10, 22), { start: new Date(2026, 8, 1), end: new Date(2026, 11, 30) });

// Situação A: sinal recebido, 1ª parcela do fio paga, demais compras e as agulhas pagas.
const situationA: Transaction[] = [
  tx({ id: 'sinal', type: 'receita', amount: 90, date: new Date(2026, 9, 1), paymentDate: new Date(2026, 9, 1), origin: 'pedido_sinal', originId: 'pedido1', category: 'Pedidos de clientes' }),
  tx({ id: 'saldo', type: 'receita', amount: 90, date: new Date(2026, 10, 1), origin: 'pedido_saldo', originId: 'pedido1', category: 'Pedidos de clientes' }),
  tx({ id: 'fio1', amount: 25, date: new Date(2026, 9, 1), paymentDate: new Date(2026, 9, 1), origin: 'compra', originId: 'fio', installmentNumber: 1, totalInstallments: 2, category: 'Materiais' }),
  tx({ id: 'fio2', amount: 25, date: new Date(2026, 10, 1), origin: 'compra', originId: 'fio', installmentNumber: 2, totalInstallments: 2, category: 'Materiais' }),
  tx({ id: 'ench', amount: 30, date: new Date(2026, 9, 1), paymentDate: new Date(2026, 9, 1), origin: 'compra', originId: 'ench', category: 'Materiais' }),
  tx({ id: 'olhos', amount: 8, date: new Date(2026, 9, 1), paymentDate: new Date(2026, 9, 1), origin: 'compra', originId: 'olhos', category: 'Materiais' }),
  tx({ id: 'agulhas', amount: 20, date: new Date(2026, 9, 1), paymentDate: new Date(2026, 9, 1), origin: 'manual', category: 'Ferramentas' })
];

describe('Cenário obrigatório (FINANCEIRO_PLAN.md secão 9)', () => {
  it('Situação A: sinal recebido, 1ª parcela do fio paga, demais pagas', () => {
    const cash = calculateCashFlow(situationA, settings, range);
    expect(cash.inflow).toBe(90);
    expect(cash.outflow).toBe(83); // 25 + 30 + 8 + 20
    expect(cash.balance).toBe(7);

    const receivable = forecastEntries(situationA, 'receita').reduce((s, f) => s + f.transaction.amount, 0);
    const payable = forecastEntries(situationA, 'despesa').reduce((s, f) => s + f.transaction.amount, 0);
    expect(receivable).toBe(90);
    expect(payable).toBe(25);
    expect(cash.balance + receivable - payable).toBe(72);
  });

  it('Situação B: 2ª parcela paga e saldo do pedido recebido', () => {
    const situationB = situationA.map(t =>
      t.id === 'saldo' ? { ...t, paymentDate: new Date(2026, 10, 5) } : t.id === 'fio2' ? { ...t, paymentDate: new Date(2026, 10, 1) } : t
    );
    const cash = calculateCashFlow(situationB, settings, range);
    expect(cash.inflow).toBe(180);
    expect(cash.outflow).toBe(108);
    expect(cash.balance).toBe(72);
    expect(forecastEntries(situationB, 'receita')).toHaveLength(0);
    expect(forecastEntries(situationB, 'despesa')).toHaveLength(0);
  });

  it('Resultado do período: pedido entregue', () => {
    const delivered = { ...order, status: 'Entregue', deliveryDate: new Date(2026, 9, 20) } as Order;
    const result = calculatePeriodResult(
      [delivered],
      [product],
      [purchaseFio, purchaseEnchimento, purchaseOlhos],
      situationA,
      settings,
      range
    );
    expect(result.revenue).toBe(180);
    expect(result.materialCost).toBeCloseTo(14.8, 6);
    expect(result.otherCosts).toBe(3);
    expect(result.laborCost).toBe(100); // 5h × R$20
    expect(result.grossProfit).toBeCloseTo(62.2, 6);
    expect(result.opEx).toBe(20); // agulhas (despesa manual)
    expect(result.profit).toBeCloseTo(42.2, 6);
    expect(result.margin).toBeCloseTo((42.2 / 180) * 100, 6);
    expect(result.deliveredCount).toBe(1);
  });
});
