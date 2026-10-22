import { describe, it, expect } from 'vitest';
import {
  groupMaterials,
  stockLevel,
  packageEquivalent,
  formatQuantity,
  formatUnitCost,
  buildShoppingList,
  materialKey
} from './materials';
import {
  phaseOf,
  nextStatus,
  orderReceived,
  orderPending,
  daysUntilDeadline,
  suggestDeadlineDays,
  missingMaterialsForOrder,
  ALL_STATUSES
} from './orders';
import { marginState, calculateMaterialLines, simulateProduct, marginFor } from './pricing';
import { calculateProductCost } from './index';
import type { Order, Product, Purchase, Settings } from '../types';

const lot = (o: Partial<Purchase>): Purchase =>
  ({
    id: 'x',
    date: new Date('2026-10-01'),
    material: 'Fio Caramelo',
    type: 'fio',
    unit: 'gramas',
    quantityPurchased: 500,
    quantityRemaining: 500,
    percentUsed: 0,
    totalPaid: 50,
    unitCost: 0.1,
    minStock: 100,
    status: 'disponível',
    paymentStatus: 'quitado',
    ...o
  }) as Purchase;

const settings = { hourlyRate: 15, desiredProfitMargin: 30, defaultSignalPercent: 50 } as Settings;

describe('Estoque por material', () => {
  it('agrupa compras com o mesmo nome (sem diferenciar acento e maiúscula)', () => {
    const groups = groupMaterials([
      lot({ id: '1', quantityRemaining: 200, date: new Date('2026-09-01') }),
      lot({ id: '2', material: 'fio caramelo', quantityRemaining: 150, unitCost: 0.12, date: new Date('2026-10-01') })
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].remaining).toBe(350);
    expect(groups[0].lastCost).toBe(0.12); // compra mais recente
    expect(groups[0].purchases[0].id).toBe('2');
  });

  it('usa a média ponderada das compras como custo do material', () => {
    const [g] = groupMaterials([
      lot({ id: '1', quantityPurchased: 400, unitCost: 0.115 }),
      lot({ id: '2', quantityPurchased: 500, unitCost: 0.117 })
    ]);
    expect(g.avgCost).toBeCloseTo((400 * 0.115 + 500 * 0.117) / 900, 6);
  });

  it('classifica estoque: abaixo, quase no mínimo e em dia', () => {
    expect(stockLevel(90, 100)).toBe('low');
    expect(stockLevel(110, 100)).toBe('near');
    expect(stockLevel(300, 100)).toBe('ok');
    expect(stockLevel(5, 0)).toBe('ok');
  });

  it('coloca o que precisa de atenção primeiro', () => {
    const groups = groupMaterials([
      lot({ id: '1', material: 'Botão', quantityRemaining: 500 }),
      lot({ id: '2', material: 'Olhos', quantityRemaining: 5, minStock: 20 })
    ]);
    expect(groups[0].name).toBe('Olhos');
  });

  it('normaliza a chave do material', () => {
    expect(materialKey('  Fio Círculo ')).toBe('fio circulo');
  });
});

describe('Embalagens (novelos)', () => {
  it('mostra a equivalência em embalagens a partir de meia embalagem', () => {
    expect(packageEquivalent(180, 'novelo', 100)).toBe('1,8 novelo');
    expect(packageEquivalent(200, 'novelo', 100)).toBe('2 novelos');
    expect(packageEquivalent(30, 'novelo', 100)).toBe('');
    expect(packageEquivalent(180, undefined, undefined)).toBe('');
  });

  it('formata a quantidade nas duas medidas', () => {
    expect(formatQuantity(180, 'gramas', 'novelo', 100)).toBe('1,8 novelo · 180 g');
    expect(formatQuantity(14, 'unidades')).toBe('14 un');
  });

  it('mostra custo unitário com 3 casas abaixo de R$ 1', () => {
    expect(formatUnitCost(0.119)).toBe('R$ 0,119');
    expect(formatUnitCost(18)).toMatch(/18,00/);
  });
});

describe('Lista de compras', () => {
  const product = {
    id: 'p1',
    materials: [{ id: 'm', material: 'Fio Caramelo', quantityUsed: 230, unit: 'gramas' }]
  } as unknown as Product;
  const order = (o: Partial<Order>): Order =>
    ({ id: 'o1', productId: 'p1', quantity: 2, status: 'Aguardando compra de materiais', ...o }) as Order;

  it('soma a demanda dos pedidos confirmados e arredonda em novelos', () => {
    const groups = groupMaterials([
      lot({ quantityRemaining: 180, minStock: 250, packageName: 'novelo', packageSize: 100, unitCost: 0.12 })
    ]);
    const [item] = buildShoppingList(groups, [product], [order({})]);
    expect(item.need).toBe(460);
    expect(item.reason).toBe('orders');
    // faltam: 250 (mínimo) - (180 - 460) = 530 g -> 6 novelos de 100 g
    expect(item.packages).toBe(6);
    expect(item.buyQuantity).toBe(600);
    expect(item.estimatedCost).toBeCloseTo(72, 6);
  });

  it('ignora pedidos que ainda não foram confirmados', () => {
    const groups = groupMaterials([lot({ quantityRemaining: 300, minStock: 250 })]);
    expect(buildShoppingList(groups, [product], [order({ status: 'Orçamento enviado' })])).toHaveLength(0);
  });

  it('sugere reposição do mínimo mesmo sem pedidos', () => {
    const groups = groupMaterials([lot({ quantityRemaining: 50, minStock: 100 })]);
    const [item] = buildShoppingList(groups, [], []);
    expect(item.reason).toBe('minimum');
    expect(item.buyQuantity).toBe(50);
  });
});

describe('Pedidos em fases', () => {
  it('agrupa as 11 etapas em 3 fases, separando concluídos e cancelados', () => {
    expect(phaseOf('Orçamento enviado')).toBe('orcamento');
    expect(phaseOf('Em produção')).toBe('producao');
    expect(phaseOf('Aguardando entrega')).toBe('entrega');
    expect(phaseOf('Entregue')).toBe('concluido');
    expect(phaseOf('Cancelado')).toBe('cancelado');
    expect(ALL_STATUSES).toHaveLength(11);
  });

  it('avança etapa por etapa até a entrega', () => {
    expect(nextStatus('Cliente escolhendo o produto')).toBe('Orçamento enviado');
    expect(nextStatus('Produção concluída')).toBe('Aguardando entrega');
    expect(nextStatus('Aguardando entrega')).toBe('Entregue');
    expect(nextStatus('Entregue')).toBeNull();
    expect(nextStatus('Cancelado')).toBeNull();
  });

  it('calcula recebido e saldo pelo status de pagamento', () => {
    const base = { agreedPrice: 200, signalAmount: 100, status: 'Em produção' as const };
    expect(orderReceived({ ...base, paymentStatus: 'pendente' })).toBe(0);
    expect(orderReceived({ ...base, paymentStatus: 'sinal pago' })).toBe(100);
    expect(orderPending({ ...base, paymentStatus: 'sinal pago' })).toBe(100);
    expect(orderPending({ ...base, paymentStatus: 'pago' })).toBe(0);
    expect(orderPending({ ...base, paymentStatus: 'sinal pago', status: 'Cancelado' })).toBe(0);
  });

  it('conta dias até o prazo ignorando a hora', () => {
    const today = new Date(2026, 9, 22, 15, 30);
    expect(daysUntilDeadline({ deadline: new Date(2026, 9, 24) }, today)).toBe(2);
    expect(daysUntilDeadline({ deadline: new Date(2026, 9, 20) }, today)).toBe(-2);
    expect(daysUntilDeadline({ deadline: new Date(2026, 9, 22, 8) }, today)).toBe(0);
  });

  it('sugere o prazo pelas horas de crochê', () => {
    expect(suggestDeadlineDays(6, 3, 5)).toBe(7);
    expect(suggestDeadlineDays(9, 3, 5)).toBe(8);
  });

  it('avisa quais materiais faltam para a encomenda', () => {
    const product = {
      materials: [
        { material: 'Fio Caramelo', quantityUsed: 230, unit: 'gramas' },
        { material: 'Olhos', quantityUsed: 2, unit: 'unidades' }
      ]
    } as unknown as Product;
    const miss = missingMaterialsForOrder(product, 2, [
      lot({ quantityRemaining: 180 }),
      lot({ id: 'o', material: 'Olhos', unit: 'unidades', quantityRemaining: 14 })
    ]);
    expect(miss).toHaveLength(1);
    expect(miss[0]).toMatchObject({ material: 'Fio Caramelo', needed: 460, available: 180 });
  });
});

describe('Precificação', () => {
  const purchases = [
    lot({ id: 'a', material: 'Fio', unitCost: 0.12, quantityPurchased: 500 }),
    lot({ id: 'b', material: 'Fibra', unitCost: 0.026, quantityPurchased: 1000 })
  ];
  const product = {
    id: 'p',
    usualPrice: 189.9,
    suggestedPrice: 0,
    estimatedTime: 6,
    otherCosts: 2.5,
    materials: [
      { id: '1', material: 'Fio', quantityUsed: 230, unit: 'gramas', purchaseId: undefined },
      { id: '2', material: 'Fibra', quantityUsed: 120, unit: 'gramas', purchaseId: 'b' }
    ]
  } as unknown as Product;

  it('detalha o custo de cada material com a mesma regra do cálculo total', () => {
    const lines = calculateMaterialLines(product, purchases);
    const total = calculateProductCost(product, settings, purchases);
    expect(lines.reduce((s, l) => s + l.cost, 0)).toBeCloseTo(total.materialCost, 6);
    expect(lines[0].unitCost).toBe(0.12);
    expect(lines[1].unitCost).toBe(0.026);
  });

  it('classifica prejuízo, margem abaixo da meta e margem saudável', () => {
    expect(marginState({ profit: -2, profitMargin: -2 }, 30)).toBe('loss');
    expect(marginState({ profit: 29, profitMargin: 24.2 }, 30)).toBe('low');
    expect(marginState({ profit: 62, profitMargin: 33.1 }, 30)).toBe('ok');
  });

  it('simula outro preço, horas e valor da hora', () => {
    const base = calculateProductCost(product, settings, purchases);
    const sim = simulateProduct(product, settings, purchases, { price: 250, hours: 8, hourlyRate: 20 });
    expect(sim.laborCost).toBe(160);
    expect(sim.profit).toBeCloseTo(250 - sim.totalCost, 6);
    expect(sim.totalCost).toBeGreaterThan(base.totalCost);
  });

  it('margem é lucro sobre o preço de venda (não é markup)', () => {
    expect(marginFor(100, 70)).toBeCloseTo(30, 6);
    expect(marginFor(0, 70)).toBe(0);
  });
});
