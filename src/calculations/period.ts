/**
 * Faturamento, caixa e lucro são coisas diferentes:
 * - Faturamento (receita reconhecida): pedidos ENTREGUES no período, pelo valor combinado.
 * - Caixa: dinheiro que de fato entrou (sinal e saldo recebidos) e saiu (compras de material) no período.
 * - Lucro: faturamento menos o custo das peças vendidas (materiais, outros custos e mão de obra).
 */

export type PeriodKey = 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom';

export interface PeriodRange {
  start: Date;
  end: Date; // inclusive
  label: string;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const periodRange = (key: PeriodKey, now: Date = new Date(), custom?: { start: Date; end: Date }): PeriodRange => {
  const today = startOfDay(now);
  switch (key) {
    case 'today':
      return { start: today, end: endOfDay(now), label: 'Hoje' };
    case 'week':
      return { start: new Date(today.getTime() - 6 * 86400000), end: endOfDay(now), label: 'Últimos 7 dias' };
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return { start, end, label: MESES[start.getMonth()].replace(/^./, c => c.toUpperCase()) };
    }
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now), label: `${now.getFullYear()} até hoje` };
    case 'custom':
      return {
        start: startOfDay(custom?.start ?? today),
        end: endOfDay(custom?.end ?? now),
        label: 'Período personalizado'
      };
    case 'month':
    default:
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfDay(now),
        label: `${MESES[now.getMonth()].replace(/^./, c => c.toUpperCase())} (1 a ${now.getDate()})`
      };
  }
};

export const inRange = (d: Date | string | undefined, r: PeriodRange): boolean => {
  if (!d) return false;
  const t = new Date(d).getTime();
  return t >= r.start.getTime() && t <= r.end.getTime();
};

export const greetingFor = (now: Date = new Date()): string => {
  const h = now.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};
