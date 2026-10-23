import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNavigation } from './Navigation';

const Where = () => <span data-testid="where">{useLocation().pathname}</span>;

describe('Barra inferior do celular', () => {
  it('"Mais" leva ao Financeiro e às Configurações', () => {
    render(
      <MemoryRouter initialEntries={['/stock']}>
        <BottomNavigation />
        <Routes><Route path="*" element={<Where />} /></Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mais' }));
    expect(screen.getByRole('link', { name: /Configurações e backup/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /^Financeiro/ }));
    expect(screen.getByTestId('where').textContent).toBe('/financeiro');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mais' }).className).toContain('active');
  });
});
