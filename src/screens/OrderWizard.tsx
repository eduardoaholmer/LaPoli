import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Calculator, Check, CheckCircle, Info, MessageCircle, Minus, Plus, Sparkles, UserPlus } from 'lucide-react';
import { orderService, productService, purchaseService, settingsService } from '../data/services';
import type { Order, Product, Purchase, Settings } from '../types';
import { calculateProductCost, formatCurrency, formatDate, calculateSuggestedPrice } from '../calculations';
import { estimateOrderProfit, missingMaterialsForOrder, suggestDeadlineDays } from '../calculations/orders';
import { baselineHistory } from '../data/orderActions';
import { Button } from '../components/Button';
import { Input, Select, TextArea, Checkbox } from '../components/Input';
import { Alert, KV } from '../components/ui';
import { ProductArt } from '../components/ProductArt';
import { ScreenLayout } from '../components/ScreenLayout';
import { SkeletonGrid } from '../components/Skeleton';
import { notify } from '../utils/notify';
import { useLeaveWarning } from '../utils/leaveWarning';
import { askDeadlineReminders } from '../utils/deadlineReminders';
import { DateField } from './OrderDialogs';

const STEPS = ['Cliente', 'Peça', 'Detalhes', 'Preço e prazo', 'Sinal', 'Revisão'];

interface ClientOption {
  name: string;
  phone: string;
  orders: number;
}

const addDays = (days: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

/** Novo pedido em 6 etapas, com os totais sempre à vista. Não exige que a peça exista no catálogo. */
export const OrderWizardScreen: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [step, setStep] = useState(1);
  const [newClient, setNewClient] = useState(false);
  const [client, setClient] = useState(params.get('client') ?? '');
  const [nName, setNName] = useState('');
  const [nPhone, setNPhone] = useState('');
  const [productId, setProductId] = useState(params.get('product') ?? '');
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [details, setDetails] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [received, setReceived] = useState(false);
  const [method, setMethod] = useState('Pix');
  const [saving, setSaving] = useState(false);
  useLeaveWarning(step > 1 && !saving);

  useEffect(() => {
    let alive = true;
    Promise.all([productService.getAll(), purchaseService.getAll(), orderService.getAll(), settingsService.initializeDefault()]).then(([prods, purch, ords, sett]) => {
      if (!alive) return;
      setProducts(prods);
      setPurchases(purch);
      setSettings(sett);
      const map = new Map<string, ClientOption>();
      [...ords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(o => {
        const cur = map.get(o.clientName);
        map.set(o.clientName, { name: o.clientName, phone: cur?.phone || o.clientPhone, orders: (cur?.orders ?? 0) + 1 });
      });
      setClients(Array.from(map.values()));
    });
    return () => {
      alive = false;
    };
  }, []);

  const product = custom ? undefined : products.find(p => p.id === productId);
  const effectivePct = pct ?? settings?.defaultSignalPercent ?? 50;
  const unitPrice = price ?? product?.usualPrice ?? 0;
  const total = unitPrice * quantity;
  const signal = Math.round(total * (effectivePct / 100) * 100) / 100;
  const balance = total - signal;

  const hours = product ? (product.actualTime || product.estimatedTime || 0) * quantity : 0;
  const suggestedDays = product ? suggestDeadlineDays(hours, settings?.hoursPerDay ?? 3) : 14;
  const effectiveDeadline = deadline ?? addDays(suggestedDays);

  const missing = useMemo(() => missingMaterialsForOrder(product, quantity, purchases), [product, quantity, purchases]);
  const profit = settings && product ? estimateOrderProfit({ agreedPrice: total, quantity }, product, settings, purchases) : null;
  const goal = settings?.desiredProfitMargin ?? 30;
  const cost = settings && product ? calculateProductCost(product, settings, purchases) : null;

  if (!settings) {
    return (
      <ScreenLayout title="Novo pedido">
        <SkeletonGrid count={2} columns={2} />
      </ScreenLayout>
    );
  }

  const chosen = newClient ? { name: nName.trim(), phone: nPhone.trim() } : clients.find(c => c.name === client) ?? { name: '', phone: '' };

  const valid =
    step === 1 ? (newClient ? nName.trim().length > 1 && nPhone.trim().length > 5 : !!client) :
    step === 2 ? (custom ? customName.trim().length > 2 : !!productId) :
    step === 4 ? unitPrice > 0 && !!effectiveDeadline :
    true;

  const pickProduct = (id: string) => {
    setProductId(id);
    setPrice(null);
    setDeadline(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const now = new Date();
      const base: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        date: now,
        clientName: chosen.name,
        clientPhone: chosen.phone,
        product: custom ? customName.trim() : (product?.name ?? ''),
        productId: custom ? '' : (product?.id ?? ''),
        customizations: [color && `Cores: ${color}`, details].filter(Boolean).join(' · '),
        size,
        quantity,
        deadline: effectiveDeadline,
        agreedPrice: total,
        signalAmount: signal,
        signalPaymentDate: received ? now : undefined,
        remainingBalance: balance,
        finalPaymentDate: undefined,
        paymentMethod: method,
        status: received ? 'Sinal recebido' : 'Orçamento enviado',
        paymentStatus: received ? 'sinal pago' : 'pendente',
        needsMaterialPurchase: missing.length > 0,
        materialsPurchased: false,
        observations: ''
      };
      const draft = { ...base, id: 'novo', createdAt: now, updatedAt: now } as Order;
      const history = baselineHistory(draft);
      const created = await orderService.create({ ...base, history });
      notify({ type: 'success', message: 'Pedido criado', detail: `${chosen.name} · ${formatCurrency(total)}` });
      void askDeadlineReminders();
      navigate(`/orders/${created.id}`);
    } catch (error) {
      notify({ type: 'error', message: 'Não foi possível salvar o pedido', detail: error instanceof Error ? error.message : undefined });
      setSaving(false);
    }
  };

  const goNext = () => {
    if (valid) setStep(s => Math.min(6, s + 1));
  };

  const summary = (
    <aside className="card summary sticky" aria-label="Resumo do pedido">
      <div className="card-head"><h3>Resumo do pedido</h3></div>
      <ProductArt product={product} artKey={product ? undefined : custom ? 'boneca' : 'novelo'} size="wide" />
      <div className="mt-16">
        <b>{custom ? customName || 'Peça ainda não descrita' : product?.name ?? 'Peça ainda não escolhida'}</b>
        <div className="small muted">{chosen.name ? `${chosen.name} · ` : ''}{quantity} un.</div>
      </div>
      <div className="stack-sm mt-16">
        <KV k="Valor total" v={formatCurrency(total)} />
        <KV k={`Sinal (${effectivePct}%)`} v={formatCurrency(signal)} />
        <KV k="Saldo na entrega" v={formatCurrency(balance)} />
        <KV k="Entrega prevista" v={formatDate(effectiveDeadline).slice(0, 5)} />
      </div>
      {profit && unitPrice > 0 && (
        <Alert tone={profit.profit < 0 ? 'error' : profit.margin < goal ? 'warning' : 'success'} icon={profit.profit < 0 ? <AlertTriangle size={18} /> : <CheckCircle size={18} />} title={`Lucro estimado ${formatCurrency(profit.profit)}`} className="mt-16">
          Margem de {profit.margin.toFixed(1)}% sobre o custo de {formatCurrency(profit.cost)}.
        </Alert>
      )}
    </aside>
  );

  return (
    <ScreenLayout
      title="Novo pedido"
      subtitle={`Etapa ${step} de 6 · ${STEPS[step - 1]}`}
      action={<Link className="btn btn-ghost" to="/orders">Cancelar</Link>}
    >
      <ol className="wiz-prog" aria-label="Progresso">
        {STEPS.map((t, i) => {
          const n = i + 1;
          return (
            <li key={t} className={n < step ? 'done' : n === step ? 'cur' : ''} aria-current={n === step ? 'step' : undefined}>
              <span className="dot">{n < step ? <Check size={14} /> : n}</span>
              <span className="lbl">{t}</span>
            </li>
          );
        })}
      </ol>

      <div className="grid g-main-side mt-16">
        <div>
          {step === 1 && (
            <div className="card">
              <h2 className="step-title">Para quem é o pedido?</h2>
              <div className="seg block mt-16">
                <button type="button" aria-pressed={!newClient} onClick={() => setNewClient(false)}>Cliente cadastrada</button>
                <button type="button" aria-pressed={newClient} onClick={() => setNewClient(true)}><UserPlus size={16} />Nova cliente</button>
              </div>
              {newClient ? (
                <div className="form-grid mt-16">
                  <Input label="Nome" value={nName} onChange={e => setNName(e.target.value)} placeholder="Nome e sobrenome" fullWidth />
                  <Input label="WhatsApp" type="tel" inputMode="tel" value={nPhone} onChange={e => setNPhone(e.target.value)} placeholder="(00) 90000-0000" fullWidth />
                </div>
              ) : clients.length ? (
                <div className="stack-sm mt-16" role="radiogroup" aria-label="Clientes">
                  {clients.slice(0, 10).map(c => {
                    const on = client === c.name;
                    return (
                      <button key={c.name} type="button" className={`pick ${on ? 'on' : ''}`} role="radio" aria-checked={on} onClick={() => setClient(c.name)}>
                        <span className="avatar">{c.name.trim().slice(0, 2).toUpperCase()}</span>
                        <span className="grow">
                          <b>{c.name}</b>
                          <span className="small muted" style={{ display: 'block' }}>{c.phone} · {c.orders} pedido{c.orders > 1 ? 's' : ''}</span>
                        </span>
                        {on && <CheckCircle size={22} className="prim" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="muted mt-16">Você ainda não tem clientes. Cadastre a primeira em “Nova cliente”.</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="card">
              <h2 className="step-title">Qual peça ela quer?</h2>
              <div className="seg block mt-16">
                <button type="button" aria-pressed={!custom} onClick={() => setCustom(false)}>Do catálogo</button>
                <button type="button" aria-pressed={custom} onClick={() => { setCustom(true); setProductId(''); }}><Sparkles size={16} />Peça personalizada</button>
              </div>
              {custom ? (
                <div className="mt-16">
                  <Input label="Descreva a peça" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Ex.: Boneca da Helena, vestido azul" help="Não precisa estar no catálogo. Você define o preço na etapa 4." fullWidth />
                </div>
              ) : (
                <div className="grid g-2 mt-16 keep2 pick-grid">
                  {products.filter(p => p.active).map(p => {
                    const on = productId === p.id;
                    return (
                      <button key={p.id} type="button" className={`pick-prod ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => pickProduct(p.id)}>
                        <ProductArt product={p} size="wide" />
                        <b>{p.name}</b>
                        <span className="small muted num">{formatCurrency(p.usualPrice)}</span>
                        {on && <span className="tick"><Check size={16} /></span>}
                      </button>
                    );
                  })}
                  {!products.some(p => p.active) && <p className="muted">Nenhum produto ativo. Use “Peça personalizada” ou <Link to="/products/new">cadastre um produto</Link>.</p>}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="card">
              <h2 className="step-title">Detalhes da encomenda</h2>
              <div className="form-grid mt-16">
                <div className="field">
                  <label>Quantidade</label>
                  <div className="stepper">
                    <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Diminuir"><Minus size={18} /></button>
                    <span className="v num" aria-live="polite">{quantity}</span>
                    <button type="button" onClick={() => setQuantity(q => q + 1)} aria-label="Aumentar"><Plus size={18} /></button>
                  </div>
                </div>
                <Input label="Cores" optional value={color} onChange={e => setColor(e.target.value)} placeholder="Ex.: caramelo com laço rosa" fullWidth />
                <Input label="Tamanho" optional value={size} onChange={e => setSize(e.target.value)} placeholder={product?.size || 'Ex.: 25 cm'} fullWidth />
                <div className="full">
                  <TextArea label="Personalização e observações" optional value={details} onChange={e => setDetails(e.target.value)} placeholder="Nome bordado, fita, referência de foto, restrições…" fullWidth />
                </div>
              </div>
              {product && (missing.length ? (
                <Alert tone="warning" icon={<AlertTriangle size={20} />} title="Faltam materiais para esta encomenda" className="mt-16">
                  {missing.map(m => `${m.material}: precisa de ${m.needed.toLocaleString('pt-BR')} ${m.unit}, tem ${Math.max(0, m.available).toLocaleString('pt-BR')}`).join('; ')}. Eles entram na lista de compras quando o sinal for recebido.
                </Alert>
              ) : (
                <Alert tone="success" icon={<CheckCircle size={20} />} className="mt-16">Há material em estoque para produzir esta encomenda.</Alert>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="card">
              <h2 className="step-title">Preço e prazo</h2>
              <div className="form-grid mt-16">
                <Input
                  label="Preço por unidade"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  prefix="R$"
                  value={price ?? product?.usualPrice ?? ''}
                  onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                  help={product && cost ? `Preço de tabela: ${formatCurrency(product.usualPrice)} · sugerido: ${formatCurrency(calculateSuggestedPrice(cost.totalCost, goal))}` : 'Peça personalizada: some materiais e horas × valor da hora.'}
                  fullWidth
                />
                <DateField label="Data prevista de entrega" value={effectiveDeadline} onChange={d => setDeadline(d ?? null)} />
              </div>
              <p className="help mt-8">
                {product ? `Sugestão: ${formatDate(addDays(suggestedDays))} (${hours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h de crochê ÷ ${settings.hoursPerDay ?? 3} h por dia + 5 dias de folga).` : 'Sem catálogo: sugestão padrão de 14 dias.'}
              </p>
              <div className="alert alert-neutral mt-16">
                <Calculator size={20} />
                <div className="a-body">
                  {profit ? (
                    <>Custo de produção: <b>{formatCurrency(profit.cost)}</b> · lucro estimado: <b className={profit.profit < 0 ? 'neg' : 'pos'}>{formatCurrency(profit.profit)}</b></>
                  ) : (
                    'Para peça personalizada o sistema não conhece o custo. Considere materiais + horas × valor da hora.'
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="card">
              <h2 className="step-title">Sinal e pagamento</h2>
              <div className="stack mt-16">
                <div className="field">
                  <label htmlFor="w-pct">Percentual do sinal <output className="prim num">{effectivePct}%</output></label>
                  <input id="w-pct" type="range" min={0} max={100} step={5} value={effectivePct} onChange={e => setPct(+e.target.value)} style={{ ['--p' as string]: `${effectivePct}%` }} />
                  <span className="help">Padrão das Configurações: {settings.defaultSignalPercent}%.</span>
                </div>
                <div className="grid g-3 keep2">
                  <div className="card sand flat pad-sm"><span className="small muted">Total</span><div className="display-num" style={{ fontSize: 24 }}>{formatCurrency(total)}</div></div>
                  <div className="card sand flat pad-sm"><span className="small muted">Sinal</span><div className="display-num prim" style={{ fontSize: 24 }}>{formatCurrency(signal)}</div></div>
                  <div className="card sand flat pad-sm"><span className="small muted">Saldo</span><div className="display-num" style={{ fontSize: 24 }}>{formatCurrency(balance)}</div></div>
                </div>
                <Select label="Forma de pagamento do sinal" value={method} onChange={e => setMethod(e.target.value)} fullWidth>
                  {settings.paymentMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </Select>
                <Checkbox checked={received} onChange={setReceived} label="O sinal já foi recebido" description="Marque para já colocar o pedido em “Sinal recebido” e registrar a data de hoje." />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="card">
              <h2 className="step-title">Revise e salve</h2>
              <div className="stack-sm mt-16">
                <KV k="Cliente" v={chosen.name} />
                <KV k="Peça" v={`${custom ? customName : product?.name} × ${quantity}`} />
                {(color || size || details) && <KV k="Detalhes" v={<span style={{ fontWeight: 500, maxWidth: '60%', display: 'inline-block' }}>{[color, size, details].filter(Boolean).join(' · ')}</span>} />}
                <KV k="Entrega prevista" v={formatDate(effectiveDeadline)} />
                <KV k="Valor total" v={formatCurrency(total)} />
                <KV k={`Sinal (${effectivePct}%)`} v={<>{formatCurrency(signal)} {received ? <span className="badge b-success">recebido</span> : <span className="badge b-warning">a receber</span>}</>} />
                <KV total k={<b>Saldo na entrega</b>} v={<b>{formatCurrency(balance)}</b>} />
              </div>
              <Alert tone="info" icon={<MessageCircle size={20} />} title="Depois de salvar" className="mt-16">
                Você poderá abrir uma mensagem de orçamento pronta para o WhatsApp. Nada é enviado automaticamente.
              </Alert>
              {missing.length > 0 && (
                <Alert tone="warning" icon={<Info size={20} />} className="mt-16">Pedido marcado como “precisa comprar materiais”.</Alert>
              )}
            </div>
          )}

          <div className="wiz-nav">
            {step > 1 ? <Button variant="secondary" icon={<ArrowLeft size={18} />} onClick={() => setStep(s => s - 1)}>Voltar</Button> : <span />}
            {step < 6 ? (
              <Button onClick={goNext} disabled={!valid}>Continuar<ArrowRight size={18} /></Button>
            ) : (
              <Button size="lg" icon={<Check size={18} />} onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar pedido'}</Button>
            )}
          </div>
        </div>
        {summary}
      </div>
    </ScreenLayout>
  );
};
