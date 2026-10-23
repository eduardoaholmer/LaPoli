import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { ColorPicker } from '../components/ColorPicker';
import type { Purchase, Settings } from '../types';
import { calculatePercentUsed, calculateUnitCost, formatCurrency, updatePurchaseStatus } from '../calculations';
import { formatUnitCost, materialKey, packageEquivalent, unitShort, type MaterialGroup } from '../calculations/materials';
import { Button } from '../components/Button';
import { Checkbox, Input, Select, TextArea } from '../components/Input';
import { Alert } from '../components/ui';

export type PurchaseData = Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>;

interface PurchaseFormProps {
  purchase?: Purchase | null;
  settings: Settings | null;
  materials: MaterialGroup[]; // para sugerir nomes que já existem e manter o estoque agrupado
  defaultMaterial?: string;
  /** Pode ser assíncrono: se lançar erro, o formulário continua aberto e mostra a mensagem. */
  onSave: (data: PurchaseData) => void | Promise<void>;
  onCancel: () => void;
}

const PACKAGE_NAMES = ['novelo', 'rolo', 'pacote', 'cone', 'caixa'];

const dateValue = (d?: Date) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().split('T')[0] : '');

/** Cadastro de compra de material. Novo: embalagem (ex.: 2 novelos de 100 g) além da quantidade direta. */
export const PurchaseForm: React.FC<PurchaseFormProps> = ({ purchase, settings, materials, defaultMaterial, onSave, onCancel }) => {
  const [form, setForm] = useState<Partial<Purchase>>(
    purchase ?? {
      date: new Date(),
      material: defaultMaterial ?? '',
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
      minStock: 10,
      status: 'disponível',
      paymentStatus: 'a pagar',
      observations: ''
    }
  );
  const [usePackage, setUsePackage] = useState(!!purchase?.packageSize);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!purchase;

  const apply = (patch: Partial<Purchase>) => {
    const next = { ...form, ...patch };
    const purchased = next.quantityPurchased || 0;
    // compra nova: o que resta começa igual ao que foi comprado
    if (!isEdit && ('quantityPurchased' in patch)) next.quantityRemaining = purchased;
    next.percentUsed = calculatePercentUsed(purchased, next.quantityRemaining || 0);
    next.unitCost = calculateUnitCost(next.totalPaid || 0, purchased);
    next.installmentValue = next.installments ? (next.totalPaid || 0) / next.installments : 0;
    setForm(next);
  };

  const applyPackage = (patch: { packageName?: string; packageCount?: number; packageSize?: number }) => {
    const name = patch.packageName ?? form.packageName ?? 'novelo';
    const count = patch.packageCount ?? form.packageCount ?? 0;
    const size = patch.packageSize ?? form.packageSize ?? 0;
    apply({ packageName: name, packageCount: count, packageSize: size, quantityPurchased: count * size });
  };

  const togglePackage = (on: boolean) => {
    setUsePackage(on);
    if (on) applyPackage({ packageName: form.packageName ?? 'novelo', packageCount: form.packageCount ?? 1, packageSize: form.packageSize ?? 100 });
    else setForm(f => ({ ...f, packageName: undefined, packageCount: undefined, packageSize: undefined }));
  };

  const purchased = form.quantityPurchased || 0;
  const eq = packageEquivalent(purchased, form.packageName, form.packageSize);
  const materialError = submitted && !form.material?.trim() ? 'Informe o material.' : undefined;
  const quantityError = submitted && !purchased ? 'Informe a quantidade comprada.' : undefined;

  const missing = [!form.material?.trim() && 'Material', !purchased && 'Quantidade comprada'].filter(Boolean) as string[];

  // Em formulário longo o erro do campo fica fora da tela: leva até o primeiro campo que falta
  useEffect(() => {
    if (attempts === 0) return;
    const field = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    field?.focus({ preventScroll: true });
  }, [attempts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSubmitted(true);
    setSaveError('');
    if (missing.length > 0) {
      setAttempts(n => n + 1);
      return;
    }
    const data = { ...form } as PurchaseData;
    data.status = isEdit ? data.status : updatePurchaseStatus({ ...(data as Purchase), quantityRemaining: data.quantityRemaining ?? purchased });
    setSaving(true);
    try {
      await onSave(data);
    } catch (error) {
      console.error('Erro ao salvar a compra:', error);
      setSaveError(error instanceof Error && error.message ? error.message : 'Erro desconhecido ao gravar no navegador.');
    } finally {
      setSaving(false);
    }
  };

  const unit = form.unit ?? 'gramas';

  // Mesmo material em outra unidade soma números que não se comparam (200 g + 150 m)
  const existing = materials.find(g => g.key === materialKey(form.material ?? ''));
  const otherUnits = existing?.purchases.filter(p => p.id !== purchase?.id).map(p => p.unit) ?? [];
  const unitConflict = otherUnits.length > 0 && !otherUnits.some(u => unitShort(u) === unitShort(unit)) ? otherUnits[0] : undefined;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <div className="stack">
        <div className="form-grid">
          <div className="full">
            <Input label="Material *" list="material-names" value={form.material ?? ''} onChange={e => apply({ material: e.target.value })} error={materialError} placeholder="Ex.: Fio Amigurumi Círculo · Caramelo" help="Se já existe um material com este nome, a compra soma ao estoque dele." fullWidth />
            <datalist id="material-names">
              {materials.map(g => (
                <option key={g.key} value={g.name} />
              ))}
            </datalist>
          </div>
          {settings && (
            <Select label="Tipo *" value={form.type} onChange={e => apply({ type: e.target.value as Purchase['type'] })} fullWidth>
              {settings.materialTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          )}
          {settings && (
            <Select label="Unidade de medida *" value={unit} onChange={e => apply({ unit: e.target.value })} fullWidth>
              {settings.units.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Select>
          )}
          {unitConflict && (
            <div className="full">
              <Alert tone="warning" icon={<AlertTriangle size={20} />} title={`“${existing?.name}” está em ${unitShort(unitConflict)} no estoque`}>
                Comprando em {unitShort(unit)}, as quantidades se misturam e o total deixa de fazer sentido. Use a mesma unidade ou dê outro nome ao material.
                <div className="mt-8">
                  <Button type="button" variant="secondary" size="sm" onClick={() => apply({ unit: unitConflict })}>
                    Usar {unitShort(unitConflict)}
                  </Button>
                </div>
              </Alert>
            </div>
          )}
          <Input label="Marca/modelo" optional value={form.brand ?? ''} onChange={e => apply({ brand: e.target.value })} fullWidth />
          <Input label="Cor" optional value={form.color ?? ''} onChange={e => apply({ color: e.target.value })} fullWidth />
          <div className="full">
            <span className="label">Cor exata <span className="opt">(opcional, aparece no estoque)</span></span>
            <ColorPicker name={form.color} hex={form.colorHex} onChange={apply} />
          </div>
        </div>

        <div className="card sand flat">
          <h3 style={{ fontSize: 17, marginBottom: 12 }}>Quantidade e estoque</h3>
          <Checkbox checked={usePackage} onChange={togglePackage} label="Comprei em novelos, rolos ou pacotes" description="Informe quantos e quanto cada um tem. Ex.: 2 novelos de 100 g." />
          {usePackage ? (
            <div className="form-grid mt-8">
              <Select label="Embalagem" value={form.packageName ?? 'novelo'} onChange={e => applyPackage({ packageName: e.target.value })} fullWidth>
                {PACKAGE_NAMES.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
              <Input label={`Quantos ${form.packageName ?? 'novelo'}s comprou`} type="number" min={0} step="1" inputMode="numeric" value={form.packageCount ?? ''} onChange={e => applyPackage({ packageCount: parseFloat(e.target.value) || 0 })} error={quantityError} fullWidth />
              <Input label={`Cada ${form.packageName ?? 'novelo'} tem`} type="number" min={0} step="any" inputMode="decimal" value={form.packageSize ?? ''} onChange={e => applyPackage({ packageSize: parseFloat(e.target.value) || 0 })} suffix={unitShort(unit)} help="Está no rótulo. Ex.: 100 g." fullWidth />
              <div className="full">
                {purchased > 0 && (
                  <div className="pkg-total">
                    <Package size={18} />
                    <span>
                      <b>
                        {form.packageCount} {form.packageName}
                        {(form.packageCount ?? 0) >= 2 ? 's' : ''} × {form.packageSize} {unitShort(unit)} = {purchased.toLocaleString('pt-BR')} {unitShort(unit)}
                      </b>{' '}
                      no total
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="form-grid mt-8">
              <Input label="Quantidade comprada *" type="number" min={0} step="any" inputMode="decimal" value={form.quantityPurchased || ''} onChange={e => apply({ quantityPurchased: parseFloat(e.target.value) || 0 })} error={quantityError} suffix={unitShort(unit)} fullWidth />
            </div>
          )}
          <div className="form-grid mt-8">
            <Input label="Quantidade restante" type="number" min={0} step="any" inputMode="decimal" value={form.quantityRemaining ?? 0} onChange={e => apply({ quantityRemaining: parseFloat(e.target.value) || 0 })} suffix={unitShort(unit)} help={isEdit ? 'Ajuste aqui se a contagem estiver diferente.' : 'Começa igual ao que você comprou.'} fullWidth />
            <Input label="Estoque mínimo" type="number" min={0} step="any" inputMode="decimal" value={form.minStock ?? 0} onChange={e => apply({ minStock: parseFloat(e.target.value) || 0 })} suffix={unitShort(unit)} help="Abaixo disso aparece o alerta." fullWidth />
          </div>
          {eq && <p className="small muted mt-8">Equivale a {eq}.</p>}
        </div>

        <div className="form-grid">
          <Input label="Valor total pago *" type="number" min={0} step="0.01" inputMode="decimal" value={form.totalPaid || ''} onChange={e => apply({ totalPaid: parseFloat(e.target.value) || 0 })} prefix="R$" help="O valor de tudo junto, como no cupom." fullWidth />
          <Input label="Custo unitário" readOnly value={form.unitCost ? formatUnitCost(form.unitCost).replace('R$ ', '') : ''} prefix="R$" suffix={`/ ${unitShort(unit)}`} help="Calculado: total pago ÷ quantidade." fullWidth />
          {settings && (
            <Select label="Forma de pagamento" value={form.paymentMethod ?? ''} onChange={e => apply({ paymentMethod: e.target.value })} fullWidth>
              <option value="">Selecione…</option>
              {settings.paymentMethods.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          )}
          <Input label="Data da compra" type="date" value={dateValue(form.date)} onChange={e => e.target.value && apply({ date: new Date(`${e.target.value}T12:00:00`) })} fullWidth />
          <Input label="Número de parcelas" type="number" min={1} value={form.installments ?? 1} onChange={e => apply({ installments: parseInt(e.target.value) || 1 })} fullWidth />
          <Input label="Valor da parcela" readOnly value={(form.installmentValue ?? 0).toFixed(2)} prefix="R$" fullWidth />
          <Input label="Data da primeira parcela" type="date" optional value={dateValue(form.firstInstallmentDate)} onChange={e => apply({ firstInstallmentDate: e.target.value ? new Date(`${e.target.value}T12:00:00`) : undefined })} fullWidth />
          <Input label="Data de quitação" type="date" optional value={dateValue(form.paymentCompletionDate)} onChange={e => apply({ paymentCompletionDate: e.target.value ? new Date(`${e.target.value}T12:00:00`) : undefined })} fullWidth />
          <Input label="Loja/fornecedor" optional value={form.store ?? ''} onChange={e => apply({ store: e.target.value })} fullWidth />
          <Input label="Link da loja/comprovante" optional value={form.storeLink ?? ''} onChange={e => apply({ storeLink: e.target.value })} fullWidth />
          {settings && (
            <Select label="Status do material" value={form.status} onChange={e => apply({ status: e.target.value as Purchase['status'] })} fullWidth>
              {settings.purchaseStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          )}
          <Select label="Status do pagamento" value={form.paymentStatus} onChange={e => apply({ paymentStatus: e.target.value as Purchase['paymentStatus'] })} fullWidth>
            <option value="a pagar">A pagar</option>
            <option value="parcial">Parcial</option>
            <option value="quitado">Quitado</option>
          </Select>
          <div className="full">
            <TextArea label="Observações" optional value={form.observations ?? ''} onChange={e => apply({ observations: e.target.value })} fullWidth />
          </div>
        </div>

        <Alert tone="info" title="Como esta compra entra nas contas">
          Soma ao estoque agora. Só vira custo quando o material for usado em uma peça vendida.
          {(form.totalPaid ?? 0) > 0 && purchased > 0 && <> Custo: {formatCurrency(form.totalPaid ?? 0)} pelo lote todo.</>}
        </Alert>
      </div>

      {submitted && missing.length > 0 && (
        <Alert tone="error" icon={<AlertTriangle size={20} />} title="Falta preencher" className="mt-16">
          {missing.join(' e ')}. O campo está marcado acima.
        </Alert>
      )}
      {saveError && (
        <Alert tone="error" icon={<AlertTriangle size={20} />} title="Não foi possível salvar a compra" className="mt-16">
          {saveError} Seus dados continuam no formulário; tente de novo.
        </Alert>
      )}

      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar compra'}</Button>
      </div>
    </form>
  );
};
