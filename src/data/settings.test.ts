import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { SETTINGS_ID, backupService, settingsService } from './services';

beforeEach(async () => {
  await db.settings.clear();
});

describe('configurações', () => {
  it('ficam num id privado ("#"), que o Dexie Cloud guarda uma vez por conta', async () => {
    const created = await settingsService.initializeDefault();
    expect(created.id).toBe(SETTINGS_ID);
    expect(SETTINGS_ID.startsWith('#')).toBe(true);
  });

  it('salvar a tela inteira grava hora, meta de lucro e formas de pagamento', async () => {
    const settings = await settingsService.initializeDefault();
    await settingsService.update({ ...settings, hourlyRate: 55, desiredProfitMargin: 40, paymentMethods: ['Pix', 'Boleto'] });
    const saved = await settingsService.get();
    expect(saved).toMatchObject({ id: SETTINGS_ID, hourlyRate: 55, desiredProfitMargin: 40, paymentMethods: ['Pix', 'Boleto'] });
    expect(await db.settings.count()).toBe(1);
  });

  it('as gravadas com o id antigo ("default") passam para o novo, sem perder nada', async () => {
    await db.settings.put({ id: 'default', hourlyRate: 42, paymentMethods: ['Pix'], owner: 'outra', realmId: 'outra' } as never);
    const settings = await settingsService.get();
    expect(settings).toMatchObject({ id: SETTINGS_ID, hourlyRate: 42, paymentMethods: ['Pix'] });
    expect(settings).not.toHaveProperty('realmId');
    expect(await db.settings.toCollection().primaryKeys()).toEqual([SETTINGS_ID]);
    await settingsService.update({ hourlyRate: 50 });
    expect((await settingsService.get())?.hourlyRate).toBe(50);
  });

  it('backup antigo, com id "default", entra no id novo', async () => {
    await settingsService.initializeDefault();
    const backup = JSON.parse(await backupService.exportData());
    backup.settings = { ...backup.settings, id: 'default', hourlyRate: 61 };
    await backupService.importData(JSON.stringify(backup));
    expect(await db.settings.toCollection().primaryKeys()).toEqual([SETTINGS_ID]);
    expect((await settingsService.get())?.hourlyRate).toBe(61);
  });
});
