import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PinSettings } from './PinSettings';
import type { Settings } from '../types';

describe('PinSettings: campos de senha', () => {
  it('só aceita números e tem botão de mostrar/ocultar', () => {
    render(<PinSettings settings={{} as Settings} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ativar senha' }));

    const field = screen.getByLabelText(/^Nova senha/) as HTMLInputElement;
    expect(field.type).toBe('password');
    fireEvent.change(field, { target: { value: '48a2x1' } });
    expect(field.value).toBe('4821');
    fireEvent.change(field, { target: { value: '48211' } });
    expect(field.value).toBe('4821');

    const [show] = screen.getAllByRole('button', { name: 'Mostrar senha' });
    fireEvent.click(show);
    expect(field.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(field.type).toBe('password');
  });
});
