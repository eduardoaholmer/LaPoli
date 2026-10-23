import { useEffect } from 'react';

/**
 * O navegador pergunta "sair do site?" ao recarregar ou fechar a aba só enquanto há algo não salvo.
 * Antes a pergunta aparecia sempre, até no recarregamento depois de importar um backup.
 */
export const useLeaveWarning = (active: boolean): void => {
  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);
};
