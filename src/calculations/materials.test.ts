import { describe, expect, it } from 'vitest';
import type { Order, Product, Purchase, Settings } from '../types';
import { brandedMaterialFor, buildShoppingList, defaultMinStock, groupMaterials, lowVariants, needsRestock, piecesPossible, planCount, planMovement, reservedByOrders, stockLevel, usageForOrder } from './materials';
import { findSimilarMaterial, fullMaterialName, materialKey, sameMaterial } from './materialName';
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
    expect(missingMaterialsForOrder(p, 1, purchases)).toEqual([{ material: 'fio de algodao', unit: 'gramas', needed: 100, available: 50, reserved: 0 }]);
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
  it('acabou, abaixo do mínimo, perto do mínimo e em dia', () => {
    expect(stockLevel(0, 10)).toBe('out');
    expect(stockLevel(5, 10)).toBe('low');
    expect(stockLevel(11, 10)).toBe('near');
    expect(stockLevel(50, 10)).toBe('ok');
  });

  it('zerado sem estoque mínimo aparece como "acabou", não como "em dia"', () => {
    expect(stockLevel(0, 0)).toBe('out');
  });
});

describe('needsRestock ("Para repor")', () => {
  it('conta só o que está abaixo do mínimo', () => {
    expect(needsRestock({ remaining: 5, minStock: 10 })).toBe(true);
    expect(needsRestock({ remaining: 0, minStock: 10 })).toBe(true);
    expect(needsRestock({ remaining: 11, minStock: 10 })).toBe(false); // quase no mínimo não conta
    expect(needsRestock({ remaining: 0, minStock: 0 })).toBe(false); // material avulso que acabou
  });

  it('material avulso que acabou vai para o fim da lista', () => {
    const groups = groupMaterials([
      lot({ material: 'Avulso', quantityRemaining: 0, minStock: 0 }),
      lot({ material: 'Bom', quantityRemaining: 500, minStock: 10 }),
      lot({ material: 'Repor', quantityRemaining: 0, minStock: 10 })
    ]);
    expect(groups.map(g => g.name)).toEqual(['Repor', 'Bom', 'Avulso']);
  });
});

describe('groupMaterials: avisos', () => {
  it('marca compras em unidades diferentes', () => {
    expect(groupMaterials([lot({ unit: 'gramas' }), lot({ unit: 'metros' })])[0].mixedUnits).toBe(true);
    expect(groupMaterials([lot({ unit: 'gramas' }), lot({ unit: 'grama' })])[0].mixedUnits).toBe(false);
  });

  it('marca como exemplo só quando todas as compras são de exemplo', () => {
    expect(groupMaterials([lot({ isExample: true })])[0].isExample).toBe(true);
    expect(groupMaterials([lot({ isExample: true }), lot()])[0].isExample).toBe(false);
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

describe('planMovement', () => {
  it('cabendo numa compra, tira da mais antiga que tem saldo', () => {
    const [g] = groupMaterials([lot({ id: 'velha', quantityRemaining: 100 }), lot({ id: 'nova', quantityRemaining: 100 })]);
    expect(planMovement(g, 50).map(m => [m.lot.id, m.quantity])).toEqual([['velha', 50]]);
  });

  it('divide entre as compras quando uma só não basta', () => {
    const [g] = groupMaterials([lot({ id: 'velha', quantityRemaining: 100 }), lot({ id: 'vazia', quantityRemaining: 0 }), lot({ id: 'nova', quantityRemaining: 300 })]);
    expect(planMovement(g, 250).map(m => [m.lot.id, m.quantity])).toEqual([['velha', 100], ['nova', 150]]);
  });

  it('passando do estoque, tira só o que existe', () => {
    const [g] = groupMaterials([lot({ quantityRemaining: 100 }), lot({ quantityRemaining: 40 })]);
    const plan = planMovement(g, 250);
    expect(plan.reduce((s, m) => s + m.quantity, 0)).toBe(140);
  });
});

describe('defaultMinStock', () => {
  it('uma embalagem quando há novelo; senão um valor por unidade', () => {
    expect(defaultMinStock('gramas', 100)).toBe(100);
    expect(defaultMinStock('gramas')).toBe(100);
    expect(defaultMinStock('metros')).toBe(10);
    expect(defaultMinStock('unidades')).toBe(4);
    expect(defaultMinStock('centímetros')).toBe(0);
  });
});

describe('findSimilarMaterial', () => {
  const existing = ['Fio de algodão', 'Enchimento', 'Olho de segurança 12 mm'];
  it('acha o mesmo material escrito de outro jeito', () => {
    expect(findSimilarMaterial('Fio algodão', existing)).toBe('Fio de algodão');
    expect(findSimilarMaterial('algodao fio', existing)).toBe('Fio de algodão');
    expect(findSimilarMaterial('Enchimeto', existing)).toBe('Enchimento');
  });

  it('não sugere quando o nome já existe, é curto demais ou muda o número', () => {
    expect(findSimilarMaterial('fio de ALGODÃO', existing)).toBeUndefined();
    expect(findSimilarMaterial('Fio', existing)).toBeUndefined();
    expect(findSimilarMaterial('Olho de segurança 10 mm', existing)).toBeUndefined();
    expect(findSimilarMaterial('Linha de seda', existing)).toBeUndefined();
  });
});

describe('planCount ("quanto você tem agora?")', () => {
  it('contagem menor tira das compras, da mais antiga para a mais nova', () => {
    const [g] = groupMaterials([lot({ id: 'velha', quantityRemaining: 100 }), lot({ id: 'nova', quantityRemaining: 100 })]);
    expect(planCount(g, 50).map(m => [m.lot.id, m.quantity])).toEqual([['velha', 100], ['nova', 50]]);
  });

  it('contagem maior soma na compra mais recente', () => {
    const [g] = groupMaterials([lot({ id: 'velha', quantityRemaining: 100 }), lot({ id: 'nova', quantityRemaining: 100 })]);
    expect(planCount(g, 260).map(m => [m.lot.id, m.quantity])).toEqual([['nova', -60]]);
  });

  it('contagem igual não muda nada', () => {
    const [g] = groupMaterials([lot({ quantityRemaining: 100 })]);
    expect(planCount(g, 100)).toEqual([]);
  });
});

describe('usageForOrder (material de uma peça pronta)', () => {
  it('receita × quantidade, somando linhas do mesmo material, com o que há no estoque', () => {
    const groups = groupMaterials([lot({ material: 'Fio rosa', quantityRemaining: 400 }), lot({ material: 'Enchimento', quantityRemaining: 50 })]);
    const p = product([
      { id: 'a', material: 'Fio Rosa', quantityUsed: 100, unit: 'gramas' },
      { id: 'b', material: 'fio rosa', quantityUsed: 20, unit: 'gramas' },
      { id: 'c', material: 'Enchimento', quantityUsed: 40, unit: 'gramas' },
      { id: 'd', material: 'Olhos 12 mm', quantityUsed: 2, unit: 'unidades' },
      { id: 'e', material: '', quantityUsed: 5, unit: 'gramas' }
    ] as Product['materials']);
    const lines = usageForOrder(p, 2, groups);
    expect(lines.map(l => [l.material, l.quantity, l.available, l.inStock])).toEqual([
      ['Fio rosa', 240, 400, true],
      ['Enchimento', 80, 50, true],
      ['Olhos 12 mm', 4, 0, false]
    ]);
  });

  it('marca receita em outra unidade que o estoque', () => {
    const groups = groupMaterials([lot({ material: 'Fita', unit: 'metros' })]);
    const p = product([{ id: 'a', material: 'Fita', quantityUsed: 10, unit: 'centímetros' }] as Product['materials']);
    expect(usageForOrder(p, 1, groups)[0].unitMismatch).toBe(true);
  });
});

describe('reserva de material para pedidos confirmados', () => {
  const leao = product([{ id: 'a', material: 'Fio rosa', quantityUsed: 100, unit: 'gramas' }] as Product['materials']);
  const pedido = (id: string, status: Order['status'], quantity = 1) => ({ id, productId: 'leao', quantity, status }) as Order;
  const groups = groupMaterials([lot({ material: 'Fio rosa', quantityRemaining: 350 })]);

  it('reserva o que pedidos confirmados vão usar até a peça ficar pronta', () => {
    const r = reservedByOrders([leao], [pedido('o1', 'Sinal recebido'), pedido('o2', 'Em produção', 2), pedido('o3', 'Orçamento enviado'), pedido('o4', 'Aguardando entrega')]);
    expect(r.get('fio rosa')).toEqual({ quantity: 300, orderIds: ['o1', 'o2'] });
    expect(reservedByOrders([leao], [pedido('o1', 'Sinal recebido')], 'o1').size).toBe(0);
  });

  it('"dá para fazer" conta só o material livre', () => {
    expect(piecesPossible(leao, groups, new Map())).toEqual({ count: 3, limiting: 'Fio rosa' });
    const r = reservedByOrders([leao], [pedido('o1', 'Sinal recebido', 2)]);
    expect(piecesPossible(leao, groups, r)?.count).toBe(1);
  });

  it('dois pedidos não "têm" o mesmo novelo', () => {
    const purchases = [lot({ material: 'Fio rosa', quantityRemaining: 150 })];
    const r = reservedByOrders([leao], [pedido('o1', 'Sinal recebido')]);
    expect(missingMaterialsForOrder(leao, 1, purchases, r)).toEqual([{ material: 'Fio rosa', unit: 'gramas', needed: 100, available: 50, reserved: 100 }]);
    expect(missingMaterialsForOrder(leao, 1, purchases)).toEqual([]);
  });
});

describe('cores do mesmo material', () => {
  const rosa = (over: Partial<Purchase> = {}) => lot({ material: 'Fio Círculo', color: 'Rosa', quantityRemaining: 40, minStock: 100, ...over });
  const caramelo = (over: Partial<Purchase> = {}) => lot({ material: 'Fio Círculo', color: 'caramelo', quantityRemaining: 500, minStock: 100, ...over });

  it('separa quanto tem de cada cor, com o mínimo de cada uma', () => {
    const [g] = groupMaterials([rosa(), caramelo(), lot({ material: 'fio circulo', color: 'rosa ', quantityRemaining: 10, minStock: 50 })]);
    expect(g.remaining).toBe(550);
    expect(g.variants.map(v => [v.name, v.remaining, v.minStock])).toEqual([['caramelo', 500, 100], ['rosa', 50, 100]]); // nome da compra mais recente da cor
    expect(g.minStock).toBe(200); // soma dos mínimos das cores
    expect(g.level).toBe('low'); // o total está bem, mas o rosa não
    expect(needsRestock(g)).toBe(true);
    expect(lowVariants(g).map(v => v.name)).toEqual(['rosa']);
  });

  it('a lista de compras pede a cor que está abaixo do mínimo', () => {
    const groups = groupMaterials([rosa(), caramelo()]);
    const items = buildShoppingList(groups, [], []);
    expect(items).toHaveLength(1);
    expect(items[0].variant?.name).toBe('Rosa');
    expect(items[0].buyQuantity).toBe(60);
  });

  it('com uma cor só, nada muda', () => {
    const [g] = groupMaterials([rosa({ quantityRemaining: 400 })]);
    expect(g.variants).toHaveLength(1);
    expect(g.minStock).toBe(100);
    expect(g.level).toBe('ok');
  });
});

describe('marcas', () => {
  const barbante = (brand: string | undefined, over: Partial<Purchase> = {}) => lot({ material: 'Barbante nº 4', brand, ...over });

  it('cada marca é um material, com estoque e custo próprios', () => {
    const groups = groupMaterials([
      barbante('Círculo', { quantityRemaining: 300, unitCost: 0.05 }),
      barbante('EuroRoma', { quantityRemaining: 200, unitCost: 0.04 }),
      barbante('circulo ', { material: 'barbante nº 4', quantityRemaining: 50, unitCost: 0.05 })
    ]);
    expect(groups.map(g => [g.name, g.remaining]).sort()).toEqual([['Barbante nº 4 · EuroRoma', 200], ['barbante nº 4 · circulo', 350]]);
    const circulo = groups.find(g => g.brand === 'circulo')!;
    expect(circulo.baseName).toBe('barbante nº 4');
    expect(circulo.avgCost).toBeCloseTo(0.05);
  });

  it('sem marca continua com o nome de sempre, e a marca que já está no nome não repete', () => {
    expect(fullMaterialName('Barbante nº 4')).toBe('Barbante nº 4');
    expect(fullMaterialName(' Barbante nº 4 ', ' Círculo ')).toBe('Barbante nº 4 · Círculo');
    expect(fullMaterialName('Fio Amigurumi Círculo', 'circulo')).toBe('Fio Amigurumi Círculo');
    expect(fullMaterialName('Fio Circular', 'Círculo')).toBe('Fio Circular · Círculo');
    expect(groupMaterials([lot()])[0].key).toBe('fio de algodao');
  });

  it('a receita usa só a marca dela no custo e na checagem do pedido', () => {
    const purchases = [barbante('Círculo', { unitCost: 0.05, quantityRemaining: 100 }), barbante('EuroRoma', { unitCost: 0.02, quantityRemaining: 900 })];
    const p = product([{ id: 'm1', material: 'Barbante nº 4 · Círculo', quantityUsed: 200, unit: 'gramas' } as Product['materials'][number]]);
    expect(calculateProductCost(p, { hourlyRate: 0 } as Settings, purchases).materialCost).toBeCloseTo(10);
    expect(missingMaterialsForOrder(p, 1, purchases)).toEqual([{ material: 'Barbante nº 4 · Círculo', unit: 'gramas', needed: 200, available: 100, reserved: 0 }]);
  });

  it('receita antiga sem a marca aponta para a marca comprada por último', () => {
    const groups = groupMaterials([barbante('Círculo', { date: new Date(2026, 0, 1) }), barbante('EuroRoma', { date: new Date(2026, 5, 1) })]);
    expect(brandedMaterialFor('barbante nº 4', groups)?.name).toBe('Barbante nº 4 · EuroRoma');
    expect(brandedMaterialFor('Barbante nº 4 · Círculo', groups)).toBeUndefined(); // já existe
    expect(brandedMaterialFor('Barbante nº 6', groups)).toBeUndefined();
    // ainda há compra sem marca: a receita continua nela
    expect(brandedMaterialFor('Barbante nº 4', groupMaterials([barbante('Círculo'), barbante(undefined)]))).toBeUndefined();
  });
});
