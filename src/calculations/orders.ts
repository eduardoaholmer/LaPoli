import type { Order, OrderStatus, Product, ProductMaterial, Purchase, Settings } from '../types';
import { calculateProductCost } from './index';
import { sameMaterial } from './materialName';

/**
 * As 11 etapas do sistema continuam existindo. No quadro elas são agrupadas em 3 fases,
 * e "Entregue" / "Cancelado" ficam fora das etapas em andamento.
 */
export type OrderPhaseId = 'orcamento' | 'producao' | 'entrega' | 'concluido' | 'cancelado';

export interface OrderPhase {
  id: 'orcamento' | 'producao' | 'entrega';
  name: string;
  hint: string;
  statuses: OrderStatus[];
}

export const ORDER_PHASES: OrderPhase[] = [
  {
    id: 'orcamento',
    name: 'Orçamento',
    hint: 'Combinando detalhes e sinal',
    statuses: ['Cliente escolhendo o produto', 'Orçamento enviado', 'Aguardando pagamento do sinal']
  },
  {
    id: 'producao',
    name: 'Produção',
    hint: 'Do sinal até a peça pronta',
    statuses: ['Sinal recebido', 'Aguardando compra de materiais', 'Materiais comprados', 'Em produção', 'Produção concluída']
  },
  { id: 'entrega', name: 'Entrega', hint: 'Pronto, aguardando retirada', statuses: ['Aguardando entrega'] }
];

export const ALL_STATUSES: OrderStatus[] = [
  ...ORDER_PHASES.flatMap(p => p.statuses),
  'Entregue',
  'Cancelado'
];

export const phaseOf = (status: OrderStatus): OrderPhaseId => {
  if (status === 'Entregue') return 'concluido';
  if (status === 'Cancelado') return 'cancelado';
  return ORDER_PHASES.find(p => p.statuses.includes(status))?.id ?? 'orcamento';
};

export const isOpenOrder = (o: Pick<Order, 'status'>): boolean => o.status !== 'Entregue' && o.status !== 'Cancelado';

/**
 * Próxima etapa do jeito que o trabalho anda, pulando o que não se aplica: sem falta de material,
 * o sinal recebido vai direto para a produção; a peça pronta vai direto para "Aguardando entrega".
 * Do sinal à entrega são 3 toques (antes eram 6, passando pelas 11 etapas uma a uma).
 */
export const nextStatus = (
  order: Pick<Order, 'status' | 'paymentStatus'>,
  missingMaterials = false
): OrderStatus | null => {
  switch (order.status) {
    case 'Cliente escolhendo o produto':
      return 'Orçamento enviado';
    case 'Orçamento enviado':
      return order.paymentStatus === 'pendente' ? 'Aguardando pagamento do sinal' : 'Sinal recebido';
    case 'Aguardando pagamento do sinal':
      return 'Sinal recebido';
    case 'Sinal recebido':
      return missingMaterials ? 'Aguardando compra de materiais' : 'Em produção';
    case 'Aguardando compra de materiais':
      return 'Materiais comprados';
    case 'Materiais comprados':
      return 'Em produção';
    case 'Em produção':
    case 'Produção concluída':
      return 'Aguardando entrega';
    case 'Aguardando entrega':
      return 'Entregue';
    default:
      return null;
  }
};

/** Texto do botão: o que acontece ao tocar, e não o nome técnico da etapa. */
export const nextStepLabel = (next: OrderStatus): string =>
  ({
    'Orçamento enviado': 'Orçamento enviado',
    'Aguardando pagamento do sinal': 'Aguardar o sinal',
    'Sinal recebido': 'Sinal recebido',
    'Aguardando compra de materiais': 'Comprar materiais',
    'Materiais comprados': 'Materiais comprados',
    'Em produção': 'Começar a produzir',
    'Aguardando entrega': 'Peça pronta',
    Entregue: 'Entregar'
  } as Partial<Record<OrderStatus, string>>)[next] ?? next;

/** Etapa ao soltar um cartão numa coluna do quadro: "Produção" é produzindo, não "sinal recebido". */
export const dropStatusOfPhase = (phase: OrderPhase['id']): OrderStatus =>
  phase === 'orcamento' ? 'Orçamento enviado' : phase === 'producao' ? 'Em produção' : 'Aguardando entrega';

// ---------- Pagamentos (derivados do status de pagamento que o pedido já tem) ----------

/** Quanto já foi recebido do cliente. */
export const orderReceived = (o: Pick<Order, 'agreedPrice' | 'signalAmount' | 'paymentStatus'>): number => {
  if (o.paymentStatus === 'pago') return o.agreedPrice;
  if (o.paymentStatus === 'sinal pago') return Math.min(o.signalAmount, o.agreedPrice);
  return 0;
};

/** Saldo a receber. Pedido cancelado não tem saldo. */
export const orderPending = (o: Pick<Order, 'agreedPrice' | 'signalAmount' | 'paymentStatus' | 'status'>): number =>
  o.status === 'Cancelado' ? 0 : Math.max(0, o.agreedPrice - orderReceived(o));

const startOfDay = (d: Date | string): number => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

/** Dias até o prazo (negativo = atrasado). */
export const daysUntilDeadline = (o: Pick<Order, 'deadline'>, today: Date = new Date()): number =>
  Math.round((startOfDay(o.deadline) - startOfDay(today)) / 86400000);

/** Sugestão de prazo: horas de crochê ÷ horas por dia + folga. */
export const suggestDeadlineDays = (hours: number, hoursPerDay = 3, slackDays = 5): number =>
  Math.ceil(hours / Math.max(hoursPerDay, 0.5)) + slackDays;

// ---------- Materiais que faltam para uma encomenda ----------

export interface MissingMaterial {
  material: string;
  unit: string;
  needed: number;
  available: number;
}

export const missingMaterialsForOrder = (
  product: Product | undefined,
  quantity: number,
  purchases: Purchase[]
): MissingMaterial[] => {
  if (!product) return [];
  const out: MissingMaterial[] = [];
  product.materials.forEach((pm: ProductMaterial) => {
    const needed = pm.quantityUsed * quantity;
    const available = purchases
      .filter(p => sameMaterial(p.material, pm.material))
      .reduce((s, p) => s + (p.quantityRemaining || 0), 0);
    if (available < needed) out.push({ material: pm.material, unit: pm.unit, needed, available });
  });
  return out;
};

/** Custo e lucro estimados de um pedido do catálogo. */
export const estimateOrderProfit = (
  o: Pick<Order, 'agreedPrice' | 'quantity'>,
  product: Product | undefined,
  settings: Settings,
  purchases: Purchase[]
): { cost: number; profit: number; margin: number } | null => {
  if (!product) return null;
  const unit = calculateProductCost(product, settings, purchases);
  const cost = unit.totalCost * o.quantity;
  const profit = o.agreedPrice - cost;
  return { cost, profit, margin: o.agreedPrice > 0 ? (profit / o.agreedPrice) * 100 : 0 };
};


/** "hoje", "amanhã", "em 3 dias", "há 2 dias". */
export const relDays = (n: number): string =>
  n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n === -1 ? 'ontem' : n > 0 ? `em ${n} dias` : `há ${Math.abs(n)} dias`;
