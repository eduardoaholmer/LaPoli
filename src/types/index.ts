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
  createdAt: Date;
  updatedAt: Date;
  isExample?: boolean;
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
  createdAt: Date;
  updatedAt: Date;
  isExample?: boolean;
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
  lastBackupDate?: Date;
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
