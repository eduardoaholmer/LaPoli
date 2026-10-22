import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CheckCheck,
  ChevronRight,
  Clock,
  History,
  Info,
  Layers,
  Package,
  Percent,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Plus,
  ClipboardList
} from 'lucide-react';
import { orderService, productService, purchaseService, settingsService } from '../data/services';
import type { Order, Product, Purchase, Settings } from '../types';
import { calculateProductCost, formatCurrency, formatDate } from '../calculations';
import {
  calculateCash,
  calculatePeriodResult,
  cashByDay,
  greetingFor,
  periodRange,
  type PeriodKey
} from '../calculations/period';
import { groupMaterials, formatQuantity, type MaterialGroup } from '../calculations/materials';
import { marginState } from '../calculations/pricing';
import { ORDER_PHASES, daysUntilDeadline, isOpenOrder, orderPending, relDays } from '../calculations/orders';
import { Alert, Lens, Segmented, Tip } from '../components/ui';
import { Input, Select } from '../components/Input';
import { ScreenLayout } from '../components/ScreenLayout';
import { EmptyState } from '../components/EmptyState';
import { SkeletonGrid } from '../components/Skeleton';
import { HookIllustration, AmigurumiIllustration, EmptyBoxIllustration, YarnIllustration } from '../components/Illustrations';
import { ProductArt } from '../components/ProductArt';
import { MiniBars } from '../components/charts';

const dateInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];

interface Attention {
  tone: 'error' | 'warning';
  icon: React.ReactNode;
  title: string;
  text: string;
  action: string;
  to: string;
}

const TASK_TEXT: Record<string, (o: Order) => string> = {
  'Sinal recebido': () => 'Separar materiais e começar',
  'Aguardando compra de materiais': () => 'Comprar os materiais que faltam',
  'Materiais comprados': () => 'Iniciar a produção',
  'Em produção': o => {
    const next = o.checklist?.find(c => !c.done);
    return next ? `Próxima etapa: ${next.label}` : 'Continuar a produção';
  },
  'Produção concluída': () => 'Avisar a cliente e combinar a entrega',
  'Aguardando entrega': () => 'Entregar e receber o saldo'
};

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [customStart, setCustomStart] = useState<Date>(new Date());
  const [customEnd, setCustomEnd] = useState<Date>(new Date());

  useEffect(() => {
    let alive = true;
    Promise.all([orderService.getAll(), productService.getAll(), purchaseService.getAll(), settingsService.initializeDefault()]).then(
      ([ords, prods, purch, sett]) => {
        if (!alive) return;
        setOrders(ords);
        setProducts(prods);
        setPurchases(purch);
        setSettings(sett);
      }
    );
    return () => {
      alive = false;
    };
  }, []);

  const range = useMemo(
    () => periodRange(period, new Date(), { start: customStart, end: customEnd }),
    [period, customStart, customEnd]
  );

  const groups: MaterialGroup[] = useMemo(() => groupMaterials(purchases), [purchases]);

  if (!settings) {
    return (
      <ScreenLayout title={`${greetingFor()}!`}>
        <SkeletonGrid count={3} />
      </ScreenLayout>
    );
  }

  const today = new Date();
  const dateLong = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today);

  // ---------- Primeiro uso ----------
  if (!orders.length && !products.length && !purchases.length) {
    return (
      <ScreenLayout title="Bem-vinda ao LaPoli" subtitle="Vamos organizar o ateliê em três passos. Seus dados ficam só neste aparelho.">
        <div className="card textured welcome">
          <div className="grid g-3 steps">
            {[
              { n: 1, ill: <YarnIllustration size={80} />, t: 'Cadastre uma compra de material', d: 'Registre fios e enchimento que você já tem. O sistema calcula o custo por grama.', to: '/stock?new=1', cta: 'Registrar compra' },
              { n: 2, ill: <AmigurumiIllustration size={80} />, t: 'Monte seu primeiro produto', d: 'Escolha os materiais e as horas de trabalho. Mostramos custo, preço sugerido e lucro.', to: '/products/new', cta: 'Cadastrar produto' },
              { n: 3, ill: <EmptyBoxIllustration size={80} />, t: 'Anote o primeiro pedido', d: 'Cliente, prazo e sinal. O pedido aparece no quadro de produção.', to: '/orders/new', cta: 'Novo pedido' }
            ].map(s => (
              <div className="step" key={s.n}>
                <span className="step-n">{s.n}</span>
                {s.ill}
                <h3>{s.t}</h3>
                <p className="muted">{s.d}</p>
                <Link className="btn btn-secondary" to={s.to}>
                  {s.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
        <Alert tone="info" icon={<Info size={20} />} title="Seus dados ficam neste aparelho" className="mt-16">
          Não há conta nem nuvem. Faça backup em Configurações de vez em quando: se o navegador limpar os dados, só o backup traz tudo de volta.
        </Alert>
      </ScreenLayout>
    );
  }

  // ---------- Números do período ----------
  const result = calculatePeriodResult(orders, products, purchases, settings, range);
  const cash = calculateCash(orders, purchases, range);
  const open = orders.filter(isOpenOrder);
  const late = open.filter(o => daysUntilDeadline(o) < 0);
  const near = open.filter(o => {
    const d = daysUntilDeadline(o);
    return d >= 0 && d <= 3;
  });

  // ---------- O que precisa de atenção ----------
  const attention: Attention[] = [];
  late.forEach(o =>
    attention.push({
      tone: 'error',
      icon: <Clock size={20} />,
      title: `Pedido de ${o.clientName} está atrasado ${Math.abs(daysUntilDeadline(o))} dia${Math.abs(daysUntilDeadline(o)) === 1 ? '' : 's'}`,
      text: `${o.product} · prazo ${formatDate(o.deadline)}`,
      action: 'Abrir pedido',
      to: `/orders/${o.id}`
    })
  );
  near.forEach(o => {
    const pending = orderPending(o);
    attention.push({
      tone: 'warning',
      icon: <Truck size={20} />,
      title: `Entrega ${relDays(daysUntilDeadline(o))}: ${o.clientName}`,
      text: `${o.product}${pending > 0 ? ` · saldo de ${formatCurrency(pending)} a receber` : ''}`,
      action: 'Abrir pedido',
      to: `/orders/${o.id}`
    });
  });
  groups
    .filter(g => g.level !== 'ok')
    .forEach(g =>
      attention.push({
        tone: g.level === 'low' ? 'error' : 'warning',
        icon: <Layers size={20} />,
        title: `${g.name} ${g.level === 'low' ? 'abaixo do mínimo' : 'quase no mínimo'}`,
        text: `Restam ${formatQuantity(g.remaining, g.unit, g.packageName, g.packageSize)} · mínimo ${formatQuantity(g.minStock, g.unit, g.packageName, g.packageSize)}`,
        action: 'Ver material',
        to: `/stock/${encodeURIComponent(g.key)}`
      })
    );
  products
    .filter(p => p.active)
    .forEach(p => {
      const c = calculateProductCost(p, settings, purchases);
      const st = marginState(c, settings.desiredProfitMargin);
      if (st !== 'ok' && p.usualPrice > 0) {
        attention.push({
          tone: st === 'loss' ? 'error' : 'warning',
          icon: <Percent size={20} />,
          title: `${p.name}: ${st === 'loss' ? 'vendendo com prejuízo' : 'margem abaixo da meta'}`,
          text: `Margem de ${c.profitMargin.toFixed(1)}% (meta ${settings.desiredProfitMargin}%)`,
          action: 'Ajustar preço',
          to: `/products/${p.id}`
        });
      }
    });
  attention.sort((a, b) => (a.tone === 'error' ? 0 : 1) - (b.tone === 'error' ? 0 : 1));

  // ---------- Para produzir e entregar ----------
  const tasks = open
    .filter(o => Object.keys(TASK_TEXT).includes(o.status))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  // ---------- Atividade recente (derivada dos registros) ----------
  const activity = [
    ...purchases.map(p => ({ date: new Date(p.date), icon: <ShoppingCart size={18} />, tone: 'n', t: `Compra registrada: ${p.material}`, s: formatCurrency(p.totalPaid) })),
    ...orders.map(o => ({ date: new Date(o.date), icon: <ClipboardList size={18} />, tone: 'p', t: `Novo pedido de ${o.clientName}`, s: `${o.product} · ${formatCurrency(o.agreedPrice)}` })),
    ...orders.filter(o => o.deliveryDate).map(o => ({ date: new Date(o.deliveryDate as Date), icon: <Truck size={18} />, tone: 's', t: `Pedido entregue a ${o.clientName}`, s: o.product }))
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const phaseCounts = ORDER_PHASES.map(ph => ({ ph, n: open.filter(o => ph.statuses.includes(o.status)).length }));
  const receivable = open.reduce((s, o) => s + orderPending(o), 0);
  const days14 = cashByDay(orders, purchases, 14);

  const periodSelect = (
    <div className="row-wrap">
      <Segmented
        label="Período"
        value={(['month', 'lastMonth', 'week'] as PeriodKey[]).includes(period) ? period : ('' as PeriodKey)}
        onChange={setPeriod}
        options={[
          { value: 'month', label: 'Este mês' },
          { value: 'lastMonth', label: 'Mês passado' },
          { value: 'week', label: '7 dias' }
        ]}
      />
      <Select
        aria-label="Outros períodos"
        className="tb-select"
        value={(['today', 'year', 'custom'] as PeriodKey[]).includes(period) ? period : ''}
        onChange={e => e.target.value && setPeriod(e.target.value as PeriodKey)}
      >
        <option value="">Outros…</option>
        <option value="today">Hoje</option>
        <option value="year">Ano atual</option>
        <option value="custom">Personalizado</option>
      </Select>
    </div>
  );

  const qa = [
    { to: '/orders/new', icon: <ShoppingBag size={22} />, label: 'Novo pedido' },
    { to: '/products/new', icon: <Package size={22} />, label: 'Cadastrar produto' },
    { to: '/stock?new=1', icon: <ShoppingCart size={22} />, label: 'Registrar compra' },
    { to: '/stock?tab=compras', icon: <ClipboardList size={22} />, label: 'Lista de compras' }
  ];

  return (
    <ScreenLayout
      title={`${greetingFor()}!`}
      subtitle={
        <>
          {dateLong} · você tem <b>{open.length} pedido{open.length === 1 ? '' : 's'} em andamento</b>
          {late.length > 0 && (
            <>
              {' '}e <b className="neg">{late.length} atrasado{late.length === 1 ? '' : 's'}</b>
            </>
          )}
          .
        </>
      }
      action={
        <Link className="btn btn-primary" to="/orders/new">
          <Plus size={18} />
          Novo pedido
        </Link>
      }
    >
      {/* Faturamento, caixa e lucro: três conceitos, três rótulos, nunca misturados */}
      <section className="card money-strip textured" aria-label={`Resumo financeiro de ${range.label}`}>
        <div className="money-head">
          <div>
            <span className="eyebrow">{range.label}</span>
            <h2>Como foi o período</h2>
          </div>
          {periodSelect}
        </div>
        {period === 'custom' && (
          <div className="row-wrap" style={{ marginBottom: 16 }}>
            <Input type="date" aria-label="Data inicial" value={dateInput(customStart)} onChange={e => e.target.value && setCustomStart(new Date(`${e.target.value}T00:00:00`))} />
            <Input type="date" aria-label="Data final" value={dateInput(customEnd)} onChange={e => e.target.value && setCustomEnd(new Date(`${e.target.value}T00:00:00`))} />
          </div>
        )}
        <div className="money-grid">
          <div className="money-col">
            <Lens kind="fat" />
            <div className="display-num">{formatCurrency(result.revenue)}</div>
            <p>
              Valor das peças <b>entregues</b> no período ({result.deliveredCount}). É o que você vendeu, não o que entrou na conta.
            </p>
          </div>
          <div className="money-col">
            <Lens kind="caixa" />
            <div className="display-num">{formatCurrency(cash.received)}</div>
            <p>
              Dinheiro que <b>entrou</b> (sinais e saldos com data registrada). Saiu em compras: <b>{formatCurrency(cash.spent)}</b>.
            </p>
          </div>
          <div className="money-col hl">
            <Lens kind="lucro" />
            <div className={`display-num ${result.profit < 0 ? 'neg' : ''}`}>{formatCurrency(result.profit)}</div>
            <p>
              Sobra depois de materiais, outros custos e seu trabalho (horas × valor da hora).{' '}
              {result.revenue > 0 ? (
                <>
                  Margem de <b>{result.margin.toFixed(1)}%</b>.
                </>
              ) : (
                'Aparece quando houver pedidos entregues.'
              )}
            </p>
          </div>
        </div>
        <div className="money-foot">
          <Info size={16} />
          <span>
            Por que são diferentes? Sinais de pedidos ainda não entregues entram no caixa, mas só viram faturamento na entrega. O caixa usa as datas de pagamento que você registra nos pedidos e nas compras.
            <Tip text="Mão de obra é um custo calculado: entra no lucro para o preço refletir suas horas, mas nunca sai do caixa." />
          </span>
        </div>
      </section>

      <section aria-label="Atalhos" className="mt-16">
        <div className="grid g-4 keep2 quick">
          {qa.map(q => (
            <Link key={q.to} to={q.to} className="quick-btn">
              <span className="dot-ic p">{q.icon}</span>
              <b>{q.label}</b>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid g-main-side mt-16">
        <div className="stack">
          <section className="card" aria-labelledby="h-att">
            <div className="card-head">
              <h2 id="h-att">
                <Bell size={20} /> Precisa de atenção <span className="badge-count">{attention.length}</span>
              </h2>
            </div>
            {attention.length ? (
              <div className="rows">
                {attention.slice(0, 6).map((a, i) => (
                  <Link key={i} className="li click att" to={a.to}>
                    <span className={`dot-ic ${a.tone === 'error' ? 'e' : 'w'}`}>{a.icon}</span>
                    <div className="grow">
                      <div className="t">{a.title}</div>
                      <div className="s">{a.text}</div>
                    </div>
                    <span className="link-btn hide-sm">
                      {a.action}
                      <ChevronRight size={16} />
                    </span>
                  </Link>
                ))}
                {attention.length > 6 && <p className="small muted mt-8">+ {attention.length - 6} avisos</p>}
              </div>
            ) : (
              <EmptyState compact icon={<AmigurumiIllustration size={64} />} title="Tudo em dia por aqui" description="Nenhum atraso, estoque baixo ou margem fora da meta." />
            )}
          </section>

          <section className="card" aria-labelledby="h-task">
            <div className="card-head">
              <h2 id="h-task">
                <CheckCheck size={20} /> Para produzir e entregar
              </h2>
              <Link className="link-btn" to="/orders">
                Ver pedidos <ArrowRight size={16} />
              </Link>
            </div>
            {tasks.length ? (
              <div className="rows">
                {tasks.map(o => {
                  const n = daysUntilDeadline(o);
                  const product = products.find(p => p.id === o.productId);
                  return (
                    <Link key={o.id} className="li click" to={`/orders/${o.id}`}>
                      <ProductArt product={product} artKey={product ? undefined : 'boneca'} size="sm" />
                      <div className="grow">
                        <div className="t">{TASK_TEXT[o.status](o)}</div>
                        <div className="s">
                          {o.clientName} · {o.product}
                        </div>
                      </div>
                      <div className="right small nowrap">
                        {n < 0 ? <span className="neg">Atrasado {Math.abs(n)}d</span> : n === 0 ? <b>Hoje</b> : formatDate(o.deadline).slice(0, 5)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState compact icon={<HookIllustration size={64} />} title="Nada para produzir agora" description="Quando um pedido tiver o sinal recebido, ele aparece aqui." />
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card" aria-labelledby="h-pipe">
            <div className="card-head">
              <h2 id="h-pipe">
                <ShoppingBag size={20} /> Pedidos em andamento
              </h2>
              <Link className="link-btn" to="/orders">
                Ver todos <ArrowRight size={16} />
              </Link>
            </div>
            <div className="pipe">
              {phaseCounts.map((x, i) => (
                <React.Fragment key={x.ph.id}>
                  {i > 0 && (
                    <span className="pipe-arrow">
                      <ChevronRight size={18} />
                    </span>
                  )}
                  <button type="button" className="pipe-step" onClick={() => navigate(`/orders?phase=${x.ph.id}`)}>
                    <span className="display-num">{x.n}</span>
                    <b>{x.ph.name}</b>
                    <span className="small muted">{x.ph.hint}</span>
                  </button>
                </React.Fragment>
              ))}
            </div>
            <div className="kv">
              <span className="k">Saldo a receber dos pedidos abertos</span>
              <span className="v">{formatCurrency(receivable)}</span>
            </div>
          </section>

          <section className="card" aria-labelledby="h-act">
            <div className="card-head">
              <h2 id="h-act">
                <History size={20} /> Atividade recente
              </h2>
            </div>
            <div className="mini-chart">
              <MiniBars days={days14} />
              <div className="legend">
                <span>
                  <i style={{ background: 'var(--color-secondary)' }} />
                  Entrou
                </span>
                <span>
                  <i style={{ background: 'var(--color-primary-light)' }} />
                  Saiu
                </span>
                <span className="faint">últimos 14 dias · caixa</span>
              </div>
            </div>
            <div className="rows mt-16">
              {activity.map((a, i) => (
                <div className="li" key={i}>
                  <span className={`dot-ic ${a.tone}`}>{a.icon}</span>
                  <div className="grow">
                    <div className="t" style={{ fontWeight: 500 }}>
                      {a.t}
                    </div>
                    <div className="s">{a.s}</div>
                  </div>
                  <span className="small faint nowrap">{formatDate(a.date).slice(0, 5)}</span>
                </div>
              ))}
              {!activity.length && <p className="muted small">Nada registrado ainda.</p>}
            </div>
          </section>
        </div>
      </div>
    </ScreenLayout>
  );
};
