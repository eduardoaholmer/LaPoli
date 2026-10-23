import { db } from './db';
import type { Product, Purchase, Order, Settings } from '../types';
import { generateId } from '../types';
import { formatDate } from '../calculations';
import { removeTransactionsFor, syncOrderTransactions, syncPurchaseTransactions } from './financeSync';

export const productService = {
  async getAll(): Promise<Product[]> {
    return await db.products.toArray();
  },

  async getById(id: string): Promise<Product | undefined> {
    return await db.products.get(id);
  },

  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const now = new Date();
    const newProduct: Product = {
      ...product,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    };
    await db.products.add(newProduct);
    return newProduct;
  },

  async update(id: string, updates: Partial<Product>): Promise<void> {
    await db.products.update(id, {
      ...updates,
      updatedAt: new Date()
    });
  },

  async delete(id: string): Promise<void> {
    // Verificar se há pedidos usando este produto
    const orders = await db.orders.where('productId').equals(id).toArray();
    if (orders.length > 0) {
      throw new Error(`Não é possível excluir este produto pois existem ${orders.length} pedido(s) vinculado(s).`);
    }
    await db.products.delete(id);
  },

  async deleteAllExamples(): Promise<void> {
    const examples = await db.products.filter(p => p.isExample === true).toArray();
    await db.products.bulkDelete(examples.map(p => p.id));
  }
};

export const purchaseService = {
  async getAll(): Promise<Purchase[]> {
    return await db.purchases.toArray();
  },

  async getById(id: string): Promise<Purchase | undefined> {
    return await db.purchases.get(id);
  },

  async create(purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>): Promise<Purchase> {
    const now = new Date();
    const newPurchase: Purchase = {
      ...purchase,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    };
    await db.purchases.add(newPurchase);
    await syncPurchaseTransactions(newPurchase);
    return newPurchase;
  },

  async update(id: string, updates: Partial<Purchase>): Promise<void> {
    await db.purchases.update(id, {
      ...updates,
      updatedAt: new Date()
    });
    const updated = await db.purchases.get(id);
    if (updated) await syncPurchaseTransactions(updated);
  },

  async delete(id: string): Promise<void> {
    // Verificar se há produtos usando esta compra
    const products = await db.products.toArray();
    const productsUsingPurchase = products.filter(p =>
      p.materials.some(m => m.purchaseId === id)
    );

    if (productsUsingPurchase.length > 0) {
      throw new Error(`Não é possível excluir esta compra pois existem ${productsUsingPurchase.length} produto(s) usando este material.`);
    }

    await db.purchases.delete(id);
    await removeTransactionsFor(id);
  },

  async deleteAllExamples(): Promise<void> {
    const examples = await db.purchases.filter(p => p.isExample === true).toArray();
    await db.purchases.bulkDelete(examples.map(p => p.id));
    await Promise.all(examples.map(p => removeTransactionsFor(p.id)));
  }
};

export const orderService = {
  async getAll(): Promise<Order[]> {
    return await db.orders.toArray();
  },

  async getById(id: string): Promise<Order | undefined> {
    return await db.orders.get(id);
  },

  async create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const now = new Date();
    const newOrder: Order = {
      ...order,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    };
    await db.orders.add(newOrder);
    await syncOrderTransactions(newOrder);
    return newOrder;
  },

  async update(id: string, updates: Partial<Order>): Promise<void> {
    await db.orders.update(id, {
      ...updates,
      updatedAt: new Date()
    });
    const updated = await db.orders.get(id);
    if (updated) await syncOrderTransactions(updated);
  },

  async delete(id: string): Promise<void> {
    await db.orders.delete(id);
    await removeTransactionsFor(id);
  },

  async deleteAllExamples(): Promise<void> {
    const examples = await db.orders.filter(o => o.isExample === true).toArray();
    await db.orders.bulkDelete(examples.map(o => o.id));
    await Promise.all(examples.map(o => removeTransactionsFor(o.id)));
  }
};

export const settingsService = {
  async get(): Promise<Settings | undefined> {
    const settings = await db.settings.toArray();
    return settings[0];
  },

  async create(settings: Omit<Settings, 'id'>): Promise<Settings> {
    const now = new Date();
    const newSettings: Settings = {
      ...settings,
      id: 'default',
      createdAt: now,
      updatedAt: now
    };
    // put (e não add): várias telas pedem as configurações padrão ao mesmo tempo na primeira abertura
    await db.settings.put(newSettings);
    return newSettings;
  },

  async update(updates: Partial<Settings>): Promise<void> {
    const existing = await this.get();
    if (existing) {
      await db.settings.update('default', {
        ...updates,
        updatedAt: new Date()
      });
    } else {
      await this.create(updates as Omit<Settings, 'id'>);
    }
  },

  _initializing: undefined as Promise<Settings> | undefined,

  async initializeDefault(): Promise<Settings> {
    // uma única criação por vez, mesmo que várias telas chamem juntas
    if (!this._initializing) {
      this._initializing = this._initializeDefault().finally(() => {
        this._initializing = undefined;
      });
    }
    return this._initializing;
  },

  async _initializeDefault(): Promise<Settings> {
    const existing = await this.get();
    if (existing) return existing;

    const defaultSettings: Omit<Settings, 'id'> = {
      hourlyRate: 30,
      defaultSignalPercent: 50,
      desiredProfitMargin: 30,
      productCategories: ['Amigurumi', 'Chaveiro', 'Bolsa', 'Acessório', 'Outro'],
      materialTypes: ['fio', 'linha', 'enchimento', 'olhos', 'botão', 'argola', 'embalagem', 'acessório', 'outro'],
      units: ['gramas', 'metros', 'unidades', 'centímetros'],
      paymentMethods: ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência'],
      orderStatuses: [
        'Cliente escolhendo o produto',
        'Orçamento enviado',
        'Aguardando pagamento do sinal',
        'Sinal recebido',
        'Aguardando compra de materiais',
        'Materiais comprados',
        'Em produção',
        'Produção concluída',
        'Aguardando entrega',
        'Entregue',
        'Cancelado'
      ],
      purchaseStatuses: ['disponível', 'parcialmente usado', 'esgotado', 'reservado'],
      suppliers: [],
      openingCash: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.create(defaultSettings);
  }
};

export const backupService = {
  async exportData(): Promise<string> {
    const [products, purchases, orders, settings] = await Promise.all([
      productService.getAll(),
      purchaseService.getAll(),
      orderService.getAll(),
      settingsService.get()
    ]);

    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      products,
      purchases,
      orders,
      settings
    };

    return JSON.stringify(data, null, 2);
  },

  async validateBackup(data: any): Promise<{ valid: boolean; error?: string }> {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Arquivo inválido: não é um objeto JSON válido' };
    }

    if (!data.version) {
      return { valid: false, error: 'Arquivo inválido: versão não especificada' };
    }

    if (data.version !== '1.0') {
      return { valid: false, error: `Versão incompatível: esperado 1.0, recebido ${data.version}` };
    }

    if (!Array.isArray(data.products)) {
      return { valid: false, error: 'Arquivo inválido: produtos não é um array' };
    }

    if (!Array.isArray(data.purchases)) {
      return { valid: false, error: 'Arquivo inválido: compras não é um array' };
    }

    if (!Array.isArray(data.orders)) {
      return { valid: false, error: 'Arquivo inválido: pedidos não é um array' };
    }

    if (!data.settings || typeof data.settings !== 'object') {
      return { valid: false, error: 'Arquivo inválido: configurações não encontradas' };
    }

    return { valid: true };
  },

  async createBackupBeforeImport(): Promise<string> {
    const backup = await this.exportData();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `lapoli-backup-before-import-${timestamp}.json`;
    
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    return filename;
  },

  async importData(jsonString: string): Promise<void> {
    try {
      const data = JSON.parse(jsonString);
      
      const validation = await this.validateBackup(data);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Criar backup automático antes de importar
      await this.createBackupBeforeImport();

      // Fazer backup dos dados atuais em memória para rollback
      const [currentProducts, currentPurchases, currentOrders, currentSettings] = await Promise.all([
        productService.getAll(),
        purchaseService.getAll(),
        orderService.getAll(),
        settingsService.get()
      ]);

      try {
        if (data.products) {
          await db.products.clear();
          await db.products.bulkAdd(data.products);
        }
        
        if (data.purchases) {
          await db.purchases.clear();
          await db.purchases.bulkAdd(data.purchases);
        }
        
        if (data.orders) {
          await db.orders.clear();
          await db.orders.bulkAdd(data.orders);
        }
        
        if (data.settings) {
          await db.settings.clear();
          await db.settings.add(data.settings);
        }
      } catch (error) {
        // Rollback em caso de erro
        console.error('Erro ao importar, fazendo rollback...', error);
        
        await db.products.clear();
        await db.purchases.clear();
        await db.orders.clear();
        await db.settings.clear();
        
        if (currentProducts.length > 0) await db.products.bulkAdd(currentProducts);
        if (currentPurchases.length > 0) await db.purchases.bulkAdd(currentPurchases);
        if (currentOrders.length > 0) await db.orders.bulkAdd(currentOrders);
        if (currentSettings) await db.settings.add(currentSettings);
        
        throw new Error('Erro ao importar dados. Backup anterior foi restaurado automaticamente.');
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Arquivo JSON inválido ou corrompido');
      }
      throw error;
    }
  },

  async deleteAllExamples(): Promise<void> {
    await Promise.all([
      productService.deleteAllExamples(),
      purchaseService.deleteAllExamples(),
      orderService.deleteAllExamples()
    ]);
  },

  async getShoppingList(): Promise<Purchase[]> {
    const purchases = await purchaseService.getAll();
    return purchases.filter((p: Purchase) => p.quantityRemaining < p.minStock);
  },

  async exportToCSV(): Promise<void> {
    const [products, purchases, orders] = await Promise.all([
      productService.getAll(),
      purchaseService.getAll(),
      orderService.getAll()
    ]);

    // Exportar produtos
    const productsCSV = [
      ['Nome', 'Categoria', 'Preço Sugerido', 'Preço Cobrado', 'Tempo Estimado (h)', 'Ativo'].join(','),
      ...products.map(p => [
        `"${p.name}"`,
        `"${p.category}"`,
        p.suggestedPrice.toFixed(2),
        p.usualPrice.toFixed(2),
        p.estimatedTime || 0,
        p.active ? 'Sim' : 'Não'
      ].join(','))
    ].join('\n');

    // Exportar compras
    const purchasesCSV = [
      ['Material', 'Tipo', 'Quantidade Comprada', 'Quantidade Restante', 'Valor Total', 'Custo Unitário', 'Status', 'Data'].join(','),
      ...purchases.map(p => [
        `"${p.material}"`,
        `"${p.type}"`,
        p.quantityPurchased,
        p.quantityRemaining,
        p.totalPaid.toFixed(2),
        p.unitCost.toFixed(2),
        `"${p.status}"`,
        formatDate(p.date)
      ].join(','))
    ].join('\n');

    // Exportar pedidos
    const ordersCSV = [
      ['Cliente', 'Telefone', 'Produto', 'Quantidade', 'Preço Combinado', 'Sinal', 'Saldo', 'Status', 'Data Pedido', 'Prazo'].join(','),
      ...orders.map(o => [
        `"${o.clientName}"`,
        `"${o.clientPhone}"`,
        `"${o.product}"`,
        o.quantity,
        o.agreedPrice.toFixed(2),
        o.signalAmount.toFixed(2),
        o.remainingBalance.toFixed(2),
        `"${o.status}"`,
        formatDate(o.date),
        formatDate(o.deadline)
      ].join(','))
    ].join('\n');

    // Criar arquivo único com todas as abas
    const allData = `PRODUTOS\n${productsCSV}\n\nCOMPRAS\n${purchasesCSV}\n\nPEDIDOS\n${ordersCSV}`;
    const blob = new Blob([allData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lapoli-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
