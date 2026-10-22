import React, { useState, useEffect } from 'react';
import { productService, purchaseService, settingsService } from '../data/services';
import type { Product, Purchase, Settings, ProductMaterial } from '../types';
import { generateId } from '../types';
import { calculateProductCost, formatCurrency, formatDate } from '../calculations';
import { Input, Select, TextArea } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { colors, spacing } from '../utils/theme';
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
    } else {
      await productService.create(productData);
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

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Produtos</h1>
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

      <div style={helpTextStyle}>
        Cadastre seus produtos de crochê, defina os materiais utilizados e calcule automaticamente o custo e a rentabilidade.
      </div>

      <div style={gridStyle}>
        {filteredProducts.map(product => {
          const cost = settings ? calculateProductCost(product, settings, purchases) : null;
          return (
            <Card key={product.id} style={{ cursor: 'pointer' }} onClick={() => handleEdit(product)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: colors.text }}>{product.name}</h3>
                  <span style={{ fontSize: '14px', color: colors.textLight }}>{product.category}</span>
                </div>
                {product.isExample && <StatusBadge status="EXEMPLO" />}
              </div>
              
              {product.description && (
                <p style={{ fontSize: '14px', color: colors.textLight, margin: `${spacing.sm} 0` }}>
                  {product.description}
                </p>
              )}

              {cost && (
                <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: spacing.xs }}>
                    <span style={{ color: colors.textLight }}>Preço:</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(product.usualPrice)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: spacing.xs }}>
                    <span style={{ color: colors.textLight }}>Custo:</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(cost.totalCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: spacing.xs }}>
                    <span style={{ color: colors.textLight }}>Lucro:</span>
                    <span style={{ fontWeight: 600, color: cost.profit >= 0 ? colors.success : colors.error }}>
                      {formatCurrency(cost.profit)} ({cost.profitMargin.toFixed(1)}%)
                    </span>
                  </div>
                  {settings && cost.profitMargin < settings.desiredProfitMargin && (
                    <div style={{ 
                      marginTop: spacing.sm, 
                      padding: spacing.sm, 
                      backgroundColor: `${colors.warning}20`, 
                      borderRadius: '8px',
                      border: `1px solid ${colors.warning}`,
                      fontSize: '12px',
                      color: colors.warning
                    }}>
                      ⚠️ Margem abaixo da meta ({settings.desiredProfitMargin}%)
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
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
    </div>
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
    observations: '',
    active: true,
    materials: []
  });

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
    marginBottom: spacing.md,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm
  };

  const materialsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.sm
  };

  const calculatedFieldStyle: React.CSSProperties = {
    backgroundColor: `${colors.secondary}20`,
    cursor: 'not-allowed'
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
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Preços</h3>
        <div style={materialsGridStyle}>
          <Input
            label="Preço sugerido (R$)"
            type="number"
            step="0.01"
            value={formData.suggestedPrice}
            onChange={(e: any) => setFormData({ ...formData, suggestedPrice: parseFloat(e.target.value) || 0 })}
            fullWidth
          />
          <Input
            label="Preço normalmente cobrado (R$)"
            type="number"
            step="0.01"
            value={formData.usualPrice}
            onChange={(e: any) => setFormData({ ...formData, usualPrice: parseFloat(e.target.value) || 0 })}
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
          <label htmlFor="active" style={{ fontSize: '14px' }}>Produto ativo</label>
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
