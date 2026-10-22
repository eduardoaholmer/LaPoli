import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle, Clock, Eye, KanbanSquare, List, MessageCircle, MoreHorizontal, Pencil, Plus, Search, Trash2, Wallet, ChevronDown } from 'lucide-react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { orderService, productService, purchaseService, settingsService } from '../data/services';
import type { Order, Product, Purchase, Settings } from '../types';
import { formatCurrency, formatDate } from '../calculations';
import {
  ORDER_PHASES,
  daysUntilDeadline,
  firstStatusOfPhase,
  isOpenOrder,
  nextStatus,
  orderPending,
  phaseOf,
  relDays,
  type OrderPhase
} from '../calculations/orders';
import { appendHistory, changeOrderStatus } from '../data/orderActions';
import { Badge, StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { Chips, DropdownMenu, Segmented } from '../components/ui';
import { ConfirmDialog, Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { EmptyBoxIllustration, YarnIllustration } from '../components/Illustrations';
import { ProductArt } from '../components/ProductArt';
import { ScreenLayout } from '../components/ScreenLayout';
import { SkeletonGrid } from '../components/Skeleton';
import { notify } from '../utils/notify';
import { MessageModal, PaymentModal } from './OrderDialogs';
import { useOrderFlow } from './useOrderFlow';
import { OrderEditForm } from './OrderEditForm';

const VIEW_KEY = 'lapoli_orders_view';

type Filter = 'open' | 'orcamento' | 'producao' | 'entrega' | 'done' | 'cancel' | 'all';
type Sort = 'deadline' | 'recent' | 'value';

export const DeadlineBadge: React.FC<{ order: Order }> = ({ order }) => {
  if (!isOpenOrder(order)) return null;
  const n = daysUntilDeadline(order);
  if (n < 0) return <Badge variant="error" icon={<Clock size={13} />}>Atrasado {Math.abs(n)} {Math.abs(n) === 1 ? 'dia' : 'dias'}</Badge>;
  if (n <= 3) return <Badge variant="warning" icon={<Clock size={13} />}>Entrega {relDays(n)}</Badge>;
  return null;
};

export const PaymentBadge: React.FC<{ order: Order }> = ({ order }) => {
  if (order.status === 'Cancelado') return <Badge variant="default">Cancelado</Badge>;
  const pending = orderPending(order);
  if (order.paymentStatus === 'pendente') return <Badge variant="warning" icon={<Wallet size={13} />}>Sinal pendente</Badge>;
  if (pending > 0.01) return <Badge variant="default" icon={<Wallet size={13} />}>Saldo {formatCurrency(pending)}</Badge>;
  return <Badge variant="success" icon={<Check size={13} />}>Pago</Badge>;
};

export const OrdersScreen: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [view, setView] = useState<'list' | 'board'>(() => (localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'list'));
  const initialPhase = params.get('phase');
  const [filter, setFilter] = useState<Filter>(initialPhase === 'orcamento' || initialPhase === 'producao' || initialPhase === 'entrega' ? initialPhase : 'open');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('deadline');
  const [kPhase, setKPhase] = useState<OrderPhase['id']>((initialPhase as OrderPhase['id']) || 'producao');

  const [editing, setEditing] = useState<Order | null>(null);
  const [messageFor, setMessageFor] = useState<Order | null>(null);
  const [payFor, setPayFor] = useState<Order | null>(null);
  const [toDelete, setToDelete] = useState<Order | null>(null);

  const loadData = async () => {
    const [ords, prods, purch, sett] = await Promise.all([orderService.getAll(), productService.getAll(), purchaseService.getAll(), settingsService.initializeDefault()]);
    setOrders(ords);
    setProducts(prods);
    setPurchases(purch);
    setSettings(sett);
    setLoaded(true);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const flow = useOrderFlow(loadData, products, purchases);

  const changeView = (v: 'list' | 'board') => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const open = orders.filter(isOpenOrder);
  const late = open.filter(o => daysUntilDeadline(o) < 0);
  const receivable = open.reduce((s, o) => s + orderPending(o), 0);
  const waitingSignal = open.filter(o => o.paymentStatus === 'pendente').length;

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter(o => {
        const ph = phaseOf(o.status);
        if (filter === 'open' && !isOpenOrder(o)) return false;
        if (filter === 'done' && ph !== 'concluido') return false;
        if (filter === 'cancel' && ph !== 'cancelado') return false;
        if ((filter === 'orcamento' || filter === 'producao' || filter === 'entrega') && ph !== filter) return false;
        return !q || `${o.clientName} ${o.product} ${o.customizations ?? ''}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sort === 'recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sort === 'value') return b.agreedPrice - a.agreedPrice;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
  }, [orders, filter, search, sort]);

  const productOf = (o: Order) => products.find(p => p.id === o.productId);

  const handleSaveEdit = async (data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editing) return;
    await orderService.update(editing.id, { ...data, history: appendHistory(editing, 'Detalhes do pedido editados') });
    setEditing(null);
    await loadData();
    notify({ type: 'success', message: 'Pedido atualizado', detail: data.clientName });
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const order = toDelete;
    setToDelete(null);
    await orderService.delete(order.id);
    await loadData();
    notify({
      type: 'success',
      message: 'Pedido excluído',
      detail: order.clientName,
      onUndo: async () => {
        await orderService.create(order);
        await loadData();
        notify({ type: 'success', message: 'Pedido restaurado' });
      }
    });
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || result.destination.droppableId === result.source.droppableId) return;
    const order = orders.find(o => o.id === result.draggableId);
    if (!order) return;
    const target = firstStatusOfPhase(result.destination.droppableId as OrderPhase['id']);
    await changeOrderStatus(order, target);
    await loadData();
    notify({
      type: order.paymentStatus === 'pendente' && result.destination.droppableId !== 'orcamento' ? 'warning' : 'info',
      message: `${order.clientName} → ${target}`,
      detail: order.paymentStatus === 'pendente' && result.destination.droppableId !== 'orcamento' ? 'Atenção: o sinal ainda não foi registrado.' : undefined
    });
  };

  const menuFor = (o: Order) => [
    { label: 'Abrir detalhes', icon: <Eye size={18} />, onSelect: () => navigate(`/orders/${o.id}`) },
    { label: 'Mensagem no WhatsApp', icon: <MessageCircle size={18} />, onSelect: () => setMessageFor(o) },
    { label: 'Registrar pagamento', icon: <Wallet size={18} />, onSelect: () => setPayFor(o) },
    { label: 'Editar detalhes', icon: <Pencil size={18} />, onSelect: () => setEditing(o) },
    { label: '', divider: true, onSelect: () => undefined },
    { label: 'Excluir pedido', icon: <Trash2 size={18} />, danger: true, onSelect: () => setToDelete(o) }
  ];

  const advanceButton = (o: Order, compact = false) => {
    const next = nextStatus(o.status);
    if (!next) return null;
    return (
      <Button variant="secondary" size="sm" aria-label={`Avançar pedido de ${o.clientName} para ${next}`} onClick={() => flow.requestAdvance(o)} icon={<ArrowRight size={16} />}>
        {!compact && <span className="hide-md">{o.status === 'Aguardando entrega' ? 'Concluir entrega' : 'Avançar'}</span>}
      </Button>
    );
  };

  const head = (
    <ScreenLayout
      title="Pedidos e produção"
      subtitle="Do orçamento à entrega: o que está em andamento, o que atrasou e quanto falta receber."
      action={
        <>
          <Segmented
            label="Visualização"
            value={view}
            onChange={changeView}
            options={[
              { value: 'list', label: <><List size={18} />Lista</> },
              { value: 'board', label: <><KanbanSquare size={18} />Quadro</> }
            ]}
          />
          <Link className="btn btn-primary" to="/orders/new">
            <Plus size={18} />
            Novo pedido
          </Link>
        </>
      }
    >
      {null}
    </ScreenLayout>
  );

  if (!loaded || !settings) {
    return (
      <>
        {head}
        <SkeletonGrid count={3} />
      </>
    );
  }

  if (!orders.length) {
    return (
      <>
        {head}
        <EmptyState
          icon={<YarnIllustration size={112} />}
          title="Nenhum pedido por aqui ainda"
          description="Quando uma cliente pedir uma peça, anote aqui: prazo, sinal e detalhes ficam organizados."
          action={{ label: 'Novo pedido', onClick: () => navigate('/orders/new') }}
        />
      </>
    );
  }

  const counts = {
    done: orders.filter(o => o.status === 'Entregue').length,
    cancel: orders.filter(o => o.status === 'Cancelado').length
  };

  const strip = (
    <div className="grid g-4 keep2 mini-metrics">
      <div className="card metric"><div className="m-label">Em andamento</div><div className="m-val">{open.length}</div></div>
      <div className={`card metric ${late.length ? 'metric-alert' : ''}`}><div className="m-label">Atrasados</div><div className={`m-val ${late.length ? 'neg' : ''}`}>{late.length}</div></div>
      <div className="card metric"><div className="m-label">Aguardando sinal</div><div className="m-val">{waitingSignal}</div></div>
      <div className="card metric"><div className="m-label">Saldo a receber</div><div className="m-val">{formatCurrency(receivable)}</div></div>
    </div>
  );

  const filters: { value: Filter; label: string; count?: number }[] = [
    { value: 'open', label: 'Em andamento', count: open.length },
    { value: 'orcamento', label: 'Orçamento' },
    { value: 'producao', label: 'Produção' },
    { value: 'entrega', label: 'Entrega' },
    { value: 'done', label: 'Concluídos', count: counts.done },
    { value: 'cancel', label: 'Cancelados', count: counts.cancel },
    { value: 'all', label: 'Todos', count: orders.length }
  ];

  const toolbar = (
    <>
      <div className="toolbar mt-16">
        <div className="search">
          <Search size={18} />
          <input className="input" type="search" placeholder="Buscar cliente ou peça" value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar pedido" />
        </div>
        <select className="select tb-select" value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Ordenar">
          <option value="deadline">Prazo mais próximo</option>
          <option value="recent">Mais recentes</option>
          <option value="value">Maior valor</option>
        </select>
      </div>
      {view === 'list' && (
        <div className="mt-8">
          <Chips label="Filtrar por situação" value={filter} onChange={setFilter} options={filters} />
        </div>
      )}
    </>
  );

  const listView = !list.length ? (
    <div className="mt-16">
      <EmptyState compact icon={<EmptyBoxIllustration size={64} />} title="Nenhum pedido neste filtro" description="Mude o filtro ou a busca para ver outros pedidos." />
    </div>
  ) : (
    <>
      <div className="card pad-0 mt-16 hide-sm">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="mw">Cliente e peça</th>
                <th className="right">Total</th>
                <th className="right">A receber</th>
                <th>Prazo</th>
                <th>Etapa</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map(o => {
                const n = daysUntilDeadline(o);
                const pending = orderPending(o);
                return (
                  <tr key={o.id} className="click" onClick={() => navigate(`/orders/${o.id}`)}>
                    <td>
                      <div className="row">
                        <ProductArt product={productOf(o)} artKey={productOf(o) ? undefined : 'boneca'} size="sm" />
                        <div>
                          <div className="name">{o.clientName}</div>
                          <div className="sub">{o.product}{o.quantity > 1 ? ` × ${o.quantity}` : ''}{!o.productId ? ' · personalizada' : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="right num">{formatCurrency(o.agreedPrice)}</td>
                    <td className="right num">{o.status === 'Cancelado' ? '—' : pending > 0.01 ? <span className="warn"><b>{formatCurrency(pending)}</b></span> : <span className="pos">Pago</span>}</td>
                    <td className="nowrap">
                      {isOpenOrder(o) ? (<>{formatDate(o.deadline).slice(0, 5)}<div className={`sub ${n < 0 ? 'neg' : ''}`}>{relDays(n)}</div></>) : o.deliveryDate ? (<>{formatDate(o.deliveryDate).slice(0, 5)}<div className="sub">entregue</div></>) : '—'}
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                      <div className="mt-8"><DeadlineBadge order={o} /></div>
                    </td>
                    <td className="right nowrap" onClick={e => e.stopPropagation()}>
                      {advanceButton(o)}
                      <DropdownMenu label={`Mais ações do pedido de ${o.clientName}`} trigger={<MoreHorizontal size={20} />} items={menuFor(o)} triggerClassName="btn btn-ghost btn-icon btn-sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="stack-sm mt-16 only-sm">
        {list.map(o => {
          const n = daysUntilDeadline(o);
          const pending = orderPending(o);
          return (
            <Link key={o.id} className="card pad-sm clickable ord-card" to={`/orders/${o.id}`}>
              <div className="row">
                <ProductArt product={productOf(o)} artKey={productOf(o) ? undefined : 'boneca'} size="md" />
                <div className="grow">
                  <b>{o.clientName}</b>
                  <div className="small muted">{o.product}{o.quantity > 1 ? ` × ${o.quantity}` : ''}</div>
                  <div className="mt-8"><StatusBadge status={o.status} /></div>
                </div>
              </div>
              <div className="row between mt-16 small">
                <span className="muted">
                  {isOpenOrder(o) ? <>Prazo {formatDate(o.deadline).slice(0, 5)} · <b className={n < 0 ? 'neg' : ''}>{relDays(n)}</b></> : o.deliveryDate ? `Entregue ${formatDate(o.deliveryDate).slice(0, 5)}` : '—'}
                </span>
                <span className="num"><b>{formatCurrency(o.agreedPrice)}</b>{pending > 0.01 && o.status !== 'Cancelado' ? <> · <span className="warn">saldo {formatCurrency(pending)}</span></> : null}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );

  // ---------- quadro ----------
  const boardOrders = list.filter(isOpenOrder);
  const finished = list.filter(o => !isOpenOrder(o));

  const card = (o: Order, index: number) => {
    const n = daysUntilDeadline(o);
    return (
      <Draggable key={o.id} draggableId={o.id} index={index}>
        {(prov, snap) => (
          <article
            ref={prov.innerRef}
            {...prov.draggableProps}
            {...prov.dragHandleProps}
            className={`kcard ${n < 0 ? 'late' : ''} ${snap.isDragging ? 'dragging' : ''}`}
            style={prov.draggableProps.style}
          >
            <Link className="kc-top" to={`/orders/${o.id}`}>
              <ProductArt product={productOf(o)} artKey={productOf(o) ? undefined : 'boneca'} size="sm" />
              <div className="grow">
                <div className="row between"><b>{o.clientName}</b></div>
                <div className="small muted">{o.product}{o.quantity > 1 ? ` × ${o.quantity}` : ''}</div>
              </div>
            </Link>
            <div className="kc-mid">
              <span className={`small ${n < 0 ? 'neg' : n <= 3 ? 'warn' : 'muted'}`}><Clock size={13} /> {formatDate(o.deadline).slice(0, 5)} · {relDays(n)}</span>
              <span className="num small"><b>{formatCurrency(o.agreedPrice)}</b></span>
            </div>
            <div className="kc-bot">
              <PaymentBadge order={o} />
              {nextStatus(o.status) && (
                <Button variant="ghost" size="sm" aria-label={`Avançar pedido de ${o.clientName}`} onClick={() => flow.requestAdvance(o)}>
                  {o.status === 'Aguardando entrega' ? 'Entregar' : 'Avançar'}
                  <ArrowRight size={16} />
                </Button>
              )}
            </div>
          </article>
        )}
      </Draggable>
    );
  };

  const board = (
    <>
      <div className="seg block only-sm mt-16" role="tablist">
        {ORDER_PHASES.map(ph => (
          <button key={ph.id} type="button" role="tab" aria-pressed={kPhase === ph.id} onClick={() => setKPhase(ph.id)}>
            {ph.name} <span className="cnt">{boardOrders.filter(o => ph.statuses.includes(o.status)).length}</span>
          </button>
        ))}
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board mt-16">
          {ORDER_PHASES.map(ph => {
            const items = boardOrders.filter(o => ph.statuses.includes(o.status)).sort((a, b) => ph.statuses.indexOf(a.status) - ph.statuses.indexOf(b.status) || new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
            let index = 0;
            return (
              <section key={ph.id} className={`kcol ${kPhase === ph.id ? 'active' : ''}`} aria-label={ph.name}>
                <header className="k-head">
                  <div><h2>{ph.name}</h2><span className="small muted">{ph.hint}</span></div>
                  <Badge variant="default">{items.length}</Badge>
                </header>
                <Droppable droppableId={ph.id}>
                  {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.droppableProps} className={`k-body ${snap.isDraggingOver ? 'over' : ''}`}>
                      {ph.statuses.map(st => {
                        const group = items.filter(o => o.status === st);
                        if (!group.length) return null;
                        return (
                          <React.Fragment key={st}>
                            <div className="k-sub">{st} <span>{group.length}</span></div>
                            {group.map(o => card(o, index++))}
                          </React.Fragment>
                        );
                      })}
                      {prov.placeholder}
                      {!items.length && (
                        <div className="k-empty"><YarnIllustration size={40} /><span>Nenhum pedido aqui</span></div>
                      )}
                    </div>
                  )}
                </Droppable>
              </section>
            );
          })}
        </div>
      </DragDropContext>
      <p className="small muted mt-8 hide-sm">Arraste um cartão para outra coluna ou use “Avançar”. Cada coluna agrupa as etapas do sistema em três fases.</p>
      <details className="card pad-sm mt-16 closed-box">
        <summary>
          <CheckCircle size={20} />
          <b>Concluídos e cancelados</b>
          <Badge variant="success">{finished.filter(o => o.status === 'Entregue').length} entregues</Badge>
          <Badge variant="default">{finished.filter(o => o.status === 'Cancelado').length} cancelados</Badge>
          <ChevronDown size={18} className="chev" />
        </summary>
        <div className="rows mt-16">
          {finished.map(o => (
            <Link key={o.id} className="li click" to={`/orders/${o.id}`} style={{ padding: '10px 12px' }}>
              <ProductArt product={productOf(o)} artKey={productOf(o) ? undefined : 'boneca'} size="sm" />
              <div className="grow"><div className="t" style={{ fontWeight: 500 }}>{o.clientName}</div><div className="s">{o.product}</div></div>
              <StatusBadge status={o.status} />
              <b className="num hide-sm" style={{ minWidth: 80, textAlign: 'right' }}>{formatCurrency(o.agreedPrice)}</b>
            </Link>
          ))}
          {!finished.length && <p className="muted small">Nenhum pedido concluído ou cancelado neste filtro.</p>}
        </div>
      </details>
    </>
  );

  return (
    <>
      {head}
      {strip}
      {toolbar}
      {view === 'list' ? listView : board}

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar pedido" size="lg">
        {editing && <OrderEditForm key={editing.id} order={editing} products={products} settings={settings} onSave={handleSaveEdit} onCancel={() => setEditing(null)} />}
      </Modal>
      <MessageModal order={messageFor} onClose={() => setMessageFor(null)} />
      <PaymentModal order={payFor} paymentMethods={settings.paymentMethods} onClose={() => setPayFor(null)} onDone={loadData} />
      <ConfirmDialog isOpen={!!toDelete} title={`Excluir o pedido de ${toDelete?.clientName ?? ''}?`} confirmLabel="Excluir pedido" danger onClose={() => setToDelete(null)} onConfirm={confirmDelete}>
        O pedido é apagado do sistema. Se só mudou de ideia, prefira cancelar na tela de detalhes. Você poderá desfazer logo depois.
      </ConfirmDialog>
      {flow.node}
    </>
  );
};
