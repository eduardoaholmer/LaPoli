import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Product, Purchase, Order, Settings } from '../types';
import { generateId } from '../types';
import type { Transaction } from '../types/financial';

function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInTargetMonth));
  return target;
}

export class LaPoliDB extends Dexie {
  products!: Table<Product>;
  purchases!: Table<Purchase>;
  orders!: Table<Order>;
  settings!: Table<Settings>;
  transactions!: Table<Transaction>;

  constructor() {
    super('LaPoliDB');
    
    // Versão 1 - Schema inicial
    this.version(1).stores({
      products: 'id, name, category, active, createdAt, updatedAt',
      purchases: 'id, material, type, status, paymentStatus, date, createdAt, updatedAt',
      orders: 'id, clientName, status, paymentStatus, date, deadline, createdAt, updatedAt',
      settings: 'id'
    });
    
    // Versão 2 - Adicionado índices para melhor performance
    this.version(2).stores({
      products: 'id, name, category, active, createdAt, updatedAt, isExample',
      purchases: 'id, material, type, status, paymentStatus, date, createdAt, updatedAt, isExample',
      orders: 'id, clientName, status, paymentStatus, date, deadline, createdAt, updatedAt, isExample, productId',
      settings: 'id'
    }).upgrade(tx => {
      // Migração: Adicionar campo isExample aos registros existentes
      return Promise.all([
        tx.table('products').toCollection().modify(product => {
          if (!('isExample' in product)) {
            product.isExample = false;
          }
        }),
        tx.table('purchases').toCollection().modify(purchase => {
          if (!('isExample' in purchase)) {
            purchase.isExample = false;
          }
        }),
        tx.table('orders').toCollection().modify(order => {
          if (!('isExample' in order)) {
            order.isExample = false;
          }
        })
      ]);
    });

    // Versão 3 - Módulo Financeiro: tabela de lançamentos, com migração retroativa de pedidos e compras
    this.version(3).stores({
      products: 'id, name, category, active, createdAt, updatedAt, isExample',
      purchases: 'id, material, type, status, paymentStatus, date, createdAt, updatedAt, isExample',
      orders: 'id, clientName, status, paymentStatus, date, deadline, createdAt, updatedAt, isExample, productId',
      settings: 'id',
      transactions: 'id, type, category, origin, originId, date, paymentDate, account, createdAt, updatedAt'
    }).upgrade(async tx => {
      const [orders, purchases] = await Promise.all([tx.table('orders').toArray(), tx.table('purchases').toArray()]);
      const now = new Date();
      const rows: Transaction[] = [];

      (orders as Order[]).forEach(order => {
        if (order.signalAmount > 0) {
          rows.push({
            id: generateId(),
            type: 'receita',
            description: `Sinal de ${order.clientName}`,
            amount: order.signalAmount,
            category: 'Pedidos de clientes',
            date: order.signalPaymentDate ?? order.date,
            paymentDate: order.signalPaymentDate,
            account: order.paymentMethod || 'Pix',
            origin: 'pedido_sinal',
            originId: order.id,
            createdAt: now,
            updatedAt: now
          });
        }
        const balance = order.agreedPrice - order.signalAmount;
        if (order.status !== 'Cancelado' && balance > 0) {
          rows.push({
            id: generateId(),
            type: 'receita',
            description: `Saldo de ${order.clientName}`,
            amount: balance,
            category: 'Pedidos de clientes',
            date: order.finalPaymentDate ?? order.deliveryDate ?? order.deadline,
            paymentDate: order.finalPaymentDate,
            account: order.paymentMethod || 'Pix',
            origin: 'pedido_saldo',
            originId: order.id,
            createdAt: now,
            updatedAt: now
          });
        }
      });

      (purchases as Purchase[]).forEach(purchase => {
        const n = Math.max(1, purchase.installments ?? 1);
        if (n <= 1) {
          rows.push({
            id: generateId(),
            type: 'despesa',
            description: `Compra: ${purchase.material}`,
            amount: purchase.totalPaid,
            category: 'Materiais',
            date: purchase.paymentCompletionDate ?? purchase.date,
            paymentDate: purchase.paymentStatus === 'quitado' ? (purchase.paymentCompletionDate ?? purchase.date) : undefined,
            account: purchase.paymentMethod || 'Pix',
            origin: 'compra',
            originId: purchase.id,
            createdAt: now,
            updatedAt: now
          });
        } else {
          const base = Math.floor((purchase.totalPaid / n) * 100) / 100;
          const first = new Date(purchase.firstInstallmentDate ?? purchase.date);
          for (let i = 0; i < n; i++) {
            const due = addMonthsClamped(first, i);
            const isLast = i === n - 1;
            const amount = isLast ? Math.round((purchase.totalPaid - base * (n - 1)) * 100) / 100 : base;
            rows.push({
              id: generateId(),
              type: 'despesa',
              description: `Compra: ${purchase.material} (parcela ${i + 1}/${n})`,
              amount,
              category: 'Materiais',
              date: due,
              paymentDate: purchase.paymentStatus === 'quitado' ? due : undefined,
              account: purchase.paymentMethod || 'Pix',
              origin: 'compra',
              originId: purchase.id,
              installmentNumber: i + 1,
              totalInstallments: n,
              createdAt: now,
              updatedAt: now
            });
          }
        }
      });

      if (rows.length) await tx.table('transactions').bulkAdd(rows);
    });
  }
}

export const db = new LaPoliDB();
