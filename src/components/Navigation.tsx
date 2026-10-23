import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  SlidersHorizontal,
  Plus,
  ShieldCheck,
  ChevronRight,
  ShoppingCart,
  ClipboardList,
  Wallet
} from 'lucide-react';
import { settingsService } from '../data/services';
import { DropdownMenu } from './ui';
import type { Settings } from '../types';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  group: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Visão geral', path: '/', icon: <LayoutDashboard size={22} />, group: 'Dia a dia', end: true },
  { id: 'orders', label: 'Pedidos', path: '/orders', icon: <ShoppingBag size={22} />, group: 'Dia a dia' },
  { id: 'products', label: 'Produtos', path: '/products', icon: <Package size={22} />, group: 'Dia a dia' },
  { id: 'stock', label: 'Estoque', path: '/stock', icon: <Layers size={22} />, group: 'Dia a dia' },
  { id: 'finance', label: 'Financeiro', path: '/financeiro', icon: <Wallet size={22} />, group: 'Dia a dia' },
  { id: 'settings', label: 'Configurações', path: '/settings', icon: <SlidersHorizontal size={22} />, group: 'Sistema' }
];

const daysSince = (d?: Date): number | null =>
  d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;

/** Menu lateral (desktop) e trilho de ícones (tablet). No celular some e entra a barra inferior. */
export const SideNavigation: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const location = useLocation();

  useEffect(() => {
    settingsService.get().then(s => setSettings(s ?? null));
  }, [location.pathname]);

  const groups = Array.from(new Set(NAV_ITEMS.map(n => n.group)));
  const days = daysSince(settings?.lastBackupDate);

  return (
    <aside className="nav" aria-label="Menu principal">
      <Link className="nav-brand" to="/">
        <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="" width={44} height={44} />
        <div>
          <span className="name">LaPoli</span>
          <span className="tag">Gestão do ateliê</span>
        </div>
      </Link>
      {groups.map(g => (
        <React.Fragment key={g}>
          <div className="nav-group">{g}</div>
          {NAV_ITEMS.filter(n => n.group === g).map(n => (
            <NavLink key={n.id} to={n.path} end={n.end} className="nav-item" aria-label={n.label}>
              {n.icon}
              <span>{n.label}</span>
            </NavLink>
          ))}
        </React.Fragment>
      ))}
      <div className="nav-spacer" />
      <div className="nav-foot">
        <strong>
          <ShieldCheck size={16} />
          Dados só neste aparelho
        </strong>
        {days === null ? 'Você ainda não fez backup.' : days === 0 ? 'Backup feito hoje.' : `Último backup há ${days} dia${days === 1 ? '' : 's'}.`}
        <Link className="btn btn-secondary btn-sm" to="/settings">
          Fazer backup
        </Link>
      </div>
    </aside>
  );
};

/** Barra inferior do celular: 4 áreas do dia a dia + Mais (Configurações). */
export const BottomNavigation: React.FC = () => {
  const tabs = [
    { to: '/', label: 'Início', icon: <LayoutDashboard size={24} />, end: true },
    { to: '/orders', label: 'Pedidos', icon: <ShoppingBag size={24} /> },
    { to: '/products', label: 'Produtos', icon: <Package size={24} /> },
    { to: '/stock', label: 'Estoque', icon: <Layers size={24} /> },
    { to: '/settings', label: 'Mais', icon: <SlidersHorizontal size={24} /> }
  ];
  return (
    <nav className="tabbar" aria-label="Menu principal">
      {tabs.map(t => (
        <NavLink key={t.to} to={t.to} end={t.end} className="tab">
          {t.icon}
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
};

const CRUMB_LABELS: Record<string, string> = {
  orders: 'Pedidos',
  products: 'Produtos',
  stock: 'Estoque',
  financeiro: 'Financeiro',
  movimentacoes: 'Movimentações',
  settings: 'Configurações',
  new: 'Novo',
  edit: 'Editar'
};

/** Barra superior: onde estou, "Novo" e o aviso de que os dados ficam no aparelho. */
export const Topbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const parts = location.pathname.split('/').filter(Boolean);

  const crumbs: { label: string; to?: string }[] = [{ label: 'Visão geral', to: parts.length ? '/' : undefined }];
  let acc = '';
  parts.forEach((p, i) => {
    acc += `/${p}`;
    // ids de produto/pedido não são legíveis: viram "Detalhes"; o material mostra o próprio nome
    const label = CRUMB_LABELS[p] ?? (parts[i - 1] === 'stock' ? decodeURIComponent(p).replace(/^./, c => c.toUpperCase()) : 'Detalhes');
    crumbs.push({ label, to: i < parts.length - 1 ? acc : undefined });
  });

  return (
    <header className="topbar">
      <Link className="topbar-title" to="/">
        <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="" width={34} height={34} />
        LaPoli
      </Link>
      <nav className="crumbs" aria-label="Você está em">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <span className="sep">
                <ChevronRight size={14} />
              </span>
            )}
            {c.to ? <Link to={c.to}>{c.label}</Link> : <span className="here">{c.label}</span>}
          </React.Fragment>
        ))}
      </nav>
      <div className="topbar-spacer" />
      <span className="device-pill" title="Os dados ficam armazenados somente neste aparelho">
        <span className="dot" />
        <span className="long">Funciona offline · dados neste aparelho</span>
        <span className="short">Offline</span>
      </span>
      <DropdownMenu
        label="Criar novo"
        triggerClassName="btn btn-primary btn-sm"
        trigger={
          <>
            <Plus size={18} />
            <span className="hide-sm">Novo</span>
          </>
        }
        items={[
          { label: 'Novo pedido', icon: <ShoppingBag size={18} />, onSelect: () => navigate('/orders/new') },
          { label: 'Cadastrar produto', icon: <Package size={18} />, onSelect: () => navigate('/products/new') },
          { label: 'Registrar compra de material', icon: <ShoppingCart size={18} />, onSelect: () => navigate('/stock?new=1') },
          { label: 'Ver lista de compras', icon: <ClipboardList size={18} />, onSelect: () => navigate('/stock?tab=compras') }
        ]}
      />
    </header>
  );
};
