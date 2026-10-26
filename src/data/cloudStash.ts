import Dexie, { type Table } from 'dexie';

/**
 * Cópia dos dados do aparelho durante o login na nuvem. Fica num banco à parte (sem sincronização),
 * para sobreviver se o app fechar no meio (esperando o código do e-mail, por exemplo).
 *
 * Por que a cópia: no primeiro login, tudo o que está no aparelho sobe e substitui o que a conta tem
 * com o mesmo id. As configurações têm sempre o mesmo id ("default"), então as do aparelho novo
 * apagariam as da conta. Com a cópia, o banco fica vazio durante o login e, depois da primeira
 * sincronização, o app decide o que volta.
 */

export const DATA_TABLES = ['products', 'purchases', 'orders', 'settings', 'transactions'] as const;
export type DataTable = (typeof DATA_TABLES)[number];

interface StashedTable {
  table: DataTable;
  rows: Record<string, unknown>[];
}

/** 'login': o banco foi esvaziado e o login está em andamento. 'merge': a conta já tinha dados e falta ela decidir se junta os do aparelho. */
export type StashPhase = 'login' | 'merge';

interface StashMeta {
  id: 'state';
  phase: StashPhase;
  startedAt: Date;
}

class StashDB extends Dexie {
  tables_!: Table<StashedTable, DataTable>;
  meta!: Table<StashMeta, string>;

  constructor() {
    super('LaPoliLoginStash');
    this.version(1).stores({ tables_: 'table', meta: 'id' });
  }
}

export const stashDb = new StashDB();

let cachedPhase: StashPhase | null | undefined;

export const stashPhase = async (): Promise<StashPhase | null> => {
  if (cachedPhase === undefined) cachedPhase = (await stashDb.meta.get('state'))?.phase ?? null;
  return cachedPhase;
};

/** Login em andamento com o banco vazio: nada deve ser gravado (as configurações padrão subiriam por cima das da conta). */
export const isLoginPending = async (): Promise<boolean> => (await stashPhase()) === 'login';

export const writeStash = async (data: Record<DataTable, Record<string, unknown>[]>): Promise<void> => {
  await stashDb.transaction('rw', stashDb.tables_, stashDb.meta, async () => {
    await stashDb.tables_.clear();
    await stashDb.tables_.bulkPut(DATA_TABLES.map(table => ({ table, rows: data[table] })));
    await stashDb.meta.put({ id: 'state', phase: 'login', startedAt: new Date() });
  });
  cachedPhase = 'login';
};

export const readStash = async (): Promise<Record<DataTable, Record<string, unknown>[]>> => {
  const stored = await stashDb.tables_.toArray();
  return Object.fromEntries(DATA_TABLES.map(t => [t, stored.find(s => s.table === t)?.rows ?? []])) as Record<DataTable, Record<string, unknown>[]>;
};

export const setStashPhase = async (phase: StashPhase): Promise<void> => {
  await stashDb.meta.update('state', { phase });
  cachedPhase = phase;
};

export const clearStash = async (): Promise<void> => {
  await stashDb.transaction('rw', stashDb.tables_, stashDb.meta, async () => {
    await stashDb.tables_.clear();
    await stashDb.meta.clear();
  });
  cachedPhase = null;
};

/**
 * Tira os campos que a sincronização grava em cada registro (de quem é e em que "pasta" da nuvem está).
 * Ao voltar a cópia depois do login, ou ao importar um backup, o registro passa a ser da conta atual;
 * com o dono antigo ("unauthorized" ou outra conta) a nuvem recusaria.
 */
export const withoutCloudFields = <T extends object>(row: T): T => {
  const { owner: _owner, realmId: _realmId, ...rest } = row as T & { owner?: unknown; realmId?: unknown };
  return rest as T;
};
