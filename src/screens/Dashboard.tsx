import React, { useState, useEffect } from 'react';
import { orderService, productService, purchaseService, settingsService } from '../data/services';
import type { Order, Product, Purchase, Settings } from '../types';
import { calculateDashboardMetrics, formatCurrency } from '../calculations';
import { MetricCard, Card } from '../components/Card';
import { ScreenLayout } from '../components/ScreenLayout';
import { CrochetTexture } from '../components/CrochetTexture';
import { EmptyState } from '../components/EmptyState';
import { YarnIllustration } from '../components/Illustrations';
import { colors, spacing, borderRadius, typography, transitions } from '../utils/theme';
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  AlertTriangle,
  Clock,
  DollarSign,
  BarChart3
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export const DashboardScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());

  // Saudação personalizada baseada no horário
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia! ☀️';
    if (hour < 18) return 'Boa tarde! 🌤️';
    return 'Boa noite! 🌙';
  };

  useEffect(() => {
    loadData();
  }, [period, customStartDate, customEndDate]);

  const loadData = async () => {
    const [ords, prods, prodsPurchases, sett] = await Promise.all([
      orderService.getAll(),
      productService.getAll(),
      purchaseService.getAll(),
      settingsService.initializeDefault()
    ]);
    setOrders(ords);
    setProducts(prods);
    setPurchases(prodsPurchases);
    setSettings(sett);
  };

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: weekAgo, end: now };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: now };
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: lastMonthStart, end: lastMonthEnd };
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart, end: now };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: today, end: now };
    }
  };

  const { start, end } = getDateRange();
  const metrics = settings ? calculateDashboardMetrics(orders, products, purchases, settings, start, end) : null;

  const chartData = metrics ? [
    { name: 'Faturamento', value: metrics.totalRevenue, color: colors.primary },
    { name: 'Custos', value: metrics.totalCosts, color: colors.error },
    { name: 'Lucro', value: metrics.totalProfit, color: colors.success }
  ].filter(d => d.value > 0) : [];

  const statusData = settings ? settings.orderStatuses.map(status => ({
    name: status,
    value: orders.filter(o => o.status === status).length
  })) : [];

  const COLORS = [colors.primary, colors.secondary, colors.warning, colors.error, colors.info];

  const metricsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: spacing.lg,
    marginBottom: spacing.xxl
  };

  const chartsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: spacing.lg,
    marginBottom: spacing.xxl
  };

  const selectStyle: React.CSSProperties = {
    padding: `${spacing.md} ${spacing.lg}`,
    borderRadius: borderRadius.md, // 12px
    border: `1px solid ${colors.border}`,
    fontSize: '15px',
    backgroundColor: colors.surface,
    color: colors.text,
    minHeight: '48px',
    cursor: 'pointer',
    transition: `all ${transitions.normal}`
  };

  const inputDateStyle: React.CSSProperties = {
    ...selectStyle,
    fontFamily: typography.fontFamily.sans
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.h3, // 20px
    fontWeight: typography.fontWeight.semibold, // 600
    marginBottom: spacing.lg,
    color: colors.text,
    letterSpacing: typography.letterSpacing.normal // -0.01em
  };

  const listContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md
  };

  const listItemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: `${spacing.md} ${spacing.lg}`,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md, // 12px
    transition: `all ${transitions.normal}`
  };

  const listItemNameStyle: React.CSSProperties = {
    fontWeight: typography.fontWeight.semibold, // 600
    color: colors.text
  };

  const listItemSubStyle: React.CSSProperties = {
    fontSize: typography.fontSize.small, // 12px
    color: colors.textLight,
    marginTop: spacing.xs
  };

  const listItemValueStyle: React.CSSProperties = {
    fontWeight: typography.fontWeight.bold, // 700
    color: colors.success,
    fontSize: typography.fontSize.bodyLarge // 16px
  };

  const alertItemStyle: React.CSSProperties = {
    ...listItemStyle,
    backgroundColor: `${colors.error}12`,
    border: `1px solid ${colors.error}30`
  };

  const alertValueStyle: React.CSSProperties = {
    fontWeight: typography.fontWeight.bold, // 700
    color: colors.error,
    fontSize: typography.fontSize.bodyLarge // 16px
  };

  if (!metrics || !settings) {
    return (
      <ScreenLayout>
        <EmptyState
          icon={<YarnIllustration size={120} />}
          title="Carregando dados..."
          description="Estamos preparando seu painel de controle."
          showTexture={false}
        />
      </ScreenLayout>
    );
  }

  const periodSelector = (
    <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
      <select
        style={selectStyle}
        value={period}
        onChange={(e) => setPeriod(e.target.value as any)}
      >
        <option value="today">Hoje</option>
        <option value="week">Últimos 7 dias</option>
        <option value="month">Mês atual</option>
        <option value="lastMonth">Mês passado</option>
        <option value="year">Ano atual</option>
        <option value="custom">Personalizado</option>
      </select>
      {period === 'custom' && (
        <>
          <input
            type="date"
            style={inputDateStyle}
            value={customStartDate.toISOString().split('T')[0]}
            onChange={(e) => setCustomStartDate(new Date(e.target.value))}
          />
          <input
            type="date"
            style={inputDateStyle}
            value={customEndDate.toISOString().split('T')[0]}
            onChange={(e) => setCustomEndDate(new Date(e.target.value))}
          />
        </>
      )}
    </div>
  );

  return (
    <ScreenLayout
      title={getGreeting()}
      subtitle="Acompanhe os indicadores financeiros e operacionais do seu negócio de crochê."
      action={periodSelector}
    >
      <CrochetTexture opacity={0.04} />

      <div style={metricsGridStyle}>
        <MetricCard
          title="Faturamento Total"
          value={formatCurrency(metrics.totalRevenue)}
          icon={<DollarSign size={20} />}
          color={colors.primary}
        />
        <MetricCard
          title="Custos Totais"
          value={formatCurrency(metrics.totalCosts)}
          icon={<TrendingDown size={20} />}
          color={colors.error}
        />
        <MetricCard
          title="Lucro Total"
          value={formatCurrency(metrics.totalProfit)}
          icon={<TrendingUp size={20} />}
          color={colors.success}
        />
        <MetricCard
          title="Margem Média"
          value={`${metrics.averageProfitMargin.toFixed(1)}%`}
          icon={<BarChart3 size={20} />}
          color={colors.secondary}
        />
        <MetricCard
          title="Pedidos em Aberto"
          value={metrics.openOrders}
          icon={<ShoppingCart size={20} />}
          color={colors.warning}
        />
        <MetricCard
          title="Pedidos Concluídos"
          value={metrics.completedOrders}
          icon={<Package size={20} />}
          color={colors.success}
        />
        <MetricCard
          title="Horas Trabalhadas"
          value={`${metrics.hoursWorked.toFixed(1)}h`}
          icon={<Clock size={20} />}
          color={colors.info}
        />
        <MetricCard
          title="Lucro por Hora"
          value={formatCurrency(metrics.profitPerHour)}
          icon={<TrendingUp size={20} />}
          color={colors.success}
        />
        <MetricCard
          title="Investimento em Materiais"
          value={formatCurrency(metrics.totalMaterialInvestment)}
          icon={<DollarSign size={20} />}
          color={colors.primary}
        />
      </div>

      <div style={chartsGridStyle}>
        <Card>
          <h3 style={cardTitleStyle}>Faturamento x Custos x Lucro</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.borderLight} />
              <XAxis dataKey="name" stroke={colors.textMuted} fontSize={12} />
              <YAxis stroke={colors.textMuted} fontSize={12} />
              <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
              <Bar dataKey="value" fill={colors.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={cardTitleStyle}>Pedidos por Status</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RechartsPieChart>
              <Pie
                data={statusData.filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={chartsGridStyle}>
        <Card>
          <h3 style={cardTitleStyle}>Produtos Mais Vendidos</h3>
          {metrics.topProducts.length > 0 ? (
            <div style={listContainerStyle}>
              {metrics.topProducts.map((product, index) => (
                <div key={index} style={listItemStyle}>
                  <div>
                    <div style={listItemNameStyle}>{product.name}</div>
                    <div style={listItemSubStyle}>
                      {product.quantity} vendidos
                    </div>
                  </div>
                  <div style={listItemValueStyle}>
                    {formatCurrency(product.revenue)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: colors.textLight, textAlign: 'center', padding: spacing.xl, fontSize: typography.fontSize.body }}>
              Nenhum produto vendido no período
            </p>
          )}
        </Card>

        <Card>
          <h3 style={{ ...cardTitleStyle, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <AlertTriangle size={20} style={{ color: colors.warning }} />
            Materiais com Estoque Baixo
          </h3>
          {metrics.lowStockMaterials.length > 0 ? (
            <div style={listContainerStyle}>
              {metrics.lowStockMaterials.map((material, index) => (
                <div key={index} style={alertItemStyle}>
                  <div>
                    <div style={listItemNameStyle}>{material.material}</div>
                    <div style={listItemSubStyle}>
                      Mínimo: {material.minStock}
                    </div>
                  </div>
                  <div style={alertValueStyle}>
                    {material.remaining.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: colors.textLight, textAlign: 'center', padding: spacing.xl, fontSize: typography.fontSize.body }}>
              Todos os materiais com estoque adequado
            </p>
          )}
        </Card>
      </div>
    </ScreenLayout>
  );
};
