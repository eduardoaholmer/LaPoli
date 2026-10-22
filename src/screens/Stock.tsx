import React, { useState, useEffect } from 'react';
import { purchaseService, settingsService } from '../data/services';
import type { Purchase, Settings } from '../types';
import { calculateUnitCost, calculatePercentUsed, formatCurrency } from '../calculations';
import { Input, Select, TextArea } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { colors, spacing } from '../utils/theme';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';

export const StockScreen: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [prods, sett] = await Promise.all([
      purchaseService.getAll(),
      settingsService.initializeDefault()
    ]);
    setPurchases(prods);
    setSettings(sett);
  };

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = p.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (p.store && p.store.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !filterStatus || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = () => {
    setEditingPurchase(null);
    setShowModal(true);
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta compra?')) {
      // Salvar a compra para possível undo
      const purchaseToDelete = purchases.find(p => p.id === id);
      
      await purchaseService.delete(id);
      await loadData();
      
      // Mostrar toast com opção de undo
      if (purchaseToDelete && (window as any).toast) {
        (window as any).toast.add({
          message: 'Compra excluída com sucesso',
          type: 'success',
          onUndo: async () => {
            await purchaseService.create(purchaseToDelete);
            await loadData();
            (window as any).toast.add({
              message: 'Compra restaurada',
              type: 'success'
            });
          }
        });
      }
    }
  };

  const handleSave = async (purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingPurchase) {
      await purchaseService.update(editingPurchase.id, purchaseData);
    } else {
      await purchaseService.create(purchaseData);
    }
    setShowModal(false);
    await loadData();
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

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: spacing.lg
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

  const lowStockPurchases = purchases.filter(p => p.quantityRemaining < p.minStock);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Estoque de Materiais</h1>
        <div style={searchStyle}>
          <Input
            placeholder="Buscar materiais..."
            value={searchTerm}
            onChange={(e: any) => setSearchTerm(e.target.value)}
            fullWidth
          />
        </div>
        {settings && (
          <Select
            value={filterStatus}
            onChange={(e: any) => setFilterStatus(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="">Todos status</option>
            {settings.purchaseStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
        )}
      </div>

      <div style={helpTextStyle}>
        Registre as compras de materiais, controle o estoque restante e acompanhe os pagamentos parcelados.
      </div>

      {lowStockPurchases.length > 0 && (
        <Card style={{ marginBottom: spacing.lg, backgroundColor: `${colors.error}10`, borderColor: colors.error }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.error }}>
            <AlertTriangle size={20} />
            <strong>{lowStockPurchases.length} materiais com estoque baixo</strong>
          </div>
        </Card>
      )}

      <div style={gridStyle}>
        {filteredPurchases.map(purchase => (
          <Card key={purchase.id} style={{ cursor: 'pointer' }} onClick={() => handleEdit(purchase)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: colors.text }}>{purchase.material}</h3>
                <span style={{ fontSize: '14px', color: colors.textLight }}>
                  {purchase.brand && `${purchase.brand} • `}{purchase.type}
                </span>
              </div>
              {purchase.isExample && <StatusBadge status="EXEMPLO" />}
            </div>

            <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: spacing.xs }}>
                <span style={{ color: colors.textLight }}>Quantidade:</span>
                <span style={{ fontWeight: 600 }}>
                  {purchase.quantityRemaining} / {purchase.quantityPurchased} {purchase.unit}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: spacing.xs }}>
                <span style={{ color: colors.textLight }}>Utilizado:</span>
                <span style={{ fontWeight: 600 }}>{purchase.percentUsed.toFixed(1)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: spacing.xs }}>
                <span style={{ color: colors.textLight }}>Custo unitário:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(purchase.unitCost)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: colors.textLight }}>Valor em estoque:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(purchase.quantityRemaining * purchase.unitCost)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' }}>
              <StatusBadge status={purchase.status} />
              <StatusBadge status={purchase.paymentStatus} />
            </div>

            {purchase.quantityRemaining < purchase.minStock && (
              <div style={{ marginTop: spacing.sm, color: colors.error, fontSize: '12px', display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                <AlertTriangle size={14} />
                Estoque abaixo do mínimo ({purchase.minStock} {purchase.unit})
              </div>
            )}

            <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(purchase); }}>
                <Edit size={16} />
              </Button>
              <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(purchase.id); }}>
                <Trash2 size={16} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <button style={fabStyle} onClick={handleCreate}>
        <Plus size={24} />
      </button>

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        title={editingPurchase ? 'Editar Compra' : 'Nova Compra'}
        size="lg"
      >
        <PurchaseForm
          purchase={editingPurchase}
          settings={settings}
          onSave={handleSave}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};

interface PurchaseFormProps {
  purchase?: Purchase | null;
  settings?: Settings | null;
  onSave: (purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({ purchase, settings, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Purchase>>(purchase || {
    date: new Date(),
    material: '',
    type: 'fio',
    brand: '',
    color: '',
    unit: 'gramas',
    quantityPurchased: 0,
    quantityRemaining: 0,
    percentUsed: 0,
    totalPaid: 0,
    unitCost: 0,
    store: '',
    storeLink: '',
    paymentMethod: '',
    installments: 1,
    installmentValue: 0,
    firstInstallmentDate: undefined,
    paymentCompletionDate: undefined,
    minStock: 10,
    status: 'disponível',
    paymentStatus: 'a pagar',
    observations: ''
  });

  const handleQuantityChange = (field: 'quantityPurchased' | 'quantityRemaining', value: number) => {
    const updated = { ...formData, [field]: value };
    if (field === 'quantityPurchased' && !formData.quantityRemaining) {
      updated.quantityRemaining = value;
    }
    const percentUsed = calculatePercentUsed(
      updated.quantityPurchased || 0,
      updated.quantityRemaining || 0
    );
    updated.percentUsed = percentUsed;
    setFormData(updated);
  };

  const handleTotalPaidChange = (value: number) => {
    const unitCost = calculateUnitCost(value, formData.quantityPurchased || 0);
    const installmentValue = formData.installments ? value / formData.installments : 0;
    setFormData({ 
      ...formData, 
      totalPaid: value, 
      unitCost,
      installmentValue
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.material && formData.quantityPurchased) {
      onSave(formData as Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>);
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
        <h3 style={sectionTitleStyle}>Informações do Material</h3>
        <div style={gridStyle}>
          <Input
            label="Material *"
            value={formData.material}
            onChange={(e: any) => setFormData({ ...formData, material: e.target.value })}
            required
            fullWidth
          />
          {settings && (
            <Select
              label="Tipo *"
              value={formData.type}
              onChange={(e: any) => setFormData({ ...formData, type: e.target.value as any })}
              required
              fullWidth
            >
              {settings.materialTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          )}
          <Input
            label="Marca/modelo"
            value={formData.brand}
            onChange={(e: any) => setFormData({ ...formData, brand: e.target.value })}
            fullWidth
          />
          <Input
            label="Cor"
            value={formData.color}
            onChange={(e: any) => setFormData({ ...formData, color: e.target.value })}
            fullWidth
          />
          {settings && (
            <Select
              label="Unidade de medida *"
              value={formData.unit}
              onChange={(e: any) => setFormData({ ...formData, unit: e.target.value })}
              required
              fullWidth
            >
              {settings.units.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Quantidade e Estoque</h3>
        <div style={gridStyle}>
          <Input
            label="Quantidade comprada *"
            type="number"
            step="0.01"
            value={formData.quantityPurchased}
            onChange={(e: any) => handleQuantityChange('quantityPurchased', parseFloat(e.target.value) || 0)}
            required
            fullWidth
          />
          <Input
            label="Quantidade restante"
            type="number"
            step="0.01"
            value={formData.quantityRemaining}
            onChange={(e: any) => handleQuantityChange('quantityRemaining', parseFloat(e.target.value) || 0)}
            fullWidth
          />
          <Input
            label="Estoque mínimo"
            type="number"
            step="0.01"
            value={formData.minStock}
            onChange={(e: any) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
            fullWidth
          />
          <Input
            label="Percentual utilizado"
            type="number"
            step="0.1"
            value={formData.percentUsed}
            style={calculatedFieldStyle}
            readOnly
            fullWidth
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Valores e Pagamento</h3>
        <div style={gridStyle}>
          <Input
            label="Valor total pago (R$) *"
            type="number"
            step="0.01"
            value={formData.totalPaid}
            onChange={(e: any) => handleTotalPaidChange(parseFloat(e.target.value) || 0)}
            required
            fullWidth
          />
          <Input
            label="Custo unitário (R$)"
            type="number"
            step="0.01"
            value={formData.unitCost}
            style={calculatedFieldStyle}
            readOnly
            fullWidth
          />
          {settings && (
            <Select
              label="Forma de pagamento"
              value={formData.paymentMethod}
              onChange={(e: any) => setFormData({ ...formData, paymentMethod: e.target.value })}
              fullWidth
            >
              <option value="">Selecione...</option>
              {settings.paymentMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </Select>
          )}
          <Input
            label="Número de parcelas"
            type="number"
            min="1"
            value={formData.installments}
            onChange={(e: any) => {
              const installments = parseInt(e.target.value) || 1;
              const installmentValue = formData.totalPaid ? formData.totalPaid / installments : 0;
              setFormData({ ...formData, installments, installmentValue });
            }}
            fullWidth
          />
          <Input
            label="Valor da parcela (R$)"
            type="number"
            step="0.01"
            value={formData.installmentValue}
            style={calculatedFieldStyle}
            readOnly
            fullWidth
          />
          <Input
            label="Data da primeira parcela"
            type="date"
            value={formData.firstInstallmentDate ? formData.firstInstallmentDate.toISOString().split('T')[0] : ''}
            onChange={(e: any) => setFormData({ ...formData, firstInstallmentDate: e.target.value ? new Date(e.target.value) : undefined })}
            fullWidth
          />
          <Input
            label="Data de quitação"
            type="date"
            value={formData.paymentCompletionDate ? formData.paymentCompletionDate.toISOString().split('T')[0] : ''}
            onChange={(e: any) => setFormData({ ...formData, paymentCompletionDate: e.target.value ? new Date(e.target.value) : undefined })}
            fullWidth
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Fornecedor e Status</h3>
        <div style={gridStyle}>
          <Input
            label="Loja/fornecedor"
            value={formData.store}
            onChange={(e: any) => setFormData({ ...formData, store: e.target.value })}
            fullWidth
          />
          <Input
            label="Link da loja/comprovante"
            value={formData.storeLink}
            onChange={(e: any) => setFormData({ ...formData, storeLink: e.target.value })}
            fullWidth
          />
          {settings && (
            <>
              <Select
                label="Status do material"
                value={formData.status}
                onChange={(e: any) => setFormData({ ...formData, status: e.target.value as any })}
                fullWidth
              >
                {settings.purchaseStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
              <Select
                label="Status do pagamento"
                value={formData.paymentStatus}
                onChange={(e: any) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                fullWidth
              >
                <option value="a pagar">A pagar</option>
                <option value="parcial">Parcial</option>
                <option value="quitado">Quitado</option>
              </Select>
            </>
          )}
        </div>
      </div>

      <div style={sectionStyle}>
        <TextArea
          label="Observações"
          value={formData.observations}
          onChange={(e: any) => setFormData({ ...formData, observations: e.target.value })}
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
