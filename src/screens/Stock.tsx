import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDownLeft, Copy, MoreHorizontal, Package, PackageX, Plus, RefreshCw, Search, ShoppingBag, ShoppingCart, TrendingDown, Check } from 'lucide-react';
import { orderService, productService, purchaseService, settingsService } from '../data/services';
import type { Order, Product, Purchase, Settings } from '../types';
import { formatCurrency, formatDate } from '../calculations';
import { buildShoppingList, reservedByOrders, formatQuantity, formatUnitCost, groupMaterials, materialKey, needsRestock, packageEquivalent, pluralize, unitShort, type MaterialGroup } from '../calculations/materials';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Alert, Bar, Chips, DropdownMenu, Tabs } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { HookIllustration, EmptyBoxIllustration } from '../components/Illustrations';
import { Modal } from '../components/Modal';
import { ScreenLayout } from '../components/ScreenLayout';
import { SkeletonGrid } from '../components/Skeleton';
import { notify } from '../utils/notify';
import { useRowLink } from '../utils/rowLink';
import { storage } from '../utils/storage';
import { PurchaseForm, type PurchaseData } from './PurchaseForm';
import { StockMovementModal } from './StockMovementModal';
import { barTone, stockPercent } from './stockHelpers';
import { ColorSwatch } from '../components/ColorSwatch';

type Tab = 'materiais' | 'compras' | 'historico';
type StockSort = 'atencao' | 'nome' | 'quantidade' | 'tipo' | 'valor';

export const StockLevelBadge: React.FC<{ level: MaterialGroup['level'] }> = ({ level }) =>
  level === 'out' ? (
    <Badge variant="error" icon={<PackageX size={13} />}>Acabou</Badge>
  ) : level === 'low' ? (
    <Badge variant="error" icon={<AlertTriangle size={13} />}>Estoque baixo</Badge>
  ) : level === 'near' ? (
    <Badge variant="warning" icon={<AlertTriangle size={13} />}>Quase no mínimo</Badge>
  ) : (
    <Badge variant="success" icon={<Check size={13} />}>Em dia</Badge>
  );

const MixedUnitsBadge: React.FC = () => <Badge variant="warning" icon={<AlertTriangle size={13} />}>Unidades misturadas</Badge>;

export const StockScreen: React.FC = () => {
  const rowLink = useRowLink();
  const [params, setParams] = useSearchParams();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'materiais');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState<StockSort>(() => (storage.get('lapoli_stock_sort') as StockSort) || 'atencao');
  const [historyCount, setHistoryCount] = useState(30);
  const changeSort = (value: StockSort) => {
    setSort(value);
    storage.set('lapoli_stock_sort', value);
  };
  const [showForm, setShowForm] = useState(params.get('new') === '1');
  const [movement, setMovement] = useState<'perda' | 'ajuste' | null>(null);
  const [movementKey, setMovementKey] = useState<string | undefined>(); // material já escolhido (atalho do card)
  const [buyKey, setBuyKey] = useState<string | undefined>(); // "Comprei": compra já preenchida com este material
  const [formDirty, setFormDirty] = useState(false);

  const loadData = async () => {
    const [purch, prods, ords, sett] = await Promise.all([purchaseService.getAll(), productService.getAll(), orderService.getAll(), settingsService.initializeDefault()]);
    setPurchases(purch);
    setProducts(prods);
    setOrders(ords);
    setSettings(sett);
    setLoaded(true);
  };

  useEffect(() => {
    void loadData();
  }, []);

  // limpa ?new=1 depois de abrir o formulário, para o botão "voltar" não reabrir
  useEffect(() => {
    if (params.get('new') === '1') {
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const groups = useMemo(() => groupMaterials(purchases), [purchases]);
  const shopping = useMemo(() => buildShoppingList(groups, products, orders), [groups, products, orders]);
  const reserved = useMemo(() => reservedByOrders(products, orders), [products, orders]);
  const openCount = (key: string) => { setMovementKey(key); setMovement('ajuste'); };
  const openBuy = (key: string) => { setBuyKey(key); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setBuyKey(undefined); };
  const shoppingTotal = shopping.reduce((s, i) => s + i.estimatedCost, 0);
  const totalValue = groups.reduce((s, g) => s + g.stockValue, 0);
  const lowGroups = groups.filter(needsRestock);

  const handleSave = async (data: PurchaseData) => {
    await purchaseService.create(data);
    closeForm();
    await loadData();
    const key = data.material.trim();
    notify({ type: 'success', message: 'Compra registrada', detail: `${key}: ${formatQuantity(data.quantityPurchased, data.unit, data.packageName, data.packageSize)} somados ao estoque.` });
  };

  const copyShopping = async () => {
    const text = shopping
      .map(i => `• ${i.group.name}: ${i.packages !== null ? `${i.packages} ${pluralize(i.group.packageName ?? 'embalagem', i.packages)} de ${i.group.packageSize} ${unitShort(i.group.unit)}` : formatQuantity(i.buyQuantity, i.group.unit)}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      notify({ type: 'info', message: 'Lista de compras copiada' });
    } catch {
      notify({ type: 'error', message: 'Não foi possível copiar' });
    }
  };

  const head = (
    <ScreenLayout
      title="Materiais e estoque"
      subtitle="O que você tem no armário, quanto custou e o que precisa comprar."
      action={
        <>
          <DropdownMenu
            label="Perda ou ajuste"
            triggerClassName="btn btn-secondary"
            trigger={<><MoreHorizontal size={20} />Perda ou ajuste</>}
            items={[
              { label: 'Registrar perda', icon: <TrendingDown size={18} />, onSelect: () => setMovement('perda') },
              { label: 'Ajustar contagem', icon: <RefreshCw size={18} />, onSelect: () => setMovement('ajuste') }
            ]}
          />
          <Button icon={<Plus size={18} />} onClick={() => setShowForm(true)} className="hide-sm">
            Registrar compra
          </Button>
        </>
      }
    >
      {null}
    </ScreenLayout>
  );

  const formModal = (
    <Modal isOpen={showForm} onClose={closeForm} title="Registrar compra de material" size="lg" confirmClose={formDirty}>
      <PurchaseForm key={buyKey ?? 'nova'} purchase={null} settings={settings} materials={groups} defaultMaterial={groups.find(g => g.key === buyKey)?.name} onSave={handleSave} onCancel={closeForm} onDirtyChange={setFormDirty} />
    </Modal>
  );

  if (!loaded || !settings) {
    return (
      <>
        {head}
        <SkeletonGrid count={3} />
      </>
    );
  }

  if (!purchases.length) {
    return (
      <>
        {head}
        <EmptyState
          icon={<HookIllustration size={112} />}
          title="Nenhum material cadastrado"
          description="Registre sua primeira compra de fio ou enchimento. Assim o sistema sabe quanto custa cada grama e avisa quando estiver acabando."
          action={{ label: 'Registrar compra', onClick: () => setShowForm(true) }}
        />
        {formModal}
      </>
    );
  }

  const types = Array.from(new Set(groups.map(g => g.type)));
  const filtered = groups.filter(g => {
    const q = search.trim().toLowerCase();
    if (q && !`${g.name} ${g.purchases.map(p => `${p.brand ?? ''} ${p.color ?? ''} ${p.store ?? ''}`).join(' ')}`.toLowerCase().includes(q)) return false;
    if (filter === 'low') return needsRestock(g);
    if (filter !== 'all') return g.type === filter;
    return true;
  });
  // groupMaterials já vem em "precisa de atenção primeiro"; as outras ordens são escolha dela
  const byName = (a: MaterialGroup, b: MaterialGroup) => a.name.localeCompare(b.name, 'pt-BR');
  if (sort === 'nome') filtered.sort(byName);
  if (sort === 'quantidade') filtered.sort((a, b) => a.remaining - b.remaining || byName(a, b));
  if (sort === 'tipo') filtered.sort((a, b) => a.type.localeCompare(b.type, 'pt-BR') || byName(a, b));
  if (sort === 'valor') filtered.sort((a, b) => b.stockValue - a.stockValue || byName(a, b));

  // histórico: compras + perdas/ajustes
  const history = [
    ...purchases.map(p => ({ date: new Date(p.date), kind: 'compra' as const, name: p.material, key: p.material, qty: p.quantityPurchased, unit: p.unit, pkg: p, note: `${p.store || '—'} · ${formatCurrency(p.totalPaid)}` })),
    ...purchases.flatMap(p => (p.movements || []).map(m => ({ date: new Date(m.date), kind: m.type, name: p.material, key: p.material, qty: -m.quantity, unit: p.unit, pkg: p, note: m.note || '' })))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <>
      {head}
      {/* celular e tablet: os números viram uma faixa curta para a lista aparecer na primeira tela */}
      <div className="stock-strip" role="group" aria-label="Resumo do estoque">
        <button type="button" className={lowGroups.length ? 'alert-tone' : ''} onClick={() => { setTab('materiais'); setFilter('low'); }}>
          <span className="v">{lowGroups.length}</span>
          <span className="l">para repor</span>
        </button>
        <button type="button" onClick={() => setTab('compras')}>
          <span className="v">{formatCurrency(shoppingTotal)}</span>
          <span className="l">compra sugerida</span>
        </button>
        <div>
          <span className="v">{formatCurrency(totalValue)}</span>
          <span className="l">no armário</span>
        </div>
      </div>
      <div className="grid g-3 stock-metrics">
        <div className="card metric">
          <div className="m-top"><span className="m-label">Valor parado em estoque</span><span className="lens lens-caixa"><Package size={13} />No armário</span></div>
          <div className="m-val">{formatCurrency(totalValue)}</div>
          <div className="m-note">Já foi pago; vira custo quando o material é usado numa peça vendida.</div>
        </div>
        <div className={`card metric ${lowGroups.length ? 'metric-alert' : ''}`}>
          <div className="m-top"><span className="m-label">Materiais para repor</span><AlertTriangle size={20} className="prim" /></div>
          <div className="m-val">{lowGroups.length} <span className="small muted" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>de {groups.length}</span></div>
          <div className="m-note">{lowGroups.length
              ? `${lowGroups.slice(0, 3).map(g => g.name).join(', ')}${lowGroups.length > 3 ? ` e mais ${lowGroups.length - 3}` : ''}.`
              : 'Tudo acima do mínimo.'}</div>
        </div>
        <div className="card metric">
          <div className="m-top"><span className="m-label">Compra sugerida</span><ShoppingCart size={20} className="prim" /></div>
          <div className="m-val">{formatCurrency(shoppingTotal)}</div>
          <div className="m-note">{shopping.length} ite{shopping.length === 1 ? 'm' : 'ns'} na lista de compras.</div>
        </div>
      </div>

      <div className="mt-24">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'materiais', label: 'Materiais', count: groups.length },
            { value: 'compras', label: 'Lista de compras', count: shopping.length },
            { value: 'historico', label: 'Histórico' }
          ]}
        />
      </div>

      {tab === 'materiais' && (
        <>
          <div className="toolbar">
            <div className="search">
              <Search size={18} />
              <input className="input" type="search" placeholder="Buscar material, marca, cor ou loja" value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar material" />
            </div>
            <select className="select tb-select" value={sort} onChange={e => changeSort(e.target.value as StockSort)} aria-label="Ordenar">
              <option value="atencao">O que precisa de atenção</option>
              <option value="nome">Nome (A–Z)</option>
              <option value="quantidade">Menor quantidade</option>
              <option value="tipo">Tipo de material</option>
              <option value="valor">Mais valor parado</option>
            </select>
          </div>
          <p className="small muted mt-8">A barra vai até o dobro do estoque mínimo; o traço no meio é o mínimo.</p>
          <div className="mt-8">
            <Chips label="Filtrar" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Todos' }, { value: 'low', label: 'Para repor' }, ...types.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))]} />
          </div>
          {!filtered.length ? (
            <div className="mt-16">
              <EmptyState compact icon={<EmptyBoxIllustration size={64} />} title="Nada encontrado" description="Tente outro termo ou limpe o filtro." />
            </div>
          ) : (
            <>
              <div className="card pad-0 mt-16 stock-table">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="mw">Material</th>
                        <th>Disponível</th>
                        <th className="right">Mínimo</th>
                        <th className="right">Custo médio</th>
                        <th className="right">Valor em estoque</th>
                        <th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(g => {
                        const eq = packageEquivalent(g.remaining, g.packageName, g.packageSize);
                        return (
                          <tr key={g.key} className="click" {...rowLink(`/stock/${encodeURIComponent(g.key)}`, g.name)}>
                            <td>
                              <div className="row">
                                {(g.color || g.colorHex) && <ColorSwatch name={g.color} hex={g.colorHex} />}
                                <div>
                                  <div className="name">{g.name} {g.isExample && <Badge>Exemplo</Badge>} {g.mixedUnits && <MixedUnitsBadge />}</div>
                                  <div className="sub">{g.type} · {unitShort(g.unit)}{g.purchases.length > 1 ? ` · ${g.purchases.length} compras` : ''}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ minWidth: 190 }}>
                              <div className="num"><b>{formatQuantity(g.remaining, g.unit)}</b>{eq && <span className="small muted"> ≈ {eq}</span>}</div>
                              {g.minStock > 0 && <div className="mt-8"><Bar percent={stockPercent(g)} tone={barTone(g.level)} markAt={50} height={6} label={`Estoque de ${g.name}`} /></div>}
                            </td>
                            <td className="right num">{formatQuantity(g.minStock, g.unit, g.packageName, g.packageSize)}</td>
                            <td className="right num">{formatUnitCost(g.avgCost)} / {unitShort(g.unit)}</td>
                            <td className="right num">{formatCurrency(g.stockValue)}</td>
                            <td><StockLevelBadge level={g.level} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="stock-cards mt-16">
                {filtered.map(g => {
                  const eq = packageEquivalent(g.remaining, g.packageName, g.packageSize);
                  return (
                    <div key={g.key} className="card pad-sm mat-card">
                      <Link className="mat-card-link" to={`/stock/${encodeURIComponent(g.key)}`}>
                        <div className="row">
                          {(g.color || g.colorHex) && <ColorSwatch name={g.color} hex={g.colorHex} />}
                          <b>{g.name}</b>
                          {g.isExample && <Badge>Exemplo</Badge>}
                          {g.mixedUnits && <MixedUnitsBadge />}
                        </div>
                        <div className="row between mt-8">
                          <span className="display-num" style={{ fontSize: 24 }}>
                            {formatQuantity(g.remaining, g.unit)} {eq && <span className="small muted" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>≈ {eq}</span>}
                          </span>
                          <StockLevelBadge level={g.level} />
                        </div>
                        {g.minStock > 0 && <div className="mt-8"><Bar percent={stockPercent(g)} tone={barTone(g.level)} markAt={50} height={6} label={`Estoque de ${g.name}`} /></div>}
                        <div className="row between small muted mt-8">
                          <span>mín. {formatQuantity(g.minStock, g.unit)}</span>
                          <span>{formatCurrency(g.stockValue)} em estoque</span>
                        </div>
                        {(reserved.get(g.key)?.quantity ?? 0) > 0 && (
                          <div className="small mt-8">
                            <b>{formatQuantity(reserved.get(g.key)!.quantity, g.unit)}</b> reservado para {reserved.get(g.key)!.orderIds.length} {pluralize('pedido', reserved.get(g.key)!.orderIds.length)} · livre{' '}
                            <b className={g.remaining - reserved.get(g.key)!.quantity < 0 ? 'neg' : ''}>{formatQuantity(g.remaining - reserved.get(g.key)!.quantity, g.unit)}</b>
                          </div>
                        )}
                      </Link>
                      {/* atalhos sem abrir o material: contar o armário ou registrar a recompra */}
                      <div className="mat-actions">
                        <Button variant="secondary" size="sm" icon={<RefreshCw size={16} />} onClick={() => openCount(g.key)}>Contei</Button>
                        <Button variant="secondary" size="sm" icon={<Plus size={16} />} onClick={() => openBuy(g.key)}>Comprei</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'compras' &&
        (shopping.length === 0 ? (
          <EmptyState icon={<EmptyBoxIllustration size={112} />} title="Nada para comprar agora" description="Todos os materiais estão acima do mínimo e os pedidos confirmados têm material suficiente." />
        ) : (
          <>
            <Alert tone="info" title="Como a lista é montada">
              Pedidos com sinal recebido que ainda não entraram em produção, mais a reposição até o estoque mínimo. Quando você informa o tamanho do novelo, a compra é arredondada em novelos inteiros.
            </Alert>
            <div className="card pad-0 mt-16">
              <div className="rows">
                {shopping.map(i => (
                  <div className="li shop-li" key={i.group.key} style={{ padding: '18px 24px' }}>
                    {(i.group.color || i.group.colorHex) && <ColorSwatch name={i.group.color} hex={i.group.colorHex} size="lg" />}
                    <div className="grow">
                      <div className="t">{i.group.name}</div>
                      <div className="s">
                        {i.reason === 'orders'
                          ? `Pedidos confirmados precisam de ${formatQuantity(i.need, i.group.unit, i.group.packageName, i.group.packageSize)} e você tem ${formatQuantity(i.group.remaining, i.group.unit, i.group.packageName, i.group.packageSize)}`
                          : `Abaixo do mínimo de ${formatQuantity(i.group.minStock, i.group.unit, i.group.packageName, i.group.packageSize)}`}
                      </div>
                      {i.need > i.group.remaining && (
                        <div className="small mt-8">
                          <Badge variant="warning">Faltam {formatQuantity(i.need - i.group.remaining, i.group.unit, i.group.packageName, i.group.packageSize)} para os pedidos</Badge>
                        </div>
                      )}
                    </div>
                    <div className="right">
                      <div className="num">
                        <b>
                          {i.packages !== null ? `${i.packages} ${pluralize(i.group.packageName ?? 'embalagem', i.packages)} de ${i.group.packageSize} ${unitShort(i.group.unit)}` : formatQuantity(i.buyQuantity, i.group.unit)}
                        </b>
                      </div>
                      <div className="small muted">{formatQuantity(i.buyQuantity, i.group.unit)} · ≈ {formatCurrency(i.estimatedCost)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="row between" style={{ padding: '18px 24px', background: 'var(--color-surface-alt)' }}>
                <span className="muted">Total estimado (último preço pago)</span>
                <b className="num" style={{ fontSize: 18 }}>{formatCurrency(shoppingTotal)}</b>
              </div>
            </div>
            <div className="row-wrap mt-16">
              <Button variant="secondary" icon={<Copy size={18} />} onClick={copyShopping}>Copiar lista</Button>
              <Button icon={<ShoppingCart size={18} />} onClick={() => setShowForm(true)}>Registrar compra</Button>
            </div>
          </>
        ))}

      {tab === 'historico' && (
        <>
          <div className="card pad-0">
            <div className="rows">
              {history.slice(0, historyCount).map((h, i) => (
                <Link key={i} className="li click" to={`/stock/${encodeURIComponent(materialKey(h.key))}`} style={{ padding: '14px 24px', margin: 0, borderRadius: 0 }}>
                  <span className="small faint nowrap" style={{ width: 44 }}>{formatDate(h.date).slice(0, 5)}</span>
                  <div className="grow">
                    <div className="t" style={{ fontWeight: 500 }}>{h.name}</div>
                    <div className="s">{h.note}</div>
                  </div>
                  {h.kind === 'compra' ? <Badge variant="success" icon={<ArrowDownLeft size={13} />}>Compra</Badge> : h.kind === 'uso' ? <Badge variant="info" icon={<ShoppingBag size={13} />}>Pedido</Badge> : h.kind === 'perda' ? <Badge variant="error" icon={<TrendingDown size={13} />}>Perda</Badge> : <Badge variant="default" icon={<RefreshCw size={13} />}>Ajuste</Badge>}
                  <b className={`num nowrap ${h.qty > 0 ? 'pos' : ''}`} style={{ minWidth: 76, textAlign: 'right' }}>
                    {h.qty > 0 ? '+' : '−'}
                    {formatQuantity(Math.abs(h.qty), h.unit, h.pkg.packageName, h.pkg.packageSize)}
                  </b>
                </Link>
              ))}
            </div>
          </div>
          {history.length > historyCount ? (
            <div className="row between mt-8">
              <span className="small muted">Mostrando {historyCount} de {history.length} movimentações.</span>
              <Button variant="secondary" size="sm" onClick={() => setHistoryCount(n => n + 30)}>Ver mais</Button>
            </div>
          ) : (
            <p className="small muted mt-8">Todas as {history.length} movimentações.</p>
          )}
        </>
      )}

      <button type="button" className="fab only-sm" onClick={() => setShowForm(true)}>
        <Plus size={22} />
        Compra
      </button>
      {formModal}
      <StockMovementModal
        key={`${movement}-${movementKey ?? ''}`}
        isOpen={movement !== null}
        kind={movement ?? 'perda'}
        groups={groups}
        initialKey={movementKey}
        onClose={() => { setMovement(null); setMovementKey(undefined); }}
        onDone={loadData}
      />
    </>
  );
};
