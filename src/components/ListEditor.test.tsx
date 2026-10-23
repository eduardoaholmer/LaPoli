import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ListEditor } from './ListEditor';

describe('ListEditor', () => {
  it('adiciona com Enter, ignora repetido e remove pelo X', () => {
    const onChange = vi.fn();
    render(<ListEditor label="Formas de pagamento" items={['Pix', 'Dinheiro']} onChange={onChange} />);
    const input = screen.getByLabelText('Formas de pagamento');
    fireEvent.change(input, { target: { value: ' Cartão ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['Pix', 'Dinheiro', 'Cartão']);
    onChange.mockClear();
    fireEvent.change(input, { target: { value: 'pix' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remover Dinheiro' }));
    expect(onChange).toHaveBeenLastCalledWith(['Pix']);
  });
});
