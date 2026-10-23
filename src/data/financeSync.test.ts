import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db';
import { backupService, purchaseService } from './services';
import { syncOrderTransactions } from './financeSync';
import { registerPayment } from './orderActions';
import type { Order, Purchase, Settings } from '../types';

const purchase = (over: Partial<Purchase> = {}): Purchase =>
  ({
    id: 'p1',
    material: 'Fio',
    totalPaid: 50,
    installments: 2,
    paymentStatus: 'a pagar',
    paymentMethod: 'Pix',
    date: new Date(2026, 9, 5),
    firstInstallmentDate: new Date(2026, 9, 5),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over
  }) as Purchase;

const order = (over: Partial<Order> = {}): Order =>
  ({
    id: 'o1',
    clientName: 'Maria',
    status: 'Em produção',
    agreedPrice: 180,
    signalAmount: 90,
    paymentMethod: 'Pix',
    date: new Date(2026, 9, 1),
    deadline: new Date(2026, 9, 20),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over
  }) as Order;

const paidFlags = async (originId: string) =>
  (await db.transactions.where('originId').equals(originId).sortBy('installmentNumber')).map(t => !!t.paymentDate);

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.purchases.clear(), db.orders.clear(), db.settings.clear(), db.transactions.clear()]);
});

describe('compras: mudança de status de pagamento propaga aos lançamentos', () => {
  it('a pagar → quitado marca todas as parcelas como pagas', async () => {
    await db.purchases.add(purchase());
    await purchaseService.update('p1', { paymentStatus: 'a pagar' });
    expect(await paidFlags('p1')).toEqual([false, false]);

    await purchaseService.update('p1', { paymentStatus: 'quitado' });
    expect(await paidFlags('p1')).toEqual([true, true]);
  });

  it('quitado → a pagar desmarca as parcelas', async () => {
    await db.purchases.add(purchase({ paymentStatus: 'quitado' }));
    await purchaseService.update('p1', { material: 'Fio cru' });
    expect(await paidFlags('p1')).toEqual([true, true]);

    await purchaseService.update('p1', { paymentStatus: 'a pagar' });
    expect(await paidFlags('p1')).toEqual([false, false]);
  });

  it('compra à vista: a pagar → quitado paga o lançamento único', async () => {
    await db.purchases.add(purchase({ id: 'p2', installments: 1, totalPaid: 30 }));
    await purchaseService.update('p2', { totalPaid: 30 });
    expect(await paidFlags('p2')).toEqual([false]);

    await purchaseService.update('p2', { paymentStatus: 'quitado' });
    expect(await paidFlags('p2')).toEqual([true]);
  });

  it('editar sem mudar o status preserva a parcela que o usuário marcou como paga', async () => {
    await db.purchases.add(purchase());
    await purchaseService.update('p1', { material: 'Fio' });
    const [first] = await db.transactions.where('originId').equals('p1').sortBy('installmentNumber');
    await db.transactions.update(first.id, { paymentDate: new Date() });

    await purchaseService.update('p1', { material: 'Fio cru', paymentStatus: 'parcial' });
    expect(await paidFlags('p1')).toEqual([true, false]);
  });
});

describe('compras sem custo', () => {
  it('material ganho (R$ 0) não vira lançamento; passar a ter valor cria, voltar a zero remove', async () => {
    await db.purchases.add(purchase({ installments: 1, totalPaid: 0 }));
    await purchaseService.update('p1', { totalPaid: 0 });
    expect(await db.transactions.where('originId').equals('p1').count()).toBe(0);

    await purchaseService.update('p1', { totalPaid: 20 });
    expect(await db.transactions.where('originId').equals('p1').count()).toBe(1);

    await purchaseService.update('p1', { totalPaid: 0 });
    expect(await db.transactions.where('originId').equals('p1').count()).toBe(0);
  });
});

describe('importar backup', () => {
  const settings = { id: 'settings', hourlyRate: 20, openingCash: 0 } as unknown as Settings;
  const backup = (extra: object = {}) =>
    JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      products: [],
      purchases: [purchase({ id: 'p9', installments: 1, totalPaid: 30, paymentStatus: 'quitado' })],
      orders: [order({ id: 'o9', signalAmount: 90, signalPaymentDate: new Date(2026, 9, 2) })],
      settings,
      ...extra
    });

  beforeEach(() => {
    vi.spyOn(backupService, 'createBackupBeforeImport').mockResolvedValue('backup.json');
  });

  it('backup 1.0 (sem lançamentos) descarta lançamentos antigos e regenera a partir do importado', async () => {
    await db.transactions.add({
      id: 'orfao',
      type: 'receita',
      description: 'Sinal de Fantasma',
      amount: 999,
      category: 'Pedidos de clientes',
      date: new Date(),
      paymentDate: new Date(),
      account: 'Pix',
      origin: 'pedido_sinal',
      originId: 'pedido-que-nao-existe',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await backupService.importData(backup());

    const all = await db.transactions.toArray();
    expect(all.find(t => t.id === 'orfao')).toBeUndefined();
    expect(all.map(t => t.origin).sort()).toEqual(['compra', 'pedido_saldo', 'pedido_sinal']);
    expect(all.find(t => t.origin === 'pedido_sinal')?.paymentDate).toBeTruthy();
    expect(all.find(t => t.origin === 'compra')?.paymentDate).toBeTruthy();
    expect(all.find(t => t.origin === 'pedido_saldo')?.paymentDate).toBeFalsy();
  });

  it('importar duas vezes o mesmo backup 1.0 não duplica lançamentos', async () => {
    await backupService.importData(backup());
    await backupService.importData(backup());
    expect(await db.transactions.count()).toBe(3);
  });

  it('backup 1.1 restaura exatamente os lançamentos do arquivo', async () => {
    const t = {
      id: 't1',
      type: 'despesa',
      description: 'Agulhas',
      amount: 20,
      category: 'Ferramentas',
      date: new Date(2026, 9, 3),
      paymentDate: new Date(2026, 9, 3),
      account: 'Pix',
      origin: 'manual',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await backupService.importData(backup({ version: '1.1', transactions: [t] }));
    expect((await db.transactions.toArray()).map(x => x.id)).toEqual(['t1']);
  });

  it('rejeita transactions que não seja array', async () => {
    await expect(backupService.importData(backup({ version: '1.1', transactions: 'x' }))).rejects.toThrow();
  });
});

describe('baixa de pedido (A receber)', () => {
  it('receber sinal e saldo pelo pedido marca os lançamentos como recebidos, sem duplicar', async () => {
    const o = order();
    await db.orders.add(o);
    await syncOrderTransactions(o);
    expect((await db.transactions.toArray()).map(t => !!t.paymentDate)).toEqual([false, false]);

    await registerPayment((await db.orders.get('o1')) as Order, 'sinal');
    await registerPayment((await db.orders.get('o1')) as Order, 'saldo');

    const all = await db.transactions.toArray();
    expect(all).toHaveLength(2);
    expect(all.every(t => !!t.paymentDate)).toBe(true);
  });
});
