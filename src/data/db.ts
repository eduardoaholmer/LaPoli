import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Product, Purchase, Order, Settings } from '../types';

export class LaPoliDB extends Dexie {
  products!: Table<Product>;
  purchases!: Table<Purchase>;
  orders!: Table<Order>;
  settings!: Table<Settings>;

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
      orders: 'id, clientName, status, paymentStatus, date, deadline, createdAt, updatedAt, isExample',
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
  }
}

export const db = new LaPoliDB();
