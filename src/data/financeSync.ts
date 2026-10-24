import { db } from './db';
import { purchaseName } from '../calculations/materialName';
import { generateId } from '../types';
import type { Order, Purchase } from '../types';
import type { Transaction, TransactionOrigin } from '../types/financial';

type Draft = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInTargetMonth));
  return target;
}

/**
 * Cria/atualiza os Transaction automáticos de uma origem (pedido ou compra), por (origin, originId,
 * installmentNumber). `syncPaymentDate` decide se um registro já existente tem o `paymentDate`
 * sobrescrito pelo valor vindo da origem (pedidos, que guardam a data de pagamento de cada parcela)
 * ou preservado (compras parceladas, cujo schema não sabe qual parcela já foi paga — ver spec).
 */
async function upsertAutoTransactions(originId: string, origin: TransactionOrigin, drafts: Draft[], syncPaymentDate: boolean): Promise<void> {
  const existing = await db.transactions.where('originId').equals(originId).filter(t => t.origin === origin).toArray();
  const now = new Date();

  for (const draft of drafts) {
    const match = existing.find(t => (t.installmentNumber ?? null) === (draft.installmentNumber ?? null));
    if (match) {
      await db.transactions.update(match.id, {
        type: draft.type,
        description: draft.description,
        amount: draft.amount,
        category: draft.category,
        date: draft.date,
        account: draft.account,
        totalInstallments: draft.totalInstallments,
        ...(syncPaymentDate ? { paymentDate: draft.paymentDate } : {}),
        updatedAt: now
      });
    } else {
      await db.transactions.add({ ...draft, id: generateId(), createdAt: now, updatedAt: now });
    }
  }

  const draftKeys = new Set(drafts.map(d => d.installmentNumber ?? 0));
  const toRemove = existing.filter(t => !draftKeys.has(t.installmentNumber ?? 0));
  if (toRemove.length) await db.transactions.bulkDelete(toRemove.map(t => t.id));
}

/** Sinal e saldo do pedido. A data de pagamento vem sempre do pedido (fonte da verdade). */
export async function syncOrderTransactions(order: Order): Promise<void> {
  const sinal: Draft[] =
    order.signalAmount > 0 && (order.status !== 'Cancelado' || order.signalPaymentDate)
      ? [
          {
            type: 'receita',
            description: `Sinal de ${order.clientName}`,
            amount: order.signalAmount,
            category: 'Pedidos de clientes',
            date: order.signalPaymentDate ?? order.date,
            paymentDate: order.signalPaymentDate,
            account: order.paymentMethod || 'Pix',
            origin: 'pedido_sinal',
            originId: order.id
          }
        ]
      : [];

  const balance = order.agreedPrice - order.signalAmount;
  const saldo: Draft[] =
    order.status !== 'Cancelado' && balance > 0
      ? [
          {
            type: 'receita',
            description: `Saldo de ${order.clientName}`,
            amount: balance,
            category: 'Pedidos de clientes',
            date: order.finalPaymentDate ?? order.deliveryDate ?? order.deadline,
            paymentDate: order.finalPaymentDate,
            account: order.paymentMethod || 'Pix',
            origin: 'pedido_saldo',
            originId: order.id
          }
        ]
      : [];

  await upsertAutoTransactions(order.id, 'pedido_sinal', sinal, true);
  await upsertAutoTransactions(order.id, 'pedido_saldo', saldo, true);
}

/**
 * Compra à vista ou parcelada. O `paymentDate` é derivado do status da compra na criação e quando o
 * status entra ou sai de "quitado" (`previousPaymentStatus` informa o status anterior). Fora isso é
 * preservado: quem marca uma parcela como paga é o usuário, na tela Movimentações (o schema de Purchase
 * não guarda qual parcela foi paga).
 */
export async function syncPurchaseTransactions(purchase: Purchase, previousPaymentStatus?: Purchase['paymentStatus']): Promise<void> {
  // material ganho ou sobra (R$ 0) não é despesa: não cria lançamento, e remove se já existia
  if (!(purchase.totalPaid > 0)) return upsertAutoTransactions(purchase.id, 'compra', [], false);

  const n = Math.max(1, purchase.installments ?? 1);
  const drafts: Draft[] = [];

  if (n <= 1) {
    drafts.push({
      type: 'despesa',
      description: `Compra: ${purchaseName(purchase)}`,
      amount: purchase.totalPaid,
      category: 'Materiais',
      date: purchase.paymentCompletionDate ?? purchase.date,
      paymentDate: purchase.paymentStatus === 'quitado' ? (purchase.paymentCompletionDate ?? purchase.date) : undefined,
      account: purchase.paymentMethod || 'Pix',
      origin: 'compra',
      originId: purchase.id
    });
  } else {
    const base = Math.floor((purchase.totalPaid / n) * 100) / 100;
    const first = new Date(purchase.firstInstallmentDate ?? purchase.date);
    for (let i = 0; i < n; i++) {
      const due = addMonthsClamped(first, i);
      const isLast = i === n - 1;
      const amount = isLast ? Math.round((purchase.totalPaid - base * (n - 1)) * 100) / 100 : base;
      drafts.push({
        type: 'despesa',
        description: `Compra: ${purchaseName(purchase)} (parcela ${i + 1}/${n})`,
        amount,
        category: 'Materiais',
        date: due,
        paymentDate: purchase.paymentStatus === 'quitado' ? due : undefined,
        account: purchase.paymentMethod || 'Pix',
        origin: 'compra',
        originId: purchase.id,
        installmentNumber: i + 1,
        totalInstallments: n
      });
    }
  }

  // Entrar ou sair de "quitado" repropaga o pagamento a todas as parcelas; qualquer outra edição preserva
  // o que o usuário já marcou como pago em Movimentações.
  const settlementChanged = previousPaymentStatus !== undefined && (previousPaymentStatus === 'quitado') !== (purchase.paymentStatus === 'quitado');
  await upsertAutoTransactions(purchase.id, 'compra', drafts, settlementChanged);
}

/** Remove todos os Transaction ligados a um pedido ou compra excluído. */
export async function removeTransactionsFor(originId: string): Promise<void> {
  const existing = await db.transactions.where('originId').equals(originId).toArray();
  if (existing.length) await db.transactions.bulkDelete(existing.map(t => t.id));
}
