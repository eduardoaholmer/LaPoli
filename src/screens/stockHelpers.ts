import type { MaterialGroup } from '../calculations/materials';

export const barTone = (level: MaterialGroup['level']) => (level === 'low' || level === 'out' ? 'err' : level === 'near' ? 'warn' : 'default');
export const stockPercent = (g: Pick<MaterialGroup, 'remaining' | 'minStock'>) =>
  g.minStock > 0 ? Math.max(0, Math.min(100, (g.remaining / (g.minStock * 2)) * 100)) : g.remaining > 0 ? 100 : 0;

export { materialSwatch } from '../calculations/colors';
