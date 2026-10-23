import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Calculator, CheckCircle, Info, Pencil, Plus, SlidersHorizontal as Sliders } from 'lucide-react';
import { YarnIcon as Yarn } from '../components/icons';
import { orderService, productService, purchaseService, settingsService } from '../data/services';
import type { Order, Product, Purchase, Settings } from '../types';
import { calculateProductCost, calculateSuggestedPrice, formatCurrency } from '../calculations';
import { calculateMaterialLines, marginState, simulateProduct } from '../calculations/pricing';
import { formatQuantity, formatUnitCost, groupMaterials, packageEquivalent, reservedByOrders, unitShort } from '../calculations/materials';
import { PiecesHint } from '../components/PiecesHint';
import { Alert, Bar, KV, Tip } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { EmptyBoxIllustration } from '../components/Illustrations';
import { ProductArt } from '../components/ProductArt';
import { ScreenLayout } from '../components/ScreenLayout';
import { SkeletonGrid } from '../components/Skeleton';
import { Badge } from '../components/Badge';

const fmtNum = (n: number, d = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: d });

/** Margem 0–50% na barra; a marca preta é a meta. */
const MARGIN_SCALE = 50;

/**
 * Precificação detalhada: de onde vem cada centavo.
 * Os números vêm dos mesmos cálculos do app (calculateProductCost / calculateSuggestedPrice);
 * o simulador só troca preço, horas e valor da hora na memória, sem gravar nada.
 */
export const ProductPricingScreen: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [price, setPrice] = useState(0);
  const [hours, setHours] = useState(0);
  const [rate, setRate] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([id ? productService.getById(id) : undefined, purchaseService.getAll(), settingsService.initializeDefault(), orderService.getAll(), productService.getAll()]).then(([p, purch, sett, ords, prods]) => {
      if (!alive) return;
      setProduct(p ?? null);
      setPurchases(purch);
      setOrders(ords);
      setAllProducts(prods);
      setSettings(sett);
      if (p) {
        setPrice(p.usualPrice);
        setHours(p.actualTime || p.estimatedTime || 0);
        setRate(sett.hourlyRate);
      }
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const goal = settings?.desiredProfitMargin ?? 30;
  const sim = useMemo(
    () => (product && settings ? simulateProduct(product, settings, purchases, { price, hours, hourlyRate: rate }) : null),
    [product, settings, purchases, price, hours, rate]
  );
  const lines = useMemo(() => (product ? calculateMaterialLines(product, purchases) : []), [product, purchases]);
  const groups = useMemo(() => groupMaterials(purchases), [purchases]);
  // pedidos de qualquer produto reservam material: o mesmo fio entra em várias receitas
  const reserved = useMemo(() => reservedByOrders(allProducts, orders), [allProducts, orders]);

  if (product === undefined || !settings) {
    return (
      <ScreenLayout title="Precificação">
        <SkeletonGrid count={3} />
      </ScreenLayout>
    );
  }

  if (product === null || !sim) {
    return (
      <EmptyState
        icon={<EmptyBoxIllustration size={112} />}
        title="Produto não encontrado"
        description="Ele pode ter sido excluído. Volte ao catálogo para escolher outro."
        action={{ label: 'Voltar aos produtos', onClick: () => navigate('/products') }}
      />
    );
  }

  const base = calculateProductCost(product, settings, purchases);
  const suggested = calculateSuggestedPrice(sim.totalCost, goal);
  const state = marginState(sim, goal);
  const changed = price !== product.usualPrice || hours !== (product.actualTime || product.estimatedTime || 0) || rate !== settings.hourlyRate;
  const diff = price - suggested;

  const parts = [
    { name: 'Materiais', value: sim.materialCost, color: 'var(--color-secondary)' },
    { name: 'Mão de obra', value: sim.laborCost, color: 'var(--color-primary)' },
    { name: 'Outros custos', value: sim.otherCosts, color: 'var(--color-warning-light)' }
  ];

  const message =
    state === 'loss'
      ? { tone: 'error' as const, title: `Você perde ${formatCurrency(Math.abs(sim.profit))} a cada peça vendida`, text: `Com este preço o valor não cobre o custo de produção. O mínimo para não perder é ${formatCurrency(sim.totalCost)}; para atingir a meta, ${formatCurrency(suggested)}.` }
      : state === 'low'
        ? { tone: 'warning' as const, title: `Margem de ${sim.profitMargin.toFixed(1)}%, abaixo da meta de ${goal}%`, text: `Para chegar à meta, cobre ${formatCurrency(suggested)} (${formatCurrency(suggested - price)} a mais) ou reduza o tempo de produção.` }
        : { tone: 'success' as const, title: 'Margem saudável', text: `Você está ${diff >= 0 ? `${formatCurrency(diff)} acima` : `${formatCurrency(Math.abs(diff))} abaixo`} do preço sugerido e dentro da meta.` };

  const chips: [string, number][] = [
    ['Custo (sem lucro)', sim.totalCost],
    [`Meta ${goal}%`, suggested],
    ['Meta + 10 pts', calculateSuggestedPrice(sim.totalCost, goal + 10)],
    ['Arredondado', Math.ceil(suggested / 5) * 5 - 0.1]
  ];

  return (
    <ScreenLayout
      title={product.name}
      subtitle={
        <>
          {`${product.category}${product.size ? ` · ${product.size}` : ''}${product.needleSize ? ` · agulha ${product.needleSize}` : ''}`}
          {product.materials.length > 0 && <> · <PiecesHint product={product} groups={groups} reserved={reserved} long /></>}
        </>
      }
      action={
        <>
          <Link className="btn btn-secondary" to={`/products/${product.id}/edit`}>
            <Pencil size={18} />
            Editar produto
          </Link>
          <Link className="btn btn-primary" to={`/orders/new?product=${product.id}`}>
            <Plus size={18} />
            Novo pedido com esta peça
          </Link>
        </>
      }
    >
      <div className="grid g-main-side">
        <div className="stack">
          <div className={`card price-hero ${state}`}>
            <div className="hero-grid">
              <div>
                <span className="eyebrow">Preço recomendado</span>
                <div className="display-num hero-price">{formatCurrency(suggested)}</div>
                <p className="muted small">para {goal}% de margem · custo {formatCurrency(sim.totalCost)}</p>
              </div>
              <div>
                <span className="eyebrow">Você cobra</span>
                <div className="display-num hero-sub">{formatCurrency(price)}</div>
                <p className="muted small">preço de venda</p>
              </div>
              <div>
                <span className="eyebrow">Lucro por peça</span>
                <div className={`display-num hero-sub ${sim.profit < 0 ? 'neg' : 'pos'}`}>{formatCurrency(sim.profit)}</div>
                <p className="muted small">
                  margem <b className="num">{sim.profitMargin.toFixed(1)}%</b>
                </p>
              </div>
            </div>
            <div className="marginmeter">
              <Bar percent={(sim.profitMargin / MARGIN_SCALE) * 100} tone={state === 'ok' ? 'default' : state === 'low' ? 'warn' : 'err'} markAt={(goal / MARGIN_SCALE) * 100} label={`Margem ${sim.profitMargin.toFixed(1)}% contra meta ${goal}%`} />
              <div className="row between small muted">
                <span>0%</span>
                <span>meta {goal}%</span>
                <span>{MARGIN_SCALE}%</span>
              </div>
            </div>
            <Alert tone={message.tone} icon={state === 'ok' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />} title={message.title} className="mt-16">
              {message.text}
            </Alert>
            {changed && (
              <p className="small muted mt-8">
                <Info size={13} style={{ verticalAlign: -2 }} /> Isto é uma simulação: nada foi salvo. O produto continua com {formatCurrency(product.usualPrice)} (margem de {base.profitMargin.toFixed(1)}%).
              </p>
            )}
          </div>

          <div className="card pad-0">
            <div className="card-head" style={{ padding: '20px 24px 0' }}>
              <h2>
                <Yarn size={20} /> Materiais usados
              </h2>
              <Tip text="O custo por grama é a média de todas as compras: tudo o que você pagou ÷ tudo o que comprou." />
            </div>
            {lines.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="mw">Material</th>
                      <th className="right">Quantidade</th>
                      <th className="right">Custo unitário</th>
                      <th className="right">Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(l => {
                      const eq = packageEquivalent(l.quantity, l.packageName, l.packageSize);
                      return (
                        <tr key={l.id}>
                          <td><span className="name">{l.material || '—'}</span></td>
                          <td className="right num">
                            {formatQuantity(l.quantity, l.unit)}
                            {eq && <div className="sub">≈ {eq}</div>}
                          </td>
                          <td className="right num">{formatUnitCost(l.unitCost)} / {unitShort(l.unit)}</td>
                          <td className="right num"><b>{formatCurrency(l.cost)}</b></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Total de materiais</td>
                      <td className="right num">{formatCurrency(sim.materialCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div style={{ padding: 24 }}>
                <EmptyState compact icon={<EmptyBoxIllustration size={64} />} title="Nenhum material neste produto" description="Adicione os materiais na edição para ver o custo." action={{ label: 'Editar produto', onClick: () => navigate(`/products/${product.id}/edit`) }} />
              </div>
            )}
          </div>

          <div className="card sand flat pad-sm formula">
            <b>
              <Info size={16} /> Margem é quanto sobra de cada R$ 100 vendidos.
            </b>{' '}
            <span>
              Margem = lucro ÷ <u>preço de venda</u>. O preço sugerido é <b>custo ÷ (1 − margem)</b>: com meta de <b className="num">{goal}%</b>, custo de <b className="num">{formatCurrency(sim.totalCost)}</b> ÷ <b className="num">{fmtNum(1 - goal / 100, 2)}</b> = <b className="num">{formatCurrency(suggested)}</b>.
            </span>
          </div>
        </div>

        <div className="stack">
          <ProductArt product={product} size="wide" placeholderNote />

          <div className="card">
            <div className="card-head">
              <h2>
                <Calculator size={20} /> Como o custo é montado
              </h2>
            </div>
            <div className="compbar" role="img" aria-label="Composição do custo">
              {parts.map(x => (
                <i key={x.name} style={{ width: `${sim.totalCost ? (x.value / sim.totalCost) * 100 : 0}%`, background: x.color }} title={x.name} />
              ))}
            </div>
            <div className="stack-sm mt-16">
              {parts.map(x => (
                <KV
                  key={x.name}
                  k={
                    <>
                      <i className="sw" style={{ background: x.color }} />
                      {x.name}
                      {x.name === 'Mão de obra' && <span className="faint small"> {fmtNum(hours)} h × {formatCurrency(rate)}</span>}
                    </>
                  }
                  v={
                    <>
                      {formatCurrency(x.value)} <span className="faint small">{sim.totalCost ? Math.round((x.value / sim.totalCost) * 100) : 0}%</span>
                    </>
                  }
                />
              ))}
              <KV total k={<b>Custo total de produção</b>} v={<b>{formatCurrency(sim.totalCost)}</b>} />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>
                <Sliders size={20} /> Simule outros valores
              </h2>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setPrice(product.usualPrice);
                  setHours(product.actualTime || product.estimatedTime || 0);
                  setRate(settings.hourlyRate);
                }}
              >
                Voltar aos valores do produto
              </button>
            </div>
            <div className="stack">
              <div className="field">
                <label htmlFor="sim-price">
                  Preço de venda <output className="prim num">{formatCurrency(price)}</output>
                </label>
                <input id="sim-price" type="range" min={Math.floor(sim.totalCost * 0.6)} max={Math.ceil(sim.totalCost * 2.4)} step={0.5} value={price} onChange={e => setPrice(+e.target.value)} style={{ ['--p' as string]: `${((price - Math.floor(sim.totalCost * 0.6)) / (Math.ceil(sim.totalCost * 2.4) - Math.floor(sim.totalCost * 0.6))) * 100}%` }} />
                <span className="help">Arraste para ver o efeito no lucro e na margem.</span>
              </div>
              <div className="field">
                <label htmlFor="sim-hours">
                  Horas de trabalho <output className="prim num">{fmtNum(hours)} h</output>
                </label>
                <input id="sim-hours" type="range" min={0.5} max={14} step={0.5} value={hours} onChange={e => setHours(+e.target.value)} style={{ ['--p' as string]: `${((hours - 0.5) / 13.5) * 100}%` }} />
              </div>
              <div className="field">
                <label htmlFor="sim-rate">
                  Valor da sua hora <output className="prim num">{formatCurrency(rate)}</output>
                </label>
                <input id="sim-rate" type="range" min={5} max={60} step={1} value={rate} onChange={e => setRate(+e.target.value)} style={{ ['--p' as string]: `${((rate - 5) / 55) * 100}%` }} />
              </div>
            </div>
            <div className="mt-16">
              <span className="small muted" style={{ display: 'block', marginBottom: 8 }}>Experimentar um preço:</span>
              <div className="chips">
                {chips.map(([label, v]) => (
                  <button key={label} type="button" className="chip" onClick={() => setPrice(Math.round(v * 100) / 100)}>
                    {label} · <b className="num">{formatCurrency(v)}</b>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {product.observations && (
            <div className="card sand flat pad-sm">
              <span className="eyebrow">Observações de produção</span>
              <p className="mt-8">{product.observations}</p>
            </div>
          )}
          {product.isExample && <Badge variant="default">Produto de exemplo</Badge>}
        </div>
      </div>
    </ScreenLayout>
  );
};
