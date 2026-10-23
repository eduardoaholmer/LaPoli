import type { Settings } from '../types';
import { storage } from './storage';

/**
 * Senha de acesso de 4 dígitos. É uma trava de privacidade contra quem pega o aparelho aberto: os dados
 * ficam no navegador e não são criptografados, então ela não substitui a proteção do próprio aparelho.
 * Só o hash (PBKDF2-SHA256 com sal) é guardado, nunca a senha.
 */

export const PIN_LENGTH = 4;
const PIN_ITERATIONS = 100_000;
const UNLOCK_KEY = 'lapoli_unlocked_at';
const FAIL_KEY = 'lapoli_pin_fails';

/** Quanto tempo um aparelho que acertou a senha fica sem precisar digitá-la de novo. */
export const UNLOCK_WINDOW_MS = 24 * 60 * 60 * 1000;

export type PinRecord = Pick<Settings, 'pinHash' | 'pinSalt' | 'pinIterations'>;

export const isValidPin = (pin: string): boolean => /^\d{4}$/.test(pin);

/** O hash usa WebCrypto, que só existe em páginas seguras (https ou localhost). */
export const pinSupported = (): boolean => typeof crypto !== 'undefined' && !!crypto.subtle;

const toHex = (bytes: Uint8Array): string => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string): Uint8Array => Uint8Array.from(hex.match(/.{2}/g) ?? [], h => parseInt(h, 16));

const derive = async (pin: string, salt: Uint8Array, iterations: number): Promise<string> => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return toHex(new Uint8Array(bits));
};

export const createPinRecord = async (pin: string): Promise<Required<PinRecord>> => {
  if (!isValidPin(pin)) throw new Error('A senha precisa ter 4 números.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { pinSalt: toHex(salt), pinIterations: PIN_ITERATIONS, pinHash: await derive(pin, salt, PIN_ITERATIONS) };
};

export const hasPin = (settings: Pick<Settings, 'pinHash'> | undefined | null): boolean => !!settings?.pinHash;

export const verifyPin = async (pin: string, record: PinRecord): Promise<boolean> => {
  if (!isValidPin(pin) || !record.pinHash || !record.pinSalt) return false;
  const candidate = await derive(pin, fromHex(record.pinSalt), record.pinIterations ?? PIN_ITERATIONS);
  // comparação em tempo constante
  if (candidate.length !== record.pinHash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ record.pinHash.charCodeAt(i);
  return diff === 0;
};

/** A senha é exigida quando existe e este aparelho não a digitou nas últimas 24 horas. */
export const needsPin = (settings: Pick<Settings, 'pinHash'> | undefined | null, lastUnlockAt: number | null, now: number = Date.now()): boolean => {
  if (!hasPin(settings)) return false;
  if (lastUnlockAt === null || Number.isNaN(lastUnlockAt)) return true;
  const elapsed = now - lastUnlockAt;
  return elapsed < 0 || elapsed >= UNLOCK_WINDOW_MS; // relógio voltado atrás conta como vencido
};

export const getLastUnlock = (): number | null => {
  const raw = storage.get(UNLOCK_KEY);
  return raw === null ? null : Number(raw);
};

export const markUnlocked = (now: number = Date.now()): void => {
  storage.set(UNLOCK_KEY, String(now));
  storage.remove(FAIL_KEY);
};

/** "Bloquear agora": o aparelho volta a pedir a senha na próxima abertura. */
export const lockDevice = (): void => storage.remove(UNLOCK_KEY);

/* ---------- Tentativas erradas: espera crescente para dificultar tentar todas as 10.000 senhas ---------- */

export const FREE_ATTEMPTS = 5;

/** Espera, em segundos, depois da n-ésima tentativa errada seguida (0 = ainda pode tentar). */
export const lockoutSeconds = (fails: number): number => {
  if (fails < FREE_ATTEMPTS) return 0;
  return Math.min(30 * 2 ** (fails - FREE_ATTEMPTS), 15 * 60);
};

interface FailState {
  count: number;
  until: number;
}

export const readFailState = (): FailState => {
  try {
    const parsed = JSON.parse(storage.get(FAIL_KEY) ?? '');
    return { count: Number(parsed.count) || 0, until: Number(parsed.until) || 0 };
  } catch {
    return { count: 0, until: 0 };
  }
};

export const registerFail = (now: number = Date.now()): FailState => {
  const count = readFailState().count + 1;
  const state = { count, until: now + lockoutSeconds(count) * 1000 };
  storage.set(FAIL_KEY, JSON.stringify(state));
  return state;
};

export const waitSeconds = (now: number = Date.now()): number => Math.max(0, Math.ceil((readFailState().until - now) / 1000));

/** Evento disparado por "Bloquear agora" para o portão de senha fechar o app sem recarregar a página. */
export const LOCK_EVENT = 'lapoli:lock';

export const lockNow = (): void => {
  lockDevice();
  window.dispatchEvent(new Event(LOCK_EVENT));
};
