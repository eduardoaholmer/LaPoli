import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Order } from '../types';
import { OrderLog } from './OrderLog';

const order = { id: 'o1', clientName: 'Maria', log: [] } as unknown as Order;

describe('Anotações da produção', () => {
  it('anota material a mais/a menos, horas e gastos', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<OrderLog order={order} groups={[]} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Material'), { target: { value: 'Fio rosa' } });
    fireEvent.change(screen.getByLabelText('Comparado com a receita'), { target: { value: 'menos' } });
    fireEvent.change(screen.getByLabelText('Quanto'), { target: { value: '20' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Anotar' })); });
    expect(onSave.mock.calls[0][0].log[0]).toMatchObject({ type: 'material', material: 'Fio rosa', quantity: -20 });

    fireEvent.click(screen.getByRole('button', { name: /Gasto/ }));
    fireEvent.change(screen.getByLabelText('O que foi'), { target: { value: 'Laço' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '4.5' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Anotar' })); });
    expect(onSave.mock.calls[1][0].log[0]).toMatchObject({ type: 'gasto', amount: 4.5, text: 'Laço' });
  });

  it('cronômetro: pausar vira uma anotação de horas', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const started = new Date(Date.now() - 90 * 60000);
    render(<OrderLog order={{ ...order, timerStartedAt: started }} groups={[]} onSave={onSave} />);
    expect(screen.getByText(/1 h 30 min/)).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Pausar e anotar' })); });
    expect(onSave.mock.calls[0][0]).toMatchObject({ timerStartedAt: undefined, log: [expect.objectContaining({ type: 'horas', quantity: 1.5 })] });
  });
});
