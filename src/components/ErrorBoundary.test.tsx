import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const Boom = (): React.ReactElement => {
  throw new Error('falha de teste');
};

describe('ErrorBoundary', () => {
  it('mostra uma explicação em vez de tela em branco quando o app quebra', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível abrir o LaPoli');
    expect(screen.getByText('falha de teste')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('renderiza normalmente quando não há erro', () => {
    render(
      <ErrorBoundary>
        <p>tudo certo</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('tudo certo')).toBeInTheDocument();
  });
});
