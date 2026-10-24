import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Calculator, Camera, Check, CheckCircle, Info, Pause, Play, Plus, Square, X } from 'lucide-react';
import { productService, purchaseService, settingsService } from '../data/services';
import type { Product, ProductMaterial, Purchase, Settings } from '../types';
import { generateId } from '../types';
import { calculateProductCost, calculateSuggestedPrice, formatCurrency, formatDate } from '../calculations';
import { groupMaterials, formatUnitCost, packageEquivalent, unitShort, materialKey } from '../calculations/materials';
import { purchaseName } from '../calculations/materialName';
import { marginState } from '../calculations/pricing';
import { Input, Select, TextArea, Checkbox } from '../components/Input';
import { Button } from '../components/Button';
import { Alert, Bar } from '../components/ui';
import { ProductArt } from '../components/ProductArt';
import { ScreenLayout } from '../components/ScreenLayout';
import { SkeletonGrid } from '../components/Skeleton';
import { notify } from '../utils/notify';
import { useLeaveWarning } from '../utils/leaveWarning';
import { resizeImageFile } from '../utils/image';

const NEW_MATERIAL = '__new__';

const emptyProduct = (): Partial<Product> => ({
  name: '',
  category: '',
  description: '',
  size: '',
  recipeLink: '',
  needleSize: '',
  estimatedTime: 0,
  actualTime: 0,
  suggestedPrice: 0,
  usualPrice: 0,
  otherCosts: 0,
  observations: '',
  active: true,
  materials: []
});

const MARGIN_SCALE = 50;

const Section: React.FC<{ n: number; title: string; hint?: string; children: React.ReactNode }> = ({ n, title, hint, children }) => (
  <section className="card form-sec">
    <div className="sec-head">
      <span className="step-n sm">{n}</span>
      <div>
        <h2>{title}</h2>
        {hint && <p className="small muted">{hint}</p>}
      </div>
    </div>
    {children}
  </section>
);

/**
 * Cadastro e edição de produto em página (antes era um modal longo).
 * Mantém os mesmos campos e regras; o resumo de precificação ao lado se atualiza a cada valor.
 */
export const ProductEditorScreen: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState<Partial<Product> | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [missing, setMissing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  useLeaveWarning(touched && !saving);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // cronômetro (igual ao de antes: ao parar, soma ao tempo real)
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([id ? productService.getById(id) : Promise.resolve(undefined), purchaseService.getAll(), settingsService.initializeDefault()]).then(([p, purch, sett]) => {
      if (!alive) return;
      setPurchases(purch);
      setSettings(sett);
      if (id && !p) setMissing(true);
      else setForm(p ? { ...p, materials: p.materials.map(m => ({ ...m })) } : emptyProduct());
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSeconds(s => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  const groups = useMemo(() => groupMaterials(purchases), [purchases]);

  const asProduct = useMemo(() => (form ? ({ id: id ?? 'novo', ...form } as Product) : null), [form, id]);
  const cost = useMemo(() => (asProduct && settings ? calculateProductCost(asProduct, settings, purchases) : null), [asProduct, settings, purchases]);

  if (missing) {
    return (
      <ScreenLayout title="Produto não encontrado" subtitle="Ele pode ter sido excluído.">
        <Link className="btn btn-primary" to="/products">Voltar aos produtos</Link>
      </ScreenLayout>
    );
  }
  if (!form || !settings || !cost || !asProduct) {
    return (
      <ScreenLayout title={isNew ? 'Novo produto' : 'Editar produto'}>
        <SkeletonGrid count={2} columns={2} />
      </ScreenLayout>
    );
  }

  const set = (patch: Partial<Product>) => {
    setForm(f => ({ ...f, ...patch }));
    setTouched(true);
  };
  const materials = form.materials ?? [];
  const goal = settings.desiredProfitMargin;
  const state = marginState(cost, goal);
  const suggestedLive = calculateSuggestedPrice(cost.totalCost, goal);
  const hasCost = cost.totalCost > 0;
  const price = form.usualPrice || 0;

  // ---------- materiais ----------
  const priceOf = (pm: ProductMaterial): number => {
    if (pm.purchaseId) return purchases.find(p => p.id === pm.purchaseId)?.unitCost ?? 0;
    return groups.find(g => g.key === materialKey(pm.material))?.avgCost ?? 0;
  };
  const withCost = (pm: ProductMaterial): ProductMaterial => {
    const unitCost = priceOf(pm);
    return { ...pm, unitCost, totalCost: pm.quantityUsed * unitCost };
  };
  const addMaterial = () =>
    set({ materials: [...materials, { id: generateId(), materialId: '', material: '', type: 'fio', unit: 'gramas', quantityUsed: 0, unitCost: 0, totalCost: 0 }] });
  const updateMaterial = (i: number, patch: Partial<ProductMaterial>) =>
    set({ materials: materials.map((m, idx) => (idx === i ? withCost({ ...m, ...patch }) : m)) });
  const removeMaterial = (i: number) => set({ materials: materials.filter((_, idx) => idx !== i) });
  const pickGroup = (i: number, key: string) => {
    if (key === NEW_MATERIAL) return updateMaterial(i, { material: '', purchaseId: undefined });
    const g = groups.find(x => x.key === key);
    if (g) updateMaterial(i, { material: g.name, type: g.type, unit: g.unit, purchaseId: undefined, materialId: g.purchases[0]?.id ?? '' });
  };

  // ---------- foto ----------
  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    try {
      set({ photo: await resizeImageFile(file) });
    } catch (err) {
      notify({ type: 'error', message: 'Não foi possível usar essa foto', detail: err instanceof Error ? err.message : undefined });
    } finally {
      setPhotoBusy(false);
    }
  };

  // ---------- cronômetro ----------
  const clock = `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const stopTimer = () => {
    setRunning(false);
    set({ actualTime: Math.round(((form.actualTime || 0) + seconds / 3600) * 100) / 100 });
    setSeconds(0);
  };

  // ---------- salvar ----------
  const nameError = submitted && !form.name?.trim() ? 'Dê um nome à peça.' : undefined;
  const categoryError = submitted && !form.category ? 'Escolha uma categoria.' : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!form.name?.trim() || !form.category) {
      notify({ type: 'error', message: 'Faltam dados obrigatórios', detail: 'Nome e categoria precisam estar preenchidos.' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, materials: materials.filter(m => m.material.trim()).map(withCost) } as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
      let savedId = id;
      if (id) {
        await productService.update(id, payload);
      } else {
        savedId = (await productService.create(payload)).id;
      }
      notify({ type: 'success', message: 'Produto salvo', detail: payload.name });
      navigate(`/products/${savedId}`);
    } catch (error) {
      notify({ type: 'error', message: 'Não foi possível salvar', detail: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const stateTone = state === 'ok' ? 'pos' : state === 'low' ? 'warn' : 'neg';

  const message = !hasCost
    ? { tone: 'neutral' as const, title: 'Adicione materiais e horas', text: 'O resumo aparece aqui conforme você preenche.', icon: <Info size={20} /> }
    : !price
      ? { tone: 'info' as const, title: 'Defina o preço de venda', text: `Sugestão para ${goal}% de margem: ${formatCurrency(suggestedLive)}.`, icon: <Info size={20} /> }
      : state === 'loss'
        ? { tone: 'error' as const, title: 'Venda com prejuízo', text: `Cada peça vendida perde ${formatCurrency(Math.abs(cost.profit))}. Cobre pelo menos ${formatCurrency(cost.totalCost)}.`, icon: <AlertTriangle size={20} /> }
        : state === 'low'
          ? { tone: 'warning' as const, title: 'Margem abaixo da meta', text: `Meta de ${goal}%. Preço sugerido: ${formatCurrency(suggestedLive)}.`, icon: <AlertTriangle size={20} /> }
          : { tone: 'success' as const, title: 'Margem saudável', text: `Acima da meta de ${goal}%.`, icon: <CheckCircle size={20} /> };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ScreenLayout
        title={isNew ? 'Novo produto' : `Editar ${asProduct.name || 'produto'}`}
        subtitle="Preencha o que souber. O resumo ao lado se atualiza a cada valor digitado."
        action={
          <>
            <Link className="btn btn-secondary" to={isNew ? '/products' : `/products/${id}`}>
              Cancelar
            </Link>
            <Button type="submit" icon={<Check size={18} />} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar produto'}
            </Button>
          </>
        }
      >
        <div className="grid g-main-side pf">
          <div className="stack">
            <Section n={1} title="A peça">
              <div className="form-grid">
                <div className="field full">
                  <label>Fotografia</label>
                  <div className="photo-drop">
                    <ProductArt product={asProduct} size="md" />
                    <div>
                      <b>Foto da peça</b>
                      <p className="small muted">Tire a foto ou escolha da galeria. Ela fica salva só neste aparelho (e entra no backup).</p>
                      <div className="row-wrap mt-8">
                        <Button type="button" variant="secondary" size="sm" icon={<Camera size={16} />} onClick={() => fileRef.current?.click()} disabled={photoBusy}>
                          {photoBusy ? 'Preparando…' : form.photo ? 'Trocar foto' : 'Escolher foto'}
                        </Button>
                        {form.photo && (
                          <Button type="button" variant="ghost" size="sm" icon={<X size={16} />} onClick={() => set({ photo: undefined })}>
                            Remover
                          </Button>
                        )}
                      </div>
                      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
                    </div>
                  </div>
                </div>
                <div className="full">
                  <Input label="Nome do produto *" value={form.name ?? ''} onChange={e => set({ name: e.target.value })} error={nameError} placeholder="Ex.: Amigurumi de capivara" required fullWidth />
                </div>
                <Select label="Categoria *" value={form.category ?? ''} onChange={e => set({ category: e.target.value })} error={categoryError} required fullWidth>
                  <option value="">Selecione…</option>
                  {settings.productCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
                <Input label="Tamanho/dimensões" optional value={form.size ?? ''} onChange={e => set({ size: e.target.value })} placeholder="Ex.: 22 cm" fullWidth />
                <Input label="Número da agulha" optional value={form.needleSize ?? ''} onChange={e => set({ needleSize: e.target.value })} placeholder="Ex.: 2,5 mm" fullWidth />
                <Input label="Link da receita" optional value={form.recipeLink ?? ''} onChange={e => set({ recipeLink: e.target.value })} fullWidth />
                <div className="full">
                  <TextArea label="Descrição" optional value={form.description ?? ''} onChange={e => set({ description: e.target.value })} placeholder="Como é a peça, para quem costuma ser, o que pode personalizar…" fullWidth />
                </div>
              </div>
            </Section>

            <Section n={2} title="Materiais usados" hint="Escolha do estoque e informe a quantidade. O custo vem das suas compras.">
              {materials.length === 0 && <p className="muted" style={{ padding: '8px 0' }}>Nenhum material adicionado ainda.</p>}
              {materials.map((m, i) => {
                const g = groups.find(x => x.key === materialKey(m.material));
                const custom = !g && (m.material !== '' || m.materialId === '');
                const eq = g ? packageEquivalent(m.quantityUsed, g.packageName, g.packageSize) : '';
                return (
                  <div className="mat-block" key={m.id}>
                    <div className="mat-row">
                      <div className="mr-name">
                        <Select aria-label="Material" value={g ? g.key : NEW_MATERIAL} onChange={e => pickGroup(i, e.target.value)} fullWidth>
                          <option value={NEW_MATERIAL}>{custom && m.material ? m.material : 'Escolha um material do estoque…'}</option>
                          {groups.map(x => (
                            <option key={x.key} value={x.key}>{x.name}</option>
                          ))}
                        </Select>
                        <span className="small muted">
                          {formatUnitCost(priceOf(m))} / {unitShort(m.unit)}
                        </span>
                        {eq && <span className="small prim">≈ {eq} de {g?.packageSize} {g ? unitShort(g.unit) : ''}</span>}
                      </div>
                      <Input aria-label={`Quantidade de ${m.material || 'material'}`} type="number" min={0} step="any" inputMode="decimal" value={m.quantityUsed || ''} onChange={e => updateMaterial(i, { quantityUsed: parseFloat(e.target.value) || 0 })} suffix={unitShort(m.unit)} fullWidth />
                      <b className="num mr-cost">{formatCurrency(m.quantityUsed * priceOf(m))}</b>
                      <Button type="button" variant="ghost" size="sm" className="btn-icon" aria-label={`Remover ${m.material || 'material'}`} onClick={() => removeMaterial(i)}>
                        <X size={18} />
                      </Button>
                    </div>
                    {custom && (
                      <div className="form-grid mat-custom">
                        <Input label="Nome do material" value={m.material} onChange={e => updateMaterial(i, { material: e.target.value })} help="Ainda não comprado? O custo fica zerado até você registrar a compra." fullWidth />
                        <Select label="Unidade" value={m.unit} onChange={e => updateMaterial(i, { unit: e.target.value })} fullWidth>
                          {settings.units.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </Select>
                      </div>
                    )}
                    <details className="adv">
                      <summary>Usar o custo de uma compra específica (opcional)</summary>
                      <Select label="Compra de origem" value={m.purchaseId || ''} onChange={e => updateMaterial(i, { purchaseId: e.target.value || undefined })} fullWidth>
                        <option value="">Usar custo médio das compras</option>
                        {purchases.map(p => (
                          <option key={p.id} value={p.id}>{purchaseName(p)} · {formatDate(p.date)} · {formatCurrency(p.totalPaid)}</option>
                        ))}
                      </Select>
                      <p className="help mt-8">Salvar a receita não mexe no estoque: o material sai quando um pedido deste produto fica pronto.</p>
                    </details>
                  </div>
                );
              })}
              <div className="mat-add">
                <Button type="button" variant="ghost" icon={<Plus size={18} />} onClick={addMaterial} fullWidth>
                  Adicionar material
                </Button>
              </div>
            </Section>

            <Section n={3} title="Tempo e custos extras">
              <div className="form-grid">
                <Input label="Tempo estimado" type="number" min={0} step="0.5" inputMode="decimal" value={form.estimatedTime ?? 0} onChange={e => set({ estimatedTime: parseFloat(e.target.value) || 0 })} suffix="horas" fullWidth />
                <Input label="Tempo real" type="number" min={0} step="0.5" inputMode="decimal" value={form.actualTime ?? 0} onChange={e => set({ actualTime: parseFloat(e.target.value) || 0 })} suffix="horas" help="Se preenchido, é o tempo usado no custo." fullWidth />
                <div className="full">
                  <Input label="Outros custos (embalagem, etiquetas, etc.)" type="number" min={0} step="0.01" inputMode="decimal" value={form.otherCosts ?? 0} onChange={e => set({ otherCosts: parseFloat(e.target.value) || 0 })} prefix="R$" help="Valor da sua hora de trabalho: veja em Configurações." fullWidth />
                </div>
              </div>
              <details className="adv mt-16">
                <summary>Cronômetro de produção</summary>
                <div className="timer-box">
                  <div className="timer-display" aria-live="off">{clock}</div>
                  <div className="row-wrap">
                    <Button type="button" size="sm" variant={running ? 'secondary' : 'primary'} onClick={() => setRunning(r => !r)} aria-label={running ? 'Pausar' : 'Iniciar'}>
                      {running ? <Pause size={16} /> : <Play size={16} />}
                    </Button>
                    <Button type="button" size="sm" variant="danger" onClick={stopTimer} disabled={seconds === 0} aria-label="Parar e somar ao tempo real">
                      <Square size={16} />
                    </Button>
                  </div>
                  <span className="small muted">Ao parar, o tempo é somado ao tempo real.</span>
                </div>
              </details>
            </Section>

            <Section n={4} title="Preço de venda">
              <div className="form-grid">
                <div className="row" style={{ alignItems: 'flex-end' }}>
                  <div className="grow">
                    <Input label="Preço sugerido" type="number" min={0} step="0.01" inputMode="decimal" value={form.suggestedPrice ?? 0} onChange={e => set({ suggestedPrice: parseFloat(e.target.value) || 0 })} prefix="R$" help={hasCost ? `Para ${goal}% de margem: ${formatCurrency(suggestedLive)}` : 'Calculado pela sua meta de margem.'} fullWidth />
                  </div>
                  <Button type="button" variant="secondary" disabled={!hasCost} onClick={() => set({ suggestedPrice: Math.round(suggestedLive * 100) / 100 })} style={{ marginBottom: 22 }}>
                    Calcular
                  </Button>
                </div>
                <Input label="Preço normalmente cobrado" type="number" min={0} step="0.01" inputMode="decimal" value={form.usualPrice ?? 0} onChange={e => set({ usualPrice: parseFloat(e.target.value) || 0 })} prefix="R$" fullWidth />
                <div className="full">
                  <TextArea label="Observações de produção" optional value={form.observations ?? ''} onChange={e => set({ observations: e.target.value })} placeholder="Dicas de montagem, cuidados, medidas…" fullWidth />
                </div>
                <div className="full">
                  <Checkbox checked={!!form.active} onChange={v => set({ active: v })} label="Produto ativo" description="Desmarque para arquivar sem apagar." />
                </div>
              </div>
            </Section>
          </div>

          <aside className="card summary" aria-live="polite" aria-label="Resumo de precificação">
            <div className="card-head">
              <h2>
                <Calculator size={20} /> Resumo de precificação
              </h2>
            </div>
            <div className="stack-sm">
              <div className="kv"><span className="k">Materiais</span><span className="v">{formatCurrency(cost.materialCost)}</span></div>
              <div className="kv"><span className="k">Mão de obra <span className="faint small">({formatCurrency(settings.hourlyRate)}/h)</span></span><span className="v">{formatCurrency(cost.laborCost)}</span></div>
              <div className="kv"><span className="k">Outros custos</span><span className="v">{formatCurrency(cost.otherCosts)}</span></div>
              <div className="kv total"><span className="k"><b>Custo total estimado</b></span><span className="v"><b>{formatCurrency(cost.totalCost)}</b></span></div>
            </div>
            <div className="sum-price">
              <div>
                <span className="small muted">Preço de venda</span>
                <div className="display-num" style={{ fontSize: 28 }}>{formatCurrency(price)}</div>
              </div>
              <div className="right">
                <span className="small muted">Lucro por peça</span>
                <div className={`display-num ${cost.profit < 0 ? 'neg' : 'pos'}`} style={{ fontSize: 28 }}>{formatCurrency(cost.profit)}</div>
              </div>
            </div>
            <div className="marginmeter mt-16">
              <div className="row between small">
                <span className="muted">Margem</span>
                <b className={`num ${hasCost && price ? stateTone : ''}`}>{cost.profitMargin.toFixed(1)}%</b>
              </div>
              <div className="mt-8">
                <Bar percent={(cost.profitMargin / MARGIN_SCALE) * 100} tone={state === 'ok' ? 'default' : state === 'low' ? 'warn' : 'err'} markAt={(goal / MARGIN_SCALE) * 100} label={`Margem ${cost.profitMargin.toFixed(1)}%`} />
              </div>
              <div className="small muted mt-8">Meta: {goal}% (a marca preta)</div>
            </div>
            <Alert tone={message.tone} icon={message.icon} title={message.title} className="mt-16">
              {message.text}
            </Alert>
            <p className="small muted mt-16">
              <Info size={14} style={{ verticalAlign: -2 }} /> Margem = quanto sobra de cada R$ 100 vendidos (lucro ÷ preço de venda).
            </p>
          </aside>
        </div>
      </ScreenLayout>

      <div className="mobile-summary" aria-hidden="true">
        <div><span className="small">Custo</span><b className="num">{formatCurrency(cost.totalCost)}</b></div>
        <div><span className="small">Lucro</span><b className={`num ${cost.profit < 0 ? 'neg' : 'pos'}`}>{formatCurrency(cost.profit)}</b></div>
        <div><span className="small">Margem</span><b className="num">{cost.profitMargin.toFixed(1)}%</b></div>
      </div>
    </form>
  );
};
