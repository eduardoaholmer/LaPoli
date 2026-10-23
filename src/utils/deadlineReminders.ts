import { storage } from './storage';

/**
 * Pede permissão para avisar de prazos só quando faz sentido: no primeiro pedido com prazo,
 * e uma vez só. Antes o pedido aparecia na primeira abertura, sem contexto, e tendia a ser negado.
 */
export const askDeadlineReminders = async (): Promise<void> => {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  if (storage.get('lapoli_notification_asked')) return;
  storage.set('lapoli_notification_asked', 'true');
  try {
    await Notification.requestPermission();
  } catch {
    /* navegador sem suporte à pergunta: segue sem avisos */
  }
};
