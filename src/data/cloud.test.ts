import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { discardDeviceData, mergeDeviceData, resumePendingLogin, signIn, type CloudClient } from './cloud';
import { clearStash, isLoginPending, stashPhase } from './cloudStash';
import { settingsService } from './services';
import type { Product } from '../types';

const product = (id: string, over: Partial<Product> = {}) => ({ id, name: id, materials: [], owner: 'unauthorized', realmId: 'unauthorized', ...over }) as unknown as Product;

/** Nuvem de mentira: "login" guarda o que a conta tem e, no pull, escreve isso no banco (como a sincronização faz). */
const fakeCloud = (account: { products?: Product[]; settings?: object } = {}, opts: { cancel?: boolean; beforeLogin?: () => Promise<void> } = {}) => {
  let loggedIn = false;
  const cloud: CloudClient = {
    ready: async () => undefined,
    isLoggedIn: () => loggedIn,
    login: async () => {
      await opts.beforeLogin?.();
      if (opts.cancel) throw Object.assign(new Error('User cancelled'), { name: 'AbortError' });
      loggedIn = true;
    },
    pull: async () => {
      if (account.products?.length) await db.products.bulkPut(account.products);
      if (account.settings) await db.settings.put({ id: 'default', ...account.settings } as never);
    },
    logout: async () => {
      loggedIn = false;
    }
  };
  return cloud;
};

const names = async () => (await db.products.toArray()).map(p => p.name).sort();

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.purchases.clear(), db.orders.clear(), db.settings.clear(), db.transactions.clear()]);
  await clearStash();
  await db.settings.put({ id: 'default', hourlyRate: 45 } as never);
});

describe('entrar na nuvem', () => {
  it('primeiro aparelho: a conta está vazia e os dados do aparelho voltam, como da conta', async () => {
    await db.products.bulkPut([product('Leão'), product('Urso')]);
    expect(await signIn(fakeCloud())).toEqual({ kind: 'first-device' });
    expect(await names()).toEqual(['Leão', 'Urso']);
    const leao = await db.products.get('Leão');
    expect(leao).not.toHaveProperty('owner'); // o dono "unauthorized" sai; a sincronização põe o da conta
    expect((await settingsService.get())?.hourlyRate).toBe(45); // as configurações deste aparelho valem
    expect(await stashPhase()).toBeNull();
  });

  it('aparelho novo só com exemplos: ficam os dados da conta, inclusive as configurações', async () => {
    await db.products.put(product('Exemplo', { isExample: true }));
    await db.settings.put({ id: 'default', hourlyRate: 30 } as never);
    const result = await signIn(fakeCloud({ products: [product('Tapete')], settings: { hourlyRate: 45 } }));
    expect(result).toEqual({ kind: 'account' });
    expect(await names()).toEqual(['Tapete']);
    expect((await settingsService.get())?.hourlyRate).toBe(45);
  });

  it('conta e aparelho com dados: pergunta; "juntar" só acrescenta o que falta', async () => {
    await db.products.bulkPut([product('Tapete', { name: 'Tapete velho' } as Partial<Product>), product('Bolsa'), product('Exemplo', { isExample: true })]);
    const result = await signIn(fakeCloud({ products: [product('Tapete', { name: 'Tapete novo' } as Partial<Product>)] }));
    expect(result).toEqual({ kind: 'merge', device: { products: 2, purchases: 0, orders: 0, transactions: 0 } });
    expect(await stashPhase()).toBe('merge');
    await mergeDeviceData();
    expect(await names()).toEqual(['Bolsa', 'Tapete novo']); // o da conta não é sobrescrito; exemplo fica de fora
    expect(await stashPhase()).toBeNull();
  });

  it('"ficar só com os da conta" descarta a cópia do aparelho', async () => {
    await db.products.put(product('Bolsa'));
    await signIn(fakeCloud({ products: [product('Tapete')] }));
    await discardDeviceData();
    expect(await names()).toEqual(['Tapete']);
  });

  it('cancelou o login: tudo volta como estava', async () => {
    await db.products.put(product('Leão'));
    expect(await signIn(fakeCloud({}, { cancel: true }))).toEqual({ kind: 'cancelled' });
    expect(await names()).toEqual(['Leão']);
    expect((await settingsService.get())?.hourlyRate).toBe(45);
    expect(await isLoginPending()).toBe(false);
  });

  it('durante o login as configurações padrão não são gravadas (subiriam por cima das da conta)', async () => {
    let created: unknown = 'não chamou';
    await signIn(
      fakeCloud(
        { settings: { hourlyRate: 45 } },
        {
          beforeLogin: async () => {
            await settingsService.initializeDefault(); // uma tela abrindo no meio do login
            created = await db.settings.get('default');
          }
        }
      )
    );
    expect(created).toBeUndefined();
  });

  it('o app fechou esperando o código: ao abrir de novo sem login, os dados voltam', async () => {
    await db.products.put(product('Leão'));
    const cloud = fakeCloud();
    cloud.login = () => new Promise(() => undefined); // nunca termina: o app "fechou"
    void signIn(cloud);
    await new Promise(r => setTimeout(r, 50));
    expect(await db.products.count()).toBe(0);
    expect(await resumePendingLogin(fakeCloud())).toEqual({ kind: 'cancelled' });
    expect(await names()).toEqual(['Leão']);
  });
});
