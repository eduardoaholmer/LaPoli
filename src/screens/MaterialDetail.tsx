import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Calendar, Calculator, Package, Pencil, Plus, RefreshCw, Trash2, TrendingDown, Wallet } from 'lucide-react';
import { productService, purchaseService, settingsService } from '../data/services';
import type { Product, Purchase, Settings } from '../types';
import { formatCurrency, formatDate } from '../calculations';
import { formatQuantity, formatUnitCost, groupMaterials, materialKey, packageEquivalent, pluralize, unitShort } from '../calculations/materials';
import { Badge, StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { Alert, Bar, KV, Tabs, Tip } from '../components/ui';
import { ConfirmDialog, Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { EmptyBoxIllustration, YarnIllustration } from '../components/Illustrations';
import { ProductArt } from '../components/ProductArt';
import { ScreenLayout } from '../components/ScreenLayout';
import { SkeletonGrid } from '../components/Skeleton';
import { notify } from '../utils/notify';
import { ColorSwatch } from '../components/ColorSwatch';
import { PurchaseForm, type PurchaseData } from './PurchaseForm';
import { StockMovementModal } from './StockMovementModal';
import { StockLevelBadge } from './Stock';
import { barTone, stockPercent } from './stockHelpers';

type Tab = 'compras' | 'perdas';

/** Histórico completo de um material: físico (quantidade) separado do financeiro (R$). */
export const MaterialDetailScreen: React.FC = () => {
  const { key = '' } = useParams();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('compras');
  const [editing, setEditing] = useState<Purchase | 'new' | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [toDelete, setToDelete] = useState<Purchase | null>(null);
  const [movement, setMovement] = useState<'perda' | 'ajuste' | null>(null);

  const loadData = async () => {
    const [purch, prods, sett] = await Promise.all([purchaseService.getAll(), productService.getAll(), settingsService.initializeDefault()]);
    setPurchases(purch);
    setProducts(prods);
    setSettings(sett);
    setLoaded(true);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const groups = useMemo(() => groupMaterials(purchases), [purchases]);
  const group = groups.find(g => g.key === materialKey(key));

  if (!loaded) {
    return (
      <ScreenLayout title="Material">
        <SkeletonGrid count={2} columns={2} />
      </ScreenLayout>
    );
  }

  if (!group) {
    return (
      <EmptyState
        icon={<EmptyBoxIllustration size={112} />}
        title="Material não encontrado"
        description="Ele pode ter sido excluído. Volte ao estoque para escolher outro."
        action={{ label: 'Voltar ao estoque', onClick: () => navigate('/stock') }}
      />
    );
  }

  const usedBy = products.filter(p => p.materials.some(m => materialKey(m.material) === group.key));
  const movements = group.purchases.flatMap(p => (p.movements || []).map(m => ({ ...m, purchase: p }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const eq = packageEquivalent(group.remaining, group.packageName, group.packageSize);
  const lost = movements.filter(m => m.type === 'perda').reduce((s, m) => s + m.quantity, 0);
  const adjusted = movements.filter(m => m.type === 'ajuste').reduce((s, m) => s + m.quantity, 0);
  const used = Math.max(0, group.bought - group.remaining - lost - adjusted);
  const lastTrend = group.purchases.length > 0 ? group.lastCost - group.avgCost : 0;

  const savePurchase = async (data: PurchaseData) => {
    if (editing && editing !== 'new') await purchaseService.update(editing.id, data);
    else await purchaseService.create(data);
    setEditing(null);
    await loadData();
    notify({ type: 'success', message: editing === 'new' || !editing ? 'Compra registrada' : 'Compra atualizada', detail: data.material });
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const lot = toDelete;
    setToDelete(null);
    try {
      await purchaseService.delete(lot.id);
      await loadData();
      notify({ type: 'success', message: 'Compra excluída', onUndo: async () => { await purchaseService.create(lot); await loadData(); notify({ type: 'success', message: 'Compra restaurada' }); } });
    } catch (error) {
      notify({ type: 'error', message: 'Não foi possível excluir', detail: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <ScreenLayout
      title={group.name}
      subtitle={`${group.type.charAt(0).toUpperCase()}${group.type.slice(1)} · medido em ${group.unit}${group.packageName ? ` · comprado em ${pluralize(group.packageName, 2)}` : ''}`}
      action={
        <>
          <Button variant="secondary" icon={<TrendingDown size={18} />} onClick={() => setMovement('perda')}>Perda</Button>
          <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={() => setMovement('ajuste')}>Ajustar</Button>
          <Button icon={<Plus size={18} />} onClick={() => setEditing('new')}>Registrar compra</Button>
        </>
      }
    >
      <div className="grid g-2">
        <section className="card">
          <div className="row between">
            <span className="eyebrow"><Package size={14} style={{ verticalAlign: -2 }} /> No armário (físico)</span>
            <span className="row">
              {group.isExample && <Badge>Exemplo</Badge>}
              <StockLevelBadge level={group.level} />
            </span>
          </div>
          <div className="display-num mt-8" style={{ fontSize: 44 }}>
            {group.remaining.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
            <span className="muted" style={{ fontSize: 20, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{unitShort(group.unit)}</span>
          </div>
          {eq && <div className="muted">≈ {eq} de {group.packageSize} {unitShort(group.unit)}</div>}
          <div className="color-block mt-16">
            <span className="eyebrow">{group.colors.length > 1 ? 'Cores deste material' : 'Cor'}</span>
            {group.colors.length === 0 ? (
              <p className="small muted" style={{ margin: '6px 0 0' }}>Nenhuma cor informada. Edite uma compra e escolha a cor.</p>
            ) : group.colors.length === 1 ? (
              <div className="row mt-8">
                <ColorSwatch name={group.colors[0].name} hex={group.colors[0].hex} size="xl" />
                <b style={{ fontSize: 17 }}>{group.colors[0].name || 'Cor escolhida na paleta'}</b>
              </div>
            ) : (
              <div className="color-list">
                {group.colors.map(c => (
                  <span className="item" key={`${c.hex ?? ''}${c.name ?? ''}`}>
                    <ColorSwatch name={c.name} hex={c.hex} size="lg" />
                    {c.name || 'Cor escolhida'}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-16">
            <Bar percent={stockPercent(group)} tone={barTone(group.level)} markAt={50} label={`Estoque de ${group.name}`} />
          </div>
          <div className="row between small muted mt-8">
            <span>0</span>
            <span>mínimo {formatQuantity(group.minStock, group.unit, group.packageName, group.packageSize)}</span>
            <span>{formatQuantity(group.minStock * 2, group.unit)}</span>
          </div>
          {group.level !== 'ok' && (
            <Alert
              tone={group.level === 'near' ? 'warning' : 'error'}
              icon={<AlertTriangle size={20} />}
              title={group.level === 'out' ? 'Este material acabou' : group.level === 'low' ? 'Abaixo do estoque mínimo' : 'Perto do estoque mínimo'}
              className="mt-16"
            >
              {group.minStock > 0 ? (
                <>
                  Faltam {formatQuantity(Math.max(0, group.minStock - group.remaining), group.unit, group.packageName, group.packageSize)} para o mínimo. <Link to="/stock?tab=compras">Ver lista de compras</Link>.
                </>
              ) : (
                'Quando repor, registre a compra e o estoque volta a aparecer aqui.'
              )}
            </Alert>
          )}
          {group.mixedUnits && (
            <Alert tone="warning" icon={<AlertTriangle size={20} />} title="Compras em unidades diferentes" className="mt-16">
              Este material tem compras em {[...new Set(group.purchases.map(p => unitShort(p.unit)))].join(' e ')}, e o total soma tudo junto. Edite a compra com a unidade errada para o número voltar a fazer sentido.
            </Alert>
          )}
        </section>

        <section className="card">
          <div className="row between">
            <span className="eyebrow"><Wallet size={14} style={{ verticalAlign: -2 }} /> Em dinheiro (financeiro)</span>
          </div>
          <div className="stack-sm mt-8">
            <KV k={<>Custo médio por {unitShort(group.unit)} <Tip text="Média ponderada de todas as compras: total pago ÷ total comprado. É o custo usado na precificação." /></>} v={formatUnitCost(group.avgCost)} />
            <KV k={`Última compra, por ${unitShort(group.unit)}`} v={<>{formatUnitCost(group.lastCost)} {Math.abs(lastTrend) > 0.0005 && <span className={`small ${lastTrend > 0 ? 'neg' : 'pos'}`}>{lastTrend > 0 ? '▲' : '▼'}</span>}</>} />
            <KV k="Valor parado em estoque" v={formatCurrency(group.stockValue)} />
            <KV k="Total já investido" v={formatCurrency(group.totalPaid)} />
          </div>
          <p className="small muted mt-16">
            Quantidade e valor são coisas diferentes: o estoque físico diminui quando você usa o material, e o dinheiro só vira custo na venda da peça.
          </p>
        </section>
      </div>

      <div className="grid g-main-side mt-16">
        <div className="stack">
          <div className="card pad-0">
            <div style={{ padding: '20px 24px 0' }}>
              <Tabs value={tab} onChange={setTab} tabs={[{ value: 'compras', label: 'Compras', count: group.purchases.length }, { value: 'perdas', label: 'Perdas e ajustes', count: movements.length }]} />
            </div>
            {tab === 'compras' ? (
              <>
                <div className="table-wrap lots-table">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th className="mw">Loja</th>
                        <th className="right">Comprado</th>
                        <th className="right">Total pago</th>
                        <th className="right">Custo / {unitShort(group.unit)}</th>
                        <th>Restante</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {group.purchases.map(p => (
                        <tr key={p.id}>
                          <td className="nowrap">
                            {formatDate(p.date)}
                            {(p.color || p.colorHex) && (
                              <div className="sub row"><ColorSwatch name={p.color} hex={p.colorHex} />{p.color || 'cor escolhida'}</div>
                            )}
                          </td>
                          <td>
                            {p.store || '—'}
                            <div className="sub">{p.paymentMethod || '—'}{p.installments && p.installments > 1 ? ` · ${p.installments}x` : ''}</div>
                          </td>
                          <td className="right num">
                            {p.packageSize && p.packageCount ? (
                              <>
                                <b>{p.packageCount} {pluralize(p.packageName ?? 'embalagem', p.packageCount)}</b>
                                <div className="sub">de {p.packageSize} {unitShort(p.unit)} = {formatQuantity(p.quantityPurchased, p.unit)}</div>
                            </>
                          ) : (
                            formatQuantity(p.quantityPurchased, p.unit)
                          )}
                        </td>
                        <td className="right num">{formatCurrency(p.totalPaid)}</td>
                        <td className="right num"><b>{formatUnitCost(p.unitCost)}</b></td>
                        <td>
                          <div className="num">{formatQuantity(p.quantityRemaining, p.unit)}</div>
                          <div className="row-wrap mt-8"><StatusBadge status={p.status} /><StatusBadge status={p.paymentStatus} /></div>
                        </td>
                        <td className="right nowrap">
                          <Button variant="ghost" size="sm" className="btn-icon" aria-label="Editar compra" onClick={() => setEditing(p)}><Pencil size={16} /></Button>
                          <Button variant="ghost" size="sm" className="btn-icon" aria-label="Excluir compra" onClick={() => setToDelete(p)}><Trash2 size={16} /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}>Total</td>
                      <td className="right num">{formatQuantity(group.bought, group.unit, group.packageName, group.packageSize)}</td>
                      <td className="right num">{formatCurrency(group.totalPaid)}</td>
                      <td className="right num">{formatUnitCost(group.avgCost)} <span className="small muted">(média)</span></td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              {/* celular e tablet em pé: uma compra por card, com Editar e Excluir à vista (a tabela exigia rolar para o lado) */}
              <div className="lot-cards">
                {group.purchases.map(p => (
                  <div className="lot-card" key={p.id}>
                    <div className="row between">
                      <span>
                        <b>{formatDate(p.date)}</b>
                        <span className="small muted"> · {p.store || 'loja não informada'}</span>
                      </span>
                      <b className="num">{formatCurrency(p.totalPaid)}</b>
                    </div>
                    <div className="small muted mt-8 row-wrap">
                      {(p.color || p.colorHex) && <ColorSwatch name={p.color} hex={p.colorHex} />}
                      <span>
                        {p.packageSize && p.packageCount
                          ? `${p.packageCount} ${pluralize(p.packageName ?? 'embalagem', p.packageCount)} de ${p.packageSize} ${unitShort(p.unit)}`
                          : formatQuantity(p.quantityPurchased, p.unit)}
                        {' · '}
                        {formatUnitCost(p.unitCost)}/{unitShort(p.unit)}
                        {p.paymentMethod ? ` · ${p.paymentMethod}` : ''}
                        {p.installments && p.installments > 1 ? ` ${p.installments}x` : ''}
                      </span>
                    </div>
                    <div className="row between mt-8">
                      <span>Resta <b className="num">{formatQuantity(p.quantityRemaining, p.unit)}</b></span>
                      <span className="row-wrap"><StatusBadge status={p.status} /><StatusBadge status={p.paymentStatus} /></span>
                    </div>
                    <div className="lot-actions">
                      <Button variant="secondary" size="sm" icon={<Pencil size={16} />} onClick={() => setEditing(p)}>Editar</Button>
                      <Button variant="danger" size="sm" icon={<Trash2 size={16} />} onClick={() => setToDelete(p)}>Excluir</Button>
                    </div>
                  </div>
                ))}
                <div className="lot-total small">
                  <b>Total</b>: {formatQuantity(group.bought, group.unit, group.packageName, group.packageSize)} · {formatCurrency(group.totalPaid)} · média {formatUnitCost(group.avgCost)}/{unitShort(group.unit)}
                </div>
              </div>
              </>
            ) : movements.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Data</th><th>Tipo</th><th>Motivo</th><th className="right">Quantidade</th></tr>
                  </thead>
                  <tbody>
                    {movements.map(m => (
                      <tr key={m.id}>
                        <td>{formatDate(m.date)}</td>
                        <td>{m.type === 'perda' ? <Badge variant="error">Perda</Badge> : <Badge variant="default">Ajuste</Badge>}</td>
                        <td>{m.note || '—'}</td>
                        <td className={`right num ${m.quantity < 0 ? 'pos' : ''}`}>{m.quantity < 0 ? '+' : '−'}{formatQuantity(Math.abs(m.quantity), m.purchase.unit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 24 }}>
                <EmptyState compact icon={<YarnIllustration size={64} />} title="Nenhuma perda ou ajuste" description="Registre aqui sobras que não dá para aproveitar ou correções de contagem." />
              </div>
            )}
          </div>

          <div className="card sand flat pad-sm">
            <b><Calculator size={16} style={{ verticalAlign: -3 }} /> Como o estoque é calculado</b>
            <p className="mt-8 muted">
              <b className="num">{formatQuantity(group.bought, group.unit)}</b> comprado − <b className="num">{formatQuantity(used, group.unit)}</b> usado nos produtos − <b className="num">{formatQuantity(lost, group.unit)}</b> de perdas {adjusted < 0 ? '+' : '−'} <b className="num">{formatQuantity(Math.abs(adjusted), group.unit)}</b> de ajustes = <b className="num">{formatQuantity(group.remaining, group.unit)}</b>. O “usado nos produtos” é descontado quando um produto salvo escolhe uma compra como origem do material; perdas e ajustes você registra à parte.
            </p>
          </div>
        </div>

        <div className="stack">
          <div className="card sand flat">
            <span className="eyebrow"><Calendar size={14} style={{ verticalAlign: -2 }} /> Quando comprar de novo</span>
            <p className="mt-8"><b>Ainda sem dados suficientes.</b></p>
            <p className="muted">Para estimar, o sistema precisa saber quando cada peça foi produzida. Até lá, confie no estoque mínimo e na lista de compras.</p>
          </div>

          <div className="card">
            <div className="card-head"><h3><Package size={18} /> Usado nestes produtos</h3></div>
            {usedBy.length ? (
              <div className="rows">
                {usedBy.map(p => {
                  const pm = p.materials.find(m => materialKey(m.material) === group.key);
                  return (
                    <Link key={p.id} className="li click" to={`/products/${p.id}`} style={{ padding: '10px 12px' }}>
                      <ProductArt product={p} size="sm" />
                      <div className="grow">
                        <div className="t" style={{ fontWeight: 500 }}>{p.name}</div>
                        <div className="s">{formatQuantity(pm?.quantityUsed ?? 0, group.unit, group.packageName, group.packageSize)} por peça · {formatCurrency((pm?.quantityUsed ?? 0) * group.avgCost)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="muted small">Nenhum produto usa este material ainda.</p>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Registrar compra de material' : 'Editar compra'} size="lg" confirmClose={formDirty}>
        {editing !== null && (
          <PurchaseForm
            key={editing === 'new' ? 'new' : editing.id}
            purchase={editing === 'new' ? null : editing}
            settings={settings}
            materials={groups}
            defaultMaterial={group.name}
            onSave={savePurchase}
            onCancel={() => setEditing(null)}
            onDirtyChange={setFormDirty}
          />
        )}
      </Modal>
      <ConfirmDialog isOpen={!!toDelete} title="Excluir esta compra?" confirmLabel="Excluir compra" danger onClose={() => setToDelete(null)} onConfirm={confirmDelete}>
        A compra de {toDelete ? formatDate(toDelete.date) : ''} sai do histórico e o estoque diminui. Se algum produto usa esta compra, a exclusão é bloqueada. Você poderá desfazer logo depois.
      </ConfirmDialog>
      <StockMovementModal isOpen={movement !== null} kind={movement ?? 'perda'} groups={groups} initialKey={group.key} onClose={() => setMovement(null)} onDone={loadData} />
    </ScreenLayout>
  );
};
