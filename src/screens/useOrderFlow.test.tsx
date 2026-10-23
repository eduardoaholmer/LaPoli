import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { db } from '../data/db';
import { orderService } from '../data/services';
import type { Order, Product, Purchase } from '../types';
import { useOrderFlow } from './useOrderFlow';

const fio = {
  id: 'f1', date: new Date(2026, 0, 1), material: 'Fio rosa', type: 'fio', unit: 'gramas', quantityPurchased: 300, quantityRemaining: 300,
  percentUsed: 0, totalPaid: 30, unitCost: 0.1, minStock: 0, status: 'disponível', paymentStatus: 'quitado', createdAt: new Date(), updatedAt: new Date()
} as Purchase;
const leao = { id: 'p1', name: 'Leão', materials: [{ id: 'm', material: 'Fio rosa', quantityUsed: 120, unit: 'gramas' }] } as unknown as Product;
const order = {
  id: 'o1', date: new Date(), clientName: 'Maria', clientPhone: '', product: 'Leão', productId: 'p1', quantity: 1, deadline: new Date(),
  agreedPrice: 100, signalAmount: 50, remainingBalance: 50, status: 'Em produção', paymentStatus: 'sinal pago',
  needsMaterialPurchase: false, materialsPurchased: false, createdAt: new Date(), updatedAt: new Date()
} as Order;

const Harness: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const flow = useOrderFlow(onChanged, [leao], [fio]);
  return (
    <>
      <button onClick={() => flow.requestAdvance(order)}>avançar</button>
      {flow.node}
    </>
  );
};

beforeEach(async () => {
  await Promise.all([db.purchases.clear(), db.orders.clear(), db.transactions.clear()]);
  await db.purchases.add(fio);
  await db.orders.add(order);
});

const click = (name: string) => act(async () => { fireEvent.click(screen.getByRole('button', { name })); });

describe('Peça pronta', () => {
  it('pergunta o material com a quantidade da receita, que dá para mudar, e desconta ao confirmar', async () => {
    render(<Harness onChanged={vi.fn()} />);
    await click('avançar');
    expect(screen.getByText('Peça pronta · Maria')).toBeInTheDocument();
    const field = screen.getByLabelText('Fio rosa') as HTMLInputElement;
    expect(field.value).toBe('120');
    fireEvent.change(field, { target: { value: '135' } });
    await click('Descontar e concluir');

    // a gravação continua depois do clique: espera o pedido mudar de etapa
    await vi.waitFor(async () => expect((await orderService.getById('o1'))?.status).toBe('Aguardando entrega'));
    expect((await db.purchases.get('f1'))?.quantityRemaining).toBe(165);
    const o = await orderService.getById('o1');
    expect(o?.status).toBe('Aguardando entrega');
    expect(o?.stockUsedAt).toBeInstanceOf(Date);
  });

  it('"Agora não" só muda a etapa', async () => {
    render(<Harness onChanged={vi.fn()} />);
    await click('avançar');
    await click('Agora não');
    await vi.waitFor(async () => expect((await orderService.getById('o1'))?.status).toBe('Aguardando entrega'));
    expect((await db.purchases.get('f1'))?.quantityRemaining).toBe(300);
    const o = await orderService.getById('o1');
    expect(o?.status).toBe('Aguardando entrega');
    expect(o?.stockUsedAt).toBeUndefined();
  });
});
