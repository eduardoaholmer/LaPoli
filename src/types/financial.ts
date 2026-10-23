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
