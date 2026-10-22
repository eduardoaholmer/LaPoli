import type { MaterialGroup } from '../calculations/materials';

export const barTone = (level: MaterialGroup['level']) => (level === 'low' ? 'err' : level === 'near' ? 'warn' : 'default');
export const stockPercent = (g: Pick<MaterialGroup, 'remaining' | 'minStock'>) =>
  g.minStock > 0 ? Math.max(0, Math.min(100, (g.remaining / (g.minStock * 2)) * 100)) : g.remaining > 0 ? 100 : 0;

/** Cor do fio vem como texto livre ("Rosa claro"); só pinta a bolinha se o navegador entender. */
export const cssColor = (value: string): string => {
  const map: Record<string, string> = { rosa: '#EFC4C4', 'rosa claro': '#F6D5D5', 'rosa bebê': '#EFC4C4', caramelo: '#C99A6B', cru: '#E9DFCB', branco: '#F2EEE8', preto: '#2D2D2D', verde: '#7B9E87', azul: '#8CA8D8', amarelo: '#E8C48A', vermelho: '#B85C5C', marrom: '#8B5A3C', cinza: '#A8A39E', lilás: '#BBA8D8', areia: '#D9CBB0' };
  const v = value.trim().toLowerCase();
  return map[v] ?? Object.entries(map).find(([k]) => v.includes(k))?.[1] ?? '#D9CBB0';
};
