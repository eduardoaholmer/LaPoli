# Plano do Módulo Financeiro - LaPoli Crochet

## Visão Geral

Módulo de controle financeiro detalhado para o app de gestão da LaPoli Crochet, com foco em separar fluxo de caixa (dinheiro que entra/sai) de resultado (lucro do negócio), integrando-se com pedidos e compras existentes.

## 1. Princípios (regras inquebráveis)

1. **Fonte única da verdade**: Cada dinheiro que entra ou sai é UM lançamento. Nada pode ser contado duas vezes.
2. **Dois olhares separados**:
   - **FLUXO DE CAIXA**: O que realmente entrou e saiu (compra de material conta quando é paga).
   - **RESULTADO**: Quanto o negócio lucrou (material só vira custo quando é consumido nos produtos vendidos).
3. **Custos estimados** dos produtos (composição de cada peça) são para precificar. Eles NÃO geram lançamentos financeiros. Só valem lançamentos de dinheiro real.
4. **Lançamentos automáticos** (de pedidos e compras) são editados na origem. Na tela do financeiro aparecem como somente leitura, com atalho "abrir origem".
5. **Alterar, excluir ou duplicar** um pedido ou compra atualiza os lançamentos ligados a eles. Nunca cria lançamento repetido.

## 2. Modelo de Dados: Transaction

### Interface Transaction

```typescript
export interface Transaction {
  id: string;
  type: 'receita' | 'despesa';
  description: string;
  amount: number; // valor em centavos (int)
  fee?: number; // taxa cobrada (opcional, ex.: maquininha, Pix)
  netAmount: number; // valor líquido (amount - fee)
  category: string; // categoria configurável
  subcategory?: string; // subcategoria opcional
  dueDate?: Date; // data de vencimento ou prevista
  paymentDate?: Date; // data de pagamento ou recebimento
  status: TransactionStatus; // calculado
  account: string; // Pix, dinheiro, conta bancária, cartão etc.
  paymentMethod?: string; // forma de pagamento
  origin: TransactionOrigin; // manual, pedido, compra
  originId?: string; // ID do pedido ou compra
  installmentNumber?: number; // número da parcela
  totalInstallments?: number; // total de parcelas
  contact?: string; // cliente ou fornecedor
  proofAttachment?: string; // comprovante (arquivo local)
  observations?: string;
  isRecurring: boolean;
  recurringType?: 'nenhuma' | 'semanal' | 'mensal' | 'anual';
  recurringEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionStatus = 'previsto' | 'pago' | 'recebido' | 'atrasado' | 'cancelado';
export type TransactionOrigin = 'manual' | 'pedido_sinal' | 'pedido_saldo' | 'compra_avista' | 'compra_parcela' | 'estorno_pedido';
```

### Categorias Iniciais (editáveis)

**Receitas:**
- Pedidos de clientes
- Vendas avulsas (feiras, eventos)
- Outras receitas

**Despesas:**
- Materiais (fio, enchimento, olhos, aviamentos)
- Embalagens e etiquetas
- Ferramentas (agulhas, tesouras)
- Frete e entregas
- Taxas e comissões
- Marketing e divulgação
- Impostos e taxas (ex.: MEI)
- Contas fixas (internet, software)
- Retirada da dona
- Outras

## 3. Lançamentos Automáticos (Integração)

### Pedidos

- **Sinal do pedido** gera uma receita (origem: `pedido_sinal`)
- **Saldo restante** gera outra receita (origem: `pedido_saldo`)
- Com data de pagamento preenchida: status "recebido"
- Sem data: "previsto", com vencimento na data combinada ou prevista de entrega
- Mudar o valor do sinal ou do preço atualiza as duas receitas
- **Pedido cancelado com sinal já recebido**: Perguntar "Reter o sinal" (receita permanece) ou "Devolver o sinal" (cria despesa de estorno ligada ao pedido)
- A parte ainda não recebida some dos "a receber"

### Compras de Material

- **Compra à vista** gera uma despesa (origem: `compra_avista`)
- **Compra parcelada** gera uma despesa por parcela (origem: `compra_parcela`)
  - Vencimento mensal a partir da data da primeira parcela
  - Valores somando exatamente o total pago (diferença de centavos vai para a última parcela)
- Marcar uma parcela como paga atualiza o status de pagamento da compra
- O status da compra passa a ser calculado a partir das parcelas (a fonte é o financeiro)
- Excluir uma compra remove os lançamentos dela, com confirmação clara

## 4. Telas do Módulo

### 4.1 Visão Geral (`/financeiro`)

**Filtros:**
- Período: hoje, 7 dias, mês atual, mês passado, ano, personalizado

**Cartões:**
- Saldo em caixa (realizado)
- Total a receber
- Total a pagar
- Saldo projetado (saldo + a receber − a pagar)
- Receitas do período
- Despesas do período
- Resultado do período

**Gráficos:**
- Receitas x despesas por mês
- Despesas por categoria
- Receitas por origem
- Saldo ao longo do tempo

**Meta mensal:**
- Meta de faturamento configurável
- Barra de progresso

**Lista rápida:**
- Próximos vencimentos (7 dias)
- Itens atrasados

### 4.2 Lançamentos (`/financeiro/transactions`)

**Lista:**
- Busca e filtros (tipo, categoria, conta, status, origem, período)
- Ordenação
- Total do filtro

**Ações:**
- Botão flutuante "+" para lançamento rápido (tipo, valor, categoria, data, conta bastam)
- Marcar como pago/recebido com um toque
- Duplicar lançamento
- Anexar comprovante
- Editar (apenas lançamentos manuais)
- Excluir (apenas lançamentos manuais)

**Lançamentos automáticos:**
- Aparecem como somente leitura
- Botão "abrir origem" para editar pedido/compra

### 4.3 A Pagar e A Receber (`/financeiro/accounts`)

**Visão por vencimento:**
- Atrasado
- Hoje
- Próximos 7 dias
- Próximos 30 dias
- Depois

**Ações rápidas:**
- "Marcar como pago/recebido"
- Para pedidos: atalho para cobrar o saldo pelo WhatsApp com mensagem pronta

### 4.4 Resultado do Período (`/financeiro/result`)

**Versão simplificada de DRE:**

- **Receita reconhecida**: Pedidos entregues no período (valor combinado) + vendas avulsas + outras receitas
- **(−) Custo dos produtos vendidos**: Materiais consumidos + outros custos dos produtos (vindos da composição)
- **(=) Lucro bruto**
- **(−) Despesas gerais**: Despesas manuais que NÃO são compra de material (compras de material entram no resultado só pelo consumo)
- **(=) Resultado sem contar a mão de obra**
- **(−) Mão de obra calculada** (horas x valor da hora), mostrada separada
- **(=) Resultado considerando a mão de obra** e margem sobre a receita
- **Indicador "material parado em estoque"**: Valor comprado e ainda não consumido
- **Texto de ajuda** (ícone de interrogação) explicando a diferença entre resultado e caixa

### 4.5 Contas e Fechamento (`/financeiro/accounts-closing`)

**Contas e carteiras:**
- Saldo inicial por conta/carteira
- Saldo atual de cada uma
- Movimentações por conta

**Retiradas da dona:**
- Acompanhamento por mês

**Fechamento mensal opcional:**
- Congela o mês
- Mostra resumo para conferir

## 5. Configurações Novas

**Extensão da interface Settings:**

```typescript
export interface FinancialSettings {
  incomeCategories: string[];
  expenseCategories: string[];
  accounts: Array<{
    name: string;
    type: 'pix' | 'dinheiro' | 'conta_bancaria' | 'cartao' | 'outro';
    initialBalance: number;
  }>;
  monthlyRevenueGoal: number;
  annualRevenueLimit?: number;
  daysBeforeDueDateWarning: number;
}
```

**Tela de Configurações Financeiras:**
- Criar, renomear, desativar categorias (sem apagar histórico)
- Gerenciar contas e carteiras com saldo inicial
- Meta mensal de faturamento
- Limite anual de faturamento (opcional) com alerta
- Dias de antecedência para avisar vencimentos

## 6. Integração com Telas Existentes

### Painel Geral

- Adicionar cartão "Saldo em caixa"
- Adicionar cartão "A pagar nos próximos 7 dias"
- Manter indicadores atuais com nomes claros:
  - "Custos (dos produtos vendidos)" ≠ "Despesas (dinheiro que saiu)"

### Pedidos

- Mostrar status financeiro (sinal recebido, saldo a receber, vencimento)
- Atalho para tela financeira

### Compras

- Mostrar parcelas pagas e a vencer
- Atalho para tela financeira

### Regra de Ouro

- Todos os totais financeiros devem sair da mesma função de cálculo
- Evitar qualquer número duplicado entre telas

## 7. Dados e Migração

### Migração do Schema Dexie

**Versão 3:**
- Adicionar tabela `transactions`
- Adicionar índices para busca eficiente
- Migração segura para gerar lançamentos automáticos de pedidos e compras existentes

```typescript
this.version(3).stores({
  products: 'id, name, category, active, createdAt, updatedAt, isExample',
  purchases: 'id, material, type, status, paymentStatus, date, createdAt, updatedAt, isExample',
  orders: 'id, clientName, status, paymentStatus, date, deadline, createdAt, updatedAt, isExample, productId',
  settings: 'id',
  transactions: 'id, type, category, status, date, dueDate, paymentDate, origin, originId, account, createdAt, updatedAt'
}).upgrade(tx => {
  // Gerar lançamentos automáticos de pedidos existentes
  // Gerar lançamentos automáticos de compras existentes
  // Não duplicar se a migração rodar duas vezes
});
```

### Backup JSON

**Incluir no backup:**
- Transactions
- Categorias financeiras
- Contas e carteiras

**Compatibilidade:**
- Backups antigos (sem financeiro) devem continuar importando sem erro
- Validação de versão do backup

### Exportar CSV

- "Exportar lançamentos em CSV"
- Separador e formato brasileiros (abre bem no Excel)
- Colunas: data, tipo, descrição, categoria, valor, status, conta

## 8. Cálculos Financeiros

**Arquivo:** `src/calculations/finance.ts`

**Funções puras:**

```typescript
// Fluxo de caixa
export function calculateCashFlow(transactions: Transaction[], startDate: Date, endDate: Date): CashFlowMetrics

// Resultado do período
export function calculatePeriodResult(orders: Order[], products: Product[], purchases: Purchase[], transactions: Transaction[], settings: Settings, startDate: Date, endDate: Date): PeriodResult

// Saldo projetado
export function calculateProjectedBalance(transactions: Transaction[], accounts: Account[]): ProjectedBalance

// Consumo de materiais
export function calculateMaterialConsumption(orders: Order[], products: Product[]): MaterialConsumption

// Status de lançamento
export function calculateTransactionStatus(transaction: Transaction): TransactionStatus
```

## 9. Teste Obrigatório com Números Esperados

### Cenário de Teste

**Configuração:**
- Hora: R$ 20,00

**Compras:**
- Fio: R$ 50,00 em 2x de R$ 25,00
- Enchimento: R$ 30,00 à vista
- Olhinhos: R$ 8,00 à vista

**Pedido:**
- Cliente: Maria
- Produto: Leão Amigurumi
- Preço: R$ 180,00
- Sinal: 50% (R$ 90,00)

**Despesa manual:**
- Agulhas de crochê: R$ 20,00 à vista

**Consumo do Leão Amigurumi:**
- 120 g de fio
- 40 g de enchimento
- 2 olhinhos
- R$ 3,00 de embalagem
- 5 horas de trabalho

### Situação A (sinal recebido, 1ª parcela do fio paga, demais compras e agulhas pagas)

| Indicador | Esperado | Obtido |
|-----------|----------|--------|
| Receitas realizadas | R$ 90,00 | - |
| Despesas realizadas | R$ 83,00 (25 + 30 + 8 + 20) | - |
| Saldo em caixa | R$ 7,00 | - |
| A receber | R$ 90,00 | - |
| A pagar | R$ 25,00 (2ª parcela) | - |
| Saldo projetado | R$ 72,00 | - |

### Situação B (2ª parcela paga e saldo do pedido recebido)

| Indicador | Esperado | Obtido |
|-----------|----------|--------|
| Receitas | R$ 180,00 | - |
| Despesas | R$ 108,00 | - |
| Saldo | R$ 72,00 | - |
| A receber | R$ 0,00 | - |
| A pagar | R$ 0,00 | - |

### Resultado do Período (pedido entregue)

| Indicador | Esperado | Obtido |
|-----------|----------|--------|
| Receita reconhecida | R$ 180,00 | - |
| Custo dos produtos | R$ 17,80 (14,80 materiais + 3,00 embalagem) | - |
| Lucro bruto | R$ 162,20 | - |
| Despesas gerais | R$ 20,00 (agulhas) | - |
| Resultado sem mão de obra | R$ 142,20 | - |
| Mão de obra (5h x R$ 20) | R$ 100,00 | - |
| Resultado com mão de obra | R$ 42,20 | - |
| Material parado em estoque | R$ 73,20 (88,00 - 14,80) | - |

### Testes Adicionais

- Mudar o sinal do pedido atualiza as receitas ligadas, sem criar lançamento novo
- Editar a mesma compra várias vezes não duplica despesas
- Cancelar o pedido com sinal recebido (reter e devolver) gera o efeito certo
- Excluir a compra parcelada remove todas as parcelas
- Rodar a migração duas vezes não duplica nada
- Importar um backup antigo (sem financeiro) funciona
- Valores com vírgula ("12,50", "1.234,56"), valor zero e valor negativo se comportam bem
- As datas aparecem no dia certo (cuidado com o erro de fuso UTC-3)
- Painel, Visão geral e Resultado mostram os mesmos totais

## 10. Arquivos a Criar/Alterar

### Novos Arquivos

1. `src/types/financial.ts` - Tipos financeiros
2. `src/calculations/finance.ts` - Cálculos financeiros
3. `src/calculations/finance.test.ts` - Testes dos cálculos
4. `src/screens/Financeiro.tsx` - Visão geral
5. `src/screens/Transactions.tsx` - Lançamentos
6. `src/screens/AccountsPayable.tsx` - A pagar/receber
7. `src/screens/FinancialResult.tsx` - Resultado (DRE)
8. `src/screens/AccountsClosing.tsx` - Contas e fechamento

### Arquivos a Alterar

1. `src/types/index.ts` - Adicionar tipos financeiros
2. `src/data/db.ts` - Adicionar tabela transactions, migração versão 3
3. `src/data/services.ts` - Adicionar transactionService, atualizar orderService e purchaseService
4. `src/data/services.ts` (backupService) - Incluir transactions no backup
5. `src/App.tsx` - Adicionar rotas financeiras
6. `src/components/Navigation.tsx` - Adicionar item Financeiro
7. `src/screens/Dashboard.tsx` - Adicionar cartões financeiros
8. `src/screens/Orders.tsx` - Mostrar status financeiro
9. `src/screens/Stock.tsx` - Mostrar parcelas
10. `src/screens/Settings.tsx` - Adicionar configurações financeiras

## 11. Decisões e Ambiguidades

### Decisões Tomadas

1. **Valores em centavos**: Guardar como inteiros para evitar erros de arredondamento
2. **Status calculado**: Status do lançamento é calculado automaticamente baseado em datas de pagamento/vencimento
3. **Lançamentos automáticos não editáveis**: Editar na origem (pedido/compra) para manter consistência
4. **Mão de obra separada**: Mostrada separada no resultado pois não é dinheiro que saiu do caixa
5. **Categorias editáveis**: Desativar sem apagar histórico para manter integridade dos dados

### Ambiguidades a Resolver

1. **Como lidar com estorno de sinal?** - Perguntar "Reter" ou "Devolver" ao cancelar pedido
2. **Como calcular consumo de materiais?** - Baseado nos produtos vendidos no período
3. **Como tratar despesas de material no resultado?** - Entram no resultado só pelo consumo, não pelo pagamento
4. **Como mostrar material parado em estoque?** - Valor comprado menos valor consumido
5. **Como integrar com meta mensal?** - Comparar receita reconhecida com meta configurada

## 12. Ordem de Implementação

1. Tipos financeiros e cálculos (com testes)
2. Migração do banco de dados
3. transactionService e integração com orderService/purchaseService
4. Tela de Lançamentos (base)
5. Tela de Visão Geral
6. Tela de A Pagar/Receber
7. Tela de Resultado
8. Tela de Contas e Fechamento
9. Configurações financeiras
10. Integração com Dashboard, Orders e Stock
11. Atualização do backup
12. Testes finais com cenário de teste
