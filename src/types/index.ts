export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  size: string;
  recipeLink?: string;
  needleSize?: string;
  estimatedTime?: number; // em horas
  actualTime?: number; // em horas
  suggestedPrice: number;
  usualPrice: number;
  otherCosts?: number; // embalagem, etiquetas, etc.
  observations?: string;
  active: boolean;
  materials: ProductMaterial[];
  photo?: string; // foto da peça (data URL reduzida, guardada só neste aparelho)
  createdAt: Date;
  updatedAt: Date;
  isExample?: boolean;
}

export interface ProductMaterial {
  id: string;
  materialId: string;
  material: string; // nome do material para exibição
  type: MaterialType;
  unit: string;
  quantityUsed: number;
  purchaseId?: string; // opcional, para vincular a uma compra específica
  unitCost: number; // custo unitário calculado
  totalCost: number; // custo total = quantityUsed * unitCost
  observations?: string;
}

export type MaterialType = 
  | 'fio' 
  | 'linha' 
  | 'enchimento' 
  | 'olhos' 
  | 'botão' 
  | 'argola' 
  | 'embalagem' 
  | 'acessório' 
  | 'outro';

export interface Purchase {
  id: string;
  date: Date;
  material: string;
  type: MaterialType;
  brand?: string;
  color?: string;
  colorHex?: string; // cor exata escolhida na paleta (#RRGGBB); o nome em `color` continua sendo o texto livre
  unit: string;
  quantityPurchased: number;
  quantityRemaining: number;
  percentUsed: number;
  totalPaid: number;
  unitCost: number;
  store?: string;
  storeLink?: string;
  paymentMethod?: string;
  installments?: number;
  installmentValue?: number;
  firstInstallmentDate?: Date;
  paymentCompletionDate?: Date;
  minStock: number;
  status: PurchaseStatus;
  paymentStatus: PaymentStatus;
  observations?: string;
  // Embalagem (novelo, rolo, pacote). A quantidade física segue em `unit`; aqui só o "como foi comprado".
  packageName?: string; // ex.: 'novelo'
  packageCount?: number; // ex.: 2
  packageSize?: number; // conteúdo de cada embalagem, em `unit` (ex.: 100)
  movements?: StockMovement[]; // perdas e ajustes de contagem
  createdAt: Date;
  updatedAt: Date;
  isExample?: boolean;
}

/** Anotação rápida no pedido, feita enquanto a peça é produzida. */
export interface OrderLogEntry {
  id: string;
  date: Date;
  type: 'material' | 'horas' | 'gasto' | 'nota';
  material?: string; // material: qual
  quantity?: number; // material: quanto a mais (positivo) ou a menos (negativo) que a receita; horas: horas
  amount?: number; // gasto: valor em reais
  text?: string; // nota, ou a descrição do gasto
}

/** Foto dos números no fim do pedido: o que custou de verdade × o que foi estimado. */
export interface OrderSettlement {
  date: Date;
  materialCost: number;
  hours: number;
  laborCost: number;
  extraCosts: number;
  totalCost: number;
  profit: number;
  estimatedProfit?: number;
  estimatedHours?: number;
}

export interface StockMovement {
  id: string;
  date: Date;
  type: 'perda' | 'ajuste' | 'uso'; // uso: material gasto numa peça pronta de um pedido
  quantity: number; // quanto saiu do estoque; negativo quando a contagem achou mais do que o app tinha
  note?: string;
  orderId?: string; // no uso, o pedido (para devolver ao estoque se o pedido voltar de etapa)
}

export type PurchaseStatus = 'disponível' | 'parcialmente usado' | 'esgotado' | 'reservado';
export type PaymentStatus = 'a pagar' | 'parcial' | 'quitado';

export interface Order {
  id: string;
  date: Date;
  clientName: string;
  clientPhone: string;
  product: string;
  productId?: string;
  customizations?: string;
  size?: string;
  quantity: number;
  deadline: Date;
  agreedPrice: number;
  signalAmount: number;
  signalPaymentDate?: Date;
  remainingBalance: number;
  finalPaymentDate?: Date;
  paymentMethod?: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  needsMaterialPurchase: boolean;
  materialsPurchased: boolean;
  productionStartDate?: Date;
  completionDate?: Date;
  deliveryDate?: Date;
  observations?: string;
  checklist?: ChecklistItem[];
  history?: HistoryEntry[];
  stockUsedAt?: Date; // quando o material da peça foi descontado do estoque
  log?: OrderLogEntry[]; // anotações feitas durante a produção (material, horas, gastos, notas)
  timerStartedAt?: Date; // cronômetro de horas ligado desde
  settlement?: OrderSettlement; // acerto dos números quando a peça ficou pronta
  createdAt: Date;
  updatedAt: Date;
  isExample?: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface HistoryEntry {
  id: string;
  date: Date;
  text: string;
}

export type OrderStatus = 
  | 'Cliente escolhendo o produto'
  | 'Orçamento enviado'
  | 'Aguardando pagamento do sinal'
  | 'Sinal recebido'
  | 'Aguardando compra de materiais'
  | 'Materiais comprados'
  | 'Em produção'
  | 'Produção concluída'
  | 'Aguardando entrega'
  | 'Entregue'
  | 'Cancelado';

export type OrderPaymentStatus = 'pendente' | 'sinal pago' | 'pago' | 'cancelado';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Settings {
  id?: string;
  hourlyRate: number;
  defaultSignalPercent: number;
  desiredProfitMargin: number;
  productCategories: string[];
  materialTypes: MaterialType[];
  units: string[];
  paymentMethods: string[];
  orderStatuses: OrderStatus[];
  purchaseStatuses: PurchaseStatus[];
  suppliers: string[];
  hoursPerDay?: number; // horas de crochê por dia, usado para sugerir o prazo de entrega
  backupEveryDays?: number; // lembrete de backup (padrão 7; 0 = nunca)
  openingCash?: number; // saldo inicial em caixa (reais), usado pelo módulo Financeiro
  lastBackupDate?: Date;
  exampleDataSeeded?: boolean; // os exemplos são criados uma vez só; apagados, não voltam
  // Senha de acesso de 4 dígitos (opcional). Guarda só o resultado de PBKDF2, nunca a senha.
  pinHash?: string;
  pinSalt?: string;
  pinIterations?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  averageProfitMargin: number;
  openOrders: number;
  completedOrders: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  lowStockMaterials: { material: string; remaining: number; minStock: number }[];
  hoursWorked: number;
  totalMaterialInvestment: number;
  profitPerHour: number;
}

export interface ProductCost {
  materialCost: number;
  laborCost: number;
  otherCosts: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  priceDifference: number;
}

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
