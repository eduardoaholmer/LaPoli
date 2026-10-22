import React, { useState, useEffect } from 'react';
import { purchaseService, settingsService } from '../data/services';
import type { Purchase, Settings } from '../types';
import { calculateUnitCost, calculatePercentUsed, formatCurrency } from '../calculations';
import { Input, Select, TextArea } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { ScreenLayout } from '../components/ScreenLayout';
import { EmptyState } from '../components/EmptyState';
import { HookIllustration } from '../components/Illustrations';
import { colors, spacing, borderRadius, typography, transitions, shadows } from '../utils/theme';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';

export const StockScreen: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingList, setShoppingList] = useState<Purchase[]>([]);

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

    // Carregar lista de compras
    const { backupService } = await import('../data/services');
    const shopping = await (backupService as any).getShoppingList();
    setShoppingList(shopping);
  };

  const handleShowShoppingList = async () => {
    const { backupService } = await import('../data/services');
    const shopping = await (backupService as any).getShoppingList();
    setShoppingList(shopping);
    setShowShoppingList(true);
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
      try {
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
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Erro ao excluir compra');
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

  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '80px',
    right: spacing.lg,
    width: '56px',
    height: '56px',
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.primary,
    zIndex: 99,
    transition: `all ${transitions.normal}`
  };

  const cardNameStyle: React.CSSProperties = {
    margin: 0,
    fontSize: typography.fontSize.subheading, // 18px
    color: colors.text,
    fontWeight: typography.fontWeight.semibold // 600
  };

  const cardBrandStyle: React.CSSProperties = {
    fontSize: typography.fontSize.body, // 14px
    color: colors.textLight
  };

  const infoRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: typography.fontSize.body, // 14px
    marginBottom: spacing.xs
  };

  const infoLabelStyle: React.CSSProperties = {
    color: colors.textLight
  };

  const infoValueStyle: React.CSSProperties = {
    fontWeight: typography.fontWeight.semibold // 600
  };

  const lowStockAlertStyle: React.CSSProperties = {
    marginTop: spacing.sm,
    color: colors.error,
    fontSize: typography.fontSize.small, // 12px
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs
  };

  const lowStockCardStyle: React.CSSProperties = {
    marginBottom: spacing.lg,
    backgroundColor: `${colors.error}12`,
    borderColor: colors.error
  };

  const lowStockPurchases = purchases.filter(p => p.quantityRemaining < p.minStock);

  const headerContent = (
    <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
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
      <Button
        variant="secondary"
        onClick={handleShowShoppingList}
        icon={<AlertTriangle size={20} />}
      >
        Lista de Compras
      </Button>
    </div>
  );

  if (filteredPurchases.length === 0) {
    return (
      <ScreenLayout
        title="Estoque de Materiais"
        subtitle="Registre as compras de materiais, controle o estoque restante e acompanhe os pagamentos parcelados."
        action={headerContent}
      >
        <EmptyState
          icon={<HookIllustration size={120} />}
          title="Nenhum material cadastrado"
          description="Que tal cadastrar sua primeira compra de materiais? 🧶"
          action={{
            label: 'Adicionar Material',
            onClick: handleCreate
          }}
        />
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
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      title="Estoque de Materiais"
      subtitle="Registre as compras de materiais, controle o estoque restante e acompanhe os pagamentos parcelados."
      action={headerContent}
    >
      {lowStockPurchases.length > 0 && (
        <Card style={lowStockCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.error }}>
            <AlertTriangle size={20} />
            <strong>{lowStockPurchases.length} materiais com estoque baixo</strong>
          </div>
        </Card>
      )}

      <div style={gridStyle}>
        {filteredPurchases.map(purchase => (
          <Card key={purchase.id} style={{ cursor: 'pointer', transition: `all ${transitions.normal}` }} onClick={() => handleEdit(purchase)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
              <div>
                <h3 style={cardNameStyle}>{purchase.material}</h3>
                <span style={cardBrandStyle}>
                  {purchase.brand && `${purchase.brand} • `}{purchase.type}
                </span>
              </div>
              {purchase.isExample && <StatusBadge status="EXEMPLO" />}
            </div>

            <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Quantidade:</span>
                <span style={infoValueStyle}>
                  {purchase.quantityRemaining} / {purchase.quantityPurchased} {purchase.unit}
                </span>
              </div>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Utilizado:</span>
                <span style={infoValueStyle}>{purchase.percentUsed.toFixed(1)}%</span>
              </div>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Custo unitário:</span>
                <span style={infoValueStyle}>{formatCurrency(purchase.unitCost)}</span>
              </div>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Valor em estoque:</span>
                <span style={infoValueStyle}>{formatCurrency(purchase.quantityRemaining * purchase.unitCost)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' }}>
              <StatusBadge status={purchase.status} />
              <StatusBadge status={purchase.paymentStatus} />
            </div>

            {purchase.quantityRemaining < purchase.minStock && (
              <div style={lowStockAlertStyle}>
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

      <Modal
        isOpen={showShoppingList}
        onClose={() => setShowShoppingList(false)}
        title="Lista de Compras Sugeridas"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <p style={{ fontSize: typography.fontSize.body, color: colors.textLight }}>
            Materiais abaixo do estoque mínimo que precisam ser comprados:
          </p>
          {shoppingList.length === 0 ? (
            <p style={{ textAlign: 'center', padding: spacing.lg, color: colors.textLight }}>
              Todos os materiais estão com estoque adequado! 🎉
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {shoppingList.map(purchase => (
                <Card key={purchase.id} style={{ padding: spacing.md }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: typography.fontSize.bodyLarge, color: colors.text, fontWeight: typography.fontWeight.semibold }}>{purchase.material}</h4>
                      <span style={{ fontSize: typography.fontSize.small, color: colors.textLight }}>
                        {purchase.brand && `${purchase.brand} • `}{purchase.type}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: typography.fontSize.body, color: colors.error, fontWeight: typography.fontWeight.semibold }}>
                        {purchase.quantityRemaining.toFixed(2)} {purchase.unit}
                      </div>
                      <div style={{ fontSize: typography.fontSize.small, color: colors.textLight }}>
                        Mínimo: {purchase.minStock} {purchase.unit}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: spacing.sm, fontSize: typography.fontSize.small, color: colors.textLight }}>
                    Faltam: {(purchase.minStock - purchase.quantityRemaining).toFixed(2)} {purchase.unit}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </ScreenLayout>
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
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.lg // 20px
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.h3, // 20px
    fontWeight: typography.fontWeight.semibold, // 600
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
            inputMode="decimal"
            value={formData.totalPaid}
            onChange={(e: any) => handleTotalPaidChange(parseFloat(e.target.value) || 0)}
            required
            fullWidth
          />
          <Input
            label="Custo unitário (R$)"
            type="number"
            step="0.01"
            inputMode="decimal"
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
            inputMode="decimal"
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
