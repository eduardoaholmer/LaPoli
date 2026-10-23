import { describe, expect, it } from 'vitest';
import type { OrderLogEntry, Product, Purchase } from '../types';
import { groupMaterials } from './materials';
import { computeSettlement, logTotals, settlementLines } from './settlement';

const e = (over: Partial<OrderLogEntry>): OrderLogEntry => ({ id: Math.random().toString(), date: new Date(), type: 'nota', ...over });
const stock = groupMaterials([
  { id: 'a', date: new Date(), material: 'Fio rosa', unit: 'gramas', quantityPurchased: 500, quantityRemaining: 400, unitCost: 0.1, totalPaid: 50 } as Purchase,
  { id: 'b', date: new Date(), material: 'Laço', unit: 'unidades', quantityPurchased: 10, quantityRemaining: 10, unitCost: 1, totalPaid: 10 } as Purchase
]);
const leao = { id: 'p', materials: [{ id: 'm', material: 'Fio rosa', quantityUsed: 100, unit: 'gramas' }] } as unknown as Product;

describe('acerto do pedido', () => {
  it('soma horas, gastos e material anotado', () => {
    const t = logTotals([e({ type: 'horas', quantity: 2 }), e({ type: 'horas', quantity: 0.5 }), e({ type: 'gasto', amount: 4.5 }), e({ type: 'material', material: 'Fio Rosa', quantity: 20 }), e({ type: 'material', material: 'fio rosa', quantity: -5 })]);
    expect(t.hours).toBe(2.5);
    expect(t.extras).toBe(4.5);
    expect(t.materials.get('fio rosa')?.quantity).toBe(15);
  });

  it('material da peça: receita × peças ± anotações, e o que foi anotado fora da receita', () => {
    const lines = settlementLines(leao, 2, stock, [e({ type: 'material', material: 'fio rosa', quantity: -30 }), e({ type: 'material', material: 'Laço', quantity: 2 })]);
    expect(lines.map(l => [l.material, l.recipe, l.quantity, l.unitCost])).toEqual([
      ['Fio rosa', 200, 170, 0.1],
      ['Laço', 0, 2, 1]
    ]);
  });

  it('lucro de verdade e quanto rendeu cada hora', () => {
    const r = computeSettlement({ agreedPrice: 150 }, [{ quantity: 170, unitCost: 0.1 }], 4, 20, 10);
    expect(r).toMatchObject({ materialCost: 17, laborCost: 80, extraCosts: 10, totalCost: 107, profit: 43 });
    expect(r.perHour).toBeCloseTo(30.75);
  });
});
