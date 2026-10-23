import { useMemo, useState } from 'react';
import type { Order, OrderStatus, Product, Purchase, Settings } from '../types';
import { formatCurrency } from '../calculations';
import { estimateOrderProfit, missingMaterialsForOrder, nextStatus, orderPending } from '../calculations/orders';
import { formatQuantity, groupMaterials, materialKey, reservedByOrders, unitShort } from '../calculations/materials';
import { computeSettlement, logTotals, settlementLines, type SettlementLine } from '../calculations/settlement';
import { appendHistory, changeOrderStatus, registerPayment } from '../data/orderActions';
import { consumeOrderMaterials, isDoneStatus, returnOrderMaterials } from '../data/stockUsage';
import { orderService, productService } from '../data/services';
import { Button } from '../components/Button';
import { Checkbox, Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { Alert, KV } from '../components/ui';
import { notify } from '../utils/notify';

/* ------------------------------------------------------------------
   Avançar etapa, com as perguntas que evitam esquecimentos
   ------------------------------------------------------------------ */
type Pending =
  | { type: 'signal'; order: Order }
  | { type: 'delivery'; order: Order }
  | { type: 'materials'; order: Order; missing: ReturnType<typeof missingMaterialsForOrder> }
  // peça pronta: acerto dos números e material que sai do estoque (target ausente = só o acerto, sem mudar a etapa)
  | { type: 'finish'; order: Order; target?: OrderStatus; lines: SettlementLine[] };

const num = (v: string | undefined) => parseFloat((v ?? '').replace(',', '.')) || 0;
const round1 = (n: number) => Math.round(n * 10) / 10;

export const useOrderFlow = (
  onChanged: () => void | Promise<void>,
  products: Product[] = [],
  purchases: Purchase[] = [],
  orders: Order[] = [],
  settings: Settings | null = null
) => {
  const [pending, setPending] = useState<Pending | null>(null);
  const [usedQty, setUsedQty] = useState<Record<string, string>>({});
  const [usedColor, setUsedColor] = useState<Record<string, string>>({});
  const [hours, setHours] = useState('');
  const [updateRecipe, setUpdateRecipe] = useState(false);
  const groups = useMemo(() => groupMaterials(purchases), [purchases]);

  const productOf = (order: Order) => products.find(p => p.id === order.productId);
  // o que os outros pedidos confirmados vão usar não conta como disponível para este
  const missingFor = (order: Order) =>
    missingMaterialsForOrder(productOf(order), order.quantity, purchases, reservedByOrders(products, orders, order.id));
  const linesFor = (order: Order) => settlementLines(productOf(order), order.quantity, groups, order.log);
  const estimatedHours = (order: Order) => {
    const p = productOf(order);
    return p ? (p.actualTime || p.estimatedTime || 0) * order.quantity : 0;
  };

  /** A peça fica pronta agora e ainda não teve o acerto (material da receita ou anotações). */
  const needsUsage = (order: Order, target: OrderStatus) =>
    !isDoneStatus(order.status) && isDoneStatus(target) && !order.stockUsedAt && (linesFor(order).length > 0 || (order.log?.length ?? 0) > 0);

  const openFinish = (order: Order, target?: OrderStatus) => {
    const lines = linesFor(order);
    // cronômetro ainda ligado: o tempo corrido entra nas horas do acerto
    const running = order.timerStartedAt ? (Date.now() - new Date(order.timerStartedAt).getTime()) / 3600000 : 0;
    const logged = logTotals(order.log).hours + running;
    setUsedQty(Object.fromEntries(lines.map(l => [l.key, String(round1(l.quantity))])));
    // material com várias cores: a cor citada no pedido ("Cores: rosa"), senão a que tem mais
    const wanted = materialKey(`${order.customizations ?? ''} ${order.observations ?? ''}`);
    setUsedColor(
      Object.fromEntries(
        lines.flatMap(l => {
          const variants = groups.find(g => g.key === l.key)?.variants ?? [];
          if (variants.length < 2) return [];
          const cited = variants.find(v => v.key && wanted.includes(materialKey(v.name)));
          return [[l.key, (cited ?? [...variants].sort((a, b) => b.remaining - a.remaining)[0]).key]];
        })
      )
    );
    setHours(String(round1(logged > 0 ? logged : estimatedHours(order))));
    setUpdateRecipe(false);
    setPending({ type: 'finish', order, target, lines });
  };

  /** Acerto: desconta o material, guarda os números de verdade (com "Desfazer") e, se houver, muda a etapa. */
  const finish = async (order: Order, target: OrderStatus | undefined, lines: SettlementLine[], workedHours: number, toRecipe: boolean) => {
    const quantities = lines.map(l => ({ ...l, quantity: l.unitMismatch ? 0 : num(usedQty[l.key]), colorKey: usedColor[l.key] }));
    const used = await consumeOrderMaterials(order.id, order.clientName, quantities);
    const summary = used.map(u => `${u.material} −${formatQuantity(u.used, u.unit)}`).join(' · ');
    const short = used.filter(u => u.short > 0).map(u => `${formatQuantity(u.short, u.unit)} de ${u.material}`).join(', ');
    const product = productOf(order);
    const result = computeSettlement(order, quantities, workedHours, settings?.hourlyRate ?? 0, logTotals(order.log).extras);
    const estimate = settings ? estimateOrderProfit(order, product, settings, purchases) : null;
    const extra: Partial<Order> = {
      stockUsedAt: new Date(),
      timerStartedAt: undefined,
      settlement: { date: new Date(), ...result, hours: workedHours, estimatedProfit: estimate?.profit, estimatedHours: estimatedHours(order) || undefined },
      history: appendHistory(order, `Acerto: lucro ${formatCurrency(result.profit)}${summary ? ` · material descontado: ${summary}` : ''}`)
    };
    if (target) await changeOrderStatus(order, target, extra);
    else await orderService.update(order.id, extra);

    // a receita passa a ter o que foi usado de verdade, por peça (para os próximos orçamentos)
    const before = product ? { materials: product.materials, actualTime: product.actualTime } : null;
    if (toRecipe && product) {
      await productService.update(product.id, {
        materials: product.materials.map(pm => {
          const line = quantities.find(l => l.key === materialKey(pm.material));
          return line && !line.unitMismatch ? { ...pm, quantityUsed: round1(line.quantity / order.quantity), totalCost: (line.quantity / order.quantity) * (pm.unitCost ?? 0) } : pm;
        }),
        ...(workedHours > 0 ? { actualTime: round1(workedHours / order.quantity) } : {})
      });
    }
    await onChanged();
    notify({
      type: short ? 'warning' : 'success',
      message: `Lucro de verdade: ${formatCurrency(result.profit)}`,
      detail: `${order.clientName}${estimate ? ` · estimado ${formatCurrency(estimate.profit)}` : ''}.${short ? ` Faltou no estoque: ${short}; confira a contagem.` : ''}`,
      onUndo: async () => {
        await returnOrderMaterials(order.id);
        const fresh = await orderService.getById(order.id);
        if (fresh) await orderService.update(order.id, { stockUsedAt: undefined, settlement: undefined, history: appendHistory(fresh, 'Acerto desfeito, material devolvido ao estoque') });
        if (toRecipe && product && before) await productService.update(product.id, before);
        await onChanged();
        notify({ type: 'info', message: 'Acerto desfeito', detail: order.clientName });
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
    (order.status === 'Produção concluída' || order.status === 'Aguardando entrega') && !order.stockUsedAt && (linesFor(order).length > 0 || (order.log?.length ?? 0) > 0);
  const requestUsage = (order: Order) => openFinish(order);

  const close = () => setPending(null);

  const node = pending && (
    <Modal
      isOpen
      onClose={close}
      title={
        pending.type === 'signal' ? 'O sinal já foi recebido?'
          : pending.type === 'delivery' ? `Concluir entrega · ${pending.order.clientName}`
          : pending.type === 'finish' ? `Acerto do pedido · ${pending.order.clientName}`
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
                await finish(p.order, p.target, p.lines, num(hours), updateRecipe);
              }}
            >
              {pending.target ? 'Fechar o acerto' : 'Salvar o acerto'}
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
      {pending.type === 'finish' && (() => {
        const o = pending.order;
        const product = productOf(o);
        const extras = logTotals(o.log);
        const worked = num(hours);
        const live = computeSettlement(o, pending.lines.map(l => ({ quantity: l.unitMismatch ? 0 : num(usedQty[l.key]), unitCost: l.unitCost })), worked, settings?.hourlyRate ?? 0, extras.extras);
        const estimate = settings ? estimateOrderProfit(o, product, settings, purchases) : null;
        return (
          <>
            <p className="muted" style={{ lineHeight: 1.7, marginTop: 0 }}>
              Confira os números desta peça. O material sai do estoque e o resto vira o lucro de verdade do pedido.
            </p>
            {pending.lines.length > 0 && <h4 className="mt-16">Material usado</h4>}
            <div className="stack-sm mt-8">
              {pending.lines.map(l => {
                const delta = l.quantity - l.recipe;
                return (
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
                        : `${l.recipe > 0 ? `Receita: ${formatQuantity(l.recipe, l.unit)}` : 'Fora da receita'}${Math.abs(delta) > 0.001 && l.recipe > 0 ? ` · anotado ${delta > 0 ? '+' : '−'}${formatQuantity(Math.abs(delta), l.unit)}` : ''} · no estoque: ${formatQuantity(l.available, l.unit)}`
                    }
                    fullWidth
                  />
                );
              })}
              {pending.lines
                .filter(l => usedColor[l.key] !== undefined)
                .map(l => {
                  const variants = groups.find(g => g.key === l.key)?.variants ?? [];
                  return (
                    <Select key={`cor-${l.key}`} label={`Cor de ${l.material}`} value={usedColor[l.key]} onChange={e => setUsedColor(c => ({ ...c, [l.key]: e.target.value }))} fullWidth>
                      {variants.map(v => (
                        <option key={v.key} value={v.key}>{v.name} ({formatQuantity(v.remaining, l.unit)})</option>
                      ))}
                    </Select>
                  );
                })}
            </div>
            <div className="mt-16">
              <Input
                label="Horas trabalhadas"
                type="number"
                min={0}
                step="0.25"
                inputMode="decimal"
                value={hours}
                onChange={e => setHours(e.target.value)}
                suffix="h"
                help={`${extras.hours > 0 ? `Anotadas: ${round1(extras.hours).toLocaleString('pt-BR')} h` : 'Nenhuma hora anotada'}${estimatedHours(o) ? ` · estimado no produto: ${round1(estimatedHours(o)).toLocaleString('pt-BR')} h` : ''}`}
                fullWidth
              />
            </div>
            <div className="card sand flat pad-sm mt-16 stack-sm">
              <KV k="Preço combinado" v={formatCurrency(o.agreedPrice)} />
              <KV k="− Material" v={formatCurrency(live.materialCost)} />
              <KV k={`− Seu trabalho (${worked.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h × ${formatCurrency(settings?.hourlyRate ?? 0)})`} v={formatCurrency(live.laborCost)} />
              {extras.extras > 0 && <KV k="− Gastos extras anotados" v={formatCurrency(extras.extras)} />}
              <KV
                total
                k="Lucro de verdade"
                v={<span className={live.profit < 0 ? 'neg' : 'pos'}>{formatCurrency(live.profit)}</span>}
              />
              <p className="small muted" style={{ margin: 0 }}>
                {estimate ? `Estimado no pedido: ${formatCurrency(estimate.profit)}. ` : ''}
                {live.perHour !== null ? `Cada hora rendeu ${formatCurrency(live.perHour)}.` : ''}
              </p>
            </div>
            {product && (
              <div className="mt-16">
                <Checkbox
                  checked={updateRecipe}
                  onChange={setUpdateRecipe}
                  label={`Atualizar a receita do ${product.name} com estes números`}
                  description={`Material e horas por peça${o.quantity > 1 ? ` (÷ ${o.quantity})` : ''}. Os próximos orçamentos ficam mais certos.`}
                />
              </div>
            )}
          </>
        );
      })()}
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

