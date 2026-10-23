import { describe, it, expect } from 'vitest';
import { periodRange, greetingFor, inRange } from './period';

const now = new Date(2026, 9, 22, 15, 0); // 22/10/2026

describe('Períodos', () => {
  it('mês atual vai do dia 1 até hoje', () => {
    const r = periodRange('month', now);
    expect(r.start.getDate()).toBe(1);
    expect(inRange(new Date(2026, 9, 22, 23, 0), r)).toBe(true);
    expect(inRange(new Date(2026, 9, 23), r)).toBe(false);
  });

  it('mês passado cobre o mês inteiro anterior', () => {
    const r = periodRange('lastMonth', now);
    expect(r.start.getMonth()).toBe(8);
    expect(inRange(new Date(2026, 8, 30, 12), r)).toBe(true);
    expect(inRange(new Date(2026, 9, 1), r)).toBe(false);
  });

  it('saúda conforme a hora', () => {
    expect(greetingFor(new Date(2026, 0, 1, 8))).toBe('Bom dia');
    expect(greetingFor(new Date(2026, 0, 1, 15))).toBe('Boa tarde');
    expect(greetingFor(new Date(2026, 0, 1, 21))).toBe('Boa noite');
  });
});
