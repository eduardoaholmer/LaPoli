import React, { useCallback, useEffect, useState } from 'react';
import { settingsService } from '../data/services';
import { LOCK_EVENT, getLastUnlock, needsPin, pinSupported, type PinRecord } from '../utils/pin';
import { LockScreen } from './LockScreen';

type Gate = { status: 'checking' } | { status: 'open' } | { status: 'locked'; record: PinRecord };

/**
 * Só mostra o app depois da senha, quando ela existe e este aparelho não a digitou nas últimas 24 horas.
 * Enquanto bloqueado, nenhuma tela é desenhada e nenhum dado é lido.
 */
export const LockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gate, setGate] = useState<Gate>({ status: 'checking' });

  const check = useCallback(async () => {
    try {
      const settings = await settingsService.get();
      if (settings && needsPin(settings, getLastUnlock())) {
        setGate({ status: 'locked', record: { pinHash: settings.pinHash, pinSalt: settings.pinSalt, pinIterations: settings.pinIterations } });
      } else {
        setGate({ status: 'open' });
      }
    } catch {
      // sem acesso ao banco não há senha guardada para conferir
      setGate({ status: 'open' });
    }
  }, []);

  useEffect(() => {
    void check();
    window.addEventListener(LOCK_EVENT, check);
    return () => window.removeEventListener(LOCK_EVENT, check);
  }, [check]);

  if (gate.status === 'checking') {
    return <div className="lock" aria-busy="true" aria-label="Abrindo o LaPoli" />;
  }

  if (gate.status === 'locked') {
    if (!pinSupported()) {
      return (
        <main className="lock">
          <div className="lock-card">
            <h1>LaPoli</h1>
            <p>Este endereço não é seguro (sem https), então não dá para conferir a senha. Abra o endereço seguro do app.</p>
          </div>
        </main>
      );
    }
    return <LockScreen record={gate.record} onUnlock={() => setGate({ status: 'open' })} />;
  }

  return <>{children}</>;
};
