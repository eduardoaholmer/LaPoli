import type { Toast } from '../components/Toast';

/** Atalho tipado para quem não quer usar `window.toast` direto. */
export const notify = (toast: Omit<Toast, 'id'>) => {
  (window as unknown as { toast?: { add: (t: Omit<Toast, 'id'>) => void } }).toast?.add(toast);
};
