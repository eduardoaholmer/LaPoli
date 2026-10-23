const DAY = 86400000;
const SNOOZE_KEY = 'lapoli_backup_snooze_until';

export interface BackupStatus {
  days: number | null; // null = nunca fez backup
  due: boolean;
}

/** Quantos dias desde o último backup e se o lembrete periódico já venceu (`everyDays` 0 = nunca lembrar). */
export const backupStatus = (lastBackupDate: Date | string | undefined, everyDays = 7, now: Date = new Date(), hasData = true): BackupStatus => {
  const days = lastBackupDate ? Math.max(0, Math.floor((now.getTime() - new Date(lastBackupDate).getTime()) / DAY)) : null;
  const due = everyDays > 0 && (days === null ? hasData : days >= everyDays);
  return { days, due };
};

/** "Agora não": esconde o aviso da tela inicial por 24 horas. O armazenamento local pode estar bloqueado; nesse caso o aviso só volta no próximo carregamento. */
export const snoozeBackupReminder = (now: Date = new Date()): void => {
  try {
    localStorage.setItem(SNOOZE_KEY, String(now.getTime() + DAY));
  } catch {
    /* sem armazenamento local: o aviso volta na próxima abertura */
  }
};

export const isBackupReminderSnoozed = (now: Date = new Date()): boolean => {
  try {
    return now.getTime() < Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
  } catch {
    return false;
  }
};
