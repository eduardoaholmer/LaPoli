import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Delete, Lock } from 'lucide-react';
import { PIN_LENGTH, FREE_ATTEMPTS, markUnlocked, registerFail, verifyPin, waitSeconds, type PinRecord } from '../utils/pin';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { wipeLocalData } from '../data/wipe';

interface LockScreenProps {
  record: PinRecord;
  onUnlock: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Tela de senha: teclado numérico grande (celular) e teclado físico (computador). */
export const LockScreen: React.FC<LockScreenProps> = ({ record, onUnlock }) => {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState('');
  const [wait, setWait] = useState(() => waitSeconds());
  const [checking, setChecking] = useState(false);
  const [forgot, setForgot] = useState(false);
  const busy = useRef(false);

  // contagem regressiva da espera após muitas tentativas erradas
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setInterval(() => setWait(waitSeconds()), 500);
    return () => clearInterval(timer);
  }, [wait]);

  const submit = useCallback(
    async (pin: string) => {
      busy.current = true;
      setChecking(true);
      try {
        if (await verifyPin(pin, record)) {
          markUnlocked();
          onUnlock();
          return;
        }
        const state = registerFail();
        const remaining = Math.max(0, FREE_ATTEMPTS - state.count);
        setError(remaining > 0 ? `Senha incorreta. ${remaining} ${remaining === 1 ? 'tentativa' : 'tentativas'} antes de uma pausa.` : 'Senha incorreta.');
        setWait(waitSeconds());
        setDigits('');
      } catch {
        setError('Não foi possível conferir a senha neste navegador. Abra o endereço seguro (https).');
        setDigits('');
      } finally {
        busy.current = false;
        setChecking(false);
      }
    },
    [record, onUnlock]
  );

  const press = useCallback(
    (d: string) => {
      if (busy.current || waitSeconds() > 0) return;
      setError('');
      setDigits(prev => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = prev + d;
        if (next.length === PIN_LENGTH) void submit(next);
        return next;
      });
    },
    [submit]
  );

  const erase = useCallback(() => {
    if (busy.current) return;
    setError('');
    setDigits(prev => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    if (forgot) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') erase();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, erase, forgot]);

  const locked = wait > 0;

  return (
    <main className="lock" aria-labelledby="lock-title">
      <div className="lock-card">
        <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="" width={64} height={64} className="lock-logo" />
        <h1 id="lock-title">
          <Lock size={20} aria-hidden="true" /> LaPoli
        </h1>
        <p className="muted">Digite sua senha de {PIN_LENGTH} números</p>

        <div className="lock-dots" role="img" aria-label={`${digits.length} de ${PIN_LENGTH} números digitados`}>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span key={i} className={i < digits.length ? 'on' : ''} />
          ))}
        </div>

        <p className="lock-msg" role="alert" aria-live="polite">
          {locked ? `Muitas tentativas. Tente de novo em ${wait} s.` : error}
        </p>

        <div className="lock-pad" aria-label="Teclado numérico">
          {KEYS.map(k => (
            <button key={k} type="button" disabled={locked || checking} onClick={() => press(k)}>
              {k}
            </button>
          ))}
          <span />
          <button type="button" disabled={locked || checking} onClick={() => press('0')}>
            0
          </button>
          <button type="button" aria-label="Apagar" disabled={checking || digits.length === 0} onClick={erase}>
            <Delete size={22} />
          </button>
        </div>

        <button type="button" className="link-btn lock-forgot" onClick={() => setForgot(true)}>
          Esqueci a senha
        </button>
      </div>

      <ForgotPinModal isOpen={forgot} onClose={() => setForgot(false)} />
    </main>
  );
};

const CONFIRM_WORD = 'APAGAR';

const ForgotPinModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [typed, setTyped] = useState('');
  const [working, setWorking] = useState(false);

  const wipe = async () => {
    setWorking(true);
    await wipeLocalData();
    window.location.reload();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Esqueci a senha"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button variant="danger" disabled={typed.trim().toUpperCase() !== CONFIRM_WORD || working} onClick={wipe}>
            Apagar dados e remover senha
          </Button>
        </>
      }
    >
      <p>Os dados do LaPoli ficam só neste aparelho e a senha não pode ser recuperada. Para entrar sem ela, é preciso apagar os dados deste aparelho.</p>
      <p>Depois você pode restaurar tudo pelo arquivo de backup (Configurações → Importar backup).</p>
      <Input label={`Para confirmar, digite ${CONFIRM_WORD}`} value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" fullWidth />
    </Modal>
  );
};
