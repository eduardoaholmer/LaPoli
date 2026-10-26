import React, { useState } from 'react';
import { useObservable } from 'dexie-react-hooks';
import type { DXCAlert, DXCUserInteraction } from 'dexie-cloud-addon';
import { Cloud, CloudOff, LogOut, Mail, RefreshCw } from 'lucide-react';
import { db } from '../data/db';
import { cloudEnabled } from '../data/cloudConfig';
import {
  answerMerge,
  dismissCloudError,
  startSignIn,
  startSignOut,
  SYNC_TEXT,
  syncLabel,
  syncNow,
  useCloudSession,
  useCloudUser,
  useSyncState
} from '../data/cloudSession';
import type { DeviceData } from '../data/cloud';
import { Button } from './Button';
import { Input } from './Input';
import { ConfirmDialog, Modal } from './Modal';
import { Alert } from './ui';
import { notify } from '../utils/notify';

/** As mensagens do Dexie Cloud vêm em inglês; aqui viram português pelo código de cada uma. */
const alertText = (a: DXCAlert): string => {
  switch (a.messageCode) {
    case 'OTP_SENT':
      return `Mandamos um código para ${a.messageParams.email ?? 'o seu e-mail'}. Ele chega em alguns segundos; confira também o spam.`;
    case 'INVALID_OTP':
      return 'Código errado ou vencido. Confira e digite de novo.';
    case 'INVALID_EMAIL':
      return 'Esse e-mail não parece certo. Confira e tente de novo.';
    case 'LICENSE_LIMIT_REACHED':
    case 'NO_SEATS_AVAILABLE':
      return 'O plano grátis da nuvem chegou ao limite de pessoas. Fale com o Eduardo.';
    case 'USER_DEACTIVATED':
    case 'USER_NOT_ACCEPTED':
    case 'USER_NOT_REGISTERED':
      return 'Este e-mail não tem acesso à nuvem do LaPoli.';
    case 'GENERIC_ERROR':
      return /connect|fetch|network/i.test(a.message)
        ? 'Não deu para falar com a nuvem. Confira a internet e tente de novo.'
        : `Algo deu errado na nuvem: ${a.message}`;
    case 'LOGOUT_CONFIRMATION':
      return 'Algumas mudanças deste aparelho ainda não foram para a nuvem (sem internet?). Se sair agora, elas se perdem.';
    default:
      return a.message;
  }
};

const TONE = { error: 'error', warning: 'warning', info: 'info' } as const;

const Alerts: React.FC<{ alerts: DXCAlert[] }> = ({ alerts }) => (
  <>
    {alerts.map((a, i) => (
      <Alert key={i} tone={TONE[a.type]} className="mt-8">
        {alertText(a)}
      </Alert>
    ))}
  </>
);

/** Login por e-mail e código, desenhado pelo app (o do Dexie Cloud é em inglês). Segue o que a nuvem pede em cada passo. */
const LoginDialog: React.FC<{ interaction: DXCUserInteraction }> = ({ interaction }) => {
  const [value, setValue] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (interaction.type === 'email') interaction.onSubmit({ email: value.trim() });
    else if (interaction.type === 'otp') interaction.onSubmit({ otp: value.trim() });
    else interaction.onSubmit({});
  };

  // "mandamos o código para…" vira o texto embaixo do campo do código, não um alerta
  const sent = interaction.type === 'otp' ? interaction.alerts.find(a => a.messageCode === 'OTP_SENT') : undefined;
  const texts =
    interaction.type === 'email'
      ? { title: 'Entrar na sua conta', submit: 'Mandar código', cancel: 'Cancelar' }
      : interaction.type === 'otp'
        ? { title: 'Digite o código', submit: 'Entrar', cancel: 'Cancelar' }
        : interaction.type === 'logout-confirmation'
          ? { title: 'Sair mesmo assim?', submit: 'Sair e perder as mudanças', cancel: 'Cancelar' }
          : { title: 'Aviso', submit: 'Ok', cancel: null };

  return (
    <Modal isOpen onClose={interaction.onCancel} title={texts.title} size="sm">
      <form onSubmit={submit}>
        {interaction.type === 'email' && (
          <>
            <p className="muted" style={{ marginTop: 0 }}>Vamos mandar um código para o seu e-mail. Não precisa criar senha.</p>
            <Input label="E-mail" type="email" inputMode="email" autoComplete="email" autoFocus required value={value} onChange={e => setValue(e.target.value)} fullWidth />
          </>
        )}
        {interaction.type === 'otp' && (
          <Input
            label="Código"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            autoFocus
            required
            value={value}
            onChange={e => setValue(e.target.value.toUpperCase())}
            fullWidth
          />
        )}
        {interaction.type === 'otp' && <p className="small muted mt-8">{alertText(sent ?? { type: 'info', messageCode: 'OTP_SENT', message: '', messageParams: {} })}</p>}
        <Alerts alerts={interaction.alerts.filter(a => a !== sent)} />
        <div className="row mt-16" style={{ justifyContent: 'flex-end', gap: 8 }}>
          {texts.cancel && <Button type="button" variant="secondary" onClick={interaction.onCancel}>{texts.cancel}</Button>}
          <Button type="submit" variant={interaction.type === 'logout-confirmation' ? 'danger' : 'primary'}>{texts.submit}</Button>
        </div>
      </form>
    </Modal>
  );
};

const NO_CLOUD = { subscribe: () => ({ unsubscribe: () => undefined }) };

const joinList = (parts: string[]) => parts.join(', ').replace(/, ([^,]*)$/, ' e $1');

const deviceSummary = (d: DeviceData) =>
  joinList(
    [
      d.products && `${d.products} produto${d.products > 1 ? 's' : ''}`,
      d.purchases && `${d.purchases} compra${d.purchases > 1 ? 's' : ''}`,
      d.orders && `${d.orders} pedido${d.orders > 1 ? 's' : ''}`,
      d.transactions && `${d.transactions} lançamento${d.transactions > 1 ? 's' : ''}`
    ].filter(Boolean) as string[]
  );

/** Tudo o que aparece por cima das telas durante o login: o passo a passo, "um instante", juntar dados e erros. */
export const CloudPrompts: React.FC = () => {
  const interaction = useObservable(cloudEnabled ? db.cloud.userInteraction : NO_CLOUD, undefined);
  const session = useCloudSession();
  if (!cloudEnabled) return null;

  if (interaction) return <LoginDialog key={interaction.type} interaction={interaction} />;

  if (session.merge) {
    return (
      <Modal isOpen onClose={() => undefined} title="Sua conta já tem dados" size="sm">
        <p style={{ marginTop: 0 }}>
          Este aparelho também tinha dados próprios: <b>{deviceSummary(session.merge)}</b>.
        </p>
        <p className="muted">
          <b>Juntar</b> acrescenta à conta só o que ela ainda não tem; nada da conta é apagado. Se este aparelho tinha uma cópia antiga dos mesmos dados
          (de um backup importado, por exemplo), escolha <b>ficar só com os da conta</b>.
        </p>
        <div className="stack-sm mt-16">
          <Button fullWidth disabled={session.busy} onClick={() => void answerMerge(true)}>Juntar com a conta</Button>
          <Button fullWidth variant="secondary" disabled={session.busy} onClick={() => void answerMerge(false)}>Ficar só com os da conta</Button>
        </div>
      </Modal>
    );
  }

  if (session.error) {
    return (
      <Modal isOpen onClose={dismissCloudError} title="Não deu para entrar" size="sm">
        <p style={{ marginTop: 0 }}>{session.error}</p>
        <p className="small muted">Seus dados continuam neste aparelho.</p>
        <div className="row mt-16" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={dismissCloudError}>Fechar</Button>
          <Button onClick={() => { dismissCloudError(); void startSignIn(); }}>Tentar de novo</Button>
        </div>
      </Modal>
    );
  }

  if (session.busy) {
    return (
      <Modal isOpen onClose={() => undefined} title="Um instante…" size="sm">
        <p className="row" style={{ marginTop: 0, gap: 8 }}>
          <RefreshCw size={18} className="spin" /> Trocando dados com a nuvem. Não feche o app.
        </p>
      </Modal>
    );
  }
  return null;
};

/** Seção "Seus dados em qualquer aparelho" das Configurações. */
export const CloudSection: React.FC = () => {
  const user = useCloudUser();
  const sync = useSyncState();
  const session = useCloudSession();
  const [confirmOut, setConfirmOut] = useState(false);
  const [syncing, setSyncing] = useState(false);
  if (!cloudEnabled) return null;

  const label = syncLabel(sync);
  const runSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
      notify({ type: 'success', message: 'Sincronizado' });
    } catch {
      notify({ type: 'error', message: 'Não deu para sincronizar agora', detail: 'Confira a internet. O app tenta de novo sozinho.' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2>{user?.isLoggedIn ? <Cloud size={20} /> : <CloudOff size={20} />} Seus dados em qualquer aparelho</h2>
      </div>
      {user?.isLoggedIn ? (
        <>
          <p style={{ marginTop: 0 }}>
            Conectado como <b>{user.email}</b>. O que você muda aqui aparece nos outros aparelhos quando eles estiverem com internet.
          </p>
          <p className={`small ${label === 'error' ? 'neg' : 'muted'}`}>{SYNC_TEXT[label]}</p>
          <div className="row-wrap mt-16" style={{ gap: 8 }}>
            <Button variant="secondary" icon={<RefreshCw size={18} />} disabled={syncing} onClick={() => void runSync()}>Sincronizar agora</Button>
            <Button variant="ghost" icon={<LogOut size={18} />} disabled={session.busy} onClick={() => setConfirmOut(true)}>Sair deste aparelho</Button>
          </div>
          <ConfirmDialog isOpen={confirmOut} title="Sair da conta neste aparelho?" confirmLabel="Sair" onClose={() => setConfirmOut(false)} onConfirm={() => { setConfirmOut(false); void startSignOut(); }}>
            Os dados saem deste aparelho e continuam na sua conta. Para ver de novo, é só entrar com o mesmo e-mail.
          </ConfirmDialog>
        </>
      ) : (
        <>
          <p style={{ marginTop: 0 }}>
            Entre com o seu e-mail para guardar tudo na nuvem e ver os mesmos dados no celular, no tablet ou no computador. O app continua funcionando sem internet.
          </p>
          <ul className="small muted" style={{ paddingLeft: 18, margin: "8px 0 16px" }}>
            <li>No primeiro aparelho, os dados dele vão para a conta.</li>
            <li>Nos outros, entre com o mesmo e-mail: os dados da conta aparecem.</li>
          </ul>
          <Button size="lg" icon={<Mail size={20} />} disabled={session.busy} onClick={() => void startSignIn()}>Entrar com e-mail</Button>
        </>
      )}
    </section>
  );
};
