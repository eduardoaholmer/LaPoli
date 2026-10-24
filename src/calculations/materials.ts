import type { MaterialType, Order, Product, Purchase } from '../types';
import { calculateWeightedAverageCost } from './index';
import { distinctColors, isHexColor, type MaterialColor } from './colors';
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
  brands: BrandStock[]; // marcas diferentes entre as compras, com o que resta de cada (a mais recente primeiro)
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
  variants: ColorVariant[]; // uma por cor; com 2 ou mais, cada cor tem quantidade e mínimo próprios
}

/** A mesma linha numa cor: o que resta dela e o mínimo dela (o maior mínimo entre as compras dessa cor). */
export interface ColorVariant {
  key: string; // '' = compras sem cor informada
  name: string;
  hex?: string;
  purchases: Purchase[]; // do mais recente para o mais antigo
  remaining: number;
  minStock: number;
  level: StockLevel;
}

/** Cor da compra como chave: o nome digitado ("Rosa" = "rosa"), ou a cor da paleta quando não há nome. */
export const variantKeyOf = (p: Pick<Purchase, 'color' | 'colorHex'>): string =>
  materialKey(p.color ?? '') || (isHexColor(p.colorHex) ? p.colorHex.toLowerCase() : '');

const buildVariants = (sorted: Purchase[]): ColorVariant[] => {
  const map = new Map<string, Purchase[]>();
  sorted.forEach(p => map.set(variantKeyOf(p), [...(map.get(variantKeyOf(p)) || []), p]));
  return [...map.entries()]
    .map(([key, lots]) => {
      const remaining = lots.reduce((s, p) => s + (p.quantityRemaining || 0), 0);
      const minStock = lots.reduce((m, p) => Math.max(m, p.minStock || 0), 0);
      const named = lots.find(p => p.color?.trim());
      const hexed = lots.find(p => isHexColor(p.colorHex));
      return { key, name: named?.color?.trim() || (hexed ? 'Cor da paleta' : 'Sem cor informada'), hex: hexed?.colorHex, purchases: lots, remaining, minStock, level: stockLevel(remaining, minStock) };
    })
    .sort((a, b) => (a.key ? 0 : 1) - (b.key ? 0 : 1) || a.name.localeCompare(b.name, 'pt-BR'));
};

const LEVEL_RANK: Record<StockLevel, number> = { out: 0, low: 1, near: 2, ok: 3 };

/** Cores que precisam de reposição (só quando o material tem mais de uma cor). */
export const lowVariants = (g: Pick<MaterialGroup, 'variants'>): ColorVariant[] =>
  g.variants.length > 1 ? g.variants.filter(v => v.minStock > 0 && v.remaining < v.minStock) : [];


export interface BrandStock {
  name?: string; // undefined = compras sem marca informada
  remaining: number;
}

/**
 * O que resta de cada marca: "Barbante nº 4" da Círculo e da EuroRoma continuam sendo o mesmo material
 * (a receita e a lista de compras não mudam), mas dá para ver quanto tem de cada uma. Compras sem marca
 * só viram uma linha quando outra compra tem marca, para a soma bater com o total.
 */
export const brandBreakdown = (purchases: Pick<Purchase, 'brand' | 'quantityRemaining'>[]): BrandStock[] => {
  const map = new Map<string, BrandStock>();
  purchases.forEach(p => {
    const name = p.brand?.trim() || undefined;
    const key = name ? materialKey(name) : '';
    const cur = map.get(key) ?? { name, remaining: 0 };
    cur.remaining += p.quantityRemaining || 0;
    map.set(key, cur);
  });
  const list = [...map.values()];
  return list.some(b => b.name) ? list : [];
};

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
export const needsRestock = (g: Pick<MaterialGroup, 'remaining' | 'minStock'> & { variants?: ColorVariant[] }): boolean =>
  g.remaining < g.minStock || (!!g.variants && lowVariants({ variants: g.variants }).length > 0);

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
    const variants = buildVariants(sorted);
    const multi = variants.length > 1;
    // várias cores: o mínimo do material é a soma dos mínimos de cada cor, e a situação é a da pior cor
    const minStock = multi ? variants.reduce((s, v) => s + v.minStock, 0) : lots.reduce((m, p) => Math.max(m, p.minStock || 0), 0);
    const totalLevel = stockLevel(remaining, minStock);
    const worstColor = multi
      ? variants.filter(v => v.minStock > 0).map(v => (v.level === 'out' ? 'low' : v.level)).sort((x, y) => LEVEL_RANK[x] - LEVEL_RANK[y])[0]
      : undefined;
    const level = worstColor && LEVEL_RANK[worstColor] < LEVEL_RANK[totalLevel] ? worstColor : totalLevel;
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
      brands: brandBreakdown(sorted),
      purchases: sorted,
      bought: lots.reduce((s, p) => s + p.quantityPurchased, 0),
      remaining,
      minStock,
      avgCost: calculateWeightedAverageCost(lots),
      lastCost: latest.unitCost,
      stockValue: lots.reduce((s, p) => s + (p.quantityRemaining || 0) * p.unitCost, 0),
      totalPaid: lots.reduce((s, p) => s + p.totalPaid, 0),
      level,
      packageName: withPackage?.packageName,
      packageSize: withPackage?.packageSize,
      mixedUnits: new Set(lots.map(p => unitShort(p.unit))).size > 1,
      isExample: lots.every(p => p.isExample),
      variants
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
  variant?: ColorVariant; // a cor que está abaixo do mínimo (material com várias cores)
  need: number; // consumo previsto dos pedidos confirmados
  after: number; // estoque depois desses pedidos
  buyQuantity: number; // quanto comprar (arredondado em embalagens, quando houver)
  packages: number | null;
  estimatedCost: number;
  orderIds: string[];
  reason: 'orders' | 'minimum';
}

/** Pedidos confirmados cujo material ainda não saiu do estoque (sai quando a peça fica pronta). */
export const DEMAND_STATUSES = ['Sinal recebido', 'Aguardando compra de materiais', 'Materiais comprados', 'Em produção'];

export interface Reservation {
  quantity: number;
  orderIds: string[];
}

/**
 * Material reservado: o que os pedidos confirmados vão gastar e ainda não saiu do estoque (sai quando a
 * peça fica pronta). `exceptOrderId` deixa um pedido de fora, para ver o que sobra para ele.
 */
export const reservedByOrders = (products: Product[], orders: Order[], exceptOrderId?: string): Map<string, Reservation> => {
  const reserved = new Map<string, Reservation>();
  orders
    .filter(o => o.productId && o.id !== exceptOrderId && DEMAND_STATUSES.includes(o.status))
    .forEach(o => {
      const product = products.find(p => p.id === o.productId);
      product?.materials.forEach(pm => {
        if (!pm.material.trim() || !(pm.quantityUsed > 0)) return;
        const key = materialKey(pm.material);
        const cur = reserved.get(key) ?? { quantity: 0, orderIds: [] };
        reserved.set(key, { quantity: cur.quantity + pm.quantityUsed * o.quantity, orderIds: cur.orderIds.includes(o.id) ? cur.orderIds : [...cur.orderIds, o.id] });
      });
    });
  return reserved;
};

/** Quantas peças dá para fazer com o estoque livre (o que tem menos o reservado), e qual material limita. */
export const piecesPossible = (
  product: Product,
  groups: MaterialGroup[],
  reserved: Map<string, Reservation>
): { count: number; limiting?: string } | null => {
  let best: { count: number; limiting?: string } | null = null;
  product.materials.forEach(pm => {
    if (!pm.material.trim() || !(pm.quantityUsed > 0)) return;
    const key = materialKey(pm.material);
    const group = groups.find(g => g.key === key);
    const free = group ? group.remaining - (reserved.get(key)?.quantity ?? 0) : 0;
    const count = Math.max(0, Math.floor(free / pm.quantityUsed + 1e-9));
    if (!best || count < best.count) best = { count, limiting: group?.name ?? pm.material };
  });
  return best;
};

export const buildShoppingList = (groups: MaterialGroup[], products: Product[], orders: Order[]): ShoppingItem[] => {
  const reserved = reservedByOrders(products, orders);
  const need = new Map([...reserved].map(([k, r]) => [k, r.quantity]));
  const who = new Map([...reserved].map(([k, r]) => [k, r.orderIds]));

  const items: ShoppingItem[] = [];
  const push = (g: MaterialGroup, missing: number, n: number, after: number, variant?: ColorVariant) => {
    const size = g.packageSize && g.packageSize > 0 ? g.packageSize : null;
    const packages = size ? Math.ceil(missing / size) : null;
    const buyQuantity = size ? (packages as number) * size : Math.ceil(missing);
    items.push({ group: g, variant, need: n, after, buyQuantity, packages, estimatedCost: buyQuantity * g.lastCost, orderIds: who.get(g.key) || [], reason: n > 0 ? 'orders' : 'minimum' });
  };
  groups.forEach(g => {
    const n = need.get(g.key) || 0;
    const after = g.remaining - n;
    if (g.variants.length > 1) {
      // cada cor abaixo do mínimo dela entra na lista; os pedidos (que não dizem a cor) contam no total
      lowVariants(g).forEach(v => push(g, v.minStock - v.remaining, 0, v.remaining, v));
      if (n > 0 && after < g.minStock) push(g, g.minStock - after, n, after);
      return;
    }
    if (after >= g.minStock) return;
    push(g, g.minStock - after, n, after);
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

// ---------- Material usado numa peça pronta ----------

export interface UsageLine {
  key: string;
  material: string;
  unit: string;
  quantity: number; // receita × quantidade de peças
  available: number; // no estoque agora
  inStock: boolean; // existe compra deste material
  unitMismatch: boolean; // receita numa unidade, estoque em outra
}

/** O que a receita diz que sai do estoque para fazer `quantity` peças, somando linhas do mesmo material. */
export const usageForOrder = (product: Product | undefined, quantity: number, groups: MaterialGroup[]): UsageLine[] => {
  const lines = new Map<string, UsageLine>();
  product?.materials.forEach(pm => {
    if (!pm.material.trim() || !(pm.quantityUsed > 0)) return;
    const key = materialKey(pm.material);
    const group = groups.find(g => g.key === key);
    const line = lines.get(key) ?? {
      key,
      material: group?.name ?? pm.material,
      unit: group?.unit ?? pm.unit,
      quantity: 0,
      available: group?.remaining ?? 0,
      inStock: !!group,
      unitMismatch: !!group && unitShort(group.unit) !== unitShort(pm.unit)
    };
    line.quantity += pm.quantityUsed * quantity;
    lines.set(key, line);
  });
  return [...lines.values()];
};
