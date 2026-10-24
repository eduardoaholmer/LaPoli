import { fullMaterialName, materialKey, purchaseName } from '../calculations/materialName';
import { brandedMaterialFor, groupMaterials } from '../calculations/materials';
import type { Product, Purchase } from '../types';
import { db } from './db';
import { syncPurchaseTransactions } from './financeSync';
import { purchaseService } from './services';

/**
 * Renomeia um material (nome e marca) em todo lugar: compras, receitas dos produtos e anotações dos pedidos.
 * Se o novo nome já é de outro material, os dois viram um só (juntar "Fio algodão" com "Fio de algodão").
 */
export const renameMaterial = async (fromKey: string, newName: string, newBrand?: string): Promise<void> => {
  const brand = newBrand?.trim() ?? '';
  const name = fullMaterialName(newName, brand); // o que receitas e anotações guardam
  const lots = (await db.purchases.toArray()).filter(p => materialKey(purchaseName(p)) === fromKey);
  // update (e não bulkPut) para o lançamento no Financeiro passar a dizer "Compra: <novo nome>"
  for (const lot of lots) await purchaseService.update(lot.id, { material: newName.trim(), brand });

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
  const lots = (await db.purchases.toArray()).filter(p => materialKey(purchaseName(p)) === key);
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

/**
 * Receitas e anotações dos pedidos que ainda dizem "Barbante nº 4" quando as compras agora têm marca
 * ("Barbante nº 4 · Círculo"): passam a apontar para a marca comprada por último. Uma linha ligada a uma
 * compra específica segue a marca dessa compra. Roda ao abrir o app e depois de salvar uma compra.
 */
export const relinkBrandedMaterials = async (): Promise<void> => {
  const purchases = await db.purchases.toArray();
  const groups = groupMaterials(purchases);
  const known = new Set(groups.map(g => g.key));
  const relinked = (name: string, purchaseId?: string): string | undefined => {
    if (!name.trim() || known.has(materialKey(name))) return undefined;
    const lot = purchaseId ? purchases.find(p => p.id === purchaseId) : undefined;
    if (lot && materialKey(lot.material) === materialKey(name)) return purchaseName(lot);
    return brandedMaterialFor(name, groups)?.name;
  };

  for (const p of await db.products.toArray()) {
    if (!p.materials.some(m => relinked(m.material, m.purchaseId))) continue;
    await db.products.update(p.id, { materials: p.materials.map(m => ({ ...m, material: relinked(m.material, m.purchaseId) ?? m.material })) });
  }
  for (const o of await db.orders.toArray()) {
    if (!o.log?.some(e => e.material && relinked(e.material))) continue;
    await db.orders.update(o.id, { log: o.log.map(e => (e.material ? { ...e, material: relinked(e.material) ?? e.material } : e)) });
  }
};
