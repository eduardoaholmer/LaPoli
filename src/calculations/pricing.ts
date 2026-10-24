import type { Product, ProductCost, Purchase, Settings } from '../types';
import { calculateMaterialCost, calculateProductCost, calculateWeightedAverageCost } from './index';
import { purchaseIs } from './materialName';

export type MarginState = 'ok' | 'low' | 'loss';

/** Prejuízo, margem abaixo da meta ou saudável. A margem é lucro ÷ preço de venda (não é markup). */
export const marginState = (cost: Pick<ProductCost, 'profit' | 'profitMargin'>, goal: number): MarginState => {
  if (cost.profit < 0) return 'loss';
  if (cost.profitMargin < goal) return 'low';
  return 'ok';
};

export interface MaterialCostLine {
  id: string;
  material: string;
  unit: string;
  quantity: number;
  unitCost: number;
  cost: number;
  packageName?: string;
  packageSize?: number;
}

/**
 * Mesma regra de calculateProductCost, só que linha a linha, para mostrar de onde vem cada centavo:
 * compra vinculada usa o custo dela; sem compra vinculada, usa a média ponderada pelo nome.
 */
export const calculateMaterialLines = (product: Product, purchases: Purchase[]): MaterialCostLine[] =>
  product.materials.map(pm => {
    const linked = pm.purchaseId ? purchases.find(p => p.id === pm.purchaseId) : undefined;
    const sameName = purchases.filter(p => purchaseIs(p, pm.material));
    const unitCost = pm.purchaseId ? linked?.unitCost ?? 0 : calculateWeightedAverageCost(sameName);
    const pack = (linked && linked.packageSize ? linked : sameName.find(p => p.packageSize));
    return {
      id: pm.id,
      material: pm.material,
      unit: pm.unit,
      quantity: pm.quantityUsed,
      unitCost,
      cost: calculateMaterialCost(pm.quantityUsed, unitCost),
      packageName: pack?.packageName,
      packageSize: pack?.packageSize
    };
  });

/** Recalcula um produto com preço, horas e valor da hora diferentes (simulador). */
export const simulateProduct = (
  product: Product,
  settings: Settings,
  purchases: Purchase[],
  overrides: { price?: number; hours?: number; hourlyRate?: number }
): ProductCost => {
  const p: Product = {
    ...product,
    usualPrice: overrides.price ?? product.usualPrice,
    ...(overrides.hours !== undefined ? { actualTime: overrides.hours, estimatedTime: overrides.hours } : {})
  };
  const s: Settings = { ...settings, hourlyRate: overrides.hourlyRate ?? settings.hourlyRate };
  return calculateProductCost(p, s, purchases);
};

/** Margem de lucro (%) para um preço e um custo. */
export const marginFor = (price: number, totalCost: number): number =>
  price > 0 && isFinite(price) ? ((price - totalCost) / price) * 100 : 0;
