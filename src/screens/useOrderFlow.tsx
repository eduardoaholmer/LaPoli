import { useMemo, useState } from 'react';
import type { Order, OrderStatus, Product, Purchase } from '../types';
import { formatCurrency } from '../calculations';
import { missingMaterialsForOrder, nextStatus, orderPending } from '../calculations/orders';
import { formatQuantity, groupMaterials, reservedByOrders, unitShort, usageForOrder, type UsageLine } from '../calculations/materials';
import { appendHistory, changeOrderStatus, registerPayment } from '../data/orderActions';
import { consumeOrderMaterials, isDoneStatus, returnOrderMaterials } from '../data/stockUsage';
import { orderService } from '../data/services';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Alert } from '../components/ui';
import { notify } from '../utils/notify';

/* ------------------------------------------------------------------
   Avançar etapa, com as perguntas que evitam esquecimentos
   ------------------------------------------------------------------ */
type Pending =
  | { type: 'signal'; order: Order }
  | { type: 'delivery'; order: Order }
  | { type: 'materials'; order: Order; missing: ReturnType<typeof missingMaterialsForOrder> }
  // peça pronta: confirma o material que sai do estoque (target ausente = só descontar, sem mudar a etapa)
  | { type: 'finish'; order: Order; target?: OrderStatus; lines: UsageLine[] };

export const useOrderFlow = (onChanged: () => void | Promise<void>, products: Product[] = [], purchases: Purchase[] = [], orders: Order[] = []) => {
  const [pending, setPending] = useState<Pending | null>(null);
  const [usedQty, setUsedQty] = useState<Record<string, string>>({});
  const groups = useMemo(() => groupMaterials(purchases), [purchases]);

  // o que os outros pedidos confirmados vão usar não conta como disponível para este
  const missingFor = (order: Order) =>
    missingMaterialsForOrder(products.find(p => p.id === order.productId), order.quantity, purchases, reservedByOrders(products, orders, order.id));
  const usageFor = (order: Order) => usageForOrder(products.find(p => p.id === order.productId), order.quantity, groups);

  /** A peça fica pronta agora e o material dela ainda não saiu do estoque. */
  const needsUsage = (order: Order, target: OrderStatus) =>
    !isDoneStatus(order.status) && isDoneStatus(target) && !order.stockUsedAt && usageFor(order).length > 0;

  const openFinish = (order: Order, target?: OrderStatus) => {
    const lines = usageFor(order);
    setUsedQty(Object.fromEntries(lines.map(l => [l.key, String(Math.round(l.quantity * 10) / 10)])));
    setPending({ type: 'finish', order, target, lines });
  };

  /** Desconta o material (com "Desfazer") e, se houver, muda a etapa junto. */
  const finish = async (order: Order, target: OrderStatus | undefined, lines: { key: string; quantity: number }[]) => {
    const used = await consumeOrderMaterials(order.id, order.clientName, lines);
    const summary = used.map(u => `${u.material} −${formatQuantity(u.used, u.unit)}`).join(' · ');
    const short = used.filter(u => u.short > 0).map(u => `${formatQuantity(u.short, u.unit)} de ${u.material}`).join(', ');
    const extra: Partial<Order> = { stockUsedAt: new Date(), history: appendHistory(order, `Material descontado do estoque: ${summary || 'nada'}`) };
    if (target) await changeOrderStatus(order, target, extra);
    else await orderService.update(order.id, extra);
    await onChanged();
    notify({
      type: short ? 'warning' : 'success',
      message: target ? `Peça pronta · ${order.clientName}` : 'Material descontado do estoque',
      detail: `${summary || 'Nada a descontar.'}${short ? ` Faltou no estoque: ${short}; confira a contagem.` : ''}`,
      onUndo: async () => {
        await returnOrderMaterials(order.id);
        const fresh = await orderService.getById(order.id);
        if (fresh) await orderService.update(order.id, { stockUsedAt: undefined, history: appendHistory(fresh, 'Material devolvido ao estoque') });
        await onChanged();
        notify({ type: 'info', message: 'Material devolvido ao estoque', detail: order.clientName });
      }
    });
  };

  const apply = async (order: Order, extra: () => Promise<Partial<Order>> | Partial<Order> = () => ({}), target?: OrderStatus) => {
    const next = target ?? nextStatus(order, missingFor(order).length > 0);
    if (!next) return;
    const patch = await extra();
    await changeOrderStatus(order, next, patch);
    await onChanged();
    notify({ type: next === 'Entregue' ? 'success' : 'info', message: next === 'Entregue' ? 'Pedido entregue' : `Etapa: ${next}`, detail: order.clientName });
  };

  /** Pede a próxima etapa; abre uma pergunta quando há algo a confirmar. */
  const requestAdvance = async (order: Order) => {
    const missing = missingFor(order);
    const next = nextStatus(order, missing.length > 0);
    if (!next) return;
    if (next === 'Sinal recebido' && order.paymentStatus === 'pendente') return setPending({ type: 'signal', order });
    if (next === 'Entregue' && orderPending(order) > 0) return setPending({ type: 'delivery', order });
    // "Materiais comprados" → produção: se ainda falta algo, avisa antes de começar
    if (next === 'Em produção' && missing.length) return setPending({ type: 'materials', order, missing });
    if (needsUsage(order, next)) return openFinish(order, next);
    await apply(order, undefined, next);
  };

  /** Soltar o cartão em outra coluna do quadro: mesma regra do material da peça pronta. */
  const requestMove = async (order: Order, target: OrderStatus) => {
    if (needsUsage(order, target)) return openFinish(order, target);
    await apply(order, undefined, target);
    if (order.paymentStatus === 'pendente' && target !== 'Orçamento enviado') {
      notify({ type: 'warning', message: 'O sinal ainda não foi registrado', detail: `${order.clientName}: use "Registrar pagamento" quando receber.` });
    }
  };

  /** Pedido pronto em que ela tocou "Agora não": descontar depois, pelo detalhe do pedido. */
  const canUseMaterials = (order: Order) =>
    (order.status === 'Produção concluída' || order.status === 'Aguardando entrega') && !order.stockUsedAt && usageFor(order).length > 0;
  const requestUsage = (order: Order) => openFinish(order);

  const close = () => setPending(null);

  const node = pending && (
    <Modal
      isOpen
      onClose={close}
      title={
        pending.type === 'signal' ? 'O sinal já foi recebido?'
          : pending.type === 'delivery' ? `Concluir entrega · ${pending.order.clientName}`
          : pending.type === 'finish' ? (pending.target ? `Peça pronta · ${pending.order.clientName}` : `Material usado · ${pending.order.clientName}`)
          : 'Faltam materiais para começar'
      }
      footer={
        pending.type === 'finish' ? (
          <>
            {pending.target ? (
              <Button variant="secondary" onClick={async () => { const p = pending; close(); await apply(p.order, undefined, p.target); }}>Agora não</Button>
            ) : (
              <Button variant="secondary" onClick={close}>Cancelar</Button>
            )}
            <Button
              onClick={async () => {
                const p = pending;
                close();
                await finish(p.order, p.target, p.lines.map(l => ({ key: l.key, quantity: l.unitMismatch ? 0 : parseFloat((usedQty[l.key] ?? '').replace(',', '.')) || 0 })));
              }}
            >
              {pending.target ? 'Descontar e concluir' : 'Descontar do estoque'}
            </Button>
          </>
        ) : pending.type === 'signal' ? (
          <>
            <Button variant="secondary" onClick={async () => { const o = pending.order; close(); await apply(o, undefined, 'Sinal recebido'); }}>Só mudar a etapa</Button>
            <Button onClick={async () => { const o = pending.order; close(); await apply(o, () => registerPayment(o, 'sinal'), 'Sinal recebido'); }}>Sim, registrar sinal</Button>
          </>
        ) : pending.type === 'delivery' ? (
          <>
            <Button variant="secondary" onClick={async () => { const o = pending.order; close(); await apply(o, undefined, 'Entregue'); }}>Entregar, saldo continua pendente</Button>
            <Button onClick={async () => { const o = pending.order; close(); await apply(o, () => registerPayment(o, 'saldo'), 'Entregue'); }}>Entregar e receber saldo</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>Voltar</Button>
            <Button onClick={async () => { const o = pending.order; close(); await apply(o, undefined, 'Em produção'); }}>Iniciar mesmo assim</Button>
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
      {pending.type === 'finish' && (
        <>
          <p className="muted" style={{ lineHeight: 1.7, marginTop: 0 }}>
            Descontar do estoque o material desta peça? As quantidades vêm da receita{pending.order.quantity > 1 ? ` × ${pending.order.quantity} peças` : ''}; mude se usou mais ou menos.
          </p>
          <div className="stack-sm mt-16">
            {pending.lines.map(l => (
              <Input
                key={l.key}
                label={l.material}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={usedQty[l.key] ?? ''}
                onChange={e => setUsedQty(q => ({ ...q, [l.key]: e.target.value }))}
                suffix={unitShort(l.unit)}
                disabled={!l.inStock || l.unitMismatch}
                help={
                  !l.inStock ? 'Não está no estoque: nada a descontar.'
                    : l.unitMismatch ? `No estoque está em ${unitShort(l.unit)} e na receita em outra unidade: não dá para descontar.`
                    : `No estoque: ${formatQuantity(l.available, l.unit)}`
                }
                fullWidth
              />
            ))}
          </div>
        </>
      )}
      {pending.type === 'materials' && (
        <Alert tone="warning" title={`O pedido de ${pending.order.clientName} precisa de mais material do que você tem`}>
          {pending.missing.map(m => `${m.material}: precisa de ${m.needed.toLocaleString('pt-BR')} ${unitShort(m.unit)}, livre ${Math.max(0, m.available).toLocaleString('pt-BR')}${m.reserved > 0 ? ` (${m.reserved.toLocaleString('pt-BR')} reservados para outros pedidos)` : ''}`).join(' · ')}. Veja a lista de compras em Estoque.
        </Alert>
      )}
    </Modal>
  );

  /** A etapa que o "Avançar" vai aplicar (para o texto do botão). */
  const nextFor = (order: Order) => nextStatus(order, missingFor(order).length > 0);

  return { requestAdvance, requestMove, requestUsage, canUseMaterials, nextFor, node };
};

