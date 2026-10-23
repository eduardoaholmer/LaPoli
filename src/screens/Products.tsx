import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, Copy, Eye, LayoutGrid, List, MoreHorizontal, Pencil, Plus, Search, Trash2, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { productService, purchaseService, settingsService } from '../data/services';
import type { Product, Purchase, Settings } from '../types';
import { generateId } from '../types';
import { calculateProductCost, formatCurrency } from '../calculations';
import { marginState, type MarginState } from '../calculations/pricing';
import { Badge, StatusBadge } from '../components/Badge';
import { Chips, DropdownMenu, Segmented } from '../components/ui';
import { Alert } from '../components/ui';
import { ConfirmDialog } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { AmigurumiIllustration, EmptyBoxIllustration } from '../components/Illustrations';
import { ProductArt } from '../components/ProductArt';
import { ScreenLayout } from '../components/ScreenLayout';
import { SkeletonGrid } from '../components/Skeleton';
import { Card } from '../components/Card';
import { notify } from '../utils/notify';
import { storage } from '../utils/storage';

const VIEW_KEY = 'lapoli_products_view';

export const MarginBadge: React.FC<{ state: MarginState }> = ({ state }) =>
  state === 'loss' ? (
    <Badge variant="error" icon={<TrendingDown size={13} />}>Prejuízo</Badge>
  ) : state === 'low' ? (
    <Badge variant="warning" icon={<AlertTriangle size={13} />}>Abaixo da meta</Badge>
  ) : (
    <Badge variant="success" icon={<CheckCircle size={13} />}>Margem saudável</Badge>
  );

export const ProductsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [view, setView] = useState<'grid' | 'list'>(() => (storage.get(VIEW_KEY) === 'list' ? 'list' : 'grid'));
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [toArchive, setToArchive] = useState<Product | null>(null);

  const loadData = async () => {
    const [prods, purch, sett] = await Promise.all([productService.getAll(), purchaseService.getAll(), settingsService.initializeDefault()]);
    setProducts(prods);
    setPurchases(purch);
    setSettings(sett);
    setLoaded(true);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const changeView = (v: 'grid' | 'list') => {
    setView(v);
    storage.set(VIEW_KEY, v);
  };

  const rows = useMemo(
    () =>
      settings
        ? products.map(p => {
            const cost = calculateProductCost(p, settings, purchases);
            return { product: p, cost, state: marginState(cost, settings.desiredProfitMargin) };
          })
        : [],
    [products, purchases, settings]
  );

  const filtered = rows.filter(({ product: p }) => {
    if (status === 'active' && !p.active) return false;
    if (status === 'archived' && p.active) return false;
    if (category !== 'all' && p.category !== category) return false;
    const q = search.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  });

  const needAdjust = rows.filter(r => r.product.active && r.product.usualPrice > 0 && r.state !== 'ok').length;

  const handleDuplicate = async (product: Product) => {
    const copy: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
      ...product,
      name: `${product.name} (cópia)`,
      isExample: false,
      materials: product.materials.map(m => ({ ...m, id: generateId() }))
    };
    await productService.create(copy);
    await loadData();
    notify({ type: 'success', message: 'Produto duplicado', detail: copy.name });
  };

  const confirmArchive = async () => {
    if (!toArchive) return;
    await productService.update(toArchive.id, { active: false });
    notify({ type: 'info', message: 'Produto arquivado', detail: toArchive.name, onUndo: async () => { await productService.update(toArchive.id, { active: true }); await loadData(); } });
    setToArchive(null);
    await loadData();
  };

  const reactivate = async (p: Product) => {
    await productService.update(p.id, { active: true });
    await loadData();
    notify({ type: 'success', message: 'Produto reativado', detail: p.name });
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const product = toDelete;
    setToDelete(null);
    try {
      await productService.delete(product.id);
      await loadData();
      notify({
        type: 'success',
        message: 'Produto excluído',
        detail: product.name,
        onUndo: async () => {
          await productService.create(product);
          await loadData();
          notify({ type: 'success', message: 'Produto restaurado' });
        }
      });
    } catch (error) {
      notify({ type: 'error', message: 'Não foi possível excluir', detail: error instanceof Error ? error.message : undefined });
    }
  };

  const menuFor = (p: Product) => [
    { label: 'Ver precificação', icon: <Eye size={18} />, onSelect: () => navigate(`/products/${p.id}`) },
    { label: 'Editar', icon: <Pencil size={18} />, onSelect: () => navigate(`/products/${p.id}/edit`) },
    { label: 'Duplicar', icon: <Copy size={18} />, onSelect: () => handleDuplicate(p) },
    { label: '', divider: true, onSelect: () => undefined },
    p.active
      ? { label: 'Arquivar', icon: <Archive size={18} />, onSelect: () => setToArchive(p) }
      : { label: 'Reativar', icon: <Archive size={18} />, onSelect: () => reactivate(p) },
    { label: 'Excluir', icon: <Trash2 size={18} />, danger: true, onSelect: () => setToDelete(p) }
  ];

  const head = (
    <ScreenLayout
      title="Produtos"
      subtitle="Seu catálogo interno: quanto custa produzir cada peça e quanto sobra em cada venda."
      action={
        <Link className="btn btn-primary" to="/products/new">
          <Plus size={18} />
          Cadastrar produto
        </Link>
      }
    >
      {null}
    </ScreenLayout>
  );

  if (!loaded || !settings) {
    return (
      <>
        {head}
        <SkeletonGrid count={6} />
      </>
    );
  }

  if (!products.length) {
    return (
      <>
        {head}
        <EmptyState
          icon={<AmigurumiIllustration size={112} />}
          title="Nenhum produto cadastrado"
          description="Cadastre sua primeira peça e descubra quanto custa produzi-la e quanto cobrar para ter lucro."
          action={{ label: 'Cadastrar produto', onClick: () => navigate('/products/new') }}
        />
      </>
    );
  }

  return (
    <>
      {head}
      <div className="toolbar">
        <div className="search">
          <Search size={18} />
          <input className="input" type="search" placeholder="Buscar por nome" value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar produto por nome" />
        </div>
        <select className="select tb-select" value={status} onChange={e => setStatus(e.target.value as typeof status)} aria-label="Situação">
          <option value="active">Ativos</option>
          <option value="archived">Arquivados</option>
          <option value="all">Todos</option>
        </select>
        <Segmented
          label="Visualização"
          value={view}
          onChange={changeView}
          options={[
            { value: 'grid', label: <><LayoutGrid size={18} /><span className="hide-sm">Grade</span></> },
            { value: 'list', label: <><List size={18} /><span className="hide-sm">Lista</span></> }
          ]}
        />
      </div>
      <div className="mt-8">
        <Chips
          label="Categoria"
          value={category}
          onChange={setCategory}
          options={[{ value: 'all', label: 'Todas' }, ...settings.productCategories.map(c => ({ value: c, label: c }))]}
        />
      </div>

      {needAdjust > 0 && (
        <Alert tone="warning" icon={<AlertTriangle size={20} />} title={`${needAdjust} produto${needAdjust > 1 ? 's precisam' : ' precisa'} de ajuste de preço`} className="mt-16">
          Margem abaixo da meta de {settings.desiredProfitMargin}% ou venda com prejuízo. Abra o produto para ver o preço sugerido.
        </Alert>
      )}

      {!filtered.length ? (
        <div className="mt-16">
          <EmptyState
            compact
            icon={<EmptyBoxIllustration size={64} />}
            title="Nada encontrado"
            description="Tente outra palavra ou limpe os filtros."
            action={{ label: 'Limpar filtros', onClick: () => { setSearch(''); setCategory('all'); setStatus('active'); } }}
          />
        </div>
      ) : view === 'grid' ? (
        <div className="grid g-3 prod-grid mt-16">
          {filtered.map(({ product: p, cost, state }) => (
            <Card key={p.id} as="article" padded={false} className={`prod-card ${p.active ? '' : 'is-arch'}`} onClick={() => navigate(`/products/${p.id}`)}>
              <ProductArt product={p} size="wide" placeholderNote />
              <div className="prod-body">
                <div className="row between">
                  <span className="eyebrow">{p.category}</span>
                  {!p.active && <Badge variant="default" icon={<Archive size={13} />}>Arquivado</Badge>}
                  {p.isExample && <StatusBadge status="EXEMPLO" />}
                </div>
                <h3>{p.name}</h3>
                <div className="prod-nums">
                  <div><span className="small muted">Preço de venda</span><b className="num">{formatCurrency(p.usualPrice)}</b></div>
                  <div><span className="small muted">Custo</span><b className="num">{formatCurrency(cost.totalCost)}</b></div>
                  <div><span className="small muted">Lucro / un.</span><b className={`num ${cost.profit < 0 ? 'neg' : 'pos'}`}>{formatCurrency(cost.profit)}</b></div>
                </div>
                <div className="row between wrap-sm">
                  <MarginBadge state={state} />
                  <span className={`num small ${state === 'ok' ? 'pos' : state === 'low' ? 'warn' : 'neg'}`}>
                    <b>{cost.profitMargin.toFixed(1)}%</b> de margem
                  </span>
                </div>
              </div>
              <div className="prod-act">
                <DropdownMenu label={`Mais ações de ${p.name}`} trigger={<MoreHorizontal size={20} />} items={menuFor(p)} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="card pad-0 mt-16">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="mw">Produto</th>
                  <th>Categoria</th>
                  <th className="right">Preço</th>
                  <th className="right">Custo</th>
                  <th className="right">Lucro/un.</th>
                  <th className="right">Margem</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ product: p, cost, state }) => (
                  <tr key={p.id} className="click" onClick={() => navigate(`/products/${p.id}`)}>
                    <td>
                      <div className="row">
                        <ProductArt product={p} size="sm" />
                        <div>
                          <div className="name">{p.name}</div>
                          <div className="sub">{p.size}{p.active ? '' : ' · arquivado'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td className="right num">{formatCurrency(p.usualPrice)}</td>
                    <td className="right num">{formatCurrency(cost.totalCost)}</td>
                    <td className={`right num ${cost.profit < 0 ? 'neg' : 'pos'}`}><b>{formatCurrency(cost.profit)}</b></td>
                    <td className="right">
                      <MarginBadge state={state} />
                      <div className="small num muted mt-8">{cost.profitMargin.toFixed(1)}%</div>
                    </td>
                    <td className="right">
                      <DropdownMenu label={`Mais ações de ${p.name}`} trigger={<MoreHorizontal size={20} />} items={menuFor(p)} triggerClassName="btn btn-ghost btn-icon btn-sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!toArchive} title={`Arquivar “${toArchive?.name ?? ''}”?`} confirmLabel="Arquivar produto" danger onClose={() => setToArchive(null)} onConfirm={confirmArchive}>
        O produto sai do catálogo ativo, mas os pedidos antigos e o histórico continuam. Você pode reativar quando quiser.
      </ConfirmDialog>
      <ConfirmDialog isOpen={!!toDelete} title={`Excluir “${toDelete?.name ?? ''}”?`} confirmLabel="Excluir produto" danger onClose={() => setToDelete(null)} onConfirm={confirmDelete}>
        Isso apaga o produto do catálogo. Se houver pedidos ligados a ele, a exclusão é bloqueada — nesse caso, prefira arquivar. Você poderá desfazer logo depois.
      </ConfirmDialog>
    </>
  );
};
