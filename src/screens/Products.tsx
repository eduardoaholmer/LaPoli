import React, { useState, useEffect } from 'react';
import { productService, purchaseService, settingsService } from '../data/services';
import type { Product, Purchase, Settings, ProductMaterial } from '../types';
import { generateId } from '../types';
import { calculateProductCost, formatCurrency, formatDate, calculateSuggestedPrice, calculateWeightedAverageCost, recalculateAndUpdateStock } from '../calculations';
import { Play, Pause, Square } from 'lucide-react';
import { Input, Select, TextArea } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { ScreenLayout } from '../components/ScreenLayout';
import { EmptyState } from '../components/EmptyState';
import { AmigurumiIllustration } from '../components/Illustrations';
import { colors, spacing, borderRadius, typography, transitions, shadows } from '../utils/theme';
import { Plus, Edit, Trash2, Calculator, Copy } from 'lucide-react';

export const ProductsScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [prods, prodsPurchases, sett] = await Promise.all([
      productService.getAll(),
      purchaseService.getAll(),
      settingsService.initializeDefault()
    ]);
    setProducts(prods);
    setPurchases(prodsPurchases);
    setSettings(sett);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreate = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        // Salvar o produto para possível undo
        const productToDelete = products.find(p => p.id === id);

        await productService.delete(id);
        await loadData();

        // Mostrar toast com opção de undo
        if (productToDelete && (window as any).toast) {
          (window as any).toast.add({
            message: 'Produto excluído com sucesso',
            type: 'success',
            onUndo: async () => {
              await productService.create(productToDelete);
              await loadData();
              (window as any).toast.add({
                message: 'Produto restaurado',
                type: 'success'
              });
            }
          });
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Erro ao excluir produto');
      }
    }
  };

  const handleDuplicate = async (product: Product) => {
    const newProduct: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
      ...product,
      name: `${product.name} (cópia)`,
      materials: product.materials.map(m => ({ ...m, id: generateId() }))
    };
    await productService.create(newProduct);
    await loadData();
  };

  const handleSave = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingProduct) {
      await productService.update(editingProduct.id, productData);
      // Atualizar estoque das compras afetadas
      await recalculateAndUpdateStock(productData as Product, purchases, purchaseService);
    } else {
      await productService.create(productData);
      // Atualizar estoque das compras afetadas
      await recalculateAndUpdateStock(productData as Product, purchases, purchaseService);
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: spacing.lg
  };

  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '80px',
    right: spacing.xl,
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
    fontWeight: typography.fontWeight.semibold, // 600
    letterSpacing: typography.letterSpacing.normal // -0.01em
  };

  const cardCategoryStyle: React.CSSProperties = {
    fontSize: typography.fontSize.body, // 14px
    color: colors.textLight,
    marginTop: spacing.xs,
    display: 'block'
  };

  const cardDescriptionStyle: React.CSSProperties = {
    fontSize: typography.fontSize.body, // 14px
    color: colors.textLight,
    margin: `${spacing.md} 0`,
    lineHeight: typography.lineHeight.normal // 1.5
  };

  const priceRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: typography.fontSize.body, // 14px
    marginBottom: spacing.sm
  };

  const priceLabelStyle: React.CSSProperties = {
    color: colors.textLight,
    fontWeight: typography.fontWeight.medium // 500
  };

  const priceValueStyle: React.CSSProperties = {
    fontWeight: typography.fontWeight.semibold, // 600
    color: colors.text
  };

  const profitValueStyle: React.CSSProperties = {
    fontWeight: typography.fontWeight.bold, // 700
    fontSize: typography.fontSize.bodyLarge, // 16px
    fontFamily: typography.fontFamily.serif, // Serifada para números
    fontFeatureSettings: '"tnum"' // Tabular nums
  };

  const alertStyle: React.CSSProperties = {
    marginTop: spacing.md,
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: `${colors.warning}15`,
    borderRadius: borderRadius.md, // 12px
    border: `1px solid ${colors.warning}30`,
    fontSize: typography.fontSize.small, // 12px
    color: colors.warning,
    fontWeight: typography.fontWeight.medium // 500
  };

  const errorAlertStyle: React.CSSProperties = {
    ...alertStyle,
    backgroundColor: `${colors.error}15`,
    border: `1px solid ${colors.error}30`,
    color: colors.error
  };

  const headerContent = (
    <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={searchStyle}>
        <Input
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e: any) => setSearchTerm(e.target.value)}
          fullWidth
        />
      </div>
      {settings && (
        <Select
          value={filterCategory}
          onChange={(e: any) => setFilterCategory(e.target.value)}
          style={{ minWidth: '150px' }}
        >
          <option value="">Todas categorias</option>
          {settings.productCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>
      )}
    </div>
  );

  if (filteredProducts.length === 0) {
    return (
      <ScreenLayout
        title="Produtos"
        subtitle="Cadastre seus produtos de crochê, defina os materiais utilizados e calcule automaticamente o custo e a rentabilidade."
        action={headerContent}
      >
        <EmptyState
          icon={<AmigurumiIllustration size={120} />}
          title="Nenhum produto cadastrado"
          description="Que tal cadastrar seu primeiro produto? 🧶"
          action={{
            label: 'Adicionar Produto',
            onClick: handleCreate
          }}
        />
        <button style={fabStyle} onClick={handleCreate}>
          <Plus size={24} />
        </button>
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
          size="lg"
        >
          <ProductForm
            product={editingProduct}
            purchases={purchases}
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
      title="Produtos"
      subtitle="Cadastre seus produtos de crochê, defina os materiais utilizados e calcule automaticamente o custo e a rentabilidade."
      action={headerContent}
    >
      <div style={gridStyle}>
        {filteredProducts.map(product => {
          const cost = settings ? calculateProductCost(product, settings, purchases) : null;
          return (
            <Card key={product.id} style={{ cursor: 'pointer', transition: `all ${transitions.normal}` }} onClick={() => handleEdit(product)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                <div>
                  <h3 style={cardNameStyle}>{product.name}</h3>
                  <span style={cardCategoryStyle}>{product.category}</span>
                </div>
                {product.isExample && <StatusBadge status="EXEMPLO" />}
              </div>

              {product.description && (
                <p style={cardDescriptionStyle}>
                  {product.description}
                </p>
              )}

              {cost && (
                <div style={{ marginTop: spacing.lg, paddingTop: spacing.lg, borderTop: `1px solid ${colors.border}` }}>
                  <div style={priceRowStyle}>
                    <span style={priceLabelStyle}>Preço:</span>
                    <span style={priceValueStyle}>{formatCurrency(product.usualPrice)}</span>
                  </div>
                  <div style={priceRowStyle}>
                    <span style={priceLabelStyle}>Custo:</span>
                    <span style={priceValueStyle}>{formatCurrency(cost.totalCost)}</span>
                  </div>
                  <div style={priceRowStyle}>
                    <span style={priceLabelStyle}>Lucro:</span>
                    <span style={{ ...profitValueStyle, color: cost.profit >= 0 ? colors.success : colors.error }}>
                      {formatCurrency(cost.profit)} ({cost.profitMargin.toFixed(1)}%)
                    </span>
                  </div>
                  {settings && cost.profitMargin < settings.desiredProfitMargin && (
                    <div style={alertStyle}>
                      ⚠️ Margem abaixo da meta ({settings.desiredProfitMargin}%)
                    </div>
                  )}
                  {cost.profit < 0 && (
                    <div style={errorAlertStyle}>
                      ⚠️ Vendendo com prejuízo ({formatCurrency(Math.abs(cost.profit))})
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.lg }}>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(product); }}>
                  <Edit size={16} />
                </Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDuplicate(product); }}>
                  <Copy size={16} />
                </Button>
                <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <button style={fabStyle} onClick={handleCreate}>
        <Plus size={24} />
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
        size="lg"
      >
        <ProductForm
          product={editingProduct}
          purchases={purchases}
          settings={settings}
          onSave={handleSave}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </ScreenLayout>
  );
};

interface ProductFormProps {
  product?: Product | null;
  purchases: Purchase[];
  settings?: Settings | null;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, purchases, settings, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Product>>(product || {
    name: '',
    category: '',
    description: '',
    size: '',
    recipeLink: '',
    needleSize: '',
    estimatedTime: 0,
    actualTime: 0,
    suggestedPrice: 0,
    usualPrice: 0,
    otherCosts: 0,
    observations: '',
    active: true,
    materials: []
  });

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isTimerRunning) {
      interval = window.setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimerToggle = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleTimerStop = () => {
    setIsTimerRunning(false);
    const hours = timerSeconds / 3600;
    setFormData({ ...formData, actualTime: (formData.actualTime || 0) + hours });
    setTimerSeconds(0);
  };

  const handleAddMaterial = () => {
    const newMaterial: ProductMaterial = {
      id: generateId(),
      materialId: '',
      material: '',
      type: 'fio',
      unit: 'gramas',
      quantityUsed: 0,
      unitCost: 0,
      totalCost: 0
    };
    setFormData({
      ...formData,
      materials: [...(formData.materials || []), newMaterial]
    });
  };

  const handleUpdateMaterial = (index: number, updates: Partial<ProductMaterial>) => {
    const materials = [...(formData.materials || [])];
    materials[index] = { ...materials[index], ...updates };
    
    const purchase = purchases.find(p => p.id === updates.purchaseId);
    const unitCost = purchase ? purchase.unitCost : 0;
    const totalCost = updates.quantityUsed ? updates.quantityUsed * unitCost : 0;
    
    materials[index] = { ...materials[index], unitCost, totalCost };
    
    setFormData({ ...formData, materials });
  };

  const handleRemoveMaterial = (index: number) => {
    const materials = formData.materials?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, materials });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.category) {
      onSave(formData as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xl
  };

  const sectionStyle: React.CSSProperties = {
    padding: spacing.xl,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.lg // 20px
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.h3, // 20px
    fontWeight: typography.fontWeight.semibold, // 600
    color: colors.text,
    marginBottom: spacing.lg,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    letterSpacing: typography.letterSpacing.normal // -0.01em
  };

  const materialsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: spacing.md
  };

  const calculatedFieldStyle: React.CSSProperties = {
    backgroundColor: `${colors.secondary}15`,
    cursor: 'not-allowed'
  };

  const timerContainerStyle: React.CSSProperties = {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: `${colors.primary}12`,
    borderRadius: borderRadius.md, // 12px
  };

  const timerTitleStyle: React.CSSProperties = {
    margin: 0,
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.body, // 14px
    color: colors.text,
    fontWeight: typography.fontWeight.semibold // 600
  };

  const timerDisplayStyle: React.CSSProperties = {
    fontSize: typography.fontSize.h2, // 24px
    fontWeight: typography.fontWeight.bold, // 700
    fontFamily: 'monospace',
    color: colors.primary,
    letterSpacing: typography.letterSpacing.tight // -0.02em
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Informações Básicas</h3>
        <div style={materialsGridStyle}>
          <Input
            label="Nome do produto *"
            value={formData.name}
            onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
          />
          {settings && (
            <Select
              label="Categoria *"
              value={formData.category}
              onChange={(e: any) => setFormData({ ...formData, category: e.target.value })}
              required
              fullWidth
            >
              <option value="">Selecione...</option>
              {settings.productCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          )}
          <Input
            label="Tamanho/dimensões"
            value={formData.size}
            onChange={(e: any) => setFormData({ ...formData, size: e.target.value })}
            fullWidth
          />
          <Input
            label="Número da agulha"
            value={formData.needleSize}
            onChange={(e: any) => setFormData({ ...formData, needleSize: e.target.value })}
            fullWidth
          />
        </div>
        <TextArea
          label="Descrição"
          value={formData.description}
          onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
          fullWidth
        />
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Tempo de Produção</h3>
        <div style={materialsGridStyle}>
          <Input
            label="Tempo estimado (horas)"
            type="number"
            step="0.5"
            value={formData.estimatedTime}
            onChange={(e: any) => setFormData({ ...formData, estimatedTime: parseFloat(e.target.value) || 0 })}
            fullWidth
          />
          <Input
            label="Tempo real (horas)"
            type="number"
            step="0.5"
            value={formData.actualTime}
            onChange={(e: any) => setFormData({ ...formData, actualTime: parseFloat(e.target.value) || 0 })}
            fullWidth
          />
        </div>
        <div style={timerContainerStyle}>
          <h4 style={timerTitleStyle}>Cronômetro</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <div style={timerDisplayStyle}>
              {formatTimer(timerSeconds)}
            </div>
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <Button
                type="button"
                variant={isTimerRunning ? 'secondary' : 'primary'}
                onClick={handleTimerToggle}
                size="sm"
              >
                {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleTimerStop}
                size="sm"
                disabled={timerSeconds === 0}
              >
                <Square size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Preços</h3>
        <div style={materialsGridStyle}>
          <Input
            label="Preço sugerido (R$)"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={formData.suggestedPrice}
            onChange={(e: any) => setFormData({ ...formData, suggestedPrice: parseFloat(e.target.value) || 0 })}
            fullWidth
          />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: spacing.sm }}>
            <Input
              label="Preço normalmente cobrado (R$)"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={formData.usualPrice}
              onChange={(e: any) => setFormData({ ...formData, usualPrice: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!settings) return;
                // Calcular custo total atual
                let materialCost = 0;
                (formData.materials || []).forEach((pm: any) => {
                  if (pm.purchaseId) {
                    const purchase = purchases.find(p => p.id === pm.purchaseId);
                    if (purchase) {
                      materialCost += pm.quantityUsed * purchase.unitCost;
                    }
                  } else {
                    const materialPurchases = purchases.filter(p => p.material === pm.material);
                    const avgCost = calculateWeightedAverageCost(materialPurchases);
                    materialCost += pm.quantityUsed * avgCost;
                  }
                });
                const laborCost = (formData.actualTime || formData.estimatedTime || 0) * settings.hourlyRate;
                const otherCosts = formData.otherCosts || 0;
                const totalCost = materialCost + laborCost + otherCosts;
                const suggested = calculateSuggestedPrice(totalCost, settings.desiredProfitMargin);
                setFormData({ ...formData, suggestedPrice: Math.round(suggested * 100) / 100 });
              }}
              style={{ minHeight: '44px', whiteSpace: 'nowrap' }}
            >
              Calcular
            </Button>
          </div>
          <Input
            label="Outros custos (embalagem, etiquetas, etc.) (R$)"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={formData.otherCosts || 0}
            onChange={(e: any) => setFormData({ ...formData, otherCosts: parseFloat(e.target.value) || 0 })}
            fullWidth
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <Calculator size={18} />
          Materiais Utilizados
        </h3>
        {(formData.materials || []).map((material, index) => (
          <Card key={material.id} style={{ marginBottom: spacing.sm }}>
            <div style={materialsGridStyle}>
              <Input
                label="Material"
                value={material.material}
                onChange={(e: any) => handleUpdateMaterial(index, { material: e.target.value })}
                fullWidth
              />
              {settings && (
                <Select
                  label="Tipo"
                  value={material.type}
                  onChange={(e: any) => handleUpdateMaterial(index, { type: e.target.value as any })}
                  fullWidth
                >
                  {settings.materialTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              )}
              {settings && (
                <Select
                  label="Unidade"
                  value={material.unit}
                  onChange={(e: any) => handleUpdateMaterial(index, { unit: e.target.value })}
                  fullWidth
                >
                  {settings.units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </Select>
              )}
              <Input
                label="Quantidade utilizada"
                type="number"
                step="0.01"
                value={material.quantityUsed}
                onChange={(e: any) => handleUpdateMaterial(index, { quantityUsed: parseFloat(e.target.value) || 0 })}
                fullWidth
              />
              <Select
                label="Compra de origem (opcional)"
                value={material.purchaseId || ''}
                onChange={(e: any) => handleUpdateMaterial(index, { purchaseId: e.target.value || undefined })}
                fullWidth
              >
                <option value="">Usar custo médio</option>
                {purchases.map(p => (
                  <option key={p.id} value={p.id}>{p.material} - {formatDate(p.date)}</option>
                ))}
              </Select>
              <Input
                label="Custo unitário (R$)"
                type="number"
                step="0.01"
                value={material.unitCost}
                style={calculatedFieldStyle}
                readOnly
                fullWidth
              />
              <Input
                label="Custo total (R$)"
                type="number"
                step="0.01"
                value={material.totalCost}
                style={calculatedFieldStyle}
                readOnly
                fullWidth
              />
            </div>
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => handleRemoveMaterial(index)}
              style={{ marginTop: spacing.sm }}
            >
              Remover Material
            </Button>
          </Card>
        ))}
        <Button onClick={handleAddMaterial} variant="ghost" fullWidth>
          <Plus size={20} /> Adicionar Material
        </Button>
      </div>

      <div style={sectionStyle}>
        <TextArea
          label="Observações"
          value={formData.observations}
          onChange={(e: any) => setFormData({ ...formData, observations: e.target.value })}
          fullWidth
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
          <input
            type="checkbox"
            id="active"
            checked={formData.active}
            onChange={(e: any) => setFormData({ ...formData, active: e.target.checked })}
          />
          <label htmlFor="active" style={{ fontSize: typography.fontSize.body, fontWeight: typography.fontWeight.medium }}>Produto ativo</label>
        </div>
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
