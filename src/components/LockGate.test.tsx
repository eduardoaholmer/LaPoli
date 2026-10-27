import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { db } from '../data/db';
import { SETTINGS_ID, settingsService } from '../data/services';
import { LockGate } from './LockGate';
import { LOCK_EVENT, UNLOCK_WINDOW_MS, createPinRecord, getLastUnlock, markUnlocked } from '../utils/pin';
import type { Settings } from '../types';

const App = () => <p>conteúdo do app</p>;

const baseSettings = { id: SETTINGS_ID, createdAt: new Date(), updatedAt: new Date() } as unknown as Settings;

const typePin = async (pin: string) => {
  for (const d of pin) fireEvent.click(screen.getByRole('button', { name: d }));
};

beforeEach(async () => {
  await db.settings.clear();
  localStorage.clear();
});

describe('LockGate', () => {
  it('sem senha configurada, abre direto', async () => {
    await db.settings.put(baseSettings);
    render(<LockGate><App /></LockGate>);
    expect(await screen.findByText('conteúdo do app')).toBeInTheDocument();
  });

  it('sem nenhuma configuração salva (primeiro uso), abre direto', async () => {
    render(<LockGate><App /></LockGate>);
    expect(await screen.findByText('conteúdo do app')).toBeInTheDocument();
  });

  it('com senha e aparelho nunca desbloqueado, bloqueia e não mostra o app', async () => {
    await db.settings.put({ ...baseSettings, ...(await createPinRecord('4821')) });
    render(<LockGate><App /></LockGate>);
    expect(await screen.findByText('Digite sua senha de 4 números')).toBeInTheDocument();
    expect(screen.queryByText('conteúdo do app')).not.toBeInTheDocument();
  });

  it('senha certa abre o app e lembra o aparelho', async () => {
    await db.settings.put({ ...baseSettings, ...(await createPinRecord('4821')) });
    render(<LockGate><App /></LockGate>);
    await screen.findByText('Digite sua senha de 4 números');
    await typePin('4821');
    expect(await screen.findByText('conteúdo do app')).toBeInTheDocument();
    expect(getLastUnlock()).not.toBeNull();
  });

  it('senha errada não abre, mostra aviso e zera os números', async () => {
    await db.settings.put({ ...baseSettings, ...(await createPinRecord('4821')) });
    render(<LockGate><App /></LockGate>);
    await screen.findByText('Digite sua senha de 4 números');
    await typePin('1111');
    expect(await screen.findByText(/Senha incorreta/)).toBeInTheDocument();
    expect(screen.queryByText('conteúdo do app')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: '0 de 4 números digitados' })).toBeInTheDocument();
  });

  it('depois de 5 erros seguidos, trava o teclado por um tempo', async () => {
    await db.settings.put({ ...baseSettings, ...(await createPinRecord('4821')) });
    render(<LockGate><App /></LockGate>);
    await screen.findByText('Digite sua senha de 4 números');
    for (let i = 0; i < 5; i++) {
      await typePin('1111');
      await waitFor(() => expect(screen.getByRole('img', { name: '0 de 4 números digitados' })).toBeInTheDocument());
    }
    expect(await screen.findByText(/Muitas tentativas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled();
  });

  it('aparelho que digitou a senha há menos de 24 h entra sem pedir', async () => {
    await db.settings.put({ ...baseSettings, ...(await createPinRecord('4821')) });
    markUnlocked(Date.now() - UNLOCK_WINDOW_MS + 60_000);
    render(<LockGate><App /></LockGate>);
    expect(await screen.findByText('conteúdo do app')).toBeInTheDocument();
  });

  it('depois de 24 h volta a pedir', async () => {
    await db.settings.put({ ...baseSettings, ...(await createPinRecord('4821')) });
    markUnlocked(Date.now() - UNLOCK_WINDOW_MS - 1000);
    render(<LockGate><App /></LockGate>);
    expect(await screen.findByText('Digite sua senha de 4 números')).toBeInTheDocument();
  });

  it('"Bloquear agora" fecha o app sem recarregar a página', async () => {
    await db.settings.put({ ...baseSettings, ...(await createPinRecord('4821')) });
    markUnlocked();
    render(<LockGate><App /></LockGate>);
    await screen.findByText('conteúdo do app');
    localStorage.removeItem('lapoli_unlocked_at');
    act(() => {
      window.dispatchEvent(new Event(LOCK_EVENT));
    });
    expect(await screen.findByText('Digite sua senha de 4 números')).toBeInTheDocument();
  });
});

describe('senha nas configurações', () => {
  it('remover os campos da senha deixa de bloquear', async () => {
    await db.settings.put({ ...baseSettings, ...(await createPinRecord('4821')) });
    await settingsService.update({ pinHash: undefined, pinSalt: undefined, pinIterations: undefined });
    const saved = await db.settings.get(SETTINGS_ID);
    expect(saved?.pinHash).toBeUndefined();
    render(<LockGate><App /></LockGate>);
    expect(await screen.findByText('conteúdo do app')).toBeInTheDocument();
  });
});
