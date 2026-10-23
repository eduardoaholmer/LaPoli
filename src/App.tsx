import React, { useEffect } from 'react';
import { HashRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNavigation, SideNavigation, Topbar } from './components/Navigation';
import { ToastContainer } from './components/Toast';
import { DashboardScreen } from './screens/Dashboard';
import { MaterialDetailScreen } from './screens/MaterialDetail';
import { OrderDetailScreen } from './screens/OrderDetail';
import { OrderWizardScreen } from './screens/OrderWizard';
import { OrdersScreen } from './screens/Orders';
import { ProductEditorScreen } from './screens/ProductEditor';
import { ProductPricingScreen } from './screens/ProductPricing';
import { ProductsScreen } from './screens/Products';
import { StockScreen } from './screens/Stock';
import { SettingsScreen } from './screens/Settings';
import { WelcomeScreen } from './screens/Welcome';
import { FinanceiroScreen } from './screens/Financeiro';
import { TransactionsScreen } from './screens/Transactions';
import { ContasScreen } from './screens/Contas';
import { settingsService } from './data/services';
import { generateId } from './types';
import { storage } from './utils/storage';
import { StorageWarning } from './components/StorageWarning';
import { LockGate } from './components/LockGate';

/** Ao trocar de tela, volta ao topo e leva o foco para o conteúdo (leitor de tela e teclado). */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('view')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
};

// A inicialização (configurações padrão e dados de exemplo) roda uma vez por carregamento da página,
// mesmo com o React StrictMode executando os efeitos duas vezes em desenvolvimento.
let appInitialization: Promise<void> | undefined;

const AppContent: React.FC = () => {

  useEffect(() => {
    appInitialization ??= initializeApp();
  }, []);

  // Backup automático a cada 7 dias - REMOVIDO (muito chato)
  // O lembrete de backup agora aparece apenas na tela de Settings

  // Lembretes de prazo de pedidos
  useEffect(() => {
    const checkDeadlines = async () => {
      // a permissão é pedida no primeiro pedido com prazo (askDeadlineReminders), não na abertura
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
              const lastNotification = storage.get(`lapoli_notification_${order.id}`);
              const nowStr = now.toDateString();

              if (lastNotification !== nowStr) {
                new Notification('⚠️ Prazo de Entrega Próximo', {
                  body: `Pedido de ${order.clientName} vence em ${daysUntilDeadline === 0 ? 'hoje' : 'amanhã'}!`,
                  icon: '/pwa-192x192.png'
                });
                storage.set(`lapoli_notification_${order.id}`, nowStr);
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

    // o aviso de que os dados ficam no aparelho agora faz parte das boas-vindas (sem alert)
    await settingsService.initializeDefault();
    await seedExampleData();
  };

  const seedExampleData = async () => {
    const settings = await settingsService.initializeDefault();
    if (settings.exampleDataSeeded) return;

    const { productService, purchaseService, orderService } = await import('./data/services');
    // datas relativas a hoje e ao meio-dia: o pedido de exemplo não nasce "atrasado 981 dias"
    // e a data não volta um dia por causa do fuso
    const exampleDay = (offset: number) => {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() + offset);
      return d;
    };
    const [products, purchases, orders] = await Promise.all([productService.getAll(), purchaseService.getAll(), orderService.getAll()]);
    // marca antes de criar: quem já usa o app (ou apagou os exemplos) não recebe os exemplos de novo
    await settingsService.update({ exampleDataSeeded: true });
    if (products.length || purchases.length || orders.length) return;

    const purchase = await purchaseService.create({
      date: exampleDay(-20),
      material: 'Fio de algodão',
      type: 'fio',
      brand: 'Circulo',
      color: 'Rosa claro',
      unit: 'gramas',
      quantityPurchased: 500,
      quantityRemaining: 350,
      percentUsed: 30,
      packageName: 'novelo',
      packageCount: 5,
      packageSize: 100,
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
      date: exampleDay(-20),
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
      date: exampleDay(-20),
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
      date: exampleDay(-6),
      clientName: 'Maria Silva',
      clientPhone: '11987654321',
      product: 'Leão Amigurumi',
      productId: product.id,
      customizations: 'Com laço vermelho',
      size: '20cm',
      quantity: 1,
      deadline: exampleDay(9),
      agreedPrice: 100,
      signalAmount: 50,
      signalPaymentDate: exampleDay(-6),
      remainingBalance: 50,
      finalPaymentDate: undefined,
      paymentMethod: 'Pix',
      status: 'Em produção',
      paymentStatus: 'sinal pago',
      needsMaterialPurchase: false,
      materialsPurchased: true,
      productionStartDate: exampleDay(-3),
      completionDate: undefined,
      deliveryDate: undefined,
      observations: '',
      isExample: true
    });
  };

  return (
    <div className="app">
      <ScrollToTop />
      <a className="skip-link" href="#view">Ir para o conteúdo</a>
      <SideNavigation />
      <div className="main">
        <Topbar />
        <StorageWarning />
        <main id="view" className="view" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/orders" element={<OrdersScreen />} />
            <Route path="/orders/new" element={<OrderWizardScreen />} />
            <Route path="/orders/:id" element={<OrderDetailScreen />} />
            <Route path="/products" element={<ProductsScreen />} />
            <Route path="/products/new" element={<ProductEditorScreen />} />
            <Route path="/products/:id" element={<ProductPricingScreen />} />
            <Route path="/products/:id/edit" element={<ProductEditorScreen />} />
            <Route path="/stock" element={<StockScreen />} />
            <Route path="/stock/:key" element={<MaterialDetailScreen />} />
            <Route path="/financeiro" element={<FinanceiroScreen />} />
            <Route path="/financeiro/movimentacoes" element={<TransactionsScreen />} />
            <Route path="/financeiro/contas" element={<ContasScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <BottomNavigation />
      <WelcomeScreen />
      <ToastContainer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LockGate>
      <Router>
        <AppContent />
      </Router>
    </LockGate>
  );
};

export default App;
