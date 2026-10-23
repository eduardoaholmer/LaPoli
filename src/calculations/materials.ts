import type { MaterialType, Order, Product, Purchase } from '../types';
import { calculateWeightedAverageCost } from './index';
import { distinctColors, type MaterialColor } from './colors';
import { materialKey } from './materialName';

export { materialKey };

/**
 * Visão por material: o estoque hoje é gravado por compra (lote). Aqui os lotes com o mesmo nome
 * são agrupados para mostrar "o que tenho de cada material", sem alterar o que está no banco.
 */

export type StockLevel = 'ok' | 'near' | 'low' | 'out';

export interface MaterialGroup {
  key: string;
  name: string;
  type: MaterialType;
  unit: string;
  color?: string;
  colorHex?: string;
  colors: MaterialColor[]; // cores diferentes entre as compras (a mais recente primeiro)
  purchases: Purchase[]; // do mais recente para o mais antigo
  bought: number;
  remaining: number;
  minStock: number;
  avgCost: number; // média ponderada pelas compras (a mesma da precificação)
  lastCost: number; // custo unitário da compra mais recente
  stockValue: number; // R$ parado em estoque
  totalPaid: number;
  level: StockLevel;
  packageName?: string;
  packageSize?: number;
  mixedUnits: boolean; // compras em unidades diferentes (g e m): o total não faz sentido
  isExample: boolean; // só compras dos dados de exemplo
}

/** Quanto acima do mínimo ainda conta como "quase no mínimo". */
export const NEAR_MIN_RATIO = 1.15;

export const stockLevel = (remaining: number, minStock: number): StockLevel => {
  if (remaining <= 0) return 'out';
  if (remaining < minStock) return 'low';
  if (minStock > 0 && remaining <= minStock * NEAR_MIN_RATIO) return 'near';
  return 'ok';
};

const UNIT_SHORT: Record<string, string> = {
  gramas: 'g',
  grama: 'g',
  metros: 'm',
  unidades: 'un',
  unidade: 'un',
  centímetros: 'cm'
};

/** Abaixo do mínimo: entra em "Para repor" e na lista de compras. Zerado sem mínimo não conta. */
export const needsRestock = (g: Pick<MaterialGroup, 'remaining' | 'minStock'>): boolean => g.remaining < g.minStock;

/** Mínimo sugerido para um material novo: uma embalagem, ou um valor que faz sentido para a unidade. */
export const defaultMinStock = (unit: string, packageSize?: number): number => {
  if (packageSize && packageSize > 0) return packageSize;
  return ({ g: 100, m: 10, un: 4 } as Record<string, number>)[unitShort(unit)] ?? 0;
};

/** "gramas" → "g". Unidades que o usuário criou ficam como estão. */
export const unitShort = (unit: string): string => UNIT_SHORT[unit.toLowerCase()] ?? unit;

export const groupMaterials = (purchases: Purchase[]): MaterialGroup[] => {
  const map = new Map<string, Purchase[]>();
  purchases.forEach(p => {
    const key = materialKey(p.material);
    map.set(key, [...(map.get(key) || []), p]);
  });

  const groups: MaterialGroup[] = [];
  map.forEach((lots, key) => {
    const sorted = [...lots].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = sorted[0];
    const remaining = lots.reduce((s, p) => s + (p.quantityRemaining || 0), 0);
    const minStock = lots.reduce((m, p) => Math.max(m, p.minStock || 0), 0);
    const coloured = sorted.find(p => p.color?.trim() || p.colorHex);
    const withPackage = sorted.find(p => p.packageSize && p.packageSize > 0);
    groups.push({
      key,
      name: latest.material,
      type: latest.type,
      unit: latest.unit,
      color: coloured?.color,
      colorHex: coloured?.colorHex,
      colors: distinctColors(sorted),
      purchases: sorted,
      bought: lots.reduce((s, p) => s + p.quantityPurchased, 0),
      remaining,
      minStock,
      avgCost: calculateWeightedAverageCost(lots),
      lastCost: latest.unitCost,
      stockValue: lots.reduce((s, p) => s + (p.quantityRemaining || 0) * p.unitCost, 0),
      totalPaid: lots.reduce((s, p) => s + p.totalPaid, 0),
      level: stockLevel(remaining, minStock),
      packageName: withPackage?.packageName,
      packageSize: withPackage?.packageSize,
      mixedUnits: new Set(lots.map(p => unitShort(p.unit))).size > 1,
      isExample: lots.every(p => p.isExample)
    });
  });

  // o que precisa de atenção primeiro; o que acabou e não tem mínimo (material avulso) vai para o fim
  const rank = (g: MaterialGroup) => (needsRestock(g) ? 0 : g.level === 'near' ? 1 : g.level === 'ok' ? 2 : 3);
  return groups.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR'));
};

// ---------- Embalagens (novelo, rolo, pacote) ----------

export const pluralize = (name: string, n: number): string => (Math.abs(n) < 2 ? name : `${name}s`);

/** Só vale a pena mostrar a equivalência a partir de meia embalagem. */
export const packageEquivalent = (quantity: number, packageName?: string, packageSize?: number): string => {
  if (!packageName || !packageSize || packageSize <= 0) return '';
  const n = quantity / packageSize;
  if (Math.abs(n) < 0.5) return '';
  const rounded = Math.abs(n - Math.round(n)) < 0.05 ? Math.round(n) : Math.round(n * 10) / 10;
  return `${rounded.toLocaleString('pt-BR')} ${pluralize(packageName, rounded)}`;
};

/** "180 g" ou, com embalagem, "1,8 novelo · 180 g". */
export const formatQuantity = (quantity: number, unit: string, packageName?: string, packageSize?: number): string => {
  const base = `${quantity.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unitShort(unit)}`;
  const eq = packageEquivalent(quantity, packageName, packageSize);
  return eq ? `${eq} · ${base}` : base;
};

/** Custo unitário com 3 casas abaixo de R$ 1 (R$ 0,119/g), para a conta fechar à vista. */
export const formatUnitCost = (value: number): string => {
  if (value >= 1) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  return `R$ ${value.toFixed(3).replace('.', ',')}`;
};

// ---------- Lista de compras ----------

export interface ShoppingItem {
  group: MaterialGroup;
  need: number; // consumo previsto dos pedidos confirmados
  after: number; // estoque depois desses pedidos
  buyQuantity: number; // quanto comprar (arredondado em embalagens, quando houver)
  packages: number | null;
  estimatedCost: number;
  orderIds: string[];
  reason: 'orders' | 'minimum';
}

/** Pedidos confirmados que ainda vão precisar de material. */
export const DEMAND_STATUSES = ['Sinal recebido', 'Aguardando compra de materiais'];

export const buildShoppingList = (groups: MaterialGroup[], products: Product[], orders: Order[]): ShoppingItem[] => {
  const need = new Map<string, number>();
  const who = new Map<string, string[]>();
  orders
    .filter(o => o.productId && DEMAND_STATUSES.includes(o.status))
    .forEach(o => {
      const product = products.find(p => p.id === o.productId);
      product?.materials.forEach(pm => {
        const key = materialKey(pm.material);
        need.set(key, (need.get(key) || 0) + pm.quantityUsed * o.quantity);
        who.set(key, [...(who.get(key) || []), o.id]);
      });
    });

  const items: ShoppingItem[] = [];
  groups.forEach(g => {
    const n = need.get(g.key) || 0;
    const after = g.remaining - n;
    if (after >= g.minStock) return;
    const missing = g.minStock - after;
    const size = g.packageSize && g.packageSize > 0 ? g.packageSize : null;
    const packages = size ? Math.ceil(missing / size) : null;
    const buyQuantity = size ? (packages as number) * size : Math.ceil(missing);
    items.push({
      group: g,
      need: n,
      after,
      buyQuantity,
      packages,
      estimatedCost: buyQuantity * g.lastCost,
      orderIds: who.get(g.key) || [],
      reason: n > 0 ? 'orders' : 'minimum'
    });
  });
  return items;
};

// ---------- Perdas e ajustes ----------

export interface LotMovement {
  lot: Purchase;
  quantity: number;
}

/**
 * Divide uma perda/ajuste entre as compras que ainda têm saldo, da mais antiga para a mais nova
 * (o novelo mais antigo é usado primeiro). Se a quantidade passa do estoque, tira só o que existe.
 */
export const planMovement = (group: Pick<MaterialGroup, 'purchases'>, quantity: number): LotMovement[] => {
  const plan: LotMovement[] = [];
  let left = quantity;
  [...group.purchases].reverse().forEach(lot => {
    if (left <= 0 || lot.quantityRemaining <= 0) return;
    const take = Math.min(left, lot.quantityRemaining);
    plan.push({ lot, quantity: take });
    left -= take;
  });
  return plan;
};

/**
 * "Contei e tenho X": a diferença para o que o app mostra. Para baixo, sai das compras como uma perda;
 * para cima (sobra achada), entra na compra mais recente como ajuste negativo, sem virar compra nova.
 */
export const planCount = (group: Pick<MaterialGroup, 'purchases' | 'remaining'>, counted: number): LotMovement[] => {
  const diff = counted - group.remaining;
  if (diff < 0) return planMovement(group, -diff);
  if (diff > 0 && group.purchases.length) return [{ lot: group.purchases[0], quantity: -diff }];
  return [];
};
