import type { Purchase } from '../types';

/** Paleta de cores de fio/material para escolher na compra (nome + cor exata). */
export const YARN_COLORS: { name: string; hex: string }[] = [
  { name: 'Branco', hex: '#F4F1EC' },
  { name: 'Cru', hex: '#E9DFCB' },
  { name: 'Bege', hex: '#D9C3A0' },
  { name: 'Areia', hex: '#D9CBB0' },
  { name: 'Amarelo', hex: '#F0D264' },
  { name: 'Mostarda', hex: '#C99A2E' },
  { name: 'Laranja', hex: '#E58A4B' },
  { name: 'Terracota', hex: '#C97B5F' },
  { name: 'Vermelho', hex: '#B83A3A' },
  { name: 'Vinho', hex: '#7A2B3F' },
  { name: 'Rosa claro', hex: '#F6D5D5' },
  { name: 'Rosa', hex: '#EFA7B5' },
  { name: 'Pink', hex: '#D6407F' },
  { name: 'Lilás', hex: '#BBA8D8' },
  { name: 'Roxo', hex: '#6F4A8E' },
  { name: 'Azul bebê', hex: '#BBD4EC' },
  { name: 'Azul', hex: '#5C86C7' },
  { name: 'Azul marinho', hex: '#26365E' },
  { name: 'Turquesa', hex: '#4FB3B0' },
  { name: 'Verde claro', hex: '#B9D8A8' },
  { name: 'Verde', hex: '#5E9C6B' },
  { name: 'Verde musgo', hex: '#6B7240' },
  { name: 'Marrom', hex: '#7A5238' },
  { name: 'Caramelo', hex: '#C99A6B' },
  { name: 'Cinza', hex: '#A8A39E' },
  { name: 'Preto', hex: '#2D2D2D' }
];

const FALLBACK = '#D9CBB0';

const normalize = (value: string): string => value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// o nome mais comprido primeiro, para "rosa claro" ganhar de "rosa" e "azul marinho" de "azul"
const BY_NAME = YARN_COLORS.map(c => ({ key: normalize(c.name), hex: c.hex })).sort((a, b) => b.key.length - a.key.length);
// apelidos comuns que não estão na paleta
const ALIASES: Record<string, string> = { 'rosa bebe': '#EFC4C4', salmao: '#F0A58F', goiaba: '#E57C7C', creme: '#F3E9D2', dourado: '#C9A24B', prata: '#BFC3C7', grafite: '#575757', petroleo: '#2F5D62', coral: '#EE7C6B', lavanda: '#C9B8E3', menta: '#B8E0CC', ocre: '#B5832F' };
const ALIAS_LIST = Object.entries(ALIASES).sort((a, b) => b[0].length - a[0].length);

export const isHexColor = (value?: string): value is string => !!value && /^#[0-9a-fA-F]{6}$/.test(value);

/** Cor a partir do nome digitado ("Rosa claro", "tom caramelo"); undefined se não reconhecer. */
export const colorFromName = (name?: string): string | undefined => {
  const v = name ? normalize(name) : '';
  if (!v) return undefined;
  const exact = BY_NAME.find(c => c.key === v)?.hex ?? ALIASES[v];
  if (exact) return exact;
  return BY_NAME.find(c => v.includes(c.key))?.hex ?? ALIAS_LIST.find(([k]) => v.includes(k))?.[1];
};

export interface Swatch {
  css: string; // cor para pintar
  exact: boolean; // false = não deu para saber a cor: mostra uma cor neutra aproximada
}

/** A cor exata escolhida na paleta vence; senão tenta pelo nome; senão uma cor neutra. */
export const materialSwatch = (name?: string, hex?: string): Swatch => {
  if (isHexColor(hex)) return { css: hex, exact: true };
  const fromName = colorFromName(name);
  return fromName ? { css: fromName, exact: true } : { css: FALLBACK, exact: false };
};

export interface MaterialColor {
  name?: string;
  hex?: string;
}

const colorKey = (c: MaterialColor): string => (isHexColor(c.hex) ? c.hex.toLowerCase() : normalize(c.name ?? ''));

/** Cores diferentes entre as compras de um material, da compra mais recente para a mais antiga. */
export const distinctColors = (purchases: Pick<Purchase, 'color' | 'colorHex'>[]): MaterialColor[] => {
  const seen = new Set<string>();
  const list: MaterialColor[] = [];
  purchases.forEach(p => {
    const c: MaterialColor = { name: p.color?.trim() || undefined, hex: isHexColor(p.colorHex) ? p.colorHex : undefined };
    const key = colorKey(c);
    if (!key || seen.has(key)) return;
    seen.add(key);
    list.push(c);
  });
  return list;
};
