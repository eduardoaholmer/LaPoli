import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { db } from '../data/db';
import { orderService } from '../data/services';
import type { Order, Product, Purchase, Settings } from '../types';
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
  await Promise.all([db.purchases.clear(), db.orders.clear(), db.transactions.clear(), db.products.clear()]);
  await db.purchases.add(fio);
  await db.orders.add(order);
});

const click = (name: string) => act(async () => { fireEvent.click(screen.getByRole('button', { name })); });

describe('Peça pronta', () => {
  it('pergunta o material com a quantidade da receita, que dá para mudar, e desconta ao confirmar', async () => {
    render(<Harness onChanged={vi.fn()} />);
    await click('avançar');
    expect(screen.getByText('Acerto do pedido · Maria')).toBeInTheDocument();
    const field = screen.getByLabelText('Fio rosa') as HTMLInputElement;
    expect(field.value).toBe('120');
    fireEvent.change(field, { target: { value: '135' } });
    await click('Fechar o acerto');

    // a gravação continua depois do clique: espera o pedido mudar de etapa
    await vi.waitFor(async () => expect((await orderService.getById('o1'))?.status).toBe('Aguardando entrega'));
    expect((await db.purchases.get('f1'))?.quantityRemaining).toBe(165);
    const o = await orderService.getById('o1');
    expect(o?.status).toBe('Aguardando entrega');
    expect(o?.stockUsedAt).toBeInstanceOf(Date);
  });

  it('usa as anotações do pedido, guarda o lucro de verdade e pode atualizar a receita', async () => {
    const settings = { hourlyRate: 20, desiredProfitMargin: 30 } as Settings;
    const anotado = {
      ...order,
      log: [
        { id: 'l1', date: new Date(), type: 'material', material: 'fio rosa', quantity: 30 },
        { id: 'l2', date: new Date(), type: 'horas', quantity: 2 },
        { id: 'l3', date: new Date(), type: 'horas', quantity: 1.5 },
        { id: 'l4', date: new Date(), type: 'gasto', amount: 5, text: 'Laço' }
      ]
    } as Order;
    await db.orders.put(anotado);
    await db.products.put({ ...leao, actualTime: 2 } as Product);
    const Anotado: React.FC = () => {
      const flow = useOrderFlow(vi.fn(), [{ ...leao, actualTime: 2 } as Product], [fio], [], settings);
      return (<><button onClick={() => flow.requestAdvance(anotado)}>avançar</button>{flow.node}</>);
    };
    render(<Anotado />);
    await click('avançar');
    expect((screen.getByLabelText('Fio rosa') as HTMLInputElement).value).toBe('150'); // receita 120 + 30 anotados
    expect((screen.getByLabelText('Horas trabalhadas') as HTMLInputElement).value).toBe('3.5');
    // 100 − 150 g × R$ 0,10 − 3,5 h × R$ 20 − R$ 5 = R$ 10
    expect(screen.getByText('Lucro de verdade').parentElement?.textContent).toContain('10,00');
    fireEvent.click(screen.getByLabelText(/Atualizar a receita do Leão/));
    await click('Fechar o acerto');

    await vi.waitFor(async () => expect((await orderService.getById('o1'))?.settlement).toBeDefined());
    const o = await orderService.getById('o1');
    expect(o?.settlement).toMatchObject({ hours: 3.5, extraCosts: 5, profit: 10 });
    expect((await db.purchases.get('f1'))?.quantityRemaining).toBe(150);
    const p = await db.products.get('p1');
    expect(p?.materials[0].quantityUsed).toBe(150);
    expect(p?.actualTime).toBe(3.5);
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
