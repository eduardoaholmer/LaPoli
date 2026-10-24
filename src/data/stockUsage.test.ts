import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { orderService } from './services';
import { cancelOrder, changeOrderStatus, saveOrderEdit } from './orderActions';
import { consumeOrderMaterials, returnOrderMaterials } from './stockUsage';
import type { Order, Purchase } from '../types';

const lot = (id: string, day: number, remaining: number): Purchase =>
  ({
    id, date: new Date(2026, 0, day), material: 'Fio rosa', type: 'fio', unit: 'gramas', quantityPurchased: 100, quantityRemaining: remaining,
    percentUsed: 0, totalPaid: 10, unitCost: 0.1, minStock: 0, status: 'disponível', paymentStatus: 'quitado', createdAt: new Date(), updatedAt: new Date()
  }) as Purchase;

const order = (over: Partial<Order> = {}): Order =>
  ({
    id: 'o1', date: new Date(), clientName: 'Maria', clientPhone: '', product: 'Leão', productId: 'p1', quantity: 1, deadline: new Date(),
    agreedPrice: 100, signalAmount: 50, remainingBalance: 50, status: 'Em produção', paymentStatus: 'sinal pago',
    needsMaterialPurchase: false, materialsPurchased: false, createdAt: new Date(), updatedAt: new Date(), ...over
  }) as Order;

const remaining = async () => (await db.purchases.orderBy('date').toArray()).map(p => p.quantityRemaining);

beforeEach(async () => {
  await Promise.all([db.purchases.clear(), db.orders.clear(), db.transactions.clear()]);
  await db.purchases.bulkAdd([lot('velha', 1, 60), lot('nova', 2, 100)]);
});

describe('material de peça pronta', () => {
  it('desconta das compras mais antigas primeiro e avisa o que faltou', async () => {
    const used = await consumeOrderMaterials('o1', 'Maria', [{ key: 'fio rosa', quantity: 100 }]);
    expect(await remaining()).toEqual([0, 60]);
    expect(used).toEqual([{ material: 'Fio rosa', unit: 'gramas', used: 100, short: 0 }]);
    const nova = await db.purchases.get('nova');
    expect(nova?.movements?.[0]).toMatchObject({ type: 'uso', orderId: 'o1', quantity: 40, note: 'Pedido de Maria' });

    const more = await consumeOrderMaterials('o2', 'Ana', [{ key: 'fio rosa', quantity: 100 }]);
    expect(more[0]).toMatchObject({ used: 60, short: 40 });
  });

  it('devolver ao estoque desfaz só o que aquele pedido usou', async () => {
    await consumeOrderMaterials('o1', 'Maria', [{ key: 'fio rosa', quantity: 100 }]);
    await consumeOrderMaterials('o2', 'Ana', [{ key: 'fio rosa', quantity: 10 }]);
    expect(await returnOrderMaterials('o1')).toBe(100);
    expect(await remaining()).toEqual([60, 90]);
    const movs = (await db.purchases.toArray()).flatMap(p => p.movements ?? []);
    expect(movs.map(m => m.orderId)).toEqual(['o2']);
  });

  it('pedido que volta para antes de "peça pronta" devolve o material; cancelar não devolve', async () => {
    await consumeOrderMaterials('o1', 'Maria', [{ key: 'fio rosa', quantity: 100 }]);
    await db.orders.add(order({ status: 'Aguardando entrega', stockUsedAt: new Date() }));

    await cancelOrder((await orderService.getById('o1'))!);
    expect(await remaining()).toEqual([0, 60]);

    await changeOrderStatus((await orderService.getById('o1'))!, 'Em produção');
    expect(await remaining()).toEqual([60, 100]);
    const o = await orderService.getById('o1');
    expect(o?.stockUsedAt).toBeUndefined();
    expect(o?.history?.map(h => h.text)).toContain('Material devolvido ao estoque');
  });

  it('editar o pedido para uma etapa anterior também devolve', async () => {
    await consumeOrderMaterials('o1', 'Maria', [{ key: 'fio rosa', quantity: 30 }]);
    await db.orders.add(order({ status: 'Aguardando entrega', stockUsedAt: new Date() }));
    await saveOrderEdit((await orderService.getById('o1'))!, { status: 'Em produção' });
    expect(await remaining()).toEqual([60, 100]);
  });

  it('material com várias cores: desconta da cor escolhida', async () => {
    await db.purchases.bulkPut([
      { ...lot('velha', 1, 60), color: 'Rosa' },
      { ...lot('nova', 2, 100), color: 'Caramelo' }
    ]);
    const used = await consumeOrderMaterials('o1', 'Maria', [{ key: 'fio rosa', quantity: 30, colorKey: 'caramelo' }]);
    expect(await remaining()).toEqual([60, 70]);
    expect(used[0].material).toBe('Fio rosa (Caramelo)');
  });
});
