/**
 * Acesso seguro ao localStorage. Alguns navegadores bloqueiam o armazenamento (navegador interno de
 * WhatsApp/Instagram, abas privadas, "bloquear todos os cookies"): o simples acesso a `localStorage`
 * lança erro. Nesses casos os valores ficam só na memória (valem até fechar a página), em vez de o app
 * quebrar.
 */
const memory = new Map<string, string>();

export const storage = {
  get(key: string): string | null {
    try {
      const value = window.localStorage.getItem(key);
      if (value !== null) return value;
    } catch {
      /* bloqueado: usa a memória */
    }
    return memory.get(key) ?? null;
  },

  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
      memory.delete(key);
    } catch {
      memory.set(key, value);
    }
  },

  remove(key: string): void {
    memory.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* bloqueado: nada a remover */
    }
  }
};

/** True se o navegador deixa gravar no localStorage (para avisar o usuário quando não deixa). */
export const storageAvailable = (): boolean => {
  try {
    const probe = '__lapoli_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

/** Confere se o IndexedDB (onde ficam os dados) abre neste navegador. */
export const indexedDbAvailable = (): Promise<boolean> =>
  new Promise(resolve => {
    try {
      if (!window.indexedDB) return resolve(false);
      const request = window.indexedDB.open('__lapoli_probe__');
      request.onsuccess = () => {
        request.result.close();
        try {
          window.indexedDB.deleteDatabase('__lapoli_probe__');
        } catch {
          /* sem importância */
        }
        resolve(true);
      };
      request.onerror = () => resolve(false);
      request.onblocked = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
