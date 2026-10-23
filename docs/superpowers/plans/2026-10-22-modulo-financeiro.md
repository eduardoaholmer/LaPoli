# Módulo Financeiro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o módulo Financeiro ao app LaPoli (telas Financeiro e Movimentações, já desenhadas no protótipo `design/`), com um modelo de dados `Transaction` completo para suportar extensões futuras sem nova migração.

**Architecture:** Nova tabela Dexie `transactions` (migração v3). Pedidos e compras continuam sendo a fonte da verdade: `orderService`/`purchaseService` sincronizam automaticamente os `Transaction` ligados a eles via `src/data/financeSync.ts`. Lançamentos manuais passam por um `transactionService` próprio. Os cálculos (`src/calculations/finance.ts`) são funções puras sobre `Transaction[]`, substituindo o cálculo provisório hoje em `period.ts`.

**Tech Stack:** React 19, TypeScript, Dexie 4 (IndexedDB), Vitest, recharts (já uma dependência instalada, não usada ainda — vai para o gráfico de evolução do caixa).

**Spec:** `docs/superpowers/specs/2026-10-22-modulo-financeiro-design.md`

## Global Constraints

- Valores monetários são `number` em **reais** (não centavos) — mesma convenção de `Order.agreedPrice`, `Purchase.totalPaid`, `Settings.hourlyRate` já usada em todo o app.
- Automáticos (`origin !== 'manual'`) não são editáveis pela tela de Movimentações, exceto marcar `paymentDate` (pago/recebido) com um toque. Edição de valor/categoria/data acontece no pedido ou na compra de origem.
- Nenhuma mudança em como `Order.paymentStatus` / `Purchase.paymentStatus` são hoje calculados — o Financeiro espelha essas datas, nunca o contrário.
- Seguir o padrão de testes já estabelecido no repo: só `src/calculations/*.ts` tem testes automatizados (`*.test.ts`, Vitest); services e telas são verificados rodando o app (`npm run dev`). Este plano segue a mesma convenção — não introduz testes de banco de dados ou de componentes onde o repo não os tem hoje.

---

## Mapa de arquivos

**Novos:**
- `src/types/financial.ts` — tipo `Transaction` e `transactionStatus`.
- `src/calculations/finance.ts` + `src/calculations/finance.test.ts` — cálculos puros e o cenário de teste obrigatório.
- `src/data/financeSync.ts` — sincronização automática pedido/compra → `Transaction`.
- `src/screens/Transactions.tsx` — tela Movimentações (inclui o modal de lançamento manual).
- `src/screens/Financeiro.tsx` — tela Financeiro (abas Caixa/Resultado + ponte).

**Alterados:**
- `src/types/index.ts` — `Settings.openingCash`.
- `src/data/db.ts` — versão 3 (tabela `transactions` + migração retroativa).
- `src/data/services.ts` — `transactionService`; `orderService`/`purchaseService` chamam `financeSync`; `backupService` inclui `transactions`.
- `src/calculations/period.ts` + `period.test.ts` — remove `calculatePeriodResult`, `calculateCash`, `cashByDay`, `cashEvents` (ficam em `finance.ts`).
- `src/screens/Dashboard.tsx` — passa a usar `finance.ts`.
- `src/components/charts.tsx` — novo `CashLineChart` (recharts).
- `src/App.tsx` — rotas `/financeiro` e `/financeiro/movimentacoes`.
- `src/components/Navigation.tsx` — item "Financeiro" no menu/trilho/barra inferior.
- `src/screens/Settings.tsx` — campo "Saldo inicial em caixa".

---

### Task 1: Tipo `Transaction` e `Settings.openingCash`

**Files:**
- Create: `src/types/financial.ts`
- Modify: `src/types/index.ts` (interface `Settings`)
- Modify: `src/data/services.ts:182-207` (`settingsService._initializeDefault`)

**Interfaces:**
- Produces: `Transaction`, `TransactionType`, `TransactionOrigin`, `TransactionStatus`, `transactionStatus(t, today?)` — usados por todas as tasks seguintes.

- [ ] **Step 1: Criar `src/types/financial.ts`**

```typescript
export type TransactionType = 'receita' | 'despesa';
export type TransactionOrigin = 'manual' | 'pedido_sinal' | 'pedido_saldo' | 'compra';
export type TransactionStatus = 'previsto' | 'realizado' | 'atrasado';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number; // em reais, mesma convenção de Order.agreedPrice / Purchase.totalPaid
  category: string;
  date: Date; // data do evento: pagamento se já ocorreu, prevista se não
  paymentDate?: Date; // preenchida = realizado
  account: string; // forma de pagamento (Pix, Dinheiro, Cartão...)
  origin: TransactionOrigin;
  originId?: string; // id do pedido ou da compra (ausente quando origin === 'manual')
  installmentNumber?: number; // só compras parceladas
  totalInstallments?: number;
  observations?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Previsto (sem pagamento), realizado (com pagamento) ou atrasado (previsto e já venceu). */
export const transactionStatus = (
  t: Pick<Transaction, 'paymentDate' | 'date'>,
  today: Date = new Date()
): TransactionStatus => {
  if (t.paymentDate) return 'realizado';
  const due = new Date(t.date);
  due.setHours(0, 0, 0, 0);
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);
  return due < now ? 'atrasado' : 'previsto';
};
```

- [ ] **Step 2: Adicionar `openingCash` em `Settings` (`src/types/index.ts`)**

Na interface `Settings` (depois de `backupEveryDays?: number;`):

```typescript
  openingCash?: number; // saldo inicial em caixa (reais), usado pelo módulo Financeiro
```

- [ ] **Step 3: Definir o padrão em `settingsService._initializeDefault` (`src/data/services.ts`)**

Dentro do objeto `defaultSettings` (depois de `suppliers: [],`):

```typescript
      openingCash: 0,
```

- [ ] **Step 4: Verificar que o projeto compila**

Run: `npm run build`
Expected: compila sem erros (os dois arquivos só adicionam tipos/campos opcionais, nada consome ainda).

- [ ] **Step 5: Commit**

```bash
git add src/types/financial.ts src/types/index.ts src/data/services.ts
git commit -m "feat(financeiro): adiciona tipo Transaction e Settings.openingCash"
```

---

### Task 2: Cálculos financeiros (`src/calculations/finance.ts`)

**Files:**
- Create: `src/calculations/finance.ts`
- Create: `src/calculations/finance.test.ts`

**Interfaces:**
- Consumes: `Transaction`, `TransactionType` (Task 1); `Order`, `Product`, `Purchase`, `Settings` (`src/types`); `calculateProductCost` (`src/calculations/index.ts`); `inRange`, `PeriodRange`, `periodRange` (`src/calculations/period.ts`).
- Produces: `calculateCashFlow(transactions, settings, range): CashFlowMetrics`, `cashByDay(transactions, days, now?): { date: Date; in: number; out: number }[]`, `forecastEntries(transactions, type, today?): ForecastEntry[]`, `calculatePeriodResult(orders, products, purchases, transactions, settings, range): PeriodResultV2`. Usados pelas telas (Tasks 6-9) e pelo Dashboard (Task 9).

- [ ] **Step 1: Escrever o teste do cenário obrigatório (`src/calculations/finance.test.ts`)**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateCashFlow, calculatePeriodResult, forecastEntries } from './finance';
import { periodRange } from './period';
import type { Order, Product, Purchase, Settings } from '../types';
import type { Transaction } from '../types/financial';

const settings = { hourlyRate: 20, openingCash: 0 } as Settings;

const tx = (t: Partial<Transaction> & Pick<Transaction, 'id' | 'amount' | 'date' | 'origin' | 'category'>): Transaction => ({
  type: 'despesa',
  description: '',
  account: 'Pix',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...t
});

const purchaseFio = { id: 'fio', material: 'Fio', unitCost: 0.05 } as Purchase;
const purchaseEnchimento = { id: 'ench', material: 'Enchimento', unitCost: 0.15 } as Purchase;
const purchaseOlhos = { id: 'olhos', material: 'Olhos', unitCost: 1.4 } as Purchase;

const product: Product = {
  id: 'leao',
  name: 'Leão Amigurumi',
  category: 'Amigurumi',
  description: '',
  size: '20cm',
  active: true,
  estimatedTime: 5,
  otherCosts: 3,
  suggestedPrice: 150,
  usualPrice: 180,
  materials: [
    { id: 'm1', materialId: 'fio', material: 'Fio', type: 'fio', unit: 'gramas', quantityUsed: 120, purchaseId: 'fio', unitCost: 0.05, totalCost: 6 },
    { id: 'm2', materialId: 'ench', material: 'Enchimento', type: 'enchimento', unit: 'gramas', quantityUsed: 40, purchaseId: 'ench', unitCost: 0.15, totalCost: 6 },
    { id: 'm3', materialId: 'olhos', material: 'Olhos', type: 'olhos', unit: 'unidades', quantityUsed: 2, purchaseId: 'olhos', unitCost: 1.4, totalCost: 2.8 }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
} as Product;

const order: Order = {
  id: 'pedido1',
  clientName: 'Maria',
  clientPhone: '',
  product: 'Leão Amigurumi',
  productId: 'leao',
  quantity: 1,
  deadline: new Date(2026, 10, 1),
  agreedPrice: 180,
  signalAmount: 90,
  remainingBalance: 90,
  status: 'Em produção',
  paymentStatus: 'sinal pago',
  needsMaterialPurchase: false,
  materialsPurchased: true,
  date: new Date(2026, 9, 1),
  createdAt: new Date(),
  updatedAt: new Date()
} as Order;

const range = periodRange('custom', new Date(2026, 10, 22), { start: new Date(2026, 8, 1), end: new Date(2026, 11, 30) });

// Situação A: sinal recebido, 1ª parcela do fio paga, demais compras e as agulhas pagas.
const situationA: Transaction[] = [
  tx({ id: 'sinal', type: 'receita', amount: 90, date: new Date(2026, 9, 1), paymentDate: new Date(2026, 9, 1), origin: 'pedido_sinal', originId: 'pedido1', category: 'Pedidos de clientes' }),
  tx({ id: 'saldo', type: 'receita', amount: 90, date: new Date(2026, 10, 1), origin: 'pedido_saldo', originId: 'pedido1', category: 'Pedidos de clientes' }),
  tx({ id: 'fio1', amount: 25, date: new Date(2026, 9, 1), paymentDate: new Date(2026, 9, 1), origin: 'compra', originId: 'fio', installmentNumber: 1, totalInstallments: 2, category: 'Materiais' }),
  tx({ id: 'fio2', amount: 25, date: new Date(2026, 10, 1), origin: 'compra', originId: 'fio', installmentNumber: 2, totalInstallments: 2, category: 'Materiais' }),
  tx({ id: 'ench', amount: 30, date: new Date(2026, 9, 1), paymentDate: new Date(2026, 9, 1), origin: 'compra', originId: 'ench', category: 'Materiais' }),
  tx({ id: 'olhos', amount: 8, date: new Date(2026, 9, 1), paymentDate: new Date(2026, 9, 1), origin: 'compra', originId: 'olhos', category: 'Materiais' }),
  tx({ id: 'agulhas', amount: 20, date: new Date(2026, 9, 1), paymentDate: new Date(2026, 9, 1), origin: 'manual', category: 'Ferramentas' })
];

describe('Cenário obrigatório (FINANCEIRO_PLAN.md secão 9)', () => {
  it('Situação A: sinal recebido, 1ª parcela do fio paga, demais pagas', () => {
    const cash = calculateCashFlow(situationA, settings, range);
    expect(cash.inflow).toBe(90);
    expect(cash.outflow).toBe(83); // 25 + 30 + 8 + 20
    expect(cash.balance).toBe(7);

    const receivable = forecastEntries(situationA, 'receita').reduce((s, f) => s + f.transaction.amount, 0);
    const payable = forecastEntries(situationA, 'despesa').reduce((s, f) => s + f.transaction.amount, 0);
    expect(receivable).toBe(90);
    expect(payable).toBe(25);
    expect(cash.balance + receivable - payable).toBe(72);
  });

  it('Situação B: 2ª parcela paga e saldo do pedido recebido', () => {
    const situationB = situationA.map(t =>
      t.id === 'saldo' ? { ...t, paymentDate: new Date(2026, 10, 5) } : t.id === 'fio2' ? { ...t, paymentDate: new Date(2026, 10, 1) } : t
    );
    const cash = calculateCashFlow(situationB, settings, range);
    expect(cash.inflow).toBe(180);
    expect(cash.outflow).toBe(108);
    expect(cash.balance).toBe(72);
    expect(forecastEntries(situationB, 'receita')).toHaveLength(0);
    expect(forecastEntries(situationB, 'despesa')).toHaveLength(0);
  });

  it('Resultado do período: pedido entregue', () => {
    const delivered = { ...order, status: 'Entregue', deliveryDate: new Date(2026, 9, 20) } as Order;
    const result = calculatePeriodResult(
      [delivered],
      [product],
      [purchaseFio, purchaseEnchimento, purchaseOlhos],
      situationA,
      settings,
      range
    );
    expect(result.revenue).toBe(180);
    expect(result.materialCost).toBeCloseTo(14.8, 6);
    expect(result.otherCosts).toBe(3);
    expect(result.laborCost).toBe(100); // 5h × R$20
    expect(result.grossProfit).toBeCloseTo(62.2, 6);
    expect(result.opEx).toBe(20); // agulhas (despesa manual)
    expect(result.profit).toBeCloseTo(42.2, 6);
    expect(result.margin).toBeCloseTo((42.2 / 180) * 100, 6);
    expect(result.deliveredCount).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha (módulo ainda não existe)**

Run: `npm test -- finance.test.ts`
Expected: FAIL com "Cannot find module './finance'"

- [ ] **Step 3: Implementar `src/calculations/finance.ts`**

```typescript
import type { Order, Product, Purchase, Settings } from '../types';
import type { Transaction, TransactionType } from '../types/financial';
import { calculateProductCost } from './index';
import { inRange, type PeriodRange } from './period';

const realized = (transactions: Transaction[]): Transaction[] => transactions.filter(t => !!t.paymentDate);

export interface CashFlowMetrics {
  opening: number;
  balance: number;
  inflow: number;
  outflow: number;
  purchases: number; // saídas com origin === 'compra'
  expenses: number; // saídas manuais
  net: number;
}

/** Camada A — fluxo de caixa: dinheiro que de fato entrou e saiu, pela data de pagamento. */
export const calculateCashFlow = (transactions: Transaction[], settings: Settings, range: PeriodRange): CashFlowMetrics => {
  const done = realized(transactions);
  const inPeriod = done.filter(t => inRange(t.paymentDate, range));

  let inflow = 0;
  let outflow = 0;
  let purchases = 0;
  let expenses = 0;
  inPeriod.forEach(t => {
    if (t.type === 'receita') {
      inflow += t.amount;
    } else {
      outflow += t.amount;
      if (t.origin === 'compra') purchases += t.amount;
      else expenses += t.amount;
    }
  });

  const before = done.filter(t => new Date(t.paymentDate as Date) < range.start);
  const opening = (settings.openingCash ?? 0) + before.reduce((s, t) => s + (t.type === 'receita' ? t.amount : -t.amount), 0);

  return { opening, balance: opening + inflow - outflow, inflow, outflow, purchases, expenses, net: inflow - outflow };
};

/** Saldo de caixa dia a dia dentro do período (gráfico de evolução). */
export const cashSeries = (transactions: Transaction[], settings: Settings, range: PeriodRange): { date: Date; balance: number }[] => {
  const done = realized(transactions);
  const before = done.filter(t => new Date(t.paymentDate as Date) < range.start);
  let balance = (settings.openingCash ?? 0) + before.reduce((s, t) => s + (t.type === 'receita' ? t.amount : -t.amount), 0);

  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const points: { date: Date; balance: number }[] = [];
  const DAY = 86400000;
  for (let time = range.start.getTime(); time <= range.end.getTime(); time += DAY) {
    const day = new Date(time);
    done.forEach(t => {
      if (sameDay(new Date(t.paymentDate as Date), day)) balance += t.type === 'receita' ? t.amount : -t.amount;
    });
    points.push({ date: day, balance });
  }
  return points;
};

/** Entradas e saídas realizadas por dia, para o gráfico compacto do Dashboard. */
export const cashByDay = (transactions: Transaction[], days: number, now: Date = new Date()): { date: Date; in: number; out: number }[] => {
  const done = realized(transactions);
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const out: { date: Date; in: number; out: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = startOfDay(new Date(now.getTime() - i * 86400000));
    let inn = 0;
    let outt = 0;
    done.forEach(t => {
      if (startOfDay(t.paymentDate as Date).getTime() === day.getTime()) {
        if (t.type === 'receita') inn += t.amount;
        else outt += t.amount;
      }
    });
    out.push({ date: day, in: inn, out: outt });
  }
  return out;
};

export interface ForecastEntry {
  transaction: Transaction;
  late: boolean;
}

/** Lançamentos ainda sem pagamento (previstos), do tipo pedido — ordenados pela data mais próxima. */
export const forecastEntries = (transactions: Transaction[], type: TransactionType, today: Date = new Date()): ForecastEntry[] => {
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);
  return transactions
    .filter(t => t.type === type && !t.paymentDate)
    .map(t => ({ transaction: t, late: new Date(t.date) < now }))
    .sort((a, b) => new Date(a.transaction.date).getTime() - new Date(b.transaction.date).getTime());
};

export interface PeriodResultV2 {
  revenue: number;
  materialCost: number;
  otherCosts: number;
  laborCost: number;
  grossProfit: number; // receita − materiais − outros custos − mão de obra
  opEx: number; // despesas manuais realizadas no período (compras de material não entram aqui: só pelo consumo, acima)
  profit: number;
  margin: number; // % sobre a receita
  deliveredCount: number;
}

const recognitionDate = (o: Order): Date => new Date(o.deliveryDate ?? o.date);

/** Camada B — resultado do negócio: receita na entrega, custo pelo consumo da peça vendida. */
export const calculatePeriodResult = (
  orders: Order[],
  products: Product[],
  purchases: Purchase[],
  transactions: Transaction[],
  settings: Settings,
  range: PeriodRange
): PeriodResultV2 => {
  const delivered = orders.filter(o => o.status === 'Entregue' && inRange(recognitionDate(o), range));

  let revenue = 0;
  let materialCost = 0;
  let otherCosts = 0;
  let laborCost = 0;
  delivered.forEach(o => {
    revenue += o.agreedPrice;
    const product = products.find(p => p.id === o.productId);
    if (product) {
      const c = calculateProductCost(product, settings, purchases);
      materialCost += c.materialCost * o.quantity;
      otherCosts += c.otherCosts * o.quantity;
      laborCost += c.laborCost * o.quantity;
    }
  });

  const opEx = transactions
    .filter(t => t.type === 'despesa' && t.origin === 'manual' && !!t.paymentDate && inRange(t.paymentDate, range))
    .reduce((s, t) => s + t.amount, 0);

  const grossProfit = revenue - materialCost - otherCosts - laborCost;
  const profit = grossProfit - opEx;

  return {
    revenue,
    materialCost,
    otherCosts,
    laborCost,
    grossProfit,
    opEx,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    deliveredCount: delivered.length
  };
};
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- finance.test.ts`
Expected: PASS (3 testes)

- [ ] **Step 5: Commit**

```bash
git add src/calculations/finance.ts src/calculations/finance.test.ts
git commit -m "feat(financeiro): cálculos de caixa e resultado sobre Transaction, com o cenário obrigatório do plano"
```

---

### Task 3: Migração Dexie v3 (tabela `transactions`)

**Files:**
- Modify: `src/data/db.ts`

**Interfaces:**
- Consumes: `Transaction` (Task 1); `Order`, `Purchase`, `generateId` (`src/types`).
- Produces: `db.transactions: Table<Transaction>` — usado por `financeSync.ts` (Task 4) e `transactionService` (Task 5).

- [ ] **Step 1: Adicionar a versão 3 em `src/data/db.ts`**

```typescript
import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Product, Purchase, Order, Settings } from '../types';
import { generateId } from '../types';
import type { Transaction } from '../types/financial';

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
      return Promise.all([
        tx.table('products').toCollection().modify(product => {
          if (!('isExample' in product)) product.isExample = false;
        }),
        tx.table('purchases').toCollection().modify(purchase => {
          if (!('isExample' in purchase)) purchase.isExample = false;
        }),
        tx.table('orders').toCollection().modify(order => {
          if (!('isExample' in order)) order.isExample = false;
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
            const due = new Date(first);
            due.setMonth(due.getMonth() + i);
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
```

- [ ] **Step 2: Verificar que o projeto compila**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 3: Verificar a migração manualmente**

Run: `npm run dev`, abrir o app no navegador com dados de exemplo já criados (de uma sessão anterior) e checar no painel de DevTools → Application → IndexedDB → LaPoliDB → `transactions` que os registros foram gerados a partir dos pedidos/compras existentes. Se o IndexedDB estiver vazio (primeiro uso), os dados de exemplo só existirão depois da Task 4 (que liga `financeSync` ao `seedExampleData`), então este passo pode ser revisitado então.

- [ ] **Step 4: Commit**

```bash
git add src/data/db.ts
git commit -m "feat(financeiro): migração Dexie v3 com a tabela transactions"
```

---

### Task 4: Sincronização automática (`src/data/financeSync.ts`)

**Files:**
- Create: `src/data/financeSync.ts`
- Modify: `src/data/services.ts` (`purchaseService`, `orderService`)

**Interfaces:**
- Consumes: `db.transactions` (Task 3); `Transaction`, `TransactionOrigin` (Task 1); `Order`, `Purchase`, `generateId` (`src/types`).
- Produces: `syncOrderTransactions(order): Promise<void>`, `syncPurchaseTransactions(purchase): Promise<void>`, `removeTransactionsFor(originId): Promise<void>` — chamados por `orderService`/`purchaseService` (Task 5 em diante dependem dos dados que isso gera).

- [ ] **Step 1: Implementar `src/data/financeSync.ts`**

```typescript
import { db } from './db';
import { generateId } from '../types';
import type { Order, Purchase } from '../types';
import type { Transaction, TransactionOrigin } from '../types/financial';

type Draft = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

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
    order.signalAmount > 0
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
 * Compra à vista ou parcelada. `paymentDate` só é definido automaticamente na CRIAÇÃO (compra à vista já
 * quitada); em compras parceladas nasce sempre em aberto — quem marca uma parcela como paga é o
 * usuário, na tela Movimentações (ver limitação documentada na spec: o schema de Purchase não guarda
 * qual parcela foi paga).
 */
export async function syncPurchaseTransactions(purchase: Purchase): Promise<void> {
  const n = Math.max(1, purchase.installments ?? 1);
  const drafts: Draft[] = [];

  if (n <= 1) {
    drafts.push({
      type: 'despesa',
      description: `Compra: ${purchase.material}`,
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
      const due = new Date(first);
      due.setMonth(due.getMonth() + i);
      const isLast = i === n - 1;
      const amount = isLast ? Math.round((purchase.totalPaid - base * (n - 1)) * 100) / 100 : base;
      drafts.push({
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
        totalInstallments: n
      });
    }
  }

  await upsertAutoTransactions(purchase.id, 'compra', drafts, false);
}

/** Remove todos os Transaction ligados a um pedido ou compra excluído. */
export async function removeTransactionsFor(originId: string): Promise<void> {
  const existing = await db.transactions.where('originId').equals(originId).toArray();
  if (existing.length) await db.transactions.bulkDelete(existing.map(t => t.id));
}
```

- [ ] **Step 2: Ligar ao `purchaseService` (`src/data/services.ts:49-95`)**

```typescript
import { removeTransactionsFor, syncOrderTransactions, syncPurchaseTransactions } from './financeSync';

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
    const products = await db.products.toArray();
    const productsUsingPurchase = products.filter(p => p.materials.some(m => m.purchaseId === id));

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
```

- [ ] **Step 3: Ligar ao `orderService` (`src/data/services.ts:97-133`)**

```typescript
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
```

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`. Em Pedidos, crie um pedido novo com sinal > 0 e confira (DevTools → Application → IndexedDB → `transactions`) que apareceu um registro `origin: 'pedido_sinal'`. Edite o sinal recebido e confirme que o mesmo registro foi atualizado (não duplicado). Em Estoque, registre uma compra parcelada em 2x e confirme 2 registros `origin: 'compra'` com `installmentNumber` 1 e 2. Exclua essa compra e confirme que os 2 registros desaparecem.

- [ ] **Step 5: Commit**

```bash
git add src/data/financeSync.ts src/data/services.ts
git commit -m "feat(financeiro): sincroniza pedidos e compras com Transaction automaticamente"
```

---

### Task 5: `transactionService` (lançamentos manuais)

**Files:**
- Modify: `src/data/services.ts`

**Interfaces:**
- Consumes: `db.transactions` (Task 3); `Transaction` (Task 1).
- Produces: `transactionService.getAll/create/update/delete` — usado pela tela Movimentações (Task 6).

- [ ] **Step 1: Adicionar `transactionService` em `src/data/services.ts`**

Logo depois do `orderService` (antes de `settingsService`):

```typescript
import type { Transaction } from '../types/financial';

export const transactionService = {
  async getAll(): Promise<Transaction[]> {
    return await db.transactions.toArray();
  },

  async create(t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'origin' | 'originId'>): Promise<Transaction> {
    const now = new Date();
    const newTransaction: Transaction = {
      ...t,
      id: generateId(),
      origin: 'manual',
      createdAt: now,
      updatedAt: now
    };
    await db.transactions.add(newTransaction);
    return newTransaction;
  },

  /** Automáticos só aceitam marcar/desmarcar `paymentDate` (pago/recebido); o resto se edita na origem. */
  async update(id: string, updates: Partial<Transaction>): Promise<void> {
    const existing = await db.transactions.get(id);
    if (!existing) return;

    if (existing.origin !== 'manual') {
      const onlyPaymentDate = Object.keys(updates).every(k => k === 'paymentDate');
      if (!onlyPaymentDate) {
        throw new Error('Este lançamento foi gerado automaticamente. Edite o pedido ou a compra de origem.');
      }
      await db.transactions.update(id, { paymentDate: updates.paymentDate, updatedAt: new Date() });
      return;
    }

    await db.transactions.update(id, { ...updates, updatedAt: new Date() });
  },

  async delete(id: string): Promise<void> {
    const existing = await db.transactions.get(id);
    if (existing && existing.origin !== 'manual') {
      throw new Error('Este lançamento foi gerado automaticamente. Exclua o pedido ou a compra de origem.');
    }
    await db.transactions.delete(id);
  }
};
```

- [ ] **Step 2: Verificar que o projeto compila**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/data/services.ts
git commit -m "feat(financeiro): transactionService para lançamentos manuais"
```

---

### Task 6: Tela Movimentações (`src/screens/Transactions.tsx`)

**Files:**
- Create: `src/screens/Transactions.tsx`

**Interfaces:**
- Consumes: `transactionService`, `orderService`, `purchaseService` (`src/data/services.ts`); `transactionStatus` (Task 1); `formatCurrency`, `formatDate` (`src/calculations/index.ts`); `Chips`, `Tabs`, `KV` (`src/components/ui.tsx`); `Input`, `Select` (`src/components/Input.tsx`); `Modal` (`src/components/Modal.tsx`); `Button` (`src/components/Button.tsx`); `EmptyState`; `SkeletonGrid`; `ScreenLayout`; `notify`.
- Produces: rota `/financeiro/movimentacoes` (ligada na Task 8); `TransactionFormModal` exportado, reaproveitado pela tela Financeiro (Task 7) para o botão "Lançar".

- [ ] **Step 1: Implementar `src/screens/Transactions.tsx`**

```typescript
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Check, ExternalLink, Plus, Search } from 'lucide-react';
import { orderService, purchaseService, transactionService } from '../data/services';
import type { Order, Purchase } from '../types';
import { generateId } from '../types';
import type { Transaction, TransactionType } from '../types/financial';
import { transactionStatus } from '../types/financial';
import { formatCurrency, formatDate } from '../calculations';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { Chips, Tabs } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { SkeletonGrid } from '../components/Skeleton';
import { ScreenLayout } from '../components/ScreenLayout';
import { notify } from '../utils/notify';

const INCOME_CATEGORIES = ['Pedidos de clientes', 'Vendas avulsas', 'Outras receitas'];
const EXPENSE_CATEGORIES = ['Materiais', 'Embalagens e etiquetas', 'Ferramentas', 'Frete e entregas', 'Taxas e comissões', 'Marketing e divulgação', 'Impostos e taxas', 'Contas fixas', 'Retirada da dona', 'Outras'];
const ACCOUNTS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência'];

interface TransactionFormModalProps {
  isOpen: boolean;
  initialType: TransactionType;
  onClose: () => void;
  onSaved: () => void;
}

/** Lançamento manual rápido: tipo, valor, categoria, data e conta bastam. */
export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ isOpen, initialType, onClose, onSaved }) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [account, setAccount] = useState(ACCOUNTS[0]);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setCategory('');
      setError(undefined);
    }
  }, [isOpen, initialType]);

  const categories = type === 'receita' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const save = async () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!description.trim()) return setError('Descreva o lançamento.');
    if (!(value > 0)) return setError('Informe um valor.');
    if (!category) return setError('Escolha uma categoria.');

    await transactionService.create({
      type,
      description: description.trim(),
      amount: value,
      category,
      date: new Date(`${date}T00:00:00`),
      paymentDate: new Date(`${date}T00:00:00`),
      account
    });
    notify({ type: 'success', message: 'Lançamento registrado', detail: `${description.trim()}: ${formatCurrency(value)}` });
    setDescription('');
    setAmount('');
    onSaved();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'receita' ? 'Nova entrada' : 'Nova saída'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="full">
          <Chips label="Tipo" value={type} onChange={setType} options={[{ value: 'receita', label: 'Entrada' }, { value: 'despesa', label: 'Saída' }]} />
        </div>
        <Input label="Descrição" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex.: Agulhas de crochê" fullWidth error={error} />
        <Input label="Valor" type="number" min={0} step="0.01" inputMode="decimal" prefix="R$" value={amount} onChange={e => setAmount(e.target.value)} fullWidth />
        <Select label="Categoria" value={category} onChange={e => setCategory(e.target.value)} fullWidth>
          <option value="">Escolha…</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} fullWidth />
        <Select label="Conta" value={account} onChange={e => setAccount(e.target.value)} fullWidth>
          {ACCOUNTS.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
      </div>
    </Modal>
  );
};

type MoveTab = 'realizado' | 'previsto';

export const TransactionsScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<MoveTab>('realizado');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [formOpen, setFormOpen] = useState<TransactionType | null>(null);

  const load = async () => {
    const [t, o, p] = await Promise.all([transactionService.getAll(), orderService.getAll(), purchaseService.getAll()]);
    setTransactions(t);
    setOrders(o);
    setPurchases(p);
    setLoaded(true);
  };

  useEffect(() => {
    void load();
  }, []);

  const originLink = (t: Transaction): string | null => {
    if (t.origin === 'pedido_sinal' || t.origin === 'pedido_saldo') return `/orders/${t.originId}`;
    if (t.origin === 'compra') return `/stock/${encodeURIComponent(purchases.find(p => p.id === t.originId)?.material ?? '')}`;
    return null;
  };

  const categories = useMemo(() => Array.from(new Set(transactions.map(t => t.category))).sort(), [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter(t => (tab === 'realizado' ? !!t.paymentDate : !t.paymentDate))
      .filter(t => category === 'all' || t.category === category)
      .filter(t => !q || t.description.toLowerCase().includes(q))
      .sort((a, b) => {
        const da = new Date(tab === 'realizado' ? (a.paymentDate as Date) : a.date).getTime();
        const db = new Date(tab === 'realizado' ? (b.paymentDate as Date) : b.date).getTime();
        return tab === 'realizado' ? db - da : da - db;
      });
  }, [transactions, tab, category, search]);

  const total = filtered.reduce((s, t) => s + (t.type === 'receita' ? t.amount : -t.amount), 0);

  const markPaid = async (t: Transaction) => {
    await transactionService.update(t.id, { paymentDate: new Date() });
    notify({ type: 'success', message: t.type === 'receita' ? 'Recebimento confirmado' : 'Pagamento confirmado' });
    await load();
  };

  if (!loaded) {
    return (
      <ScreenLayout title="Movimentações">
        <SkeletonGrid count={3} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      title="Movimentações"
      subtitle="Entradas e saídas, uma única vez cada. Pagamentos de pedidos e compras já aparecem sozinhos."
      action={
        <>
          <Button variant="secondary" icon={<ArrowUpRight size={18} />} onClick={() => setFormOpen('despesa')}>Nova saída</Button>
          <Button icon={<ArrowDownLeft size={18} />} onClick={() => setFormOpen('receita')}>Nova entrada</Button>
        </>
      }
    >
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'realizado', label: 'Realizado' }, { value: 'previsto', label: 'Previsto' }]} />

      <div className="row-wrap mt-16">
        <Input icon={<Search size={16} />} placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar movimentação" />
      </div>
      {categories.length > 0 && (
        <Chips
          label="Categoria"
          value={category}
          onChange={setCategory}
          options={[{ value: 'all', label: 'Todas' }, ...categories.map(c => ({ value: c, label: c }))]}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={tab === 'realizado' ? 'Nenhuma movimentação ainda' : 'Nada previsto'}
          description="Registre uma compra, receba um sinal ou lance uma despesa para começar."
          action={{ label: 'Lançar movimentação', onClick: () => setFormOpen('receita') }}
        />
      ) : (
        <div className="card pad-0 mt-16">
          <div className="rows" style={{ padding: '0 12px 8px' }}>
            {filtered.map(t => {
              const link = originLink(t);
              const status = transactionStatus(t);
              return (
                <div key={t.id} className="li" style={{ padding: 12 }}>
                  <span className={`dot-ic ${t.type === 'receita' ? 's' : 'n'}`}>
                    {t.type === 'receita' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </span>
                  <div className="grow">
                    <div className="t" style={{ fontWeight: 500 }}>{t.description}</div>
                    <div className="s">
                      {formatDate(tab === 'realizado' ? (t.paymentDate as Date) : t.date)} · {t.category} · {t.account}
                      {status === 'atrasado' && <span className="neg"> · atrasado</span>}
                      {t.installmentNumber && ` · parcela ${t.installmentNumber}/${t.totalInstallments}`}
                    </div>
                  </div>
                  <b className={`num ${t.type === 'receita' ? 'pos' : ''}`}>
                    {t.type === 'receita' ? '+' : '−'}{formatCurrency(t.amount)}
                  </b>
                  {tab === 'previsto' && (
                    <Button size="sm" variant="secondary" icon={<Check size={16} />} onClick={() => markPaid(t)}>
                      {t.type === 'receita' ? 'Recebido' : 'Pago'}
                    </Button>
                  )}
                  {link && (
                    <Link className="btn btn-ghost btn-icon btn-sm" to={link} aria-label="Abrir origem" title="Abrir origem">
                      <ExternalLink size={16} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
          <div className="kv total" style={{ padding: '12px 24px' }}>
            <span className="k">Total do filtro</span>
            <span className="v">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      <TransactionFormModal isOpen={formOpen !== null} initialType={formOpen ?? 'receita'} onClose={() => setFormOpen(null)} onSaved={load} />
    </ScreenLayout>
  );
};
```

- [ ] **Step 2: Verificar que o projeto compila**

Run: `npm run build`
Expected: compila sem erros. Se `Chips`/`Tabs` não aceitarem o tipo genérico usado (`TransactionType`/`MoveTab`), ajuste as assinaturas conforme `src/components/ui.tsx` (ambos já são genéricos sobre `T extends string`).

- [ ] **Step 3: Verificar manualmente (depois da Task 8, quando a rota existir)**

Abrir `/financeiro/movimentacoes`, lançar uma entrada e uma saída manuais, confirmar que aparecem na lista e no total, marcar uma delas como paga na aba "Previsto" (crie uma compra parcelada em Estoque para ter algo "previsto" de verdade) e confirmar que ela migra para "Realizado".

- [ ] **Step 4: Commit**

```bash
git add src/screens/Transactions.tsx
git commit -m "feat(financeiro): tela Movimentações com lançamento manual e marcar pago/recebido"
```

---

### Task 7: Tela Financeiro (`src/screens/Financeiro.tsx`)

**Files:**
- Create: `src/screens/Financeiro.tsx`
- Modify: `src/components/charts.tsx` (novo `CashLineChart`)

**Interfaces:**
- Consumes: `calculateCashFlow`, `cashSeries`, `calculatePeriodResult`, `forecastEntries` (Task 2); `transactionService`, `orderService`, `productService`, `purchaseService`, `settingsService` (`src/data/services.ts`); `periodRange`, `PeriodKey` (`src/calculations/period.ts`); `TransactionFormModal` (Task 6); `Lens`, `Tip`, `Segmented` (`src/components/ui.tsx`).
- Produces: rota `/financeiro` (Task 8).

- [ ] **Step 1: Adicionar `CashLineChart` em `src/components/charts.tsx`**

```typescript
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../calculations';

const dshort = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Evolução do saldo de caixa no período (gráfico de linha, com eixo e tooltip). */
export const CashLineChart: React.FC<{ points: { date: Date; balance: number }[] }> = ({ points }) => {
  const data = points.map(p => ({ label: dshort(p.date), value: p.balance }));
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(data.length / 6))} />
          <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={v => formatCurrency(v).replace('R$', '').trim()} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={l => `Dia ${l}`} />
          <Line type="monotone" dataKey="value" stroke="var(--color-secondary)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

- [ ] **Step 2: Implementar `src/screens/Financeiro.tsx`**

```typescript
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Clock, History, Info, List, Plus, Scale, TrendingUp, Wallet } from 'lucide-react';
import { orderService, productService, purchaseService, settingsService, transactionService } from '../data/services';
import type { Order, Product, Purchase, Settings } from '../types';
import type { Transaction } from '../types/financial';
import { calculateCashFlow, calculatePeriodResult, cashSeries, forecastEntries } from '../calculations/finance';
import { periodRange, type PeriodKey } from '../calculations/period';
import { formatCurrency, formatDate } from '../calculations';
import { CashLineChart } from '../components/charts';
import { Lens, Segmented, Tip } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { SkeletonGrid } from '../components/Skeleton';
import { ScreenLayout } from '../components/ScreenLayout';
import { Button } from '../components/Button';
import { TransactionFormModal } from './Transactions';

type FinTab = 'caixa' | 'resultado';

export const FinanceiroScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [tab, setTab] = useState<FinTab>('caixa');
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    const [t, o, p, pu, s] = await Promise.all([
      transactionService.getAll(),
      orderService.getAll(),
      productService.getAll(),
      purchaseService.getAll(),
      settingsService.initializeDefault()
    ]);
    setTransactions(t);
    setOrders(o);
    setProducts(p);
    setPurchases(pu);
    setSettings(s);
  };

  useEffect(() => {
    void load();
  }, []);

  const range = useMemo(() => periodRange(period, new Date()), [period]);

  if (!settings) {
    return (
      <ScreenLayout title="Financeiro">
        <SkeletonGrid count={3} />
      </ScreenLayout>
    );
  }

  if (transactions.length === 0) {
    return (
      <ScreenLayout
        title="Financeiro"
        subtitle="Duas visões do mesmo ateliê: o dinheiro que se mexeu e o que realmente sobrou."
        action={
          <Button icon={<Plus size={18} />} onClick={() => setFormOpen(true)}>Lançar</Button>
        }
      >
        <EmptyState
          icon={<Wallet size={48} />}
          title="Ainda não há movimentações"
          description="Quando você registrar compras, receber sinais ou lançar despesas, o caixa e o resultado do ateliê aparecem aqui."
          action={{ label: 'Lançar movimentação', onClick: () => setFormOpen(true) }}
        />
        <TransactionFormModal isOpen={formOpen} initialType="receita" onClose={() => setFormOpen(false)} onSaved={load} />
      </ScreenLayout>
    );
  }

  const cash = calculateCashFlow(transactions, settings, range);
  const series = cashSeries(transactions, settings, range);
  const receivable = forecastEntries(transactions, 'receita');
  const result = calculatePeriodResult(orders, products, purchases, transactions, settings, range);

  return (
    <ScreenLayout
      title="Financeiro"
      subtitle="Duas visões do mesmo ateliê: o dinheiro que se mexeu e o que realmente sobrou."
      action={
        <>
          <Link className="btn btn-secondary" to="/financeiro/movimentacoes">
            <List size={18} /> Movimentações
          </Link>
          <Button icon={<Plus size={18} />} onClick={() => setFormOpen(true)}>Lançar</Button>
        </>
      }
    >
      <div className="layer-switch" role="tablist" aria-label="Escolha a visão">
        <button role="tab" aria-selected={tab === 'caixa'} className="ls" onClick={() => setTab('caixa')}>
          <Wallet size={22} />
          <span><b>Fluxo de caixa</b><span className="small muted" style={{ display: 'block' }}>Dinheiro que entrou e saiu de verdade</span></span>
        </button>
        <button role="tab" aria-selected={tab === 'resultado'} className="ls" onClick={() => setTab('resultado')}>
          <BarChart3 size={22} />
          <span><b>Resultado do negócio</b><span className="small muted" style={{ display: 'block' }}>O que o ateliê realmente ganhou</span></span>
        </button>
      </div>

      <div className="row between wrap-sm mt-16">
        <span className="eyebrow">{range.label}</span>
        <Segmented
          label="Período"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'month', label: 'Este mês' },
            { value: 'lastMonth', label: 'Mês passado' },
            { value: 'week', label: '7 dias' },
            { value: 'year', label: 'Ano' }
          ]}
        />
      </div>

      {tab === 'caixa' ? (
        <>
          <div className="grid g-4 keep2 mt-16">
            <div className="card metric">
              <div className="m-top"><span className="m-label">Saldo de caixa</span><Lens kind="caixa" /></div>
              <div className="m-val">{formatCurrency(cash.balance)}</div>
              <div className="m-note">Começou o período com {formatCurrency(cash.opening)}.</div>
            </div>
            <div className="card metric">
              <div className="m-top"><span className="m-label">Entradas</span></div>
              <div className="m-val pos">{formatCurrency(cash.inflow)}</div>
              <div className="m-note">Sinais e saldos recebidos.</div>
            </div>
            <div className="card metric">
              <div className="m-top"><span className="m-label">Saídas</span></div>
              <div className="m-val">{formatCurrency(cash.outflow)}</div>
              <div className="m-note">Compras {formatCurrency(cash.purchases)} · despesas {formatCurrency(cash.expenses)}.</div>
            </div>
            <div className="card metric">
              <div className="m-top">
                <span className="m-label">Variação no período</span>
                <Tip text="Entradas menos saídas. Não é lucro: inclui sinais de pedidos ainda não entregues e material comprado que ainda não foi usado." />
              </div>
              <div className={`m-val ${cash.net < 0 ? 'neg' : 'pos'}`}>{cash.net >= 0 ? '+' : ''}{formatCurrency(cash.net)}</div>
              <div className="m-note">Não é o lucro.</div>
            </div>
          </div>

          <div className="card mt-16">
            <div className="card-head"><h2><TrendingUp size={20} /> Evolução do caixa</h2></div>
            {series.length > 1 ? <CashLineChart points={series} /> : <EmptyState compact title="Poucos dias para desenhar" description="Escolha um período maior." />}
          </div>

          <div className="card mt-16">
            <div className="card-head">
              <h2><Clock size={20} /> A receber <Lens kind="prev" /></h2>
              <span className="num"><b>{formatCurrency(receivable.reduce((s, f) => s + f.transaction.amount, 0))}</b></span>
            </div>
            <p className="small muted" style={{ margin: '-8px 0 8px' }}>Dinheiro combinado, mas que ainda não entrou. Não está no saldo acima.</p>
            <div className="rows">
              {receivable.slice(0, 5).map(f => (
                <Link key={f.transaction.id} className="li click" to={f.transaction.originId ? `/orders/${f.transaction.originId}` : '/financeiro/movimentacoes'} style={{ padding: 12 }}>
                  <span className={`dot-ic ${f.late ? 'e' : 'n'}`}><Clock size={18} /></span>
                  <div className="grow">
                    <div className="t" style={{ fontWeight: 500 }}>{f.transaction.description}</div>
                    <div className="s">{f.transaction.category} · {formatDate(f.transaction.date)}{f.late ? <span className="neg"> · atrasado</span> : null}</div>
                  </div>
                  <b className="num">{formatCurrency(f.transaction.amount)}</b>
                </Link>
              ))}
            </div>
            {receivable.length > 5 && (
              <p className="small muted mt-8">
                + {receivable.length - 5} valores a receber. <Link to="/financeiro/movimentacoes">Ver todos</Link>
              </p>
            )}
          </div>

          <div className="card mt-16 pad-0">
            <div className="card-head" style={{ padding: '20px 24px 0' }}>
              <h2><History size={20} /> Últimas movimentações</h2>
              <Link className="link-btn" to="/financeiro/movimentacoes">Ver todas <ArrowRight size={16} /></Link>
            </div>
          </div>
        </>
      ) : result.revenue === 0 ? (
        <div className="mt-16">
          <EmptyState icon={<BarChart3 size={48} />} title="Sem vendas entregues neste período" description="O resultado só considera pedidos entregues. Sinais recebidos de pedidos em andamento aparecem no caixa, não aqui." />
        </div>
      ) : (
        <div className="card pad-0 mt-16">
          <div className="card-head" style={{ padding: '20px 24px 0' }}>
            <h2><BarChart3 size={20} /> Do faturamento ao lucro</h2>
            <Lens kind="lucro" />
          </div>
          <div className="table-wrap">
            <table className="table dre">
              <tbody>
                <tr className="rev">
                  <td>Receita reconhecida<div className="sub">Pedidos entregues no período ({result.deliveredCount})</div></td>
                  <td className="right num"><b>{formatCurrency(result.revenue)}</b></td>
                </tr>
                <tr>
                  <td>(−) Materiais usados nas peças vendidas<div className="sub">Custo médio dos fios e insumos de cada peça</div></td>
                  <td className="right num"><b>−{formatCurrency(result.materialCost)}</b></td>
                </tr>
                <tr>
                  <td>(−) Embalagem e outros custos das peças<div className="sub">Estimativa cadastrada em cada produto</div></td>
                  <td className="right num"><b>−{formatCurrency(result.otherCosts)}</b></td>
                </tr>
                <tr className="calc">
                  <td>(−) Seu trabalho (horas × valor da hora) <Tip text="O valor do seu trabalho entra no resultado para o preço refletir suas horas, mas nunca sai do caixa. Por isso lucro e caixa são diferentes." /></td>
                  <td className="right num"><b>−{formatCurrency(result.laborCost)}</b></td>
                </tr>
                <tr className="sub">
                  <td>= Lucro bruto</td>
                  <td className={`right num ${result.grossProfit < 0 ? 'neg' : 'pos'}`}><b>{formatCurrency(result.grossProfit)}</b></td>
                </tr>
                <tr>
                  <td>(−) Despesas operacionais<div className="sub">Impostos, frete, divulgação</div></td>
                  <td className="right num"><b>−{formatCurrency(result.opEx)}</b></td>
                </tr>
                <tr className="total">
                  <td>= Lucro do período<div className="sub">Margem de {result.margin.toFixed(1)}%</div></td>
                  <td className={`right num ${result.profit < 0 ? 'neg' : 'pos'}`}><b>{formatCurrency(result.profit)}</b></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="card mt-24 bridge">
        <div className="card-head"><h2><Scale size={20} /> Por que o caixa não é igual ao lucro?</h2></div>
        <p className="muted" style={{ marginBottom: 12 }}>
          Sinais de pedidos ainda não entregues entram no caixa, mas só viram faturamento na entrega. Material comprado só é
          custo quando é consumido numa peça vendida — o que foi comprado e ainda não usado fica parado no estoque, não no lucro.
        </p>
        <Info size={16} />
      </section>

      <TransactionFormModal isOpen={formOpen} initialType="receita" onClose={() => setFormOpen(false)} onSaved={load} />
    </ScreenLayout>
  );
};
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 4: Verificar manualmente (depois da Task 8, quando a rota existir)**

Abrir `/financeiro` com os dados de exemplo: confirmar que a aba Caixa mostra saldo/entradas/saídas coerentes com as Movimentações, que "A receber" lista o pedido de exemplo (saldo ainda não pago), e que a aba Resultado mostra "Sem vendas entregues" (o pedido de exemplo não está Entregue). Marcar o pedido de exemplo como Entregue e confirmar que a aba Resultado passa a mostrar a DRE.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Financeiro.tsx src/components/charts.tsx
git commit -m "feat(financeiro): tela Financeiro com abas Caixa/Resultado e gráfico de evolução"
```

---

### Task 8: Navegação e rotas

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Navigation.tsx`

**Interfaces:**
- Consumes: `FinanceiroScreen` (Task 7), `TransactionsScreen` (Task 6).

- [ ] **Step 1: Adicionar as rotas em `src/App.tsx`**

```typescript
import { FinanceiroScreen } from './screens/Financeiro';
import { TransactionsScreen } from './screens/Transactions';
```

E, dentro de `<Routes>`, depois de `<Route path="/stock/:key" .../>`:

```typescript
            <Route path="/financeiro" element={<FinanceiroScreen />} />
            <Route path="/financeiro/movimentacoes" element={<TransactionsScreen />} />
```

- [ ] **Step 2: Adicionar o item de menu em `src/components/Navigation.tsx`**

Import do ícone (linha do `lucide-react`):

```typescript
  Wallet,
```

No array `NAV_ITEMS`, depois do item `stock`:

```typescript
  { id: 'finance', label: 'Financeiro', path: '/financeiro', icon: <Wallet size={22} />, group: 'Dia a dia' },
```

E em `BottomNavigation`, a barra inferior só tem espaço para 5 abas (hoje: Início, Pedidos, Produtos, Estoque, Mais) — trocar "Estoque" por um item "Mais" não é o objetivo aqui. Financeiro entra no trilho de ícones (tablet) e no menu lateral (desktop) via `NAV_ITEMS`/`SideNavigation` automaticamente; no celular ele fica acessível a partir da tela Visão geral (sem mudar a barra inferior, para não estourar 5 abas).

- [ ] **Step 3: Verificar que o projeto compila e navega**

Run: `npm run build`
Run: `npm run dev`, abrir o app, clicar em "Financeiro" no menu lateral e confirmar que a tela carrega; clicar em "Movimentações" dentro dela e confirmar que navega para `/financeiro/movimentacoes`.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/Navigation.tsx
git commit -m "feat(financeiro): adiciona rotas e item de menu do Financeiro"
```

---

### Task 9: Dashboard usa `finance.ts`; remove o cálculo provisório de `period.ts`

**Files:**
- Modify: `src/screens/Dashboard.tsx`
- Modify: `src/calculations/period.ts`
- Modify: `src/calculations/period.test.ts`

**Interfaces:**
- Consumes: `calculateCashFlow`, `calculatePeriodResult`, `cashByDay` (Task 2, `finance.ts`); `transactionService` (Task 5).

- [ ] **Step 1: Atualizar os imports e o carregamento de dados em `src/screens/Dashboard.tsx`**

Troca o import de `../calculations/period`:

```typescript
import {
  greetingFor,
  periodRange,
  type PeriodKey
} from '../calculations/period';
import { calculateCashFlow, calculatePeriodResult, cashByDay } from '../calculations/finance';
```

Adiciona `transactions` ao estado e ao carregamento (perto de `purchases`):

```typescript
  const [transactions, setTransactions] = useState<Transaction[]>([]);
```

```typescript
    Promise.all([orderService.getAll(), productService.getAll(), purchaseService.getAll(), transactionService.getAll(), settingsService.initializeDefault()]).then(
      ([ords, prods, purch, trans, sett]) => {
        if (!alive) return;
        setOrders(ords);
        setProducts(prods);
        setPurchases(purch);
        setTransactions(trans);
        setSettings(sett);
      }
    );
```

Com os imports correspondentes:

```typescript
import { orderService, productService, purchaseService, settingsService, transactionService } from '../data/services';
import type { Order, Product, Purchase, Settings } from '../types';
import type { Transaction } from '../types/financial';
```

- [ ] **Step 2: Trocar as chamadas de cálculo**

```typescript
  const result = calculatePeriodResult(orders, products, purchases, transactions, settings, range);
  const cash = calculateCashFlow(transactions, settings, range);
```

E, mais abaixo:

```typescript
  const days14 = cashByDay(transactions, 14);
```

- [ ] **Step 3: Ajustar as referências a `cash.received`/`cash.spent` para `cash.inflow`/`cash.outflow`**

Nas linhas do "money-strip" (`cash.received` → `cash.inflow`, `cash.spent` → `cash.outflow`):

```typescript
            <div className="display-num">{formatCurrency(cash.inflow)}</div>
            <p>
              Dinheiro que <b>entrou</b> (sinais e saldos com data registrada). Saiu em compras: <b>{formatCurrency(cash.outflow)}</b>.
            </p>
```

- [ ] **Step 4: Remover o cálculo provisório de `src/calculations/period.ts`**

Apagar `CashEvent`, `cashEvents`, `CashResult`, `calculateCash`, `cashByDay`, `PeriodResult` e `calculatePeriodResult` (tudo a partir do comentário "Quando a venda conta..." até o fim do arquivo, exceto `greetingFor`). O arquivo final mantém só `PeriodKey`, `PeriodRange`, `periodRange`, `inRange` e `greetingFor`.

- [ ] **Step 5: Atualizar `src/calculations/period.test.ts`**

Remover os imports e os blocos `describe('Faturamento e lucro', ...)` e `describe('Caixa', ...)` (já cobertos, para o novo modelo, por `finance.test.ts`). Fica só:

```typescript
import { describe, it, expect } from 'vitest';
import { periodRange, greetingFor, inRange } from './period';

const now = new Date(2026, 9, 22, 15, 0); // 22/10/2026

describe('Períodos', () => {
  it('mês atual vai do dia 1 até hoje', () => {
    const r = periodRange('month', now);
    expect(r.start.getDate()).toBe(1);
    expect(inRange(new Date(2026, 9, 22, 23, 0), r)).toBe(true);
    expect(inRange(new Date(2026, 9, 23), r)).toBe(false);
  });

  it('mês passado cobre o mês inteiro anterior', () => {
    const r = periodRange('lastMonth', now);
    expect(r.start.getMonth()).toBe(8);
    expect(inRange(new Date(2026, 8, 30, 12), r)).toBe(true);
    expect(inRange(new Date(2026, 9, 1), r)).toBe(false);
  });

  it('saúda conforme a hora', () => {
    expect(greetingFor(new Date(2026, 0, 1, 8))).toBe('Bom dia');
    expect(greetingFor(new Date(2026, 0, 1, 15))).toBe('Boa tarde');
    expect(greetingFor(new Date(2026, 0, 1, 21))).toBe('Boa noite');
  });
});
```

- [ ] **Step 6: Rodar os testes e o build**

Run: `npm test`
Expected: PASS em todos os arquivos (`finance.test.ts`, `period.test.ts`, `index.test.ts`, `design.test.ts`).
Run: `npm run build`
Expected: compila sem erros (nenhuma referência a `calculateCash`/`cashEvents`/`CashResult` deve sobrar).

- [ ] **Step 7: Verificar manualmente**

Abrir o Dashboard e confirmar que o "Resumo financeiro" (faturamento, caixa, lucro) e o gráfico "Atividade recente" continuam mostrando números coerentes com a tela Financeiro.

- [ ] **Step 8: Commit**

```bash
git add src/screens/Dashboard.tsx src/calculations/period.ts src/calculations/period.test.ts
git commit -m "refactor(financeiro): Dashboard passa a usar finance.ts; remove o cálculo provisório de period.ts"
```

---

### Task 10: Backup inclui `transactions`; campo de saldo inicial em Configurações

**Files:**
- Modify: `src/data/services.ts` (`backupService`)
- Modify: `src/screens/Settings.tsx`

**Interfaces:**
- Consumes: `transactionService` (Task 5); `db.transactions` (Task 3).

- [ ] **Step 1: Incluir `transactions` no `exportData` (`src/data/services.ts`)**

```typescript
  async exportData(): Promise<string> {
    const [products, purchases, orders, settings, transactions] = await Promise.all([
      productService.getAll(),
      purchaseService.getAll(),
      orderService.getAll(),
      settingsService.get(),
      transactionService.getAll()
    ]);

    const data = {
      version: '1.1',
      exportDate: new Date().toISOString(),
      products,
      purchases,
      orders,
      settings,
      transactions
    };

    return JSON.stringify(data, null, 2);
  },
```

- [ ] **Step 2: Aceitar `'1.0'` e `'1.1'` em `validateBackup`**

```typescript
    if (data.version !== '1.0' && data.version !== '1.1') {
      return { valid: false, error: `Versão incompatível: esperado 1.0 ou 1.1, recebido ${data.version}` };
    }
```

(A checagem de `data.transactions` fica fora de `validateBackup`: backups `'1.0'` legitimamente não têm o campo.)

- [ ] **Step 3: Importar `transactions` com fallback para backups antigos (`importData`)**

No bloco de backup em memória para rollback:

```typescript
      const [currentProducts, currentPurchases, currentOrders, currentSettings, currentTransactions] = await Promise.all([
        productService.getAll(),
        purchaseService.getAll(),
        orderService.getAll(),
        settingsService.get(),
        transactionService.getAll()
      ]);
```

No bloco de importação:

```typescript
        if (data.transactions) {
          await db.transactions.clear();
          await db.transactions.bulkAdd(data.transactions);
        }
```

E no rollback:

```typescript
        if (currentTransactions.length > 0) await db.transactions.bulkAdd(currentTransactions);
```

- [ ] **Step 4: Campo "Saldo inicial em caixa" em `src/screens/Settings.tsx`**

Na seção "Valores padrão" (`<Calculator size={20} /> Valores padrão`), depois do `Input` de "Horas de crochê por dia":

```typescript
              <Input label="Saldo inicial em caixa" type="number" step="0.01" inputMode="decimal" prefix="R$" value={settings.openingCash ?? 0} onChange={e => set({ openingCash: parseFloat(e.target.value) || 0 })} help="Quanto você já tinha em caixa antes de começar a registrar no Financeiro." fullWidth />
```

- [ ] **Step 5: Verificar que o projeto compila**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 6: Verificar manualmente**

Em Configurações, exportar um backup e confirmar (abrindo o `.json`) que `transactions` está presente e `version` é `"1.1"`. Importar esse mesmo arquivo de volta e confirmar que as movimentações continuam lá. Ajustar "Saldo inicial em caixa" para um valor diferente de zero e confirmar que o saldo em `/financeiro` muda de acordo.

- [ ] **Step 7: Commit**

```bash
git add src/data/services.ts src/screens/Settings.tsx
git commit -m "feat(financeiro): inclui transactions no backup e adiciona saldo inicial em caixa"
```

---

## Verificação final

- [ ] `npm run build` sem erros.
- [ ] `npm test` com todos os testes passando (`finance.test.ts` cobrindo o cenário obrigatório; `period.test.ts`, `index.test.ts`, `design.test.ts` inalterados).
- [ ] `npm run dev`: percorrer manualmente o fluxo completo — criar pedido com sinal → aparece em Movimentações e no "A receber" do Financeiro; registrar compra parcelada → aparecem as parcelas; marcar pedido como Entregue → aba Resultado mostra a DRE; exportar/importar backup → `transactions` preservado.
