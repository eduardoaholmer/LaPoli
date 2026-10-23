import React, { useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import type { Settings } from '../types';
import { PIN_LENGTH, createPinRecord, hasPin, isValidPin, lockNow, markUnlocked, pinSupported, verifyPin, type PinRecord } from '../utils/pin';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { notify } from '../utils/notify';

type Mode = 'set' | 'change' | 'remove';

interface PinSettingsProps {
  settings: Settings;
  /** Grava os campos da senha nas configurações (e atualiza a tela). */
  onChange: (patch: Partial<Pick<Settings, 'pinHash' | 'pinSalt' | 'pinIterations'>>) => Promise<void>;
}

const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, PIN_LENGTH);

const PinField: React.FC<{ label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }> = ({ label, value, onChange, autoFocus }) => {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      label={label}
      type={visible ? 'text' : 'password'}
      inputMode="numeric"
      autoComplete="off"
      maxLength={PIN_LENGTH}
      placeholder="••••"
      value={value}
      autoFocus={autoFocus}
      onChange={e => onChange(digitsOnly(e.target.value))}
      suffix={
        <button type="button" className="pin-eye" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible} onClick={() => setVisible(v => !v)}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
      fullWidth
    />
  );
};

/** Ativar, trocar ou remover a senha de 4 números, e bloquear este aparelho agora. */
export const PinSettings: React.FC<PinSettingsProps> = ({ settings, onChange }) => {
  const [mode, setMode] = useState<Mode | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const active = hasPin(settings);

  const open = (m: Mode) => {
    setMode(m);
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
  };

  const needsCurrent = mode === 'change' || mode === 'remove';
  const needsNew = mode === 'set' || mode === 'change';

  const submit = async () => {
    setError('');
    if (needsCurrent && !(await verifyPin(current, settings as PinRecord))) return setError('A senha atual está incorreta.');
    if (needsNew) {
      if (!isValidPin(next)) return setError(`A nova senha precisa ter ${PIN_LENGTH} números.`);
      if (next !== confirm) return setError('As duas senhas digitadas são diferentes.');
    }
    setSaving(true);
    try {
      if (mode === 'remove') {
        await onChange({ pinHash: undefined, pinSalt: undefined, pinIterations: undefined });
        notify({ type: 'success', message: 'Senha removida' });
      } else {
        await onChange(await createPinRecord(next));
        markUnlocked(); // quem acabou de definir a senha não precisa digitá-la agora
        notify({ type: 'success', message: mode === 'set' ? 'Senha ativada' : 'Senha alterada', detail: 'Este aparelho só pedirá a senha de novo depois de 24 horas.' });
      }
      setMode(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a senha.');
    } finally {
      setSaving(false);
    }
  };

  const title = mode === 'set' ? 'Ativar senha' : mode === 'change' ? 'Alterar senha' : 'Remover senha';

  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <KeyRound size={20} /> Senha de acesso
        </h2>
        {active ? <Badge variant="success" icon={<Check size={13} />}>Ativada</Badge> : <Badge>Desativada</Badge>}
      </div>

      {!pinSupported() ? (
        <p className="muted">A senha só funciona em endereço seguro (https). Abra o app pelo endereço oficial para ativá-la.</p>
      ) : (
        <>
          <p className="muted">
            Pede uma senha de {PIN_LENGTH} números ao abrir o app. Um aparelho que digitou a senha nas últimas 24 horas entra direto. Ela evita que outra pessoa abra o app aberto em um aparelho, mas não criptografa os dados.
          </p>
          <div className="row-wrap mt-16">
            {active ? (
              <>
                <Button variant="secondary" onClick={() => open('change')}>Alterar senha</Button>
                <Button variant="secondary" onClick={() => open('remove')}>Remover senha</Button>
                <Button variant="secondary" icon={<Lock size={18} />} onClick={lockNow}>Bloquear agora</Button>
              </>
            ) : (
              <Button icon={<KeyRound size={18} />} onClick={() => open('set')}>Ativar senha</Button>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={mode !== null}
        onClose={() => setMode(null)}
        title={title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMode(null)}>Cancelar</Button>
            <Button variant={mode === 'remove' ? 'danger' : 'primary'} disabled={saving} onClick={submit}>
              {mode === 'remove' ? 'Remover' : 'Salvar'}
            </Button>
          </>
        }
      >
        <div className="stack-sm">
          {needsCurrent && <PinField label="Senha atual" value={current} onChange={setCurrent} autoFocus />}
          {needsNew && <PinField label={mode === 'set' ? `Nova senha (${PIN_LENGTH} números)` : 'Nova senha'} value={next} onChange={setNext} autoFocus={mode === 'set'} />}
          {needsNew && <PinField label="Repita a nova senha" value={confirm} onChange={setConfirm} />}
          {mode === 'set' && <p className="small muted">Anote a senha. Se esquecer, só é possível entrar apagando os dados deste aparelho e restaurando um backup.</p>}
          {error && <p className="neg" role="alert">{error}</p>}
        </div>
      </Modal>
    </section>
  );
};
