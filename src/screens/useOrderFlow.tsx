import { useState } from 'react';
import type { Order, Product, Purchase } from '../types';
import { formatCurrency } from '../calculations';
import { missingMaterialsForOrder, nextStatus, orderPending } from '../calculations/orders';
import { changeOrderStatus, registerPayment } from '../data/orderActions';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Alert } from '../components/ui';
import { notify } from '../utils/notify';

/* ------------------------------------------------------------------
   Avançar etapa, com as perguntas que evitam esquecimentos
   ------------------------------------------------------------------ */
type Pending =
  | { type: 'signal'; order: Order }
  | { type: 'delivery'; order: Order }
  | { type: 'materials'; order: Order; missing: ReturnType<typeof missingMaterialsForOrder> };

export const useOrderFlow = (onChanged: () => void | Promise<void>, products: Product[] = [], purchases: Purchase[] = []) => {
  const [pending, setPending] = useState<Pending | null>(null);

  const apply = async (order: Order, extra: () => Promise<Partial<Order>> | Partial<Order> = () => ({})) => {
    const next = nextStatus(order.status);
    if (!next) return;
    const patch = await extra();
    await changeOrderStatus(order, next, patch);
    await onChanged();
    notify({ type: next === 'Entregue' ? 'success' : 'info', message: next === 'Entregue' ? 'Pedido entregue' : `Etapa: ${next}`, detail: order.clientName });
  };

  /** Pede a próxima etapa; abre uma pergunta quando há algo a confirmar. */
  const requestAdvance = async (order: Order) => {
    const next = nextStatus(order.status);
    if (!next) return;
    if (next === 'Sinal recebido' && order.paymentStatus === 'pendente') return setPending({ type: 'signal', order });
    if (next === 'Entregue' && orderPending(order) > 0) return setPending({ type: 'delivery', order });
    if (next === 'Em produção') {
      const missing = missingMaterialsForOrder(products.find(p => p.id === order.productId), order.quantity, purchases);
      if (missing.length) return setPending({ type: 'materials', order, missing });
    }
    await apply(order);
  };

  const close = () => setPending(null);

  const node = pending && (
    <Modal
      isOpen
      onClose={close}
      title={pending.type === 'signal' ? 'O sinal já foi recebido?' : pending.type === 'delivery' ? `Concluir entrega · ${pending.order.clientName}` : 'Faltam materiais para começar'}
      footer={
        pending.type === 'signal' ? (
          <>
            <Button variant="secondary" onClick={async () => { const o = pending.order; close(); await apply(o); }}>Só mudar a etapa</Button>
            <Button onClick={async () => { const o = pending.order; close(); await apply(o, () => registerPayment(o, 'sinal')); }}>Sim, registrar sinal</Button>
          </>
        ) : pending.type === 'delivery' ? (
          <>
            <Button variant="secondary" onClick={async () => { const o = pending.order; close(); await apply(o); }}>Entregar, saldo continua pendente</Button>
            <Button onClick={async () => { const o = pending.order; close(); await apply(o, () => registerPayment(o, 'saldo')); }}>Entregar e receber saldo</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>Voltar</Button>
            <Button onClick={async () => { const o = pending.order; close(); await apply(o); }}>Iniciar mesmo assim</Button>
          </>
        )
      }
    >
      {pending.type === 'signal' && (
        <p className="muted" style={{ lineHeight: 1.7 }}>
          Ao passar para “Sinal recebido”, posso também marcar o sinal de <b>{formatCurrency(pending.order.signalAmount)}</b> como recebido hoje. Isso entra no caixa.
        </p>
      )}
      {pending.type === 'delivery' && (
        <p className="muted" style={{ lineHeight: 1.7 }}>
          Ainda há <b>{formatCurrency(orderPending(pending.order))}</b> a receber. Se receber agora, o saldo entra no caixa hoje e a venda passa a contar no faturamento.
        </p>
      )}
      {pending.type === 'materials' && (
        <Alert tone="warning" title={`O pedido de ${pending.order.clientName} precisa de mais material do que você tem`}>
          {pending.missing.map(m => `${m.material}: precisa de ${m.needed.toLocaleString('pt-BR')} ${m.unit}, tem ${Math.max(0, m.available).toLocaleString('pt-BR')}`).join(' · ')}. Veja a lista de compras em Estoque.
        </Alert>
      )}
    </Modal>
  );

  return { requestAdvance, node };
};

