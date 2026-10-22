import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { BottomNavigation, SideNavigation } from './components/Navigation';
import { ToastContainer } from './components/Toast';
import { DashboardScreen } from './screens/Dashboard';
import { OrdersScreen } from './screens/Orders';
import { ProductsScreen } from './screens/Products';
import { StockScreen } from './screens/Stock';
import { SettingsScreen } from './screens/Settings';
import { WelcomeScreen } from './screens/Welcome';
import { settingsService } from './data/services';
import { generateId } from './types';
import { colors, spacing, breakpoints } from './utils/theme';
import { useMediaQuery } from './utils/hooks';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isTabletOrDesktop = useMediaQuery(`(min-width: ${breakpoints.tablet})`);
  const isSettingsRoute = location.pathname === '/settings';

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Solicitar armazenamento persistente para evitar que o navegador apague os dados
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const isPersistent = await navigator.storage.persist();
        if (!isPersistent) {
          console.warn('Armazenamento persistente não foi garantido. O navegador pode apagar os dados se precisar de espaço.');
        }
      } catch (error) {
        console.error('Erro ao solicitar armazenamento persistente:', error);
      }
    }
    
    await settingsService.initializeDefault();
    await seedExampleData();
  };

  const seedExampleData = async () => {
    const existingProducts = await (await import('./data/services')).productService.getAll();
    if (existingProducts.length > 0) return;

    const { productService, purchaseService, orderService } = await import('./data/services');

    const purchase = await purchaseService.create({
      date: new Date('2024-01-15'),
      material: 'Fio de algodão',
      type: 'fio',
      brand: 'Circulo',
      color: 'Rosa claro',
      unit: 'gramas',
      quantityPurchased: 500,
      quantityRemaining: 350,
      percentUsed: 30,
      totalPaid: 45,
      unitCost: 0.09,
      store: 'Mercado de Fios',
      paymentMethod: 'Pix',
      installments: 1,
      installmentValue: 45,
      minStock: 100,
      status: 'disponível',
      paymentStatus: 'quitado',
      observations: 'Fio de boa qualidade',
      isExample: true
    });

    const purchase2 = await purchaseService.create({
      date: new Date('2024-01-15'),
      material: 'Enchimento',
      type: 'enchimento',
      brand: 'Generic',
      color: 'Branco',
      unit: 'gramas',
      quantityPurchased: 1000,
      quantityRemaining: 800,
      percentUsed: 20,
      totalPaid: 30,
      unitCost: 0.03,
      store: 'Mercado de Fios',
      paymentMethod: 'Pix',
      installments: 1,
      installmentValue: 30,
      minStock: 200,
      status: 'disponível',
      paymentStatus: 'quitado',
      observations: '',
      isExample: true
    });

    const purchase3 = await purchaseService.create({
      date: new Date('2024-01-15'),
      material: 'Olhos de segurança',
      type: 'olhos',
      brand: 'Generic',
      color: 'Preto',
      unit: 'unidades',
      quantityPurchased: 50,
      quantityRemaining: 45,
      percentUsed: 10,
      totalPaid: 25,
      unitCost: 0.5,
      store: 'Mercado de Fios',
      paymentMethod: 'Pix',
      installments: 1,
      installmentValue: 25,
      minStock: 10,
      status: 'disponível',
      paymentStatus: 'quitado',
      observations: '',
      isExample: true
    });

    const product = await productService.create({
      name: 'Leão Amigurumi',
      category: 'Amigurumi',
      description: 'Leão fofo em crochê, tamanho médio',
      size: '20cm',
      recipeLink: '',
      needleSize: '3.0mm',
      estimatedTime: 8,
      actualTime: 8,
      suggestedPrice: 80,
      usualPrice: 100,
      observations: 'Modelo popular',
      active: true,
      materials: [
        {
          id: generateId(),
          materialId: purchase.id,
          material: 'Fio de algodão',
          type: 'fio',
          unit: 'gramas',
          quantityUsed: 150,
          purchaseId: purchase.id,
          unitCost: purchase.unitCost,
          totalCost: 150 * purchase.unitCost
        },
        {
          id: generateId(),
          materialId: purchase2.id,
          material: 'Enchimento',
          type: 'enchimento',
          unit: 'gramas',
          quantityUsed: 200,
          purchaseId: purchase2.id,
          unitCost: purchase2.unitCost,
          totalCost: 200 * purchase2.unitCost
        },
        {
          id: generateId(),
          materialId: purchase3.id,
          material: 'Olhos de segurança',
          type: 'olhos',
          unit: 'unidades',
          quantityUsed: 2,
          purchaseId: purchase3.id,
          unitCost: purchase3.unitCost,
          totalCost: 2 * purchase3.unitCost
        }
      ],
      isExample: true
    });

    await orderService.create({
      date: new Date('2024-02-01'),
      clientName: 'Maria Silva',
      clientPhone: '11987654321',
      product: 'Leão Amigurumi',
      productId: product.id,
      customizations: 'Com laço vermelho',
      size: '20cm',
      quantity: 1,
      deadline: new Date('2024-02-15'),
      agreedPrice: 100,
      signalAmount: 50,
      signalPaymentDate: new Date('2024-02-01'),
      remainingBalance: 50,
      finalPaymentDate: undefined,
      paymentMethod: 'Pix',
      status: 'Em produção',
      paymentStatus: 'sinal pago',
      needsMaterialPurchase: false,
      materialsPurchased: true,
      productionStartDate: new Date('2024-02-05'),
      completionDate: undefined,
      deliveryDate: undefined,
      observations: '',
      isExample: true
    });
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  const headerStyle: React.CSSProperties = {
    padding: `${spacing.md} ${spacing.lg}`,
    backgroundColor: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    position: 'sticky',
    top: 0,
    zIndex: 50
  };

  const logoStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: colors.primary,
    margin: 0
  };

  const contentStyle: React.CSSProperties = {
    marginLeft: isTabletOrDesktop && !isSettingsRoute ? '250px' : 0,
    paddingBottom: isTabletOrDesktop ? spacing.lg : '80px'
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <img src="/logo.jpg" alt="LaPoli Logo" style={logoStyle} />
        <h1 style={titleStyle}>LaPoli</h1>
      </header>
      {isTabletOrDesktop && !isSettingsRoute && <SideNavigation />}
      <div style={contentStyle}>
        <Routes>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/orders" element={<OrdersScreen />} />
          <Route path="/products" element={<ProductsScreen />} />
          <Route path="/stock" element={<StockScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
        <WelcomeScreen />
        <ToastContainer />
      </div>
      {!isTabletOrDesktop && <BottomNavigation />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
