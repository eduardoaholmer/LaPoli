import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { indexedDbAvailable, storageAvailable } from '../utils/storage';
import { Alert } from './ui';

/** Avisa, sem bloquear, quando o navegador não deixa guardar dados: o que for cadastrado se perderia ao fechar. */
export const StorageWarning: React.FC = () => {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let alive = true;
    indexedDbAvailable().then(ok => {
      if (alive && (!ok || !storageAvailable())) setBlocked(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!blocked) return null;
  return (
    <div style={{ padding: '12px 16px' }}>
      <Alert tone="warning" icon={<AlertTriangle size={20} />} title="Este navegador não está deixando guardar os dados">
        O que você cadastrar aqui pode se perder ao fechar a página. Abra o endereço direto no Chrome ou no Safari, fora de aplicativos como WhatsApp e Instagram e fora de abas privadas.
      </Alert>
    </div>
  );
};
