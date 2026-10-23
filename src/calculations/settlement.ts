import type { Order, OrderLogEntry, Product } from '../types';
import { materialKey } from './materialName';
import { usageForOrder, type MaterialGroup, type UsageLine } from './materials';

/** O que as anotações do pedido somam: horas, gastos extras e material a mais/a menos que a receita. */
export const logTotals = (log: OrderLogEntry[] = []) => {
  const materials = new Map<string, { material: string; quantity: number }>();
  let hours = 0;
  let extras = 0;
  log.forEach(e => {
    if (e.type === 'horas') hours += e.quantity ?? 0;
    if (e.type === 'gasto') extras += e.amount ?? 0;
    if (e.type === 'material' && e.material?.trim()) {
      const key = materialKey(e.material);
      const cur = materials.get(key) ?? { material: e.material.trim(), quantity: 0 };
      materials.set(key, { ...cur, quantity: cur.quantity + (e.quantity ?? 0) });
    }
  });
  return { hours, extras, materials };
};

export interface SettlementLine extends UsageLine {
  recipe: number; // o que a receita previa (0 para material que não está na receita)
  unitCost: number; // custo médio por unidade
}

/** Material da peça pronta: receita × peças, mais o que foi anotado a mais ou a menos durante a produção. */
export const settlementLines = (product: Product | undefined, quantity: number, groups: MaterialGroup[], log: OrderLogEntry[] = []): SettlementLine[] => {
  const { materials } = logTotals(log);
  const lines: SettlementLine[] = usageForOrder(product, quantity, groups).map(l => ({
    ...l,
    recipe: l.quantity,
    quantity: Math.max(0, l.quantity + (materials.get(l.key)?.quantity ?? 0)),
    unitCost: groups.find(g => g.key === l.key)?.avgCost ?? 0
  }));
  // material anotado que não está na receita (ex.: troquei o enchimento, usei um laço)
  materials.forEach((m, key) => {
    if (lines.some(l => l.key === key) || m.quantity <= 0) return;
    const group = groups.find(g => g.key === key);
    lines.push({
      key,
      material: group?.name ?? m.material,
      unit: group?.unit ?? 'gramas',
      quantity: m.quantity,
      recipe: 0,
      available: group?.remaining ?? 0,
      inStock: !!group,
      unitMismatch: false,
      unitCost: group?.avgCost ?? 0
    });
  });
  return lines;
};

/** Lucro de verdade: preço combinado − material usado − horas × valor da hora − gastos extras. */
export const computeSettlement = (
  order: Pick<Order, 'agreedPrice'>,
  materials: { quantity: number; unitCost: number }[],
  hours: number,
  hourlyRate: number,
  extraCosts: number
) => {
  const materialCost = materials.reduce((s, m) => s + m.quantity * m.unitCost, 0);
  const laborCost = hours * hourlyRate;
  const totalCost = materialCost + laborCost + extraCosts;
  const profit = order.agreedPrice - totalCost;
  // quanto cada hora rendeu, sem descontar a própria mão de obra
  const perHour = hours > 0 ? (order.agreedPrice - materialCost - extraCosts) / hours : null;
  return { materialCost, laborCost, extraCosts, totalCost, profit, perHour };
};
