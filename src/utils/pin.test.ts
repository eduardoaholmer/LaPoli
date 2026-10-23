import { beforeEach, describe, expect, it } from 'vitest';
import {
  UNLOCK_WINDOW_MS,
  createPinRecord,
  getLastUnlock,
  isValidPin,
  lockDevice,
  lockoutSeconds,
  markUnlocked,
  needsPin,
  readFailState,
  registerFail,
  verifyPin,
  waitSeconds
} from './pin';

describe('validação da senha', () => {
  it('aceita exatamente 4 números', () => {
    expect(isValidPin('0000')).toBe(true);
    expect(isValidPin('1234')).toBe(true);
    ['', '123', '12345', 'abcd', '12a4', ' 123', '12.4'].forEach(v => expect(isValidPin(v)).toBe(false));
  });
});

describe('hash e verificação', () => {
  it('acerta a senha certa e recusa as erradas, sem guardar a senha', async () => {
    const record = await createPinRecord('4821');
    expect(JSON.stringify(record)).not.toContain('4821');
    expect(record.pinHash).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifyPin('4821', record)).toBe(true);
    expect(await verifyPin('4822', record)).toBe(false);
    expect(await verifyPin('', record)).toBe(false);
    expect(await verifyPin('abcd', record)).toBe(false);
  });

  it('cada senha tem um sal próprio (mesma senha, hashes diferentes)', async () => {
    const a = await createPinRecord('1111');
    const b = await createPinRecord('1111');
    expect(a.pinSalt).not.toBe(b.pinSalt);
    expect(a.pinHash).not.toBe(b.pinHash);
  });

  it('recusa criar senha inválida e verificar sem registro', async () => {
    await expect(createPinRecord('12')).rejects.toThrow();
    expect(await verifyPin('1234', {})).toBe(false);
  });
});

describe('quando pedir a senha (24 horas)', () => {
  const withPin = { pinHash: 'x' };
  const now = new Date(2026, 9, 23, 12).getTime();

  it('nunca pede se não há senha configurada', () => {
    expect(needsPin({}, null, now)).toBe(false);
    expect(needsPin(undefined, null, now)).toBe(false);
  });

  it('pede se o aparelho nunca digitou a senha', () => {
    expect(needsPin(withPin, null, now)).toBe(true);
  });

  it('não pede dentro de 24 horas e pede a partir de 24 horas', () => {
    expect(needsPin(withPin, now - UNLOCK_WINDOW_MS + 1, now)).toBe(false);
    expect(needsPin(withPin, now - 60_000, now)).toBe(false);
    expect(needsPin(withPin, now - UNLOCK_WINDOW_MS, now)).toBe(true);
    expect(needsPin(withPin, now - 3 * UNLOCK_WINDOW_MS, now)).toBe(true);
  });

  it('relógio voltado atrás conta como vencido', () => {
    expect(needsPin(withPin, now + 60_000, now)).toBe(true);
  });
});

describe('desbloqueio por aparelho', () => {
  beforeEach(() => localStorage.clear());

  it('guarda o horário do desbloqueio e "bloquear agora" apaga', () => {
    expect(getLastUnlock()).toBeNull();
    markUnlocked(1234);
    expect(getLastUnlock()).toBe(1234);
    lockDevice();
    expect(getLastUnlock()).toBeNull();
  });
});

describe('tentativas erradas', () => {
  beforeEach(() => localStorage.clear());

  it('as 5 primeiras são livres e depois a espera dobra até 15 minutos', () => {
    expect([1, 4].map(lockoutSeconds)).toEqual([0, 0]);
    expect([5, 6, 7, 8].map(lockoutSeconds)).toEqual([30, 60, 120, 240]);
    expect(lockoutSeconds(30)).toBe(15 * 60);
  });

  it('conta as falhas, impõe espera e zera ao acertar', () => {
    const t = 1_000_000;
    for (let i = 0; i < 4; i++) registerFail(t);
    expect(waitSeconds(t)).toBe(0);
    registerFail(t);
    expect(readFailState().count).toBe(5);
    expect(waitSeconds(t)).toBe(30);
    expect(waitSeconds(t + 10_000)).toBe(20);
    expect(waitSeconds(t + 31_000)).toBe(0);
    markUnlocked(t);
    expect(readFailState().count).toBe(0);
  });
});
