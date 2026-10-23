# Módulo Financeiro — Design

## Contexto

O protótipo visual "Ateliê Aconchegante v2" (`design/`) foi portado para o app React em `ad9c753`, mas a parte financeira ficou de fora. O protótipo já tem a UI e a lógica de cálculo desenhadas em `design/js/screens-more.js` e `design/js/data.js` (funções `LP.ledger`, `LP.cash`, `LP.result`, `LP.forecastIn`, `LP.cashSeries`): duas telas, **Financeiro** (abas Caixa/Resultado) e **Movimentações**. Existe também `FINANCEIRO_PLAN.md`, um plano anterior e mais ambicioso (5 telas, modelo de dados `Transaction` completo) que nunca foi implementado.

Hoje o app já tem um cálculo financeiro rudimentar em `src/calculations/period.ts` (`cashEvents`, `calculateCash`, `cashByDay`), usado só pelo Dashboard, com o comentário explícito "O módulo Financeiro completo virá depois". Este design é esse "depois".

## Decisão de escopo

Confirmado com o usuário: implementar **as 2 telas já desenhadas no protótipo** (Financeiro e Movimentações), mas sobre o **modelo de dados `Transaction` completo** do `FINANCEIRO_PLAN.md`, para não precisar de outra migração de schema quando as telas de A Pagar/Receber, Resultado isolado e Contas/Fechamento forem construídas depois.

**Fora de escopo nesta entrega:**
- Telas dedicadas de A Pagar/Receber, Resultado (DRE) isolado, Contas e Fechamento.
- Tela de Configurações Financeiras (categorias e contas editáveis pela UI).
- Qualquer mudança em como `Order.paymentStatus` / `Purchase.paymentStatus` são hoje calculados — o Financeiro passa a *espelhar* essas datas, não a ser a fonte delas. Evita risco de regressão em Pedidos/Estoque, que já funcionam.

## Modelo de dados

### `Transaction` (novo tipo, `src/types/financial.ts`)

```typescript
export interface Transaction {
  id: string;
  type: 'receita' | 'despesa';
  description: string;
  amount: number; // em centavos (inteiro)
  category: string;
  date: Date; // data do evento (pagamento, se já ocorreu; prevista, se não)
  paymentDate?: Date; // preenchida = realizado; vazia = previsto
  account: string; // forma de pagamento (reaproveita Settings.paymentMethods)
  origin: 'manual' | 'pedido_sinal' | 'pedido_saldo' | 'compra';
  originId?: string; // id do pedido ou da compra
  installmentNumber?: number; // só para compra parcelada
  totalInstallments?: number;
  observations?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionStatus = 'previsto' | 'realizado' | 'atrasado';
export const transactionStatus = (t: Transaction, today: Date): TransactionStatus => { ... };
```

Simplificações deliberadas em relação ao `FINANCEIRO_PLAN.md` (para caber no escopo das 2 telas, sem perder a extensibilidade):
- Sem `fee`/`netAmount`, `isRecurring`, `proofAttachment`: nenhuma das 2 telas do protótipo usa esses campos. Dá para adicionar depois sem migração (campos opcionais).
- Uma única categoria `compra` em vez de `compra_avista`/`compra_parcela`: a diferença já está em `installmentNumber`/`totalInstallments`.
- Sem `estorno_pedido`: cancelamento de pedido com sinal recebido vira uma pergunta simples (reter ou devolver) tratada no `orderService`, gerando uma `despesa` manual de estorno quando "devolver" é escolhido — não precisa de um `origin` dedicado.

### Migração Dexie v3 (`src/data/db.ts`)

```typescript
this.version(3).stores({
  ...v2,
  transactions: 'id, type, category, origin, originId, date, paymentDate, account, createdAt, updatedAt'
}).upgrade(async tx => {
  // gera Transaction automáticos para orders e purchases existentes
  // (mesma lógica de syncOrderTransactions / syncPurchaseTransactions, ver abaixo)
  // idempotente: se já existir um Transaction com esse originId+origin, não duplica
});
```

### Sincronização automática (não um `transactionService` CRUD completo para os automáticos)

Pedidos e compras continuam sendo a fonte da verdade. Em vez de o usuário editar `Transaction` automáticos, `orderService` e `purchaseService` ganham uma sincronização interna:

- `orderService.create/update/delete` chama `syncOrderTransactions(order)` depois de salvar:
  - Sinal: 1 `Transaction` tipo receita, `origin: 'pedido_sinal'`, `amount = signalAmount`, `paymentDate = signalPaymentDate`. Só existe se `signalAmount > 0`.
  - Saldo: 1 `Transaction` tipo receita, `origin: 'pedido_saldo'`, `amount = agreedPrice - signalAmount`, `paymentDate = finalPaymentDate`. Só existe se o saldo for `> 0`.
  - `delete`: remove os Transaction ligados (`origin + originId`).
  - Pedido cancelado com sinal já com `paymentDate`: pergunta "Reter o sinal" (Transaction de sinal permanece) ou "Devolver" (cria uma `Transaction` manual de despesa, categoria "Estorno", ligada por `observations` ao pedido — sem `origin` dedicado).
- `purchaseService.create/update/delete` chama `syncPurchaseTransactions(purchase)`:
  - Sem parcelamento (`installments` vazio ou 1): 1 `Transaction` despesa, `origin: 'compra'`, `amount = totalPaid`, `date = paymentCompletionDate ?? purchase.date`.
  - Parcelado: N `Transaction` despesa, uma por parcela, `installmentNumber`/`totalInstallments` preenchidos, vencimento mensal a partir de `firstInstallmentDate`, valores somando exatamente `totalPaid` (resto de centavos na última parcela). **Limitação aceita**: como o schema atual de `Purchase` não guarda qual parcela já foi paga individualmente, todas as parcelas nascem com `paymentDate` vazia (previstas) exceto quando `paymentStatus === 'quitado'`, caso em que todas recebem `paymentDate = paymentCompletionDate`. Marcar uma parcela como paga nas Movimentações é possível (edita aquele `Transaction`), mas isso não volta a escrever em `Purchase` — é uma limitação conhecida, documentada na tela.
  - `delete`: remove todas as parcelas ligadas.

Essas funções de sync ficam em `src/data/financeSync.ts`, chamadas pelos services existentes — não um serviço novo com API própria para os automáticos.

### `transactionService` (para os manuais, `src/data/services.ts`)

CRUD simples igual aos outros services, só para `origin: 'manual'`:
```typescript
export const transactionService = {
  async getAll(): Promise<Transaction[]>
  async create(t: Omit<Transaction, 'id'|'createdAt'|'updatedAt'|'origin'>): Promise<Transaction> // força origin: 'manual'
  async update(id, updates): Promise<void> // só permite se origin === 'manual'
  async delete(id): Promise<void> // só permite se origin === 'manual'
}
```

## Cálculos (`src/calculations/finance.ts`)

Porte direto de `LP.ledger`/`LP.cash`/`LP.result`/`LP.forecastIn`/`LP.cashSeries` (design/js/data.js) para TypeScript, lendo de `Transaction[]` em vez de arrays mock:

```typescript
export interface CashFlowMetrics { opening: number; balance: number; inflow: number; outflow: number; purchases: number; expenses: number; net: number; }
export const calculateCashFlow = (transactions: Transaction[], settings: Settings, range: PeriodRange): CashFlowMetrics

export interface PeriodResultV2 { revenue: number; materialCost: number; otherCosts: number; laborCost: number; grossProfit: number; opEx: number; profit: number; margin: number; }
export const calculatePeriodResult = (orders: Order[], products: Product[], purchases: Purchase[], transactions: Transaction[], settings: Settings, range: PeriodRange): PeriodResultV2
// despesas operacionais = transactions manuais tipo despesa no período (exclui origin 'compra': compra entra no resultado só via consumo de material, não aqui)

export const forecastIn = (orders: Order[], transactions: Transaction[]): ForecastEntry[] // saldos/sinais previstos, com link para o pedido
export const cashSeries = (transactions: Transaction[], settings: Settings, range: PeriodRange): { date: Date; balance: number }[]
```

`Settings` ganha `openingCash: number` (saldo inicial em centavos) — único campo novo de configuração necessário para as 2 telas.

**Substitui** `cashEvents`/`calculateCash`/`cashByDay` de `period.ts` (ficam obsoletas e são removidas; `calculatePeriodResult` antigo também é substituído pela v2 acima). O Dashboard passa a usar as funções novas — "Regra de Ouro" do plano: um único lugar calcula cada número.

## Telas

### `src/screens/Financeiro.tsx` (rota `/financeiro`)

Porte de `LP.screens.finance()` + `cashView`/`resultView`/`bridge`:
- Cabeçalho com ações "Movimentações" e "Lançar" (abre o mesmo modal de lançamento manual).
- Seletor de período (hoje / 7 dias / mês atual / mês passado / tudo), reaproveitando `periodRange` de `period.ts`.
- Duas abas:
  - **Fluxo de caixa**: cards (saldo, entradas, saídas, variação do período), gráfico de evolução do saldo, "a receber" (via `forecastIn`), últimas movimentações.
  - **Resultado do negócio**: tabela estilo DRE (receita reconhecida → materiais/embalagem → mão de obra → lucro bruto → despesas operacionais → lucro), barra de distribuição, comparação com o mês anterior.
  - **Ponte caixa × lucro**: seção fixa abaixo das abas explicando a diferença (igual ao protótipo).
- Estado vazio dedicado (sem nenhuma `Transaction`).

### `src/screens/Transactions.tsx` (rota `/financeiro/movimentacoes`)

Porte de `LP.screens.moves()`:
- Lista com busca, filtro por tipo/categoria/conta, abas "Realizado" / "Previsto".
- Botão "+" para lançamento manual rápido (tipo, valor, categoria, data, conta).
- Marcar como pago/recebido com um toque (preenche `paymentDate`).
- Editar/excluir — só para `origin: 'manual'`; automáticos mostram "abrir origem" (link para o pedido/compra).

## Integrações

- **Navegação**: item "Financeiro" no menu lateral/trilho/barra inferior, ícone `wallet`.
- **Dashboard**: card "Em dinheiro (financeiro)" usando `calculateCashFlow`, substituindo o cálculo provisório de `cashEvents`.
- **Settings**: campo `openingCash` (saldo inicial). Sem tela de categorias/contas por ora — usa listas fixas (iguais ao protótipo) e `Settings.paymentMethods` existente para "conta".
- **Backup** (`backupService`): novos backups são exportados com `version: '1.1'` e incluem `transactions`. `validateBackup` passa a aceitar `'1.0'` (sem `transactions`, trata como lista vazia na importação) e `'1.1'`.

## Teste obrigatório

Implementar o cenário de `FINANCEIRO_PLAN.md` seção 9 como teste automatizado em `src/calculations/finance.test.ts` (fio 2x R$25, enchimento R$30, olhinhos R$8 à vista, pedido Leão Amigurumi R$180 com sinal 50%, despesa manual agulhas R$20), validando os números esperados das Situações A e B e do Resultado do Período.

Testes adicionais: editar sinal do pedido atualiza a `Transaction` ligada sem duplicar; excluir compra parcelada remove todas as parcelas; rodar a migração v3 duas vezes não duplica nada; importar backup antigo (sem `transactions`) funciona.

## Arquivos

**Novos:**
- `src/types/financial.ts`
- `src/data/financeSync.ts`
- `src/calculations/finance.ts`, `src/calculations/finance.test.ts`
- `src/screens/Financeiro.tsx`, `src/screens/Transactions.tsx`

**Alterados:**
- `src/types/index.ts` (campo `openingCash` em `Settings`)
- `src/data/db.ts` (versão 3)
- `src/data/services.ts` (`transactionService`; `orderService`/`purchaseService` chamam `financeSync`; `backupService` inclui `transactions`)
- `src/calculations/period.ts` (remove `cashEvents`/`calculateCash`/`cashByDay`; `calculatePeriodResult` antigo sai, Dashboard passa a usar `finance.ts`)
- `src/screens/Dashboard.tsx` (card de caixa via `finance.ts`)
- `src/App.tsx` (rotas `/financeiro` e `/financeiro/movimentacoes`)
- `src/components/Navigation.tsx` (item Financeiro)
- `src/screens/Settings.tsx` (campo saldo inicial)

## Ordem de implementação

1. Tipos (`financial.ts`) + `Settings.openingCash`.
2. `finance.ts` com testes (cenário obrigatório) — sem UI ainda, cálculo validado isoladamente.
3. Migração v3 + `financeSync.ts`, ligado a `orderService`/`purchaseService`.
4. `transactionService` (manuais).
5. Tela Movimentações (mais simples, valida o CRUD manual e a leitura dos automáticos).
6. Tela Financeiro (Caixa, depois Resultado, depois ponte).
7. Navegação + rotas.
8. Dashboard (troca `period.ts` antigo pelo novo).
9. Backup (export/import/validação).
10. Remoção do código morto em `period.ts`.
