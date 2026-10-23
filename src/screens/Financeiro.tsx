import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Clock, History, Info, List, Plus, Scale, TrendingUp, Wallet } from 'lucide-react';
import { orderService, productService, purchaseService, settingsService, transactionService } from '../data/services';
import type { Order, Product, Purchase, Settings } from '../types';
import type { Transaction } from '../types/financial';
import { calculateCashFlow, calculatePeriodResult, cashSeries, forecastEntries } from '../calculations/finance';
import { periodRange, type PeriodKey } from '../calculations/period';
import { formatCurrency, formatDate } from '../calculations';
import { CashLineChart } from '../components/charts';
import { Lens, Segmented, Tip } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { SkeletonGrid } from '../components/Skeleton';
import { ScreenLayout } from '../components/ScreenLayout';
import { Button } from '../components/Button';
import { TransactionFormModal } from './Transactions';

type FinTab = 'caixa' | 'resultado';

export const FinanceiroScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [tab, setTab] = useState<FinTab>('caixa');
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    const [t, o, p, pu, s] = await Promise.all([
      transactionService.getAll(),
      orderService.getAll(),
      productService.getAll(),
      purchaseService.getAll(),
      settingsService.initializeDefault()
    ]);
    setTransactions(t);
    setOrders(o);
    setProducts(p);
    setPurchases(pu);
    setSettings(s);
  };

  useEffect(() => {
    void load();
  }, []);

  const range = useMemo(() => periodRange(period, new Date()), [period]);

  if (!settings) {
    return (
      <ScreenLayout title="Financeiro">
        <SkeletonGrid count={3} />
      </ScreenLayout>
    );
  }

  if (transactions.length === 0) {
    return (
      <ScreenLayout
        title="Financeiro"
        subtitle="Duas visões do mesmo ateliê: o dinheiro que se mexeu e o que realmente sobrou."
        action={
          <Button icon={<Plus size={18} />} onClick={() => setFormOpen(true)}>Lançar</Button>
        }
      >
        <EmptyState
          icon={<Wallet size={48} />}
          title="Ainda não há movimentações"
          description="Quando você registrar compras, receber sinais ou lançar despesas, o caixa e o resultado do ateliê aparecem aqui."
          action={{ label: 'Lançar movimentação', onClick: () => setFormOpen(true) }}
        />
        <TransactionFormModal isOpen={formOpen} initialType="receita" onClose={() => setFormOpen(false)} onSaved={load} />
      </ScreenLayout>
    );
  }

  const cash = calculateCashFlow(transactions, settings, range);
  const series = cashSeries(transactions, settings, range);
  const receivable = forecastEntries(transactions, 'receita');
  const result = calculatePeriodResult(orders, products, purchases, transactions, settings, range);
  const recent = transactions
    .filter(t => !!t.paymentDate)
    .sort((a, b) => new Date(b.paymentDate as Date).getTime() - new Date(a.paymentDate as Date).getTime())
    .slice(0, 5);

  return (
    <ScreenLayout
      title="Financeiro"
      subtitle="Duas visões do mesmo ateliê: o dinheiro que se mexeu e o que realmente sobrou."
      action={
        <>
          <Link className="btn btn-secondary" to="/financeiro/contas">
            <Clock size={18} /> A pagar e a receber
          </Link>
          <Link className="btn btn-secondary" to="/financeiro/movimentacoes">
            <List size={18} /> Movimentações
          </Link>
          <Button icon={<Plus size={18} />} onClick={() => setFormOpen(true)}>Lançar</Button>
        </>
      }
    >
      <div className="layer-switch" role="tablist" aria-label="Escolha a visão">
        <button role="tab" aria-selected={tab === 'caixa'} className="ls" onClick={() => setTab('caixa')}>
          <Wallet size={22} />
          <span><b>Fluxo de caixa</b><span className="small muted" style={{ display: 'block' }}>Dinheiro que entrou e saiu de verdade</span></span>
        </button>
        <button role="tab" aria-selected={tab === 'resultado'} className="ls" onClick={() => setTab('resultado')}>
          <BarChart3 size={22} />
          <span><b>Resultado do negócio</b><span className="small muted" style={{ display: 'block' }}>O que o ateliê realmente ganhou</span></span>
        </button>
      </div>

      <div className="row between wrap-sm mt-16">
        <span className="eyebrow">{range.label}</span>
        <Segmented
          label="Período"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'month', label: 'Este mês' },
            { value: 'lastMonth', label: 'Mês passado' },
            { value: 'week', label: '7 dias' },
            { value: 'year', label: 'Ano' }
          ]}
        />
      </div>

      {tab === 'caixa' ? (
        <>
          <div className="grid g-4 keep2 mt-16">
            <div className="card metric">
              <div className="m-top"><span className="m-label">Saldo de caixa</span><Lens kind="caixa" /></div>
              <div className="m-val">{formatCurrency(cash.balance)}</div>
              <div className="m-note">Começou o período com {formatCurrency(cash.opening)}.</div>
            </div>
            <div className="card metric">
              <div className="m-top"><span className="m-label">Entradas</span></div>
              <div className="m-val pos">{formatCurrency(cash.inflow)}</div>
              <div className="m-note">Sinais e saldos recebidos.</div>
            </div>
            <div className="card metric">
              <div className="m-top"><span className="m-label">Saídas</span></div>
              <div className="m-val">{formatCurrency(cash.outflow)}</div>
              <div className="m-note">Compras {formatCurrency(cash.purchases)} · despesas {formatCurrency(cash.expenses)}.</div>
            </div>
            <div className="card metric">
              <div className="m-top">
                <span className="m-label">Variação no período</span>
                <Tip text="Entradas menos saídas. Não é lucro: inclui sinais de pedidos ainda não entregues e material comprado que ainda não foi usado." />
              </div>
              <div className={`m-val ${cash.net < 0 ? 'neg' : 'pos'}`}>{cash.net >= 0 ? '+' : ''}{formatCurrency(cash.net)}</div>
              <div className="m-note">Não é o lucro.</div>
            </div>
          </div>

          <div className="card mt-16">
            <div className="card-head"><h2><TrendingUp size={20} /> Evolução do caixa</h2></div>
            {series.length > 1 ? <CashLineChart points={series} /> : <EmptyState compact title="Poucos dias para desenhar" description="Escolha um período maior." />}
          </div>

          <div className="card mt-16">
            <div className="card-head">
              <h2><Clock size={20} /> A receber <Lens kind="prev" /></h2>
              <span className="num"><b>{formatCurrency(receivable.reduce((s, f) => s + f.transaction.amount, 0))}</b></span>
            </div>
            <p className="small muted" style={{ margin: '-8px 0 8px' }}>Dinheiro combinado, mas que ainda não entrou. Não está no saldo acima.</p>
            <div className="rows">
              {receivable.slice(0, 5).map(f => (
                <Link key={f.transaction.id} className="li click" to={f.transaction.originId ? `/orders/${f.transaction.originId}` : '/financeiro/movimentacoes'} style={{ padding: 12 }}>
                  <span className={`dot-ic ${f.late ? 'e' : 'n'}`}><Clock size={18} /></span>
                  <div className="grow">
                    <div className="t" style={{ fontWeight: 500 }}>{f.transaction.description}</div>
                    <div className="s">{f.transaction.category} · {formatDate(f.transaction.date)}{f.late ? <span className="neg"> · atrasado</span> : null}</div>
                  </div>
                  <b className="num">{formatCurrency(f.transaction.amount)}</b>
                </Link>
              ))}
            </div>
            {receivable.length > 5 && (
              <p className="small muted mt-8">
                + {receivable.length - 5} valores a receber. <Link to="/financeiro/contas">Ver todos</Link>
              </p>
            )}
          </div>

          <div className="card mt-16 pad-0">
            <div className="card-head" style={{ padding: '20px 24px 0' }}>
              <h2><History size={20} /> Últimas movimentações</h2>
              <Link className="link-btn" to="/financeiro/movimentacoes">Ver todas <ArrowRight size={16} /></Link>
            </div>
            {recent.length > 0 && (
              <div className="rows" style={{ padding: '0 12px 8px' }}>
                {recent.map(t => (
                  <div key={t.id} className="li" style={{ padding: 12 }}>
                    <span className={`dot-ic ${t.type === 'receita' ? 's' : 'n'}`}>
                      {t.type === 'receita' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </span>
                    <div className="grow">
                      <div className="t" style={{ fontWeight: 500 }}>{t.description}</div>
                      <div className="s">{formatDate(t.paymentDate as Date)} · {t.category}</div>
                    </div>
                    <b className={`num ${t.type === 'receita' ? 'pos' : ''}`}>
                      {t.type === 'receita' ? '+' : '−'}{formatCurrency(t.amount)}
                    </b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : result.revenue === 0 ? (
        <div className="mt-16">
          <EmptyState icon={<BarChart3 size={48} />} title="Sem vendas entregues neste período" description="O resultado só considera pedidos entregues. Sinais recebidos de pedidos em andamento aparecem no caixa, não aqui." />
        </div>
      ) : (
        <div className="card pad-0 mt-16">
          <div className="card-head" style={{ padding: '20px 24px 0' }}>
            <h2><BarChart3 size={20} /> Do faturamento ao lucro</h2>
            <Lens kind="lucro" />
          </div>
          <div className="table-wrap">
            <table className="table dre">
              <tbody>
                <tr className="rev">
                  <td>Receita reconhecida<div className="sub">Pedidos entregues no período ({result.deliveredCount})</div></td>
                  <td className="right num"><b>{formatCurrency(result.revenue)}</b></td>
                </tr>
                <tr>
                  <td>(−) Materiais usados nas peças vendidas<div className="sub">Custo médio dos fios e insumos de cada peça</div></td>
                  <td className="right num"><b>−{formatCurrency(result.materialCost)}</b></td>
                </tr>
                <tr>
                  <td>(−) Embalagem e outros custos das peças<div className="sub">Estimativa cadastrada em cada produto</div></td>
                  <td className="right num"><b>−{formatCurrency(result.otherCosts)}</b></td>
                </tr>
                <tr className="calc">
                  <td>(−) Seu trabalho (horas × valor da hora) <Tip text="O valor do seu trabalho entra no resultado para o preço refletir suas horas, mas nunca sai do caixa. Por isso lucro e caixa são diferentes." /></td>
                  <td className="right num"><b>−{formatCurrency(result.laborCost)}</b></td>
                </tr>
                <tr className="sub">
                  <td>= Lucro bruto</td>
                  <td className={`right num ${result.grossProfit < 0 ? 'neg' : 'pos'}`}><b>{formatCurrency(result.grossProfit)}</b></td>
                </tr>
                <tr>
                  <td>(−) Despesas operacionais<div className="sub">Impostos, frete, divulgação</div></td>
                  <td className="right num"><b>−{formatCurrency(result.opEx)}</b></td>
                </tr>
                <tr className="total">
                  <td>= Lucro do período<div className="sub">Margem de {result.margin.toFixed(1)}%</div></td>
                  <td className={`right num ${result.profit < 0 ? 'neg' : 'pos'}`}><b>{formatCurrency(result.profit)}</b></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="card mt-24 bridge">
        <div className="card-head"><h2><Scale size={20} /> Por que o caixa não é igual ao lucro?</h2></div>
        <p className="muted" style={{ marginBottom: 12 }}>
          Sinais de pedidos ainda não entregues entram no caixa, mas só viram faturamento na entrega. Material comprado só é
          custo quando é consumido numa peça vendida — o que foi comprado e ainda não usado fica parado no estoque, não no lucro.
        </p>
        <Info size={16} />
      </section>

      <TransactionFormModal isOpen={formOpen} initialType="receita" onClose={() => setFormOpen(false)} onSaved={load} />
    </ScreenLayout>
  );
};
