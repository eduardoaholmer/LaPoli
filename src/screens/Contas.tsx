import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Check, ExternalLink, MessageCircle } from 'lucide-react';
import { orderService, purchaseService, transactionService } from '../data/services';
import { registerPayment } from '../data/orderActions';
import type { Order, Purchase } from '../types';
import type { Transaction, TransactionType } from '../types/financial';
import { groupByDue } from '../calculations/finance';
import { formatCurrency, formatDate } from '../calculations';
import { Button } from '../components/Button';
import { Tabs } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { SkeletonGrid } from '../components/Skeleton';
import { ScreenLayout } from '../components/ScreenLayout';
import { chargeMessage, whatsappUrl } from './orderMessages';
import { notify } from '../utils/notify';

type Side = 'receber' | 'pagar';

const SIDE_TYPE: Record<Side, TransactionType> = { receber: 'receita', pagar: 'despesa' };

/** A pagar e a receber por vencimento, com baixa em um toque e cobrança de pedidos pelo WhatsApp. */
export const ContasScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [side, setSide] = useState<Side>('receber');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [t, o, p] = await Promise.all([transactionService.getAll(), orderService.getAll(), purchaseService.getAll()]);
    setTransactions(t);
    setOrders(o);
    setPurchases(p);
    setLoaded(true);
  };

  useEffect(() => {
    void load();
  }, []);

  const buckets = useMemo(() => groupByDue(transactions, SIDE_TYPE[side]), [transactions, side]);
  const counts = useMemo(
    () => ({
      receber: transactions.filter(t => t.type === 'receita' && !t.paymentDate).length,
      pagar: transactions.filter(t => t.type === 'despesa' && !t.paymentDate).length
    }),
    [transactions]
  );
  const total = buckets.reduce((s, b) => s + b.total, 0);
  const late = buckets.find(b => b.key === 'late');

  const orderOf = (t: Transaction): Order | undefined => orders.find(o => o.id === t.originId);

  const originLink = (t: Transaction): string | null => {
    if (t.origin === 'pedido_sinal' || t.origin === 'pedido_saldo') return `/orders/${t.originId}`;
    if (t.origin === 'compra') return `/stock/${encodeURIComponent(purchases.find(p => p.id === t.originId)?.material ?? '')}`;
    return null;
  };

  /** Pedidos são baixados no próprio pedido (a fonte da verdade); o resto, direto no lançamento. */
  const settle = async (t: Transaction) => {
    setBusy(t.id);
    try {
      if (t.origin === 'pedido_sinal' || t.origin === 'pedido_saldo') {
        const order = orderOf(t);
        if (!order) throw new Error('Pedido de origem não encontrado.');
        await registerPayment(order, t.origin === 'pedido_sinal' ? 'sinal' : 'saldo');
      } else {
        await transactionService.update(t.id, { paymentDate: new Date() });
      }
      notify({ type: 'success', message: t.type === 'receita' ? 'Recebimento confirmado' : 'Pagamento confirmado', detail: t.description });
      await load();
    } catch (error) {
      notify({ type: 'error', message: 'Não foi possível dar baixa', detail: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const chargeLink = (t: Transaction): string | null => {
    if (t.origin !== 'pedido_sinal' && t.origin !== 'pedido_saldo') return null;
    const order = orderOf(t);
    if (!order?.clientPhone) return null;
    return whatsappUrl(order.clientPhone, chargeMessage(order, t.origin === 'pedido_sinal' ? 'sinal' : 'saldo'));
  };

  if (!loaded) {
    return (
      <ScreenLayout title="A pagar e a receber">
        <SkeletonGrid count={3} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      title="A pagar e a receber"
      subtitle="O que ainda vai entrar e sair, por vencimento. Dê baixa com um toque quando acontecer."
      action={
        <Link className="btn btn-secondary" to="/financeiro">
          Voltar ao Financeiro
        </Link>
      }
    >
      <Tabs
        value={side}
        onChange={setSide}
        tabs={[
          { value: 'receber', label: 'A receber', count: counts.receber },
          { value: 'pagar', label: 'A pagar', count: counts.pagar }
        ]}
      />

      {buckets.length === 0 ? (
        <div className="mt-16">
          <EmptyState
            title={side === 'receber' ? 'Nada a receber' : 'Nada a pagar'}
            description={
              side === 'receber'
                ? 'Sinais e saldos de pedidos em aberto aparecem aqui até serem recebidos.'
                : 'Parcelas de compras e despesas previstas aparecem aqui até serem pagas.'
            }
          />
        </div>
      ) : (
        <>
          <div className="grid g-4 keep2 mt-16">
            <div className="card metric">
              <div className="m-top"><span className="m-label">{side === 'receber' ? 'Total a receber' : 'Total a pagar'}</span></div>
              <div className="m-val">{formatCurrency(total)}</div>
              <div className="m-note">Ainda não está no saldo de caixa.</div>
            </div>
            <div className="card metric">
              <div className="m-top"><span className="m-label">Atrasado</span></div>
              <div className={`m-val ${late ? 'neg' : ''}`}>{formatCurrency(late?.total ?? 0)}</div>
              <div className="m-note">{late ? `${late.items.length} ${late.items.length > 1 ? 'itens vencidos' : 'item vencido'}.` : 'Nada vencido.'}</div>
            </div>
          </div>

          {buckets.map(bucket => (
            <section key={bucket.key} className="card mt-16 pad-0" aria-label={bucket.label}>
              <div className="card-head" style={{ padding: '16px 24px 0' }}>
                <h2 className={bucket.key === 'late' ? 'neg' : undefined}>{bucket.label}</h2>
                <span className="num"><b>{formatCurrency(bucket.total)}</b></span>
              </div>
              <div className="rows" style={{ padding: '0 12px 8px' }}>
                {bucket.items.map(t => {
                  const link = originLink(t);
                  const charge = chargeLink(t);
                  return (
                    <div key={t.id} className="li" style={{ padding: 12, flexWrap: 'wrap' }}>
                      <span className={`dot-ic ${bucket.key === 'late' ? 'e' : t.type === 'receita' ? 's' : 'n'}`}>
                        {t.type === 'receita' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </span>
                      <div className="grow" style={{ flex: '1 1 180px' }}>
                        <div className="t" style={{ fontWeight: 500 }}>{t.description}</div>
                        <div className="s">
                          Vence em {formatDate(t.date)} · {t.category}
                          {t.installmentNumber && ` · parcela ${t.installmentNumber}/${t.totalInstallments}`}
                        </div>
                      </div>
                      <div className="row-wrap" style={{ marginLeft: 'auto', flexWrap: 'nowrap' }}>
                        <b className={`num ${t.type === 'receita' ? 'pos' : ''}`} style={{ marginRight: 4 }}>{formatCurrency(t.amount)}</b>
                        <Button size="sm" variant="secondary" icon={<Check size={16} />} disabled={busy === t.id} onClick={() => settle(t)}>
                          {t.type === 'receita' ? 'Recebido' : 'Pago'}
                        </Button>
                        {charge && (
                          <a className="btn btn-ghost btn-icon btn-sm" href={charge} target="_blank" rel="noopener noreferrer" aria-label={`Cobrar ${orderOf(t)?.clientName} pelo WhatsApp`} title="Cobrar pelo WhatsApp">
                            <MessageCircle size={16} />
                          </a>
                        )}
                        {link && (
                          <Link className="btn btn-ghost btn-icon btn-sm" to={link} aria-label="Abrir origem" title="Abrir origem">
                            <ExternalLink size={16} />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </ScreenLayout>
  );
};
