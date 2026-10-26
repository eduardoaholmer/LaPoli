import type { Product, Purchase, Order, Settings, ProductCost, DashboardMetrics } from '../types';
import { purchaseIs, purchaseName } from './materialName';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/** Data válida ou null. Aceita Date ou texto (backups antigos guardavam datas como texto). */
export const validDate = (value: Date | string | number | null | undefined): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const DATE_FMT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const DATE_TIME_FMT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

// Uma data vazia ou estragada num registro vira "—": antes derrubava o app inteiro ("Invalid time value")
export const formatDate = (date: Date | string | null | undefined): string => {
  const d = validDate(date);
  return d ? DATE_FMT.format(d) : '—';
};

export const formatDateTime = (date: Date | string | null | undefined): string => {
  const d = validDate(date);
  return d ? DATE_TIME_FMT.format(d) : '—';
};

/** Valor para <input type="date"> no dia local; vazio se a data não existe ou é inválida. */
export const dateInputValue = (date: Date | string | null | undefined): string => {
  const d = validDate(date);
  return d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0] : '';
};

export const calculateUnitCost = (totalPaid: number, quantityPurchased: number): number => {
  if (quantityPurchased <= 0) return 0;
  if (!isFinite(totalPaid) || !isFinite(quantityPurchased)) return 0;
  return totalPaid / quantityPurchased;
};

export const calculateMaterialCost = (quantityUsed: number, unitCost: number): number => {
  return quantityUsed * unitCost;
};

export const calculateWeightedAverageCost = (purchases: Purchase[]): number => {
  if (purchases.length === 0) return 0;
  
  const totalQuantity = purchases.reduce((sum, p) => sum + p.quantityPurchased, 0);
  if (totalQuantity <= 0 || !isFinite(totalQuantity)) return 0;
  
  const weightedSum = purchases.reduce((sum, p) => sum + (p.unitCost * p.quantityPurchased), 0);
  if (!isFinite(weightedSum)) return 0;
  
  return weightedSum / totalQuantity;
};

export const calculateProductCost = (
  product: Product,
  settings: Settings,
  allPurchases: Purchase[]
): ProductCost => {
  let materialCost = 0;

  product.materials.forEach((pm) => {
    if (pm.purchaseId) {
      const purchase = allPurchases.find(p => p.id === pm.purchaseId);
      if (purchase) {
        materialCost += calculateMaterialCost(pm.quantityUsed, purchase.unitCost);
      }
    } else {
      const materialPurchases = allPurchases.filter(p => purchaseIs(p, pm.material));
      const avgCost = calculateWeightedAverageCost(materialPurchases);
      materialCost += calculateMaterialCost(pm.quantityUsed, avgCost);
    }
  });

  const laborCost = (product.actualTime || product.estimatedTime || 0) * settings.hourlyRate;
  const otherCosts = product.otherCosts || 0;

  const totalCost = materialCost + laborCost + otherCosts;
  const profit = product.usualPrice - totalCost;
  const profitMargin = product.usualPrice > 0 && isFinite(product.usualPrice) ? (profit / product.usualPrice) * 100 : 0;
  const priceDifference = product.usualPrice - product.suggestedPrice;

  return {
    materialCost,
    laborCost,
    otherCosts,
    totalCost,
    profit,
    profitMargin,
    priceDifference
  };
};

export const calculateSuggestedPrice = (
  totalCost: number,
  desiredMargin: number
): number => {
  if (totalCost <= 0 || desiredMargin <= 0 || desiredMargin >= 100) return totalCost;
  // Preço = Custo / (1 - Margem/100)
  return totalCost / (1 - desiredMargin / 100);
};

/** Total já retirado do estoque por perdas e ajustes de contagem registrados na compra. */
export const calculateMovementsTotal = (purchase: Purchase): number =>
  (purchase.movements || []).reduce((sum, m) => sum + m.quantity, 0);

export const calculateRemainingQuantity = (
  purchase: Purchase,
  allProducts: Product[]
): number => {
  let totalUsed = 0;
  
  allProducts.forEach(product => {
    product.materials.forEach(pm => {
      // Conta materiais com lote vinculado
      if (pm.purchaseId === purchase.id) {
        totalUsed += pm.quantityUsed;
      }
      // Conta materiais sem lote mas com mesmo nome de material
      else if (!pm.purchaseId && purchaseIs(purchase, pm.material)) {
        totalUsed += pm.quantityUsed;
      }
    });
  });
  
  return purchase.quantityPurchased - totalUsed - calculateMovementsTotal(purchase);
};

export const calculatePercentUsed = (quantityPurchased: number, quantityRemaining: number): number => {
  if (quantityPurchased <= 0) return 0;
  // contagem maior que o comprado (sobra achada no armário) não vira uso negativo
  return Math.max(0, ((quantityPurchased - quantityRemaining) / quantityPurchased) * 100);
};

export const calculateRemainingBalance = (agreedPrice: number, signalAmount: number): number => {
  return agreedPrice - signalAmount;
};

export const updatePurchaseStatus = (purchase: Purchase): import('../types').PurchaseStatus => {
  if (purchase.quantityRemaining <= 0) return 'esgotado';
  if (purchase.quantityRemaining < purchase.quantityPurchased) return 'parcialmente usado';
  return 'disponível';
};

export const calculateDashboardMetrics = (
  orders: Order[],
  products: Product[],
  purchases: Purchase[],
  settings: Settings,
  startDate: Date,
  endDate: Date
): DashboardMetrics => {
  const filteredOrders = orders.filter(o => o.date >= startDate && o.date <= endDate);
  
  const completedOrders = filteredOrders.filter(o => o.status === 'Entregue');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.agreedPrice, 0);
  
  let totalCosts = 0;
  let hoursWorked = 0;
  
  completedOrders.forEach(order => {
    const product = products.find(p => p.id === order.productId);
    if (product) {
      const cost = calculateProductCost(product, settings, purchases);
      totalCosts += cost.totalCost * order.quantity;
      hoursWorked += (product.actualTime || product.estimatedTime || 0) * order.quantity;
    }
  });
  
  const totalProfit = totalRevenue - totalCosts;
  const averageProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  const openOrders = orders.filter(o => 
    o.status !== 'Entregue' && o.status !== 'Cancelado'
  ).length;
  
  const productSales = new Map<string, { quantity: number; revenue: number }>();
  completedOrders.forEach(order => {
    const current = productSales.get(order.product) || { quantity: 0, revenue: 0 };
    productSales.set(order.product, {
      quantity: current.quantity + order.quantity,
      revenue: current.revenue + order.agreedPrice
    });
  });
  
  const topProducts = Array.from(productSales.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  
  const lowStockMaterials = purchases
    .filter(p => p.quantityRemaining < p.minStock)
    .map(p => ({
      material: purchaseName(p),
      remaining: p.quantityRemaining,
      minStock: p.minStock
    }));
  
  const totalMaterialInvestment = purchases.reduce((sum, p) => sum + p.totalPaid, 0);

  const profitPerHour = hoursWorked > 0 ? totalProfit / hoursWorked : 0;

  return {
    totalRevenue,
    totalCosts,
    totalProfit,
    averageProfitMargin,
    openOrders,
    completedOrders: completedOrders.length,
    topProducts,
    lowStockMaterials,
    hoursWorked,
    totalMaterialInvestment,
    profitPerHour
  };
};

export const isOrderDelayed = (order: Order): boolean => {
  if (order.status === 'Entregue' || order.status === 'Cancelado') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(order.deadline);
  deadline.setHours(0, 0, 0, 0);
  return deadline < today;
};

export const isOrderNearDeadline = (order: Order, daysThreshold: number = 3): boolean => {
  if (order.status === 'Entregue' || order.status === 'Cancelado') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(order.deadline);
  deadline.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysThreshold;
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
