import { describe, expect, it } from 'vitest';
import type { Order, Product, Purchase, Settings } from '../types';
import { buildShoppingList, groupMaterials, pickLotForMovement, stockLevel } from './materials';
import { materialKey, sameMaterial } from './materialName';
import { calculateProductCost } from './index';
import { missingMaterialsForOrder } from './orders';

let seq = 0;
const lot = (patch: Partial<Purchase> = {}): Purchase => {
  seq += 1;
  return {
    id: `p${seq}`,
    date: new Date(2026, 0, seq),
    material: 'Fio de algodão',
    type: 'fio',
    unit: 'gramas',
    quantityPurchased: 100,
    quantityRemaining: 100,
    percentUsed: 0,
    totalPaid: 10,
    unitCost: 0.1,
    minStock: 0,
    status: 'disponível',
    paymentStatus: 'quitado',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...patch
  };
};

const product = (materials: Product['materials']): Product =>
  ({ id: 'leao', name: 'Leão', materials, usualPrice: 100, suggestedPrice: 100, otherCosts: 0, estimatedTime: 0 }) as unknown as Product;

describe('nomes de material', () => {
  it('ignora maiúsculas, acentos e espaços nas pontas', () => {
    expect(materialKey('  Fio de Algodão ')).toBe('fio de algodao');
    expect(sameMaterial('Olho de Segurança', 'olho de seguranca')).toBe(true);
    expect(sameMaterial('Fio de algodão', 'Fio algodão')).toBe(false);
  });

  it('custo do produto, estoque e checagem do pedido acham o mesmo material', () => {
    const purchases = [lot({ material: 'Fio de Algodão', unitCost: 0.2, quantityRemaining: 50 })];
    const p = product([{ id: 'm1', material: 'fio de algodao', quantityUsed: 100, unit: 'gramas' } as Product['materials'][number]]);
    const settings = { hourlyRate: 0 } as Settings;
    expect(calculateProductCost(p, settings, purchases).materialCost).toBeCloseTo(20);
    expect(groupMaterials(purchases)[0].key).toBe('fio de algodao');
    expect(missingMaterialsForOrder(p, 1, purchases)).toEqual([{ material: 'fio de algodao', unit: 'gramas', needed: 100, available: 50 }]);
  });
});

describe('groupMaterials', () => {
  it('junta as compras do mesmo material e soma o que resta', () => {
    const groups = groupMaterials([
      lot({ material: 'Fio de algodão', quantityRemaining: 30, minStock: 50 }),
      lot({ material: 'fio de algodao', quantityRemaining: 100, minStock: 80 }),
      lot({ material: 'Enchimento', quantityRemaining: 200, unit: 'gramas' })
    ]);
    expect(groups).toHaveLength(2);
    const fio = groups.find(g => g.key === 'fio de algodao')!;
    expect(fio.remaining).toBe(130);
    expect(fio.minStock).toBe(80); // o maior mínimo entre as compras
    expect(fio.name).toBe('fio de algodao'); // nome da compra mais recente
    expect(fio.purchases.map(p => p.material)).toEqual(['fio de algodao', 'Fio de algodão']);
  });

  it('mostra primeiro o que precisa de atenção', () => {
    const groups = groupMaterials([
      lot({ material: 'A', quantityRemaining: 500, minStock: 10 }),
      lot({ material: 'B', quantityRemaining: 5, minStock: 10 })
    ]);
    expect(groups.map(g => g.name)).toEqual(['B', 'A']);
  });
});

describe('stockLevel', () => {
  it('abaixo do mínimo, perto do mínimo e em dia', () => {
    expect(stockLevel(5, 10)).toBe('low');
    expect(stockLevel(11, 10)).toBe('near');
    expect(stockLevel(50, 10)).toBe('ok');
  });
});

describe('buildShoppingList', () => {
  it('arredonda a compra em novelos inteiros', () => {
    const groups = groupMaterials([lot({ quantityRemaining: 40, minStock: 150, packageName: 'novelo', packageSize: 100 })]);
    const [item] = buildShoppingList(groups, [], []);
    expect(item.packages).toBe(2);
    expect(item.buyQuantity).toBe(200);
    expect(item.reason).toBe('minimum');
  });

  it('conta o material dos pedidos com sinal recebido', () => {
    const groups = groupMaterials([lot({ quantityRemaining: 100 })]);
    const p = product([{ id: 'm1', material: 'Fio de algodão', quantityUsed: 80, unit: 'gramas' } as Product['materials'][number]]);
    const orders = [{ id: 'o1', productId: 'leao', quantity: 2, status: 'Sinal recebido' } as Order];
    const [item] = buildShoppingList(groups, [p], orders);
    expect(item.need).toBe(160);
    expect(item.reason).toBe('orders');
    expect(item.orderIds).toEqual(['o1']);
  });
});

describe('pickLotForMovement', () => {
  it('usa uma compra que tenha saldo suficiente', () => {
    const [g] = groupMaterials([lot({ quantityRemaining: 20 }), lot({ quantityRemaining: 100 })]);
    expect(pickLotForMovement(g, 50)?.quantityRemaining).toBe(100);
  });
});
