import { useSyncExternalStore } from 'react';
import { useObservable } from 'dexie-react-hooks';
import type { SyncState, UserLogin } from 'dexie-cloud-addon';
import { db } from './db';
import { cloudEnabled } from './cloudConfig';
import { discardDeviceData, mergeDeviceData, resumePendingLogin, signIn, signOut, type CloudClient, type DeviceData, type SignInResult } from './cloud';
import { storage } from '../utils/storage';

/** O Dexie Cloud de verdade, no formato que o fluxo de login (cloud.ts) espera. */
const realCloud: CloudClient = {
  ready: () =>
    new Promise<void>(resolve => {
      let done = false;
      const sub = db.cloud.currentUser.subscribe(u => {
        if (u.isLoading || done) return;
        done = true;
        resolve();
        queueMicrotask(() => sub.unsubscribe());
      });
    }),
  isLoggedIn: () => !!db.cloud.currentUser.value.isLoggedIn,
  login: () => db.cloud.login(),
  pull: () => db.cloud.sync({ wait: true, purpose: 'pull' }),
  logout: () => db.cloud.logout()
};

// ---------- estado do login para as telas ----------

export interface CloudSession {
  busy: boolean; // entrando, baixando os dados ou saindo
  merge?: DeviceData; // a conta já tinha dados e este aparelho também: perguntar se junta
  error?: string;
}

let session: CloudSession = { busy: false };
const listeners = new Set<() => void>();
const setSession = (patch: Partial<CloudSession>) => {
  session = { ...session, ...patch };
  listeners.forEach(l => l());
};

export const useCloudSession = (): CloudSession =>
  useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session
  );

/** Mensagem para mostrar depois de recarregar (as telas leem os dados ao abrir, então recarrega depois do login). */
const DONE_KEY = 'lapoli_cloud_done';

const reloadWith = (message: string) => {
  storage.set(DONE_KEY, message);
  window.location.reload();
};

export const takeCloudDoneMessage = (): string | null => {
  const message = storage.get(DONE_KEY);
  if (message) storage.remove(DONE_KEY);
  return message;
};

const errorText = (error: unknown) =>
  error instanceof Error && /fetch|network|failed/i.test(error.message)
    ? 'Sem conexão com a nuvem. Confira a internet e tente de novo.'
    : `Não deu para entrar agora. ${error instanceof Error ? error.message : ''}`.trim();

const handle = (result: SignInResult | null) => {
  if (!result || result.kind === 'cancelled') return setSession({ busy: false });
  if (result.kind === 'merge') return setSession({ busy: false, merge: result.device });
  reloadWith(
    result.kind === 'first-device'
      ? 'Pronto! Seus dados estão na sua conta. Nos outros aparelhos, entre com o mesmo e-mail.'
      : 'Pronto! Os dados da sua conta estão neste aparelho.'
  );
};

export const startSignIn = async (): Promise<void> => {
  if (!cloudEnabled || session.busy) return;
  setSession({ busy: true, error: undefined });
  try {
    handle(await signIn(realCloud));
  } catch (error) {
    console.error('Erro ao entrar na nuvem:', error);
    setSession({ busy: false, error: errorText(error) });
  }
};

/** Ao abrir o app: termina um login que ficou pela metade. Roda antes de qualquer outra gravação. */
export const resumeCloudLogin = async (): Promise<void> => {
  if (!cloudEnabled) return;
  try {
    const result = await resumePendingLogin(realCloud);
    if (result) handle(result);
  } catch (error) {
    console.error('Erro ao terminar o login na nuvem:', error);
    setSession({ busy: false, error: errorText(error) });
  }
};

export const answerMerge = async (join: boolean): Promise<void> => {
  setSession({ busy: true });
  try {
    if (join) await mergeDeviceData();
    else await discardDeviceData();
    reloadWith(join ? 'Pronto! Os dados deste aparelho foram juntados com os da sua conta.' : 'Pronto! Os dados da sua conta estão neste aparelho.');
  } catch (error) {
    setSession({ busy: false, error: errorText(error) });
  }
};

export const startSignOut = async (): Promise<void> => {
  setSession({ busy: true, error: undefined });
  try {
    await signOut(realCloud);
    reloadWith('Você saiu da conta neste aparelho. Seus dados continuam na nuvem.');
  } catch (error) {
    // ela desistiu de sair (havia mudanças ainda não enviadas)
    setSession({ busy: false });
    if (!(error instanceof Error && /cancel/i.test(error.message))) setSession({ error: errorText(error) });
  }
};

export const syncNow = (): Promise<void> => db.cloud.sync({ wait: true, purpose: 'pull' });

export const dismissCloudError = () => setSession({ error: undefined });

// ---------- quem está logado e como está a sincronização ----------

const NO_CLOUD = { subscribe: () => ({ unsubscribe: () => undefined }) };

export const useCloudUser = (): UserLogin | undefined => useObservable(cloudEnabled ? db.cloud.currentUser : NO_CLOUD, undefined);

export const useSyncState = (): SyncState | undefined => useObservable(cloudEnabled ? db.cloud.syncState : NO_CLOUD, undefined);

export type SyncLabel = 'ok' | 'syncing' | 'offline' | 'error';

/** Estado da sincronização em uma palavra, para o selo do topo e o cartão do menu. */
export const syncLabel = (s: SyncState | undefined): SyncLabel => {
  if (!s) return 'syncing';
  if (s.phase === 'offline' || s.status === 'offline') return 'offline';
  if (s.phase === 'error' || s.status === 'error' || s.license === 'expired' || s.license === 'deactivated') return 'error';
  if (s.phase === 'in-sync') return 'ok';
  return 'syncing';
};

export const SYNC_TEXT: Record<SyncLabel, string> = {
  ok: 'Tudo sincronizado',
  syncing: 'Sincronizando…',
  offline: 'Sem internet: sincroniza quando voltar',
  error: 'Não deu para sincronizar agora'
};
