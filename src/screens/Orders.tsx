import React, { useState, useEffect } from 'react';
import { orderService, productService, settingsService } from '../data/services';
import type { Order, Product, Settings } from '../types';
import { calculateRemainingBalance, formatCurrency, formatDate, isOrderDelayed, isOrderNearDeadline } from '../calculations';
import { Input, Select, TextArea } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { colors, spacing } from '../utils/theme';
import { Plus, Edit, Trash2, AlertTriangle, MessageCircle, Calendar, Copy } from 'lucide-react';

const orderStatusMessages: Record<string, string> = {
  'Cliente escolhendo o produto': 'Olá! Vi que você está interessada no produto. Gostaria de mais informações ou quer que eu prepare um orçamento?',
  'Orçamento enviado': 'Olá! Enviei o orçamento para você. Fico aguardando seu retorno. Qualquer dúvida, é só chamar! 💕',
  'Aguardando pagamento do sinal': 'Olá! Já estou com os materiais separados para começar seu pedido. Aguardo o pagamento do sinal para iniciar a produção.',
  'Sinal recebido': 'Obrigada pelo sinal! Já estou começando a produção do seu pedido. Vou te avisar quando estiver pronto! 🧶',
  'Aguardando compra de materiais': 'Olá! Já estou organizando a compra dos materiais para seu pedido. Em breve estarei produzindo!',
  'Materiais comprados': 'Materiais comprados! Agora vou começar a produção do seu pedido. Em breve te aviso! ✨',
  'Em produção': 'Seu pedido está sendo produzido com carinho! Já estou em X% do trabalho. Em breve estará pronto! 🧶',
  'Produção concluída': 'Seu pedido está pronto! 🎉 Agora é só aguardar a entrega. Te aviso quando for despachar!',
  'Aguardando entrega': 'Seu pedido está pronto e aguardando entrega! Vamos combinar o horário/local? 📦',
  'Entregue': 'Obrigada pela preferência! Espero que tenha gostado do produto. Volte sempre! 💕',
  'Cancelado': 'Pedido cancelado conforme solicitado. Se mudar de ideia, estarei à disposição!'
};

export const OrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageToCopy, setMessageToCopy] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ords, prods, sett] = await Promise.all([
      orderService.getAll(),
      productService.getAll(),
      settingsService.initializeDefault()
    ]);
    setOrders(ords);
    setProducts(prods);
    setSettings(sett);
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         o.product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = () => {
    setEditingOrder(null);
    setShowModal(true);
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este pedido?')) {
      // Salvar o pedido para possível undo
      const orderToDelete = orders.find(o => o.id === id);
      
      await orderService.delete(id);
      await loadData();
      
      // Mostrar toast com opção de undo
      if (orderToDelete && (window as any).toast) {
        (window as any).toast.add({
          message: 'Pedido excluído com sucesso',
          type: 'success',
          onUndo: async () => {
            await orderService.create(orderToDelete);
            await loadData();
            (window as any).toast.add({
              message: 'Pedido restaurado',
              type: 'success'
            });
          }
        });
      }
    }
  };

  const handleSave = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Validação: data de entrega não pode ser anterior à data do pedido
    if (orderData.deadline && orderData.date) {
      const orderDate = new Date(orderData.date);
      const deadlineDate = new Date(orderData.deadline);

      // Normalizar as datas para meia-noite local para comparação
      orderDate.setHours(0, 0, 0, 0);
      deadlineDate.setHours(0, 0, 0, 0);

      if (deadlineDate < orderDate) {
        alert('A data de entrega não pode ser anterior à data do pedido.');
        return;
      }
    }

    if (editingOrder) {
      await orderService.update(editingOrder.id, orderData);
    } else {
      await orderService.create(orderData);
    }
    setShowModal(false);
    await loadData();
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  const handleCopyMessage = (status: string) => {
    const message = orderStatusMessages[status] || '';
    setMessageToCopy(message);
    setShowMessageModal(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(messageToCopy);
    setShowMessageModal(false);
    alert('Mensagem copiada para a área de transferência!');
  };

  const handleGenerateQuote = (order: Order) => {
    const quote = `🧶 *ORÇAMENTO - LaPoli Crochet*

📦 *Produto:* ${order.product}
👤 *Cliente:* ${order.clientName}
📱 *Telefone:* ${order.clientPhone}

💰 *Valores:*
• Preço combinado: ${formatCurrency(order.agreedPrice)}
• Sinal: ${formatCurrency(order.signalAmount)}
• Saldo: ${formatCurrency(order.remainingBalance)}

📅 *Datas:*
• Data do pedido: ${formatDate(order.date)}
• Prazo de entrega: ${formatDate(order.deadline)}

📝 *Status:* ${order.status}
💳 *Pagamento:* ${order.paymentStatus}

---
Orçamento gerado em ${new Date().toLocaleDateString('pt-BR')}`;

    setMessageToCopy(quote);
    setShowMessageModal(true);
  };

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

  const searchStyle: React.CSSProperties = {
    flex: 1,
    minWidth: '200px',
    maxWidth: '400px'
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

  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '80px',
    right: spacing.lg,
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(232, 160, 180, 0.4)',
    zIndex: 99
  };

  const delayedOrders = orders.filter(o => isOrderDelayed(o));
  const nearDeadlineOrders = orders.filter(o => isOrderNearDeadline(o));

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Pedidos</h1>
        <div style={searchStyle}>
          <Input
            placeholder="Buscar pedidos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
          />
        </div>
        {settings && (
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="">Todos status</option>
            {settings.orderStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
        )}
        <Button
          variant="ghost"
          onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
        >
          {viewMode === 'list' ? 'Kanban' : 'Lista'}
        </Button>
      </div>

      <div style={helpTextStyle}>
        Gerencie os pedidos dos clientes, acompanhe o status de produção e controle os pagamentos.
      </div>

      {delayedOrders.length > 0 && (
        <Card style={{ marginBottom: spacing.lg, backgroundColor: `${colors.error}10`, borderColor: colors.error }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.error }}>
            <AlertTriangle size={20} />
            <strong>{delayedOrders.length} pedidos atrasados</strong>
          </div>
        </Card>
      )}

      {nearDeadlineOrders.length > 0 && delayedOrders.length === 0 && (
        <Card style={{ marginBottom: spacing.lg, backgroundColor: `${colors.warning}10`, borderColor: colors.warning }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.warning }}>
            <Calendar size={20} />
            <strong>{nearDeadlineOrders.length} pedidos próximos do prazo</strong>
          </div>
        </Card>
      )}

      {viewMode === 'list' ? (
        <OrderListView
          orders={filteredOrders}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onWhatsApp={openWhatsApp}
          onCopyMessage={handleCopyMessage}
          onGenerateQuote={handleGenerateQuote}
        />
      ) : (
        <KanbanView
          orders={filteredOrders}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onWhatsApp={openWhatsApp}
          onCopyMessage={handleCopyMessage}
          onGenerateQuote={handleGenerateQuote}
          settings={settings}
        />
      )}

      <button style={fabStyle} onClick={handleCreate}>
        <Plus size={24} />
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingOrder ? 'Editar Pedido' : 'Novo Pedido'}
        size="lg"
      >
        <OrderForm
          order={editingOrder}
          products={products}
          settings={settings}
          onSave={handleSave}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title="Mensagem Pronta"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <p style={{ fontSize: '14px', color: colors.textLight }}>
            Copie a mensagem abaixo e cole no WhatsApp:
          </p>
          <TextArea
            value={messageToCopy}
            readOnly
            fullWidth
            style={{ minHeight: '120px' }}
          />
          <Button onClick={copyToClipboard} fullWidth>
            <Copy size={20} style={{ marginRight: spacing.sm }} />
            Copiar para Área de Transferência
          </Button>
        </div>
      </Modal>
    </div>
  );
};

interface OrderListViewProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onWhatsApp: (phone: string) => void;
  onCopyMessage: (status: string) => void;
  onGenerateQuote: (order: Order) => void;
}

const OrderListView: React.FC<OrderListViewProps> = ({ orders, onEdit, onDelete, onWhatsApp, onCopyMessage, onGenerateQuote }) => {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: spacing.lg
  };

  return (
    <div style={gridStyle}>
      {orders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          onEdit={onEdit}
          onDelete={onDelete}
          onWhatsApp={onWhatsApp}
          onCopyMessage={onCopyMessage}
          onGenerateQuote={onGenerateQuote}
        />
      ))}
    </div>
  );
};

interface KanbanViewProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onWhatsApp: (phone: string) => void;
  onCopyMessage: (status: string) => void;
  onGenerateQuote: (order: Order) => void;
  settings?: Settings | null;
}

const KanbanView: React.FC<KanbanViewProps> = ({ orders, onEdit, onDelete, onWhatsApp, onCopyMessage, onGenerateQuote, settings }) => {
  const statuses = settings?.orderStatuses || [
    'Cliente escolhendo o produto',
    'Orçamento enviado',
    'Aguardando pagamento do sinal',
    'Sinal recebido',
    'Aguardando compra de materiais',
    'Materiais comprados',
    'Em produção',
    'Produção concluída',
    'Aguardando entrega',
    'Entregue',
    'Cancelado'
  ];

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.md,
    overflowX: 'auto',
    paddingBottom: spacing.md
  };

  const columnStyle: React.CSSProperties = {
    minWidth: '280px',
    flexShrink: 0,
    backgroundColor: `${colors.background}`,
    borderRadius: '8px',
    padding: spacing.md,
    maxHeight: 'calc(100vh - 200px)',
    overflowY: 'auto'
  };

  const columnTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.text,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottom: `2px solid ${colors.border}`
  };

  return (
    <div style={containerStyle}>
      {statuses.map(status => {
        const columnOrders = orders.filter(o => o.status === status);
        return (
          <div key={status} style={columnStyle}>
            <div style={columnTitleStyle}>
              {status} ({columnOrders.length})
            </div>
            {columnOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onEdit={onEdit}
                onDelete={onDelete}
                onWhatsApp={onWhatsApp}
                onCopyMessage={onCopyMessage}
                onGenerateQuote={onGenerateQuote}
                compact
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

interface OrderCardProps {
  order: Order;
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onWhatsApp: (phone: string) => void;
  onCopyMessage: (status: string) => void;
  onGenerateQuote: (order: Order) => void;
  compact?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onEdit, onDelete, onWhatsApp, onCopyMessage, onGenerateQuote, compact }) => {
  const isDelayed = isOrderDelayed(order);
  const isNearDeadline = isOrderNearDeadline(order);

  return (
    <Card 
      style={{ 
        cursor: 'pointer', 
        borderColor: isDelayed ? colors.error : isNearDeadline ? colors.warning : undefined,
        borderWidth: isDelayed || isNearDeadline ? '2px' : '1px'
      }} 
      onClick={() => onEdit(order)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
        <div>
          <h3 style={{ margin: 0, fontSize: compact ? '16px' : '18px', color: colors.text }}>{order.clientName}</h3>
          <span style={{ fontSize: '14px', color: colors.textLight }}>{order.product}</span>
        </div>
        {order.isExample && <StatusBadge status="EXEMPLO" />}
      </div>

      {!compact && (
        <>
          <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: spacing.xs }}>
              <span style={{ color: colors.textLight }}>Prazo:</span>
              <span style={{ fontWeight: 600 }}>{formatDate(order.deadline)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: spacing.xs }}>
              <span style={{ color: colors.textLight }}>Valor:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(order.agreedPrice)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: spacing.xs }}>
              <span style={{ color: colors.textLight }}>Sinal:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(order.signalAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: colors.textLight }}>Saldo:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(order.remainingBalance)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' }}>
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} />
          </div>

          {isDelayed && (
            <div style={{ marginTop: spacing.sm, color: colors.error, fontSize: '12px', display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <AlertTriangle size={14} />
              Pedido atrasado
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(order); }}>
          <Edit size={16} />
        </Button>
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onGenerateQuote(order); }}>
          <Calendar size={16} />
        </Button>
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onCopyMessage(order.status); }}>
          <Copy size={16} />
        </Button>
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onWhatsApp(order.clientPhone); }}>
          <MessageCircle size={16} />
        </Button>
        <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); onDelete(order.id); }}>
          <Trash2 size={16} />
        </Button>
      </div>
    </Card>
  );
};

interface OrderFormProps {
  order?: Order | null;
  products: Product[];
  settings?: Settings | null;
  onSave: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ order, products, settings, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Order>>(order || {
    date: new Date(),
    clientName: '',
    clientPhone: '',
    product: '',
    productId: '',
    customizations: '',
    size: '',
    quantity: 1,
    deadline: new Date(),
    agreedPrice: 0,
    signalAmount: 0,
    signalPaymentDate: undefined,
    remainingBalance: 0,
    finalPaymentDate: undefined,
    paymentMethod: '',
    status: 'Cliente escolhendo o produto',
    paymentStatus: 'pendente',
    needsMaterialPurchase: false,
    materialsPurchased: false,
    productionStartDate: undefined,
    completionDate: undefined,
    deliveryDate: undefined,
    observations: ''
  });

  const handlePriceChange = (field: 'agreedPrice' | 'signalAmount', value: number) => {
    const updated = { ...formData, [field]: value };
    if (field === 'agreedPrice' && !formData.signalAmount && settings) {
      updated.signalAmount = value * (settings.defaultSignalPercent / 100);
    }
    const remainingBalance = calculateRemainingBalance(updated.agreedPrice || 0, updated.signalAmount || 0);
    updated.remainingBalance = remainingBalance;
    setFormData(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.clientName && formData.product) {
      onSave(formData as Omit<Order, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  const handleChange = (field: keyof Order, value: any) => {
    setFormData({ ...formData, [field]: value });
    
    // Validação em tempo real para data de entrega
    if (field === 'deadline' && value && formData.date) {
      const orderDate = new Date(formData.date);
      const deadlineDate = new Date(value);
      orderDate.setHours(0, 0, 0, 0);
      deadlineDate.setHours(0, 0, 0, 0);
      
      if (deadlineDate < orderDate) {
        // Não impedimos a edição, mas poderíamos mostrar um aviso
        console.warn('Data de entrega anterior à data do pedido');
      }
    }
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md
  };

  const sectionStyle: React.CSSProperties = {
    padding: spacing.md,
    backgroundColor: `${colors.background}`,
    borderRadius: '8px'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.text,
    marginBottom: spacing.md
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.md
  };

  const calculatedFieldStyle: React.CSSProperties = {
    backgroundColor: `${colors.secondary}20`,
    cursor: 'not-allowed'
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Informações do Cliente</h3>
        <div style={gridStyle}>
          <Input
            label="Nome do cliente *"
            value={formData.clientName}
            onChange={(e) => handleChange('clientName', e.target.value)}
            required
            fullWidth
          />
          <Input
            label="Telefone/WhatsApp *"
            type="tel"
            inputMode="tel"
            value={formData.clientPhone}
            onChange={(e) => handleChange('clientPhone', e.target.value)}
            required
            fullWidth
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Produto e Personalização</h3>
        <div style={gridStyle}>
          <div>
            <label style={{ fontSize: '14px', fontWeight: 500, color: colors.text, marginBottom: spacing.xs, display: 'block' }}>
              Produto *
            </label>
            <Select
              value={formData.productId || ''}
              onChange={(e) => {
                const product = products.find(p => p.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  productId: e.target.value,
                  product: product?.name || '',
                  agreedPrice: product?.usualPrice || 0
                });
              }}
              fullWidth
            >
              <option value="">Selecione um produto...</option>
              {products.filter(p => p.active).map(p => (
                <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.usualPrice)}</option>
              ))}
            </Select>
          </div>
          <Input
            label="Personalizações"
            value={formData.customizations}
            onChange={(e) => handleChange('customizations', e.target.value)}
            fullWidth
          />
          <Input
            label="Tamanho"
            value={formData.size}
            onChange={(e) => handleChange('size', e.target.value)}
            fullWidth
          />
          <Input
            label="Quantidade"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
            fullWidth
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Prazo e Valores</h3>
        <div style={gridStyle}>
          <Input
            label="Prazo de entrega *"
            type="date"
            value={formData.deadline ? formData.deadline.toISOString().split('T')[0] : ''}
            onChange={(e) => handleChange('deadline', e.target.value ? new Date(e.target.value) : undefined)}
            required
            fullWidth
          />
          <Input
            label="Preço combinado (R$) *"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={formData.agreedPrice}
            onChange={(e) => handlePriceChange('agreedPrice', parseFloat(e.target.value) || 0)}
            required
            fullWidth
          />
          <Input
            label="Valor do sinal (R$)"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={formData.signalAmount}
            onChange={(e) => handlePriceChange('signalAmount', parseFloat(e.target.value) || 0)}
            fullWidth
          />
          <Input
            label="Saldo restante (R$)"
            type="number"
            step="0.01"
            value={formData.remainingBalance}
            style={calculatedFieldStyle}
            readOnly
            fullWidth
          />
          <Input
            label="Data do pagamento do sinal"
            type="date"
            value={formData.signalPaymentDate ? formData.signalPaymentDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleChange('signalPaymentDate', e.target.value ? new Date(e.target.value) : undefined)}
            fullWidth
          />
          <Input
            label="Data do pagamento final"
            type="date"
            value={formData.finalPaymentDate ? formData.finalPaymentDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleChange('finalPaymentDate', e.target.value ? new Date(e.target.value) : undefined)}
            fullWidth
          />
          {settings && (
            <Select
              label="Forma de pagamento"
              value={formData.paymentMethod}
              onChange={(e) => handleChange('paymentMethod', e.target.value)}
              fullWidth
            >
              <option value="">Selecione...</option>
              {settings.paymentMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Status</h3>
        <div style={gridStyle}>
          {settings && (
            <Select
              label="Status do pedido"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value as any)}
              fullWidth
            >
              {settings.orderStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          )}
          <Select
            label="Status do pagamento"
            value={formData.paymentStatus}
            onChange={(e) => handleChange('paymentStatus', e.target.value as any)}
            fullWidth
          >
            <option value="pendente">Pendente</option>
            <option value="sinal pago">Sinal pago</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </Select>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <input
              type="checkbox"
              id="needsMaterial"
              checked={formData.needsMaterialPurchase}
              onChange={(e) => handleChange('needsMaterialPurchase', e.target.checked)}
            />
            <label htmlFor="needsMaterial" style={{ fontSize: '14px' }}>Precisa comprar materiais?</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <input
              type="checkbox"
              id="materialsPurchased"
              checked={formData.materialsPurchased}
              onChange={(e) => handleChange('materialsPurchased', e.target.checked)}
            />
            <label htmlFor="materialsPurchased" style={{ fontSize: '14px' }}>Materiais comprados?</label>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Datas de Produção</h3>
        <div style={gridStyle}>
          <Input
            label="Início da produção"
            type="date"
            value={formData.productionStartDate ? formData.productionStartDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleChange('productionStartDate', e.target.value ? new Date(e.target.value) : undefined)}
            fullWidth
          />
          <Input
            label="Conclusão da produção"
            type="date"
            value={formData.completionDate ? formData.completionDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleChange('completionDate', e.target.value ? new Date(e.target.value) : undefined)}
            fullWidth
          />
          <Input
            label="Data de entrega"
            type="date"
            value={formData.deliveryDate ? formData.deliveryDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleChange('deliveryDate', e.target.value ? new Date(e.target.value) : undefined)}
            fullWidth
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <TextArea
          label="Observações"
          value={formData.observations}
          onChange={(e) => handleChange('observations', e.target.value)}
          fullWidth
        />
      </div>

      <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          Salvar
        </Button>
      </div>
    </form>
  );
};
