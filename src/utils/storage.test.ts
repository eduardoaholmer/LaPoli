import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storage, storageAvailable } from './storage';

describe('storage com localStorage funcionando', () => {
  beforeEach(() => localStorage.clear());

  it('grava, lê e remove', () => {
    expect(storage.get('k')).toBeNull();
    storage.set('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
    expect(storage.get('k')).toBe('v');
    storage.remove('k');
    expect(storage.get('k')).toBeNull();
  });
});

describe('storage com localStorage bloqueado', () => {
  const blocked = () => {
    throw new DOMException('denied', 'SecurityError');
  };

  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);
  });
  afterEach(() => vi.restoreAllMocks());

  it('não lança erro e guarda na memória até recarregar', () => {
    expect(() => storage.get('x')).not.toThrow();
    expect(storage.get('x')).toBeNull();
    expect(() => storage.set('x', '1')).not.toThrow();
    expect(storage.get('x')).toBe('1');
    expect(() => storage.remove('x')).not.toThrow();
    expect(storage.get('x')).toBeNull();
  });

  it('storageAvailable avisa que está bloqueado', () => {
    expect(storageAvailable()).toBe(false);
  });
});
