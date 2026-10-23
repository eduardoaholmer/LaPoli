import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Purchase } from '../types';
import { groupMaterials } from '../calculations/materials';

const update = vi.fn();
vi.mock('../data/services', () => ({ purchaseService: { update: (...args: unknown[]) => update(...args) } }));
vi.mock('../utils/notify', () => ({ notify: vi.fn() }));

const { StockMovementModal } = await import('./StockMovementModal');

const lot = (id: string, day: number, remaining: number): Purchase =>
  ({ id, date: new Date(2026, 0, day), material: 'Fio', type: 'fio', unit: 'gramas', quantityPurchased: 100, quantityRemaining: remaining, minStock: 0 }) as Purchase;

const open = (kind: 'perda' | 'ajuste') => {
  const groups = groupMaterials([lot('velha', 1, 100), lot('nova', 2, 100)]);
  render(<StockMovementModal isOpen kind={kind} groups={groups} onClose={() => {}} onDone={() => {}} />);
};

const save = () => act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Salvar' })); });

beforeEach(() => update.mockReset());

describe('Ajustar contagem', () => {
  it('pergunta quanto tem e mostra o que vai mudar', () => {
    open('ajuste');
    expect(screen.getByText(/O app mostra/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Quanto você tem agora?'), { target: { value: '150' } });
    expect(screen.getByText('Vai tirar 50 g do estoque.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Quanto você tem agora?'), { target: { value: '260' } });
    expect(screen.getByText('Vai somar 60 g ao estoque.')).toBeInTheDocument();
  });

  it('contagem maior soma na compra mais recente, sem criar compra', async () => {
    open('ajuste');
    fireEvent.change(screen.getByLabelText('Quanto você tem agora?'), { target: { value: '260' } });
    await save();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).toBe('nova');
    expect(update.mock.calls[0][1]).toMatchObject({ quantityRemaining: 160, percentUsed: 0, movements: [expect.objectContaining({ type: 'ajuste', quantity: -60 })] });
  });

  it('contagem zero zera todas as compras', async () => {
    open('ajuste');
    fireEvent.change(screen.getByLabelText('Quanto você tem agora?'), { target: { value: '0' } });
    await save();
    expect(update.mock.calls.map(c => [c[0], c[1].quantityRemaining])).toEqual([['velha', 0], ['nova', 0]]);
  });

  it('contagem igual ao app não grava nada', async () => {
    open('ajuste');
    fireEvent.change(screen.getByLabelText('Quanto você tem agora?'), { target: { value: '200' } });
    await save();
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByText(/Nada a ajustar/)).toBeInTheDocument();
  });
});

describe('Registrar perda', () => {
  it('continua pedindo a quantidade perdida', async () => {
    open('perda');
    fireEvent.change(screen.getByLabelText('Quantidade perdida'), { target: { value: '30' } });
    await save();
    expect(update.mock.calls[0][1]).toMatchObject({ quantityRemaining: 70, movements: [expect.objectContaining({ type: 'perda', quantity: 30 })] });
  });
});
