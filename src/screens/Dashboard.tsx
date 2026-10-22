import React, { useState, useEffect } from 'react';
import { orderService, productService, purchaseService, settingsService } from '../data/services';
import type { Order, Product, Purchase, Settings } from '../types';
import { calculateDashboardMetrics, formatCurrency } from '../calculations';
import { MetricCard, Card } from '../components/Card';
import { colors, spacing } from '../utils/theme';
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

  const containerStyle: React.CSSProperties = {
    padding: spacing.lg,
    paddingBottom: '100px',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
    gap: spacing.md
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.text,
    margin: 0
  };

  const metricsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.lg,
    marginBottom: spacing.xl
  };

  const chartsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: spacing.lg,
    marginBottom: spacing.xl
  };

  const selectStyle: React.CSSProperties = {
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    fontSize: '16px',
    backgroundColor: colors.surface,
    color: colors.text,
    minHeight: '44px',
    cursor: 'pointer'
  };

  const helpTextStyle: React.CSSProperties = {
    fontSize: '14px',
    color: colors.textLight,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: `${colors.primary}10`,
    borderRadius: '8px',
    borderLeft: `4px solid ${colors.primary}`
  };

  if (!metrics || !settings) return <div>Carregando...</div>;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Painel Geral</h1>
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
                style={selectStyle}
                value={customStartDate.toISOString().split('T')[0]}
                onChange={(e) => setCustomStartDate(new Date(e.target.value))}
              />
              <input
                type="date"
                style={selectStyle}
                value={customEndDate.toISOString().split('T')[0]}
                onChange={(e) => setCustomEndDate(new Date(e.target.value))}
              />
            </>
          )}
        </div>
      </div>

      <div style={helpTextStyle}>
        Acompanhe os indicadores financeiros e operacionais do seu negócio de crochê. Selecione o período para filtrar os dados.
      </div>

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
          title="Investimento em Materiais"
          value={formatCurrency(metrics.totalMaterialInvestment)}
          icon={<DollarSign size={20} />}
          color={colors.primary}
        />
      </div>

      <div style={chartsGridStyle}>
        <Card>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: spacing.md }}>Faturamento x Custos x Lucro</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
              <Bar dataKey="value" fill={colors.primary} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: spacing.md }}>Pedidos por Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart>
              <Pie
                data={statusData.filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
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
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: spacing.md }}>Produtos Mais Vendidos</h3>
          {metrics.topProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {metrics.topProducts.map((product, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: spacing.sm,
                  backgroundColor: `${colors.background}`,
                  borderRadius: '8px'
                }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{product.name}</div>
                    <div style={{ fontSize: '12px', color: colors.textLight }}>
                      {product.quantity} vendidos
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, color: colors.success }}>
                    {formatCurrency(product.revenue)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: colors.textLight, textAlign: 'center', padding: spacing.lg }}>
              Nenhum produto vendido no período
            </p>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: spacing.md }}>
            <AlertTriangle size={18} style={{ display: 'inline', marginRight: spacing.xs }} />
            Materiais com Estoque Baixo
          </h3>
          {metrics.lowStockMaterials.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {metrics.lowStockMaterials.map((material, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: spacing.sm,
                  backgroundColor: `${colors.error}10`,
                  borderRadius: '8px',
                  border: `1px solid ${colors.error}`
                }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{material.material}</div>
                    <div style={{ fontSize: '12px', color: colors.textLight }}>
                      Mínimo: {material.minStock}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, color: colors.error }}>
                    {material.remaining.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: colors.textLight, textAlign: 'center', padding: spacing.lg }}>
              Todos os materiais com estoque adequado
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};
