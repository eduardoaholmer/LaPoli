import { beforeEach, describe, expect, it } from 'vitest';
import { backupStatus, isBackupReminderSnoozed, snoozeBackupReminder } from './backup';

const now = new Date(2026, 9, 23, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

describe('backupStatus', () => {
  it('vence exatamente no 7º dia, não antes', () => {
    expect(backupStatus(daysAgo(6), 7, now)).toEqual({ days: 6, due: false });
    expect(backupStatus(daysAgo(7), 7, now)).toEqual({ days: 7, due: true });
    expect(backupStatus(daysAgo(30), 7, now).due).toBe(true);
  });

  it('respeita o intervalo escolhido e "nunca" (0)', () => {
    expect(backupStatus(daysAgo(10), 14, now).due).toBe(false);
    expect(backupStatus(daysAgo(400), 0, now).due).toBe(false);
  });

  it('quem nunca fez backup é avisado se já tem dados', () => {
    expect(backupStatus(undefined, 7, now, true)).toEqual({ days: null, due: true });
    expect(backupStatus(undefined, 7, now, false).due).toBe(false);
  });

  it('aceita data em texto (vinda de backup importado) e não passa de 0 dias no futuro', () => {
    expect(backupStatus(daysAgo(8).toISOString(), 7, now).due).toBe(true);
    expect(backupStatus(new Date(now.getTime() + 86400000), 7, now).days).toBe(0);
  });
});

describe('adiar o aviso', () => {
  beforeEach(() => localStorage.clear());

  it('some por 24 horas e depois volta', () => {
    expect(isBackupReminderSnoozed(now)).toBe(false);
    snoozeBackupReminder(now);
    expect(isBackupReminderSnoozed(new Date(now.getTime() + 3600000))).toBe(true);
    expect(isBackupReminderSnoozed(new Date(now.getTime() + 86400000 + 1))).toBe(false);
  });
});
