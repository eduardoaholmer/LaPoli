import { describe, expect, it } from 'vitest';
import { YARN_COLORS, colorFromName, distinctColors, isHexColor, materialSwatch } from './colors';
import { groupMaterials } from './materials';
import type { Purchase } from '../types';

describe('cor pelo nome', () => {
  it('reconhece nomes da paleta, com acento e caixa diferentes', () => {
    expect(colorFromName('Rosa claro')).toBe('#F6D5D5');
    expect(colorFromName('  LILAS ')).toBe('#BBA8D8');
    expect(colorFromName('azul marinho')).toBe('#26365E');
  });

  it('o nome mais específico vence ("rosa claro" não vira "rosa", "azul marinho não vira "azul")', () => {
    expect(colorFromName('fio rosa claro cisne')).toBe('#F6D5D5');
    expect(colorFromName('tom azul marinho')).toBe('#26365E');
    expect(colorFromName('verde musgo')).toBe('#6B7240');
  });

  it('reconhece apelidos e devolve undefined para o que não conhece', () => {
    expect(colorFromName('Salmão')).toBe('#F0A58F');
    expect(colorFromName('Arco-íris')).toBeUndefined();
    expect(colorFromName('')).toBeUndefined();
    expect(colorFromName(undefined)).toBeUndefined();
  });

  it('todas as cores da paleta têm hex válido e nomes únicos', () => {
    YARN_COLORS.forEach(c => expect(isHexColor(c.hex)).toBe(true));
    expect(new Set(YARN_COLORS.map(c => c.name)).size).toBe(YARN_COLORS.length);
  });
});

describe('cor para mostrar', () => {
  it('a cor exata escolhida vence o nome', () => {
    expect(materialSwatch('Rosa', '#112233')).toEqual({ css: '#112233', exact: true });
  });

  it('sem cor exata, usa o nome', () => {
    expect(materialSwatch('Caramelo')).toEqual({ css: '#C99A6B', exact: true });
  });

  it('hex inválido é ignorado e nome desconhecido vira cor neutra marcada como aproximada', () => {
    expect(materialSwatch('Arco-íris', 'vermelho')).toEqual({ css: '#D9CBB0', exact: false });
    expect(materialSwatch()).toEqual({ css: '#D9CBB0', exact: false });
  });
});

const lot = (id: string, date: string, color?: string, colorHex?: string): Purchase =>
  ({ id, date: new Date(date), material: 'Fio de algodão', type: 'fio', unit: 'gramas', color, colorHex, quantityPurchased: 100, quantityRemaining: 50, totalPaid: 10, unitCost: 0.1, minStock: 10 }) as Purchase;

describe('cores de um material', () => {
  it('lista cada cor uma vez, da compra mais recente para a mais antiga', () => {
    const list = distinctColors([lot('a', '2026-03-01', 'Rosa'), lot('b', '2026-02-01', 'rosa'), lot('c', '2026-01-01', 'Azul', '#5C86C7'), lot('d', '2025-12-01')]);
    expect(list).toEqual([{ name: 'Rosa', hex: undefined }, { name: 'Azul', hex: '#5C86C7' }]);
  });

  it('o grupo usa a cor da compra mais recente que tem cor', () => {
    const [g] = groupMaterials([lot('novo', '2026-03-01'), lot('velho', '2026-01-01', 'Caramelo', '#C99A6B')]);
    expect(g.color).toBe('Caramelo');
    expect(g.colorHex).toBe('#C99A6B');
    expect(g.colors).toHaveLength(1);
  });

  it('material sem nenhuma cor informada não inventa uma', () => {
    const [g] = groupMaterials([lot('a', '2026-03-01')]);
    expect(g.color).toBeUndefined();
    expect(g.colors).toEqual([]);
  });
});
