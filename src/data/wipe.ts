import { db } from './db';

/** Apaga os dados deste aparelho (banco e preferências locais). Usado quando a senha foi esquecida. */
export const wipeLocalData = async (): Promise<void> => {
  db.close();
  await db.delete();
  try {
    window.localStorage.clear();
  } catch {
    /* armazenamento bloqueado: nada a limpar */
  }
};
