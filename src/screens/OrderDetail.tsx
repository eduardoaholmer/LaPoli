import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Calculator, Calendar, Check, CheckCheck, Heart, History, MessageCircle, MoreHorizontal, Pencil, Plus, StickyNote, Trash2, Wallet, XCircle, FileText } from 'lucide-react';
import { orderService, productService, purchaseService, settingsService } from '../data/services';
import type { ChecklistItem, Order, Product, Purchase, Settings } from '../types';
import { generateId } from '../types';
import { formatCurrency, formatDate } from '../calculations';
import { ORDER_PHASES, daysUntilDeadline, estimateOrderProfit, isOpenOrder, nextStatus, orderPending, orderReceived, phaseOf, relDays } from '../calculations/orders';
import { baselineHistory, cancelOrder, appendHistory } from '../data/orderActions';
import { Badge, StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { TextArea, Input } from '../components/Input';
import { Alert, Bar, DropdownMenu, KV } from '../components/ui';
import { ConfirmDialog, Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { EmptyBoxIllustration } from '../components/Illustrations';
import { ProductArt } from '../components/ProductArt';
import { ScreenLayout } from '../components/ScreenLayout';
import { SkeletonGrid } from '../components/Skeleton';
import { notify } from '../utils/notify';
import { MessageModal, PaymentModal } from './OrderDialogs';
import { useOrderFlow } from './useOrderFlow';
import { OrderEditForm } from './OrderEditForm';
import { DeadlineBadge, PaymentBadge } from './Orders';

const DEFAULT_STEPS = ['Montar as peças', 'Bordados e detalhes', 'Acabamento', 'Embalagem'];

export const OrderDetailScreen: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [notes, setNotes] = useState('');
  const [newStep, setNewStep] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const loadData = async () => {
    const [o, prods, purch, sett] = await Promise.all([id ? orderService.getById(id) : undefined, productService.getAll(), purchaseService.getAll(), settingsService.initializeDefault()]);
    setOrder(o ?? null);
    setNotes(o?.observations ?? '');
    setProducts(prods);
    setPurchases(purch);
    setSettings(sett);
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const flow = useOrderFlow(loadData, products, purchases);

  if (order === undefined || !settings) {
    return (
      <ScreenLayout title="Pedido">
        <SkeletonGrid count={3} />
      </ScreenLayout>
    );
  }
  if (order === null) {
    return (
      <EmptyState icon={<EmptyBoxIllustration size={112} />} title="Pedido não encontrado" description="Ele pode ter sido excluído. Volte à lista para escolher outro." action={{ label: 'Voltar aos pedidos', onClick: () => navigate('/orders') }} />
    );
  }

  const product = products.find(p => p.id === order.productId);
  const received = orderReceived(order);
  const pending = orderPending(order);
  const days = daysUntilDeadline(order);
  const next = nextStatus(order.status);
  const phase = phaseOf(order.status);
  const checklist = order.checklist ?? [];
  const doneCount = checklist.filter(c => c.done).length;
  const profit = estimateOrderProfit(order, product, settings, purchases);
  const history = [...(order.history ?? baselineHistory(order))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const save = async (patch: Partial<Order>) => {
    await orderService.update(order.id, patch);
    await loadData();
  };

  const saveChecklist = (list: ChecklistItem[]) => save({ checklist: list });
  const toggleStep = (stepId: string) => saveChecklist(checklist.map(c => (c.id === stepId ? { ...c, done: !c.done } : c)));
  const addStep = async (label: string) => {
    if (!label.trim()) return;
    await saveChecklist([...checklist, { id: generateId(), label: label.trim(), done: false }]);
    setNewStep('');
  };

  const saveNotes = async () => {
    if (notes === (order.observations ?? '')) return;
    await save({ observations: notes });
    notify({ type: 'info', message: 'Nota salva' });
  };

  const handleCancel = async () => {
    setShowCancel(false);
    await cancelOrder(order);
    await loadData();
    notify({ type: 'info', message: 'Pedido cancelado', detail: order.clientName });
  };

  const handleDelete = async () => {
    setShowDelete(false);
    const copy = order;
    await orderService.delete(order.id);
    notify({ type: 'success', message: 'Pedido excluído', detail: order.clientName, onUndo: async () => { await orderService.create(copy); notify({ type: 'success', message: 'Pedido restaurado' }); } });
    navigate('/orders');
  };

  const handleSaveEdit = async (data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    await orderService.update(order.id, { ...data, history: appendHistory(order, 'Detalhes do pedido editados') });
    setShowEdit(false);
    await loadData();
    notify({ type: 'success', message: 'Pedido atualizado' });
  };

  const trackStates = ORDER_PHASES.map((ph, i) => {
    const cur = phase === 'concluido' ? 3 : phase === 'cancelado' ? -1 : ORDER_PHASES.findIndex(p => p.id === phase);
    return { ph, state: i < cur ? 'done' : i === cur ? 'cur' : '' };
  });

  return (
    <ScreenLayout
      title={
        <>
          Pedido de {order.clientName} <StatusBadge status={order.status} /> <DeadlineBadge order={order} />
        </>
      }
      subtitle={`${order.product} · feito em ${formatDate(order.date)}`}
      action={
        <>
          <Button variant="secondary" icon={<MessageCircle size={18} />} onClick={() => setShowMessage(true)}>WhatsApp</Button>
          {isOpenOrder(order) && <Button variant="secondary" icon={<Wallet size={18} />} onClick={() => setShowPay(true)}>Registrar pagamento</Button>}
          {next && (
            <Button icon={<ArrowRight size={18} />} onClick={() => flow.requestAdvance(order)}>
              {next === 'Entregue' ? 'Concluir entrega' : `Avançar: ${next}`}
            </Button>
          )}
          <DropdownMenu
            label="Mais ações"
            trigger={<MoreHorizontal size={20} />}
            items={[
              { label: 'Editar detalhes', icon: <Pencil size={18} />, onSelect: () => setShowEdit(true) },
              ...(isOpenOrder(order) ? [{ label: 'Cancelar pedido', icon: <XCircle size={18} />, danger: true, onSelect: () => setShowCancel(true) }] : []),
              { label: 'Excluir pedido', icon: <Trash2 size={18} />, danger: true, onSelect: () => setShowDelete(true) }
            ]}
          />
        </>
      }
    >
      <div className="card pad-sm track-card">
        {phase === 'cancelado' ? (
          <Alert tone="neutral" icon={<XCircle size={20} />}>
            <b>Pedido cancelado.</b> Nenhum valor entra no faturamento.
          </Alert>
        ) : (
          <ol className="track" aria-label="Fase do pedido">
            {trackStates.map((t, i) => (
              <li key={t.ph.id} className={t.state}>
                <span className="dot">{t.state === 'done' ? <Check size={14} /> : i + 1}</span>
                <span className="tt">
                  <b>{t.ph.name}</b>
                  {t.state === 'cur' && <span className="small muted">{order.status}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="grid g-main-side mt-16">
        <div className="stack">
          <section className="card">
            <div className="row" style={{ alignItems: 'flex-start', gap: 18 }}>
              <ProductArt product={product} artKey={product ? undefined : 'boneca'} size="md-lg" />
              <div className="grow">
                <span className="eyebrow">{product ? product.category : 'Peça personalizada'}</span>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '4px 0' }}>{order.product}</h2>
                <div className="muted">
                  {order.quantity} {order.quantity > 1 ? 'unidades' : 'unidade'}
                  {(order.size || product?.size) && ` · ${order.size || product?.size}`}
                </div>
                {order.customizations && (
                  <div className="spec mt-16">
                    <span className="eyebrow">Especificações</span>
                    <p className="mt-8">{order.customizations}</p>
                  </div>
                )}
              </div>
            </div>
            {product && (
              <div className="row-wrap mt-16">
                <Link className="link-btn" to={`/products/${product.id}`}>
                  <Calculator size={16} />
                  Ver precificação da peça
                </Link>
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2><CheckCheck size={20} /> Checklist de produção</h2>
              {checklist.length > 0 && <Badge variant="default">{doneCount} de {checklist.length}</Badge>}
            </div>
            {checklist.length > 0 && <Bar percent={(doneCount / checklist.length) * 100} tone="prim" height={6} label="Progresso da produção" />}
            <div className="mt-16">
              {checklist.map(c => (
                <div key={c.id} className="row" style={{ gap: 4 }}>
                  <button type="button" className="check grow" role="checkbox" aria-checked={c.done} onClick={() => toggleStep(c.id)}>
                    <span className="box"><Check size={14} /></span>
                    <span className="t">{c.label}</span>
                  </button>
                  <Button variant="ghost" size="sm" className="btn-icon" aria-label={`Remover etapa ${c.label}`} onClick={() => saveChecklist(checklist.filter(x => x.id !== c.id))}><Trash2 size={16} /></Button>
                </div>
              ))}
              {!checklist.length && <p className="muted small">Quebre a peça em etapas pequenas para acompanhar o andamento.</p>}
            </div>
            <form className="row mt-16" onSubmit={e => { e.preventDefault(); void addStep(newStep); }}>
              <div className="grow"><Input aria-label="Nova etapa" placeholder="Nova etapa (ex.: costurar as orelhas)" value={newStep} onChange={e => setNewStep(e.target.value)} fullWidth /></div>
              <Button type="submit" variant="secondary" icon={<Plus size={18} />}>Adicionar</Button>
            </form>
            {!checklist.length && (
              <button type="button" className="link-btn mt-8" onClick={() => saveChecklist(DEFAULT_STEPS.map(label => ({ id: generateId(), label, done: false })))}>Usar etapas sugeridas</button>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2><StickyNote size={20} /> Notas internas</h2>
              <span className="small muted">só você vê</span>
            </div>
            <TextArea aria-label="Notas internas" value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes} placeholder="Anotações de produção, combinados com a cliente…" fullWidth />
          </section>

          <section className="card">
            <div className="card-head"><h2><History size={20} /> Histórico</h2></div>
            <div className="timeline">
              {history.map((h, i) => (
                <div key={h.id} className={`tl-item ${i === 0 ? 'now' : ''}`}>
                  <div className="t">{h.text}</div>
                  <div className="s">{formatDate(h.date)}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head"><h2><Wallet size={20} /> Pagamento</h2><PaymentBadge order={order} /></div>
            <div className="stack-sm">
              <KV k="Valor total" v={formatCurrency(order.agreedPrice)} />
              <KV k="Sinal combinado" v={formatCurrency(order.signalAmount)} />
              <KV k="Recebido" v={<span className="pos">{formatCurrency(received)}</span>} />
              <KV k={<b>Saldo pendente</b>} v={<span className={pending > 0.01 ? 'warn' : 'pos'}><b>{formatCurrency(pending)}</b></span>} />
            </div>
            <div className="mt-16"><Bar percent={order.agreedPrice ? (received / order.agreedPrice) * 100 : 0} label="Quanto já foi recebido" /></div>
            {order.paymentMethod && <p className="small muted mt-8">Forma de pagamento: {order.paymentMethod}</p>}
          </section>

          {isOpenOrder(order) && (
            <section className={`card ${days < 0 ? 'edge-error' : days <= 3 ? 'edge-warn' : ''}`}>
              <span className="eyebrow"><Calendar size={14} style={{ verticalAlign: -2 }} /> Prazo de entrega</span>
              <div className="display-num mt-8" style={{ fontSize: 30 }}>{formatDate(order.deadline)}</div>
              <p className={`mt-8 ${days < 0 ? 'neg' : 'muted'}`}>
                <b>{relDays(days).charAt(0).toUpperCase() + relDays(days).slice(1)}</b>
                {days < 0 && ' — avise a cliente e combine nova data.'}
              </p>
            </section>
          )}

          <section className="card">
            <div className="row">
              <span className="avatar lg">{order.clientName.trim().slice(0, 2).toUpperCase()}</span>
              <div className="grow">
                <b style={{ fontSize: 17 }}>{order.clientName}</b>
                <div className="small muted">{order.clientPhone}</div>
              </div>
            </div>
            <div className="row-wrap mt-16">
              <Button variant="secondary" size="sm" icon={<MessageCircle size={16} />} onClick={() => setShowMessage(true)}>WhatsApp</Button>
            </div>
            <p className="small muted mt-16"><Heart size={14} style={{ verticalAlign: -2 }} /> Pedido de {formatDate(order.date)}</p>
          </section>

          {profit && order.status !== 'Cancelado' && (
            <section className="card sand flat pad-sm">
              <span className="eyebrow">Rentabilidade estimada</span>
              <div className="mt-8">
                <KV k="Custo de produção" v={formatCurrency(profit.cost)} />
                <KV k="Lucro estimado" v={<span className={profit.profit < 0 ? 'neg' : 'pos'}>{formatCurrency(profit.profit)} <span className="small">({profit.margin.toFixed(1)}%)</span></span>} />
              </div>
            </section>
          )}
          <p className="small muted"><FileText size={14} style={{ verticalAlign: -2 }} /> As etapas e os pagamentos usam os mesmos campos que o pedido já tinha.</p>
        </div>
      </div>

      <MessageModal order={showMessage ? order : null} onClose={() => setShowMessage(false)} />
      <PaymentModal order={showPay ? order : null} paymentMethods={settings.paymentMethods} onClose={() => setShowPay(false)} onDone={loadData} />
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar pedido" size="lg">
        {showEdit && <OrderEditForm order={order} products={products} settings={settings} onSave={handleSaveEdit} onCancel={() => setShowEdit(false)} />}
      </Modal>
      <ConfirmDialog isOpen={showCancel} title={`Cancelar o pedido de ${order.clientName}?`} confirmLabel="Cancelar pedido" cancelLabel="Voltar" danger onClose={() => setShowCancel(false)} onConfirm={handleCancel}>
        O pedido sai do quadro de produção e não conta no faturamento.{received > 0 ? ` Os ${formatCurrency(received)} já recebidos continuam registrados.` : ''}
      </ConfirmDialog>
      <ConfirmDialog isOpen={showDelete} title={`Excluir o pedido de ${order.clientName}?`} confirmLabel="Excluir pedido" danger onClose={() => setShowDelete(false)} onConfirm={handleDelete}>
        O pedido é apagado do sistema. Se só mudou de ideia, prefira cancelar. Você poderá desfazer logo depois.
      </ConfirmDialog>
      {flow.node}
    </ScreenLayout>
  );
};
