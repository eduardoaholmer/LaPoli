import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Settings
} from 'lucide-react';
import { colors, spacing, borderRadius } from '../utils/theme';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Painel', path: '/', icon: <LayoutDashboard size={24} /> },
  { id: 'orders', label: 'Pedidos', path: '/orders', icon: <ShoppingCart size={24} /> },
  { id: 'products', label: 'Produtos', path: '/products', icon: <Package size={24} /> },
  { id: 'stock', label: 'Estoque', path: '/stock', icon: <Warehouse size={24} /> },
  { id: 'settings', label: 'Mais', path: '/settings', icon: <Settings size={24} /> }
];

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    justifyContent: 'space-around',
    padding: `${spacing.sm} 0`,
    zIndex: 100,
    paddingBottom: 'env(safe-area-inset-bottom, 16px)',
    boxShadow: '0 -2px 8px rgba(45, 45, 45, 0.04)'
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: colors.textMuted,
    minWidth: '64px',
    minHeight: '64px',
    transition: 'all 0.2s ease'
  };

  const activeItemStyle: React.CSSProperties = {
    color: colors.primary
  };

  const iconStyle: React.CSSProperties = {
    transition: 'transform 0.2s ease'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.01em'
  };

  return (
    <div style={containerStyle}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.id}
            style={{ ...itemStyle, ...(isActive ? activeItemStyle : {}) }}
            onClick={() => navigate(item.path)}
          >
            <span style={iconStyle}>{item.icon}</span>
            <span style={labelStyle}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const SideNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: '260px',
    backgroundColor: colors.surface,
    borderRight: `1px solid ${colors.border}`,
    padding: spacing.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    zIndex: 100
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: `${spacing.md} ${spacing.lg}`,
    borderRadius: borderRadius.md,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: colors.textLight,
    fontSize: '15px',
    fontWeight: 500,
    minHeight: '48px',
    transition: 'all 0.2s ease',
    letterSpacing: '0.01em'
  };

  const activeItemStyle: React.CSSProperties = {
    backgroundColor: `${colors.primary}12`,
    color: colors.primary,
    fontWeight: 600
  };

  const iconStyle: React.CSSProperties = {
    flexShrink: 0
  };

  return (
    <div style={containerStyle}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.id}
            style={{ ...itemStyle, ...(isActive ? activeItemStyle : {}) }}
            onClick={() => navigate(item.path)}
          >
            <span style={iconStyle}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
