import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { deleteMaterial, relinkBrandedMaterials, renameMaterial, restoreMaterial } from './materialActions';
import type { Order, Product, Purchase } from '../types';

const lot = (id: string, material: string, remaining = 100): Purchase =>
  ({ id, createdAt: new Date(), updatedAt: new Date(), date: new Date(), material, type: 'fio', unit: 'gramas', quantityPurchased: 100, quantityRemaining: remaining, percentUsed: 0, totalPaid: 10, unitCost: 0.1, minStock: 0, status: 'disponível', paymentStatus: 'quitado' }) as Purchase;

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.purchases.clear(), db.orders.clear(), db.transactions.clear()]);
  await db.purchases.bulkPut([lot('a', 'Fio algodão', 60), lot('b', 'Fio de algodão', 200)]);
  await db.products.put({ id: 'p1', name: 'Leão', materials: [{ id: 'm', material: 'fio algodao', quantityUsed: 50, unit: 'gramas', purchaseId: 'a' }] } as unknown as Product);
  await db.orders.put({ id: 'o1', clientName: 'Maria', log: [{ id: 'l', date: new Date(), type: 'material', material: 'Fio algodão', quantity: 10 }] } as unknown as Order);
});

describe('renomear e juntar material', () => {
  it('renomeia nas compras, nas receitas e nas anotações dos pedidos', async () => {
    await renameMaterial('fio algodao', 'Fio de algodão');
    expect((await db.purchases.toArray()).map(p => p.material)).toEqual(['Fio de algodão', 'Fio de algodão']);
    expect((await db.products.get('p1'))?.materials[0].material).toBe('Fio de algodão');
    expect((await db.orders.get('o1'))?.log?.[0].material).toBe('Fio de algodão');
  });
});

describe('excluir material', () => {
  it('apaga as compras, solta as receitas e desfaz tudo', async () => {
    const deleted = await deleteMaterial('fio algodao');
    expect(await db.purchases.get('a')).toBeUndefined();
    expect(await db.purchases.get('b')).toBeDefined(); // outro material, outro nome
    expect((await db.products.get('p1'))?.materials[0].purchaseId).toBeUndefined();

    await restoreMaterial(deleted);
    expect((await db.purchases.get('a'))?.quantityRemaining).toBe(60);
    expect((await db.products.get('p1'))?.materials[0].purchaseId).toBe('a');
    expect(await db.transactions.where('originId').equals('a').count()).toBe(1);
  });
});

describe('receitas quando cada marca vira um material', () => {
  const branded = (id: string, day: number, brand?: string): Purchase => ({ ...lot(id, 'Barbante nº 4'), date: new Date(2026, 0, day), brand });
  const line = (material: string, purchaseId?: string) => ({ id: material, material, quantityUsed: 10, unit: 'gramas', purchaseId });
  const recipe = async () => (await db.products.get('p2'))!.materials.map(m => m.material);

  beforeEach(async () => {
    await db.purchases.bulkPut([branded('c', 1, 'Círculo'), branded('e', 2, 'EuroRoma')]);
  });

  it('nome sem marca passa para a marca comprada por último; linha ligada a uma compra segue a marca dela', async () => {
    await db.products.put({ id: 'p2', name: 'Tapete', materials: [line('Barbante nº 4'), line('barbante nº 4', 'c'), line('Barbante nº 4 · Círculo'), line('Enchimento')] } as unknown as Product);
    await db.orders.put({ id: 'o2', log: [{ id: 'l2', date: new Date(), type: 'material', material: 'Barbante nº 4', quantity: 5 }] } as unknown as Order);
    await relinkBrandedMaterials();
    expect(await recipe()).toEqual(['Barbante nº 4 · EuroRoma', 'Barbante nº 4 · Círculo', 'Barbante nº 4 · Círculo', 'Enchimento']);
    expect((await db.orders.get('o2'))!.log![0].material).toBe('Barbante nº 4 · EuroRoma');
    // o que não tem marca fica como está
    expect((await db.products.get('p1'))?.materials[0].material).toBe('fio algodao');
  });

  it('trocar a marca no "Renomear" leva as compras e as receitas juntas', async () => {
    await db.products.put({ id: 'p2', name: 'Tapete', materials: [line('Barbante nº 4 · Círculo')] } as unknown as Product);
    await renameMaterial('barbante nº 4 · circulo', 'Barbante nº 4', 'EuroRoma');
    expect((await db.purchases.get('c'))!.brand).toBe('EuroRoma');
    expect(await recipe()).toEqual(['Barbante nº 4 · EuroRoma']);
  });
});
