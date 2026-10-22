import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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
import { colors, spacing, breakpoints, typography, shadows, borderRadius, transitions } from './utils/theme';
import { useMediaQuery } from './utils/hooks';
import { Home } from 'lucide-react';

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isTabletOrDesktop = useMediaQuery(`(min-width: ${breakpoints.tablet})`);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Backup automático a cada 7 dias - REMOVIDO (muito chato)
  // O lembrete de backup agora aparece apenas na tela de Settings

  // Lembretes de prazo de pedidos
  useEffect(() => {
    const checkDeadlines = async () => {
      // Solicitar permissão para notificações
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        const { orderService } = await import('./data/services');
        const orders = await orderService.getAll();
        const now = new Date();

        orders.forEach(order => {
          if (order.deadline && order.status !== 'Entregue' && order.status !== 'Cancelado') {
            const deadline = new Date(order.deadline);
            const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

            // Notificar se o prazo é amanhã ou já passou
            if (daysUntilDeadline <= 1 && daysUntilDeadline >= 0) {
              const lastNotification = localStorage.getItem(`lapoli_notification_${order.id}`);
              const nowStr = now.toDateString();

              if (lastNotification !== nowStr) {
                new Notification('⚠️ Prazo de Entrega Próximo', {
                  body: `Pedido de ${order.clientName} vence em ${daysUntilDeadline === 0 ? 'hoje' : 'amanhã'}!`,
                  icon: '/icon-192.png'
                });
                localStorage.setItem(`lapoli_notification_${order.id}`, nowStr);
              }
            }
          }
        });
      }
    };

    // Verificar a cada 6 horas
    const interval = setInterval(checkDeadlines, 6 * 60 * 60 * 1000);
    checkDeadlines(); // Verificar na carga inicial

    return () => clearInterval(interval);
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

    // Mostrar aviso sobre dados locais na primeira vez
    const hasSeenDataWarning = localStorage.getItem('lapoli_data_warning_seen');
    if (!hasSeenDataWarning) {
      setTimeout(() => {
        alert('⚠️ IMPORTANTE: Todos os seus dados ficam salvos neste navegador (IndexedDB).\n\n' +
              'Se você limpar os dados do navegador ou mudar de dispositivo, os dados serão perdidos.\n\n' +
              'Faça backup regularmente em Configurações → Exportar Dados.');
        localStorage.setItem('lapoli_data_warning_seen', 'true');
      }, 2000);
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
    fontFamily: typography.fontFamily.sans
  };

  const headerStyle: React.CSSProperties = {
    padding: `${spacing.lg} ${spacing.xl}`,
    backgroundColor: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    position: 'sticky',
    top: 0,
    zIndex: 50,
    boxShadow: shadows.sm
  };

  const logoStyle: React.CSSProperties = {
    width: '44px',
    height: '44px',
    borderRadius: borderRadius.full,
    objectFit: 'cover',
    border: `2px solid ${colors.border}`,
    cursor: 'pointer',
    transition: `all ${transitions.normal}`
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.h2, // 24px
    fontWeight: typography.fontWeight.bold, // 700
    color: colors.primary,
    margin: 0,
    fontFamily: typography.fontFamily.serif, // Fonte serifada
    letterSpacing: typography.letterSpacing.tight, // -0.02em
    cursor: 'pointer',
    transition: `all ${transitions.normal}`
  };

  const homeButtonStyle: React.CSSProperties = {
    padding: spacing.sm,
    borderRadius: borderRadius.md, // 12px
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: colors.textLight,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    transition: `all ${transitions.normal}`,
    minHeight: '48px'
  };

  const contentStyle: React.CSSProperties = {
    marginLeft: isTabletOrDesktop ? '260px' : 0,
    paddingBottom: isTabletOrDesktop ? spacing.xl : '80px'
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <img 
          src="/logo.jpg" 
          alt="LaPoli Logo" 
          style={logoStyle} 
          onClick={() => navigate('/')}
        />
        <h1 style={titleStyle} onClick={() => navigate('/')}>LaPoli</h1>
        {location.pathname !== '/' && (
          <button 
            style={homeButtonStyle}
            onClick={() => navigate('/')}
            title="Voltar para o Painel"
          >
            <Home size={20} />
            <span style={{ fontSize: typography.fontSize.small }}>Painel</span>
          </button>
        )}
      </header>
      {isTabletOrDesktop && <SideNavigation />}
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
