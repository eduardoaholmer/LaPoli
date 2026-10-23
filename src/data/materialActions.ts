import { materialKey } from '../calculations/materialName';
import type { Product, Purchase } from '../types';
import { db } from './db';
import { syncPurchaseTransactions } from './financeSync';
import { purchaseService } from './services';

/**
 * Renomeia um material em todo lugar: compras, receitas dos produtos e anotações dos pedidos. Se o novo
 * nome já é de outro material, os dois viram um só (juntar "Fio algodão" com "Fio de algodão").
 */
export const renameMaterial = async (fromKey: string, newName: string): Promise<void> => {
  const name = newName.trim();
  const lots = (await db.purchases.toArray()).filter(p => materialKey(p.material) === fromKey);
  // update (e não bulkPut) para o lançamento no Financeiro passar a dizer "Compra: <novo nome>"
  for (const lot of lots) await purchaseService.update(lot.id, { material: name });

  const products = (await db.products.toArray()).filter(p => p.materials.some(m => materialKey(m.material) === fromKey));
  for (const p of products) {
    await db.products.update(p.id, { materials: p.materials.map(m => (materialKey(m.material) === fromKey ? { ...m, material: name } : m)) });
  }

  const orders = (await db.orders.toArray()).filter(o => o.log?.some(e => e.material && materialKey(e.material) === fromKey));
  for (const o of orders) {
    await db.orders.update(o.id, { log: o.log!.map(e => (e.material && materialKey(e.material) === fromKey ? { ...e, material: name } : e)) });
  }
};

export interface DeletedMaterial {
  lots: Purchase[];
  products: Pick<Product, 'id' | 'materials'>[]; // receitas que apontavam para uma compra dele (para "Desfazer")
}

/**
 * Exclui o material e todas as compras dele, inclusive os lançamentos no Financeiro. Receitas que usavam
 * uma compra específica passam a usar o custo médio. Devolve o necessário para "Desfazer".
 */
export const deleteMaterial = async (key: string): Promise<DeletedMaterial> => {
  const lots = (await db.purchases.toArray()).filter(p => materialKey(p.material) === key);
  const ids = new Set(lots.map(l => l.id));
  const linked = (await db.products.toArray()).filter(p => p.materials.some(m => m.purchaseId && ids.has(m.purchaseId)));
  for (const p of linked) {
    await db.products.update(p.id, { materials: p.materials.map(m => (m.purchaseId && ids.has(m.purchaseId) ? { ...m, purchaseId: undefined } : m)) });
  }
  for (const lot of lots) await purchaseService.delete(lot.id);
  return { lots, products: linked.map(p => ({ id: p.id, materials: p.materials })) };
};

/** "Desfazer" da exclusão: as compras voltam com os mesmos ids (e os lançamentos são refeitos). */
export const restoreMaterial = async (deleted: DeletedMaterial): Promise<void> => {
  await db.purchases.bulkPut(deleted.lots);
  for (const lot of deleted.lots) await syncPurchaseTransactions(lot);
  for (const p of deleted.products) await db.products.update(p.id, { materials: p.materials });
};
