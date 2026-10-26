import { db } from './db';
import { settingsService } from './services';
import { DATA_TABLES, clearStash, readStash, setStashPhase, stashPhase, withoutCloudFields, writeStash, type DataTable } from './cloudStash';

/** O que o fluxo precisa da nuvem. Em produção é o Dexie Cloud (realCloud); nos testes, um dublê. */
export interface CloudClient {
  /** Espera saber se há alguém logado (o estado é lido do banco ao abrir). */
  ready(): Promise<void>;
  isLoggedIn(): boolean;
  /** Abre o login (e-mail e código). Lança erro se ela cancelar. */
  login(): Promise<void>;
  /** Primeira sincronização: envia e baixa tudo, e espera terminar. */
  pull(): Promise<void>;
  logout(): Promise<void>;
}

/** Dados de verdade (não exemplos) que só este aparelho tem, para perguntar se junta com a conta. */
export interface DeviceData {
  products: number;
  purchases: number;
  orders: number;
  transactions: number;
}

export type SignInResult =
  | { kind: 'first-device' } // a conta estava vazia: os dados do aparelho foram para ela
  | { kind: 'account' } // a conta já tinha dados; o aparelho não tinha nada de próprio
  | { kind: 'merge'; device: DeviceData } // a conta já tinha dados e o aparelho também: perguntar
  | { kind: 'cancelled' };

type Rows = Record<DataTable, Record<string, unknown>[]>;

const tables = () => DATA_TABLES.map(t => db.table(t));

const snapshot = async (): Promise<Rows> =>
  Object.fromEntries(await Promise.all(DATA_TABLES.map(async t => [t, await db.table(t).toArray()]))) as Rows;

const putAll = async (rows: Rows, only: (table: DataTable, row: Record<string, unknown>) => boolean = () => true) => {
  await db.transaction('rw', tables(), async () => {
    for (const t of DATA_TABLES) {
      const keep = rows[t].filter(r => only(t, r)).map(withoutCloudFields);
      if (keep.length) await db.table(t).bulkPut(keep);
    }
  });
};

/** Exemplos e o que veio deles não contam como "dados do aparelho". */
const realRows = (rows: Rows): Rows => {
  const real = (r: Record<string, unknown>) => r.isExample !== true;
  const ids = new Set([...rows.orders, ...rows.purchases].filter(real).map(r => r.id));
  return {
    products: rows.products.filter(real),
    purchases: rows.purchases.filter(real),
    orders: rows.orders.filter(real),
    settings: [],
    // lançamentos manuais, ou de pedidos e compras de verdade
    transactions: rows.transactions.filter(t => !t.originId || ids.has(t.originId))
  };
};

const countOf = (rows: Rows): DeviceData => ({ products: rows.products.length, purchases: rows.purchases.length, orders: rows.orders.length, transactions: rows.transactions.length });

/** Depois que o login e a primeira sincronização terminaram: decide o que volta da cópia. */
const settle = async (): Promise<SignInResult> => {
  const accountHasData = (await Promise.all(tables().map(t => t.count()))).some(n => n > 0);
  const stash = await readStash();
  if (!accountHasData) {
    // primeiro aparelho: tudo volta, agora como da conta, e sobe na próxima sincronização
    await putAll(stash);
    await clearStash();
    return { kind: 'first-device' };
  }
  const device = realRows(stash);
  if (Object.values(countOf(device)).every(n => n === 0)) {
    await clearStash();
    return { kind: 'account' };
  }
  await setStashPhase('merge');
  return { kind: 'merge', device: countOf(device) };
};

const restoreAfterFailure = async () => {
  await putAll(await readStash());
  await clearStash();
};

/**
 * Entrar na conta: guarda uma cópia do aparelho, esvazia o banco, faz o login e a primeira sincronização,
 * e então decide o que volta (ver settle). Se ela cancelar ou der erro antes de entrar, tudo volta como estava.
 */
export const signIn = async (cloud: CloudClient): Promise<SignInResult> => {
  await cloud.ready();
  if (cloud.isLoggedIn()) return { kind: 'account' };
  await writeStash(await snapshot());
  await db.transaction('rw', tables(), async () => {
    for (const t of tables()) await t.clear();
  });
  try {
    await cloud.login();
  } catch (error) {
    await restoreAfterFailure();
    if (error instanceof Error && error.name === 'AbortError') return { kind: 'cancelled' };
    throw error;
  }
  if (!cloud.isLoggedIn()) {
    await restoreAfterFailure();
    return { kind: 'cancelled' };
  }
  // entrou: daqui em diante a cópia só sai depois que a primeira sincronização terminar
  await cloud.pull();
  const result = await settle();
  await settingsService.initializeDefault(); // conta nova e aparelho sem configurações: cria as padrão
  return result;
};

/**
 * Ao abrir o app: se o login ficou pela metade (o app fechou esperando o código, ou sem internet),
 * termina o que dá. Sem login, devolve os dados ao aparelho. Devolve 'merge' se ainda falta ela decidir.
 */
export const resumePendingLogin = async (cloud: CloudClient): Promise<SignInResult | null> => {
  const phase = await stashPhase();
  if (!phase) return null;
  await cloud.ready();
  if (!cloud.isLoggedIn()) {
    await restoreAfterFailure();
    return { kind: 'cancelled' };
  }
  if (phase === 'merge') return { kind: 'merge', device: countOf(realRows(await readStash())) };
  await cloud.pull();
  const result = await settle();
  await settingsService.initializeDefault();
  return result;
};

/** "Juntar com a conta": acrescenta só o que a conta não tem (nada é sobrescrito). Exemplos e configurações ficam de fora. */
export const mergeDeviceData = async (): Promise<void> => {
  const device = realRows(await readStash());
  const existing = Object.fromEntries(
    await Promise.all(DATA_TABLES.map(async t => [t, new Set(await db.table(t).toCollection().primaryKeys())]))
  ) as Record<DataTable, Set<unknown>>;
  await putAll(device, (t, row) => !existing[t].has(row.id));
  await clearStash();
};

/** "Ficar só com os da conta": a cópia do aparelho é descartada. */
export const discardDeviceData = async (): Promise<void> => {
  await clearStash();
};

/** Sair da conta neste aparelho: os dados saem daqui e continuam na conta. Volta com configurações padrão, sem exemplos. */
export const signOut = async (cloud: CloudClient): Promise<void> => {
  await cloud.logout();
  await settingsService.initializeDefault();
  await settingsService.update({ exampleDataSeeded: true });
};
