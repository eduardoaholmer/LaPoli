import type React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Linha de tabela que abre um detalhe: além do clique, recebe foco pelo Tab e abre com Enter ou espaço,
 * para quem usa teclado ou leitor de tela.
 */
export const useRowLink = () => {
  const navigate = useNavigate();
  return (to: string, label: string) => ({
    onClick: () => navigate(to),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return; // Enter num botão dentro da linha é do botão
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate(to);
      }
    },
    tabIndex: 0,
    'aria-label': `Abrir ${label}`
  });
};
