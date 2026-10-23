import { calculatePercentUsed, updatePurchaseStatus } from '../calculations';
import { groupMaterials, planMovement, type LotMovement } from '../calculations/materials';
import { generateId, type OrderStatus, type Purchase, type StockMovement } from '../types';
import { purchaseService } from './services';

/** Etapas em que a peça já está pronta: o material dela já saiu (ou deveria ter saído) do estoque. */
export const DONE_STATUSES: OrderStatus[] = ['Produção concluída', 'Aguardando entrega', 'Entregue'];
export const isDoneStatus = (status: OrderStatus): boolean => DONE_STATUSES.includes(status);

/** Grava a saída em cada compra: o restante diminui e a compra guarda o motivo em `movements`. */
export const applyLotMovements = async (
  plan: LotMovement[],
  movement: Omit<StockMovement, 'id' | 'quantity' | 'date'>
): Promise<void> => {
  const date = new Date();
  // uma compra por vez: cada lote guarda a sua parte
  for (const { lot, quantity } of plan) {
    const remaining = lot.quantityRemaining - quantity;
    await purchaseService.update(lot.id, {
      quantityRemaining: remaining,
      percentUsed: calculatePercentUsed(lot.quantityPurchased, remaining),
      status: updatePurchaseStatus({ ...lot, quantityRemaining: remaining }),
      movements: [...(lot.movements || []), { ...movement, id: generateId(), date, quantity }]
    });
  }
};

export interface UsedLine {
  material: string;
  unit: string;
  used: number; // o que saiu do estoque
  short: number; // o que faltou (não havia no estoque)
}

/**
 * Tira do estoque o material de uma peça pronta, das compras mais antigas para as mais novas.
 * Só mexe nas compras; quem chama grava `stockUsedAt` no pedido junto com a mudança de etapa.
 */
export const consumeOrderMaterials = async (
  orderId: string,
  clientName: string,
  lines: { key: string; quantity: number }[]
): Promise<UsedLine[]> => {
  const groups = groupMaterials(await purchaseService.getAll());
  const result: UsedLine[] = [];
  for (const line of lines) {
    if (!(line.quantity > 0)) continue;
    const group = groups.find(g => g.key === line.key);
    if (!group) continue;
    const plan = planMovement(group, line.quantity);
    await applyLotMovements(plan, { type: 'uso', orderId, note: `Pedido de ${clientName}` });
    const used = plan.reduce((sum, m) => sum + m.quantity, 0);
    result.push({ material: group.name, unit: group.unit, used, short: Math.max(0, line.quantity - used) });
  }
  return result;
};

/** Devolve ao estoque tudo o que um pedido usou (pedido voltou de etapa, ou "Desfazer"). */
export const returnOrderMaterials = async (orderId: string): Promise<number> => {
  const lots = (await purchaseService.getAll()).filter(p => (p.movements || []).some(m => m.orderId === orderId));
  let total = 0;
  for (const lot of lots) {
    const back = (lot.movements || []).filter(m => m.orderId === orderId).reduce((sum, m) => sum + m.quantity, 0);
    const remaining = lot.quantityRemaining + back;
    total += back;
    await purchaseService.update(lot.id, {
      quantityRemaining: remaining,
      percentUsed: calculatePercentUsed(lot.quantityPurchased, remaining),
      status: updatePurchaseStatus({ ...lot, quantityRemaining: remaining } as Purchase),
      movements: (lot.movements || []).filter(m => m.orderId !== orderId)
    });
  }
  return total;
};
