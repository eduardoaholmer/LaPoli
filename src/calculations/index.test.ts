import { describe, it, expect } from 'vitest';
import {
  calculateUnitCost,
  calculateMaterialCost,
  calculateWeightedAverageCost,
  calculateProductCost,
  calculateRemainingQuantity,
  calculatePercentUsed,
  calculateRemainingBalance,
  formatCurrency,
  formatDate,
  calculateSuggestedPrice
} from './index';
import type { Product, Purchase, Settings } from '../types';

describe('Cálculos de Custo', () => {
  describe('calculateUnitCost', () => {
    it('deve calcular custo unitário corretamente', () => {
      expect(calculateUnitCost(50, 500)).toBe(0.1);
      expect(calculateUnitCost(30, 1000)).toBe(0.03);
      expect(calculateUnitCost(8, 10)).toBe(0.8);
    });

    it('deve retornar 0 quando quantidade é 0', () => {
      expect(calculateUnitCost(50, 0)).toBe(0);
    });

    it('deve retornar 0 quando quantidade é negativa', () => {
      expect(calculateUnitCost(50, -10)).toBe(0);
    });
  });

  describe('calculateMaterialCost', () => {
    it('deve calcular custo do material usado', () => {
      expect(calculateMaterialCost(150, 0.1)).toBe(15);
      expect(calculateMaterialCost(40, 0.03)).toBe(1.2);
      expect(calculateMaterialCost(2, 0.8)).toBe(1.6);
    });
  });

  describe('calculateWeightedAverageCost', () => {
    it('deve calcular média ponderada corretamente', () => {
      const purchases: Purchase[] = [
        { id: '1', material: 'fio', unitCost: 0.1, quantityPurchased: 500 } as Purchase,
        { id: '2', material: 'fio', unitCost: 0.15, quantityPurchased: 300 } as Purchase
      ];
      
      const result = calculateWeightedAverageCost(purchases);
      // (0.1 * 500 + 0.15 * 300) / (500 + 300) = (50 + 45) / 800 = 95 / 800 = 0.11875
      expect(result).toBeCloseTo(0.11875, 5);
    });

    it('deve retornar 0 quando não há compras', () => {
      expect(calculateWeightedAverageCost([])).toBe(0);
    });

    it('deve retornar 0 quando quantidade total é 0', () => {
      const purchases: Purchase[] = [
        { id: '1', material: 'fio', unitCost: 0.1, quantityPurchased: 0 } as Purchase
      ];
      expect(calculateWeightedAverageCost(purchases)).toBe(0);
    });
  });

  describe('calculateProductCost', () => {
    const settings: Settings = {
      hourlyRate: 20,
      defaultSignalPercent: 50,
      desiredProfitMargin: 40,
      productCategories: [],
      materialTypes: [],
      units: [],
      paymentMethods: [],
      orderStatuses: [],
      purchaseStatuses: [],
      suppliers: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const purchases: Purchase[] = [
      { id: '1', material: 'fio', unitCost: 0.1 } as Purchase,
      { id: '2', material: 'enchimento', unitCost: 0.03 } as Purchase,
      { id: '3', material: 'olhos', unitCost: 0.8 } as Purchase
    ];

    const product: Product = {
      id: '1',
      name: 'Leão',
      category: 'Amigurumi',
      description: '',
      size: '',
      suggestedPrice: 200,
      usualPrice: 180,
      actualTime: 5,
      active: true,
      materials: [
        { id: 'm1', materialId: '1', material: 'fio', type: 'fio', unit: 'gramas', quantityUsed: 120, purchaseId: '1', unitCost: 0.1, totalCost: 12 },
        { id: 'm2', materialId: '2', material: 'enchimento', type: 'enchimento', unit: 'gramas', quantityUsed: 40, purchaseId: '2', unitCost: 0.03, totalCost: 1.2 },
        { id: 'm3', materialId: '3', material: 'olhos', type: 'olhos', unit: 'unidades', quantityUsed: 2, purchaseId: '3', unitCost: 0.8, totalCost: 1.6 }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('deve calcular custo total corretamente', () => {
      const result = calculateProductCost(product, settings, purchases);
      
      // Materiais: 12 + 1.2 + 1.6 = 14.8
      // Mão de obra: 5 * 20 = 100
      // Total: 114.8
      expect(result.materialCost).toBeCloseTo(14.8, 2);
      expect(result.laborCost).toBe(100);
      expect(result.totalCost).toBeCloseTo(114.8, 2);
    });

    it('deve calcular lucro e margem corretamente', () => {
      const result = calculateProductCost(product, settings, purchases);
      
      // Lucro: 180 - 114.8 = 65.2
      // Margem: 65.2 / 180 * 100 = 36.22%
      expect(result.profit).toBeCloseTo(65.2, 1);
      expect(result.profitMargin).toBeCloseTo(36.22, 1);
    });

    it('deve calcular diferença de preço', () => {
      const result = calculateProductCost(product, settings, purchases);
      expect(result.priceDifference).toBe(-20); // 180 - 200
    });

    it('deve usar tempo estimado quando tempo real não existe', () => {
      const productNoActualTime = { ...product, actualTime: undefined, estimatedTime: 8 };
      const result = calculateProductCost(productNoActualTime, settings, purchases);
      expect(result.laborCost).toBe(160); // 8 * 20
    });
  });

  describe('calculateRemainingQuantity', () => {
    const purchases: Purchase[] = [
      { id: '1', material: 'fio', quantityPurchased: 500 } as Purchase,
      { id: '2', material: 'enchimento', quantityPurchased: 1000 } as Purchase
    ];

    const products: Product[] = [
      {
        id: 'p1',
        name: 'Leão',
        category: 'Amigurumi',
        description: '',
        size: '',
        suggestedPrice: 0,
        usualPrice: 0,
        active: true,
        materials: [
          { id: 'm1', materialId: '1', material: 'fio', type: 'fio', unit: 'gramas', quantityUsed: 120, purchaseId: '1', unitCost: 0, totalCost: 0 }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    it('deve calcular quantidade restante com lote vinculado', () => {
      const result = calculateRemainingQuantity(purchases[0], products);
      expect(result).toBe(380); // 500 - 120
    });

    it('deve considerar materiais sem lote', () => {
      const productsWithoutLot: Product[] = [
        {
          id: 'p1',
          name: 'Leão',
          category: 'Amigurumi',
          description: '',
          size: '',
          suggestedPrice: 0,
          usualPrice: 0,
          active: true,
          materials: [
            { id: 'm1', materialId: '', material: 'fio', type: 'fio', unit: 'gramas', quantityUsed: 50, purchaseId: undefined, unitCost: 0, totalCost: 0 }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      const result = calculateRemainingQuantity(purchases[0], productsWithoutLot);
      expect(result).toBe(450); // 500 - 50 (considera material sem lote com mesmo nome)
    });
  });

  describe('calculatePercentUsed', () => {
    it('deve calcular percentual usado corretamente', () => {
      expect(calculatePercentUsed(500, 380)).toBe(24); // (500-380)/500*100
      expect(calculatePercentUsed(1000, 960)).toBe(4);
      expect(calculatePercentUsed(10, 8)).toBe(20);
    });

    it('deve retornar 0 quando quantidade é 0', () => {
      expect(calculatePercentUsed(0, 0)).toBe(0);
    });
  });

  describe('calculateRemainingBalance', () => {
    it('deve calcular saldo restante', () => {
      expect(calculateRemainingBalance(180, 90)).toBe(90);
      expect(calculateRemainingBalance(100, 50)).toBe(50);
      expect(calculateRemainingBalance(200, 100)).toBe(100);
    });
  });

  describe('Formatação', () => {
    it('deve formatar moeda em pt-BR', () => {
      expect(formatCurrency(100)).toBe('R$ 100,00');
      expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
      expect(formatCurrency(0.5)).toBe('R$ 0,50');
    });

    it('deve formatar data em pt-BR', () => {
      const date = new Date('2024-02-15');
      expect(formatDate(date)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('calculateSuggestedPrice', () => {
    it('deve calcular preço sugerido baseado na margem', () => {
      // Custo 100, margem 40% -> Preço = 100 / (1 - 0.4) = 100 / 0.6 = 166.67
      expect(calculateSuggestedPrice(100, 40)).toBeCloseTo(166.67, 2);
      // Custo 50, margem 50% -> Preço = 50 / (1 - 0.5) = 50 / 0.5 = 100
      expect(calculateSuggestedPrice(50, 50)).toBe(100);
    });

    it('deve retornar custo quando margem é inválida', () => {
      expect(calculateSuggestedPrice(100, 0)).toBe(100);
      expect(calculateSuggestedPrice(100, 100)).toBe(100);
      expect(calculateSuggestedPrice(0, 40)).toBe(0);
    });
  });
});
