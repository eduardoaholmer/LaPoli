import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Copy, Package } from 'lucide-react';
import { ColorPicker } from '../components/ColorPicker';
import type { Purchase, Settings } from '../types';
import { calculatePercentUsed, calculateUnitCost, dateInputValue, updatePurchaseStatus } from '../calculations';
import { defaultMinStock, formatUnitCost, materialKey, packageEquivalent, unitShort, type MaterialGroup } from '../calculations/materials';
import { findSimilarMaterial, fullMaterialName } from '../calculations/materialName';
import { Button } from '../components/Button';
import { Checkbox, Input, Select, TextArea } from '../components/Input';
import { Alert } from '../components/ui';
import { useLeaveWarning } from '../utils/leaveWarning';

export type PurchaseData = Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>;

interface PurchaseFormProps {
  purchase?: Purchase | null;
  settings: Settings | null;
  materials: MaterialGroup[]; // para sugerir nomes que já existem e manter o estoque agrupado
  defaultMaterial?: string; // nome completo do material (com a marca), para "Comprei" de um material
  /** Pode ser assíncrono: se lançar erro, o formulário continua aberto e mostra a mensagem. */
  onSave: (data: PurchaseData) => void | Promise<void>;
  onCancel: () => void;
  /** Avisa quando algo foi preenchido, para o modal perguntar antes de fechar. */
  onDirtyChange?: (dirty: boolean) => void;
}

const PACKAGE_NAMES = ['novelo', 'rolo', 'pacote', 'cone', 'caixa'];

const dateValue = dateInputValue;

/** O que se repete de uma compra para a outra do mesmo material (recompra sem redigitar). */
const fromLastPurchase = (last: Purchase): Partial<Purchase> => ({
  type: last.type,
  unit: last.unit,
  brand: last.brand ?? '',
  color: last.color ?? '',
  colorHex: last.colorHex,
  minStock: last.minStock,
  store: last.store ?? '',
  ...(last.packageSize ? { packageName: last.packageName ?? 'novelo', packageSize: last.packageSize } : {})
});

/**
 * Cadastro de compra de material. À vista só o essencial (material, marca, quantidade, valor e pagamento);
 * cor, mínimo, parcelas e loja ficam em "Mais detalhes". Cada marca é um material separado no estoque.
 */
export const PurchaseForm: React.FC<PurchaseFormProps> = ({ purchase, settings, materials, defaultMaterial, onSave, onCancel, onDirtyChange }) => {
  const isEdit = !!purchase;
  const findGroup = (name?: string, brand?: string) => materials.find(g => g.key === materialKey(fullMaterialName(name ?? '', brand)));
  // a mesma linha em todas as marcas, a comprada por último primeiro
  const sameLine = (name?: string) =>
    materials
      .filter(g => materialKey(g.baseName) === materialKey(name ?? '') && materialKey(name ?? ''))
      .sort((a, b) => new Date(b.purchases[0].date).getTime() - new Date(a.purchases[0].date).getTime());
  const initialGroup = isEdit ? undefined : materials.find(g => g.name === defaultMaterial) ?? findGroup(defaultMaterial);

  const [form, setForm] = useState<Partial<Purchase>>(() =>
    purchase ?? {
      date: new Date(),
      material: initialGroup?.baseName ?? defaultMaterial ?? '',
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
      minStock: defaultMinStock('gramas'),
      status: 'disponível',
      // quase toda compra é paga na hora (Pix, dinheiro); "a pagar" criava conta fantasma no Financeiro
      paymentStatus: 'quitado',
      observations: '',
      ...(initialGroup ? fromLastPurchase(initialGroup.purchases[0]) : {})
    }
  );
  const [usePackage, setUsePackage] = useState(!!form.packageSize);
  const [prefilledFrom, setPrefilledFrom] = useState(initialGroup?.name);
  const [minTouched, setMinTouched] = useState(isEdit);
  const [brandTyped, setBrandTyped] = useState(false); // marca escolhida por ela (e não copiada de outra compra)
  const [free, setFree] = useState(!!purchase && !(purchase.totalPaid > 0));
  const [showMore, setShowMore] = useState(isEdit);
  const [dirty, setDirty] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const onDirtyRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyRef.current = onDirtyChange;
  });
  useEffect(() => {
    onDirtyRef.current?.(dirty);
  }, [dirty]);
  useLeaveWarning(dirty && !saving);
  // fechou (salvou ou cancelou): nada mais a proteger
  useEffect(() => () => onDirtyRef.current?.(false), []);

  const apply = (patch: Partial<Purchase>) => {
    let next = { ...form, ...patch };
    let copied = !!prefilledFrom;

    // compra nova de um material que já existe: copia marca, tipo, unidade, novelo, cor, mínimo e loja.
    // Só o nome, sem marca: usa a marca comprada por último (dá para trocar logo abaixo).
    const group = isEdit
      ? undefined
      : 'material' in patch
        ? findGroup(next.material, next.brand) ?? (brandTyped && next.brand?.trim() ? undefined : sameLine(next.material)[0])
        : 'brand' in patch
          ? findGroup(next.material, next.brand)
          : undefined;
    // a marca copiada de outro material não vale para um material novo
    if (!group && 'material' in patch && !brandTyped && prefilledFrom) next.brand = '';
    if (group && group.name !== prefilledFrom) {
      const last = fromLastPurchase(group.purchases[0]);
      next = { ...next, ...last, ...('brand' in patch ? { brand: next.brand } : {}) };
      if (last.packageSize && usePackage) next.quantityPurchased = (next.packageCount || 0) * last.packageSize;
      else if (last.packageSize && !(next.quantityPurchased! > 0)) setUsePackage(true);
      setPrefilledFrom(group.name);
      copied = true;
    }

    // material novo: o mínimo acompanha a unidade (1 novelo, 100 g, 10 m) até a pessoa mexer nele
    if (!isEdit && !minTouched && !copied) next.minStock = defaultMinStock(next.unit ?? 'gramas', next.packageSize);

    const purchased = next.quantityPurchased || 0;
    // compra nova: o que resta começa igual ao que foi comprado
    if (!isEdit) next.quantityRemaining = purchased;
    next.percentUsed = calculatePercentUsed(purchased, next.quantityRemaining || 0);
    next.unitCost = calculateUnitCost(next.totalPaid || 0, purchased);
    next.installmentValue = next.installments ? (next.totalPaid || 0) / next.installments : 0;
    setForm(next);
    setDirty(true);
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
    else apply({ packageName: undefined, packageCount: undefined, packageSize: undefined });
  };

  const toggleFree = (on: boolean) => {
    setFree(on);
    apply(on ? { totalPaid: 0, paymentStatus: 'quitado', installments: 1 } : {});
  };

  const purchased = form.quantityPurchased || 0;
  const eq = packageEquivalent(purchased, form.packageName, form.packageSize);
  const unit = form.unit ?? 'gramas';
  const paid = (form.totalPaid ?? 0) > 0;

  const materialError = submitted && !form.material?.trim() ? 'Informe o material.' : undefined;
  const quantityError = submitted && !purchased ? 'Informe a quantidade comprada.' : undefined;
  const valueError = submitted && !free && !paid ? 'Informe quanto pagou, ou marque que ganhou o material.' : undefined;
  const missing = [!form.material?.trim() && 'Material', !purchased && 'Quantidade comprada', !free && !paid && 'Valor pago'].filter(Boolean) as string[];

  // Mesmo material em outra unidade soma números que não se comparam (200 g + 150 m)
  const existing = findGroup(form.material, form.brand);
  const otherUnits = existing?.purchases.filter(p => p.id !== purchase?.id).map(p => p.unit) ?? [];
  const unitConflict = otherUnits.length > 0 && !otherUnits.some(u => unitShort(u) === unitShort(unit)) ? otherUnits[0] : undefined;
  // "Fio algodão" quando já existe "Fio de algodão": viraria um segundo material
  const baseNames = [...new Map(materials.map(g => [materialKey(g.baseName), g.baseName])).values()];
  const similar = findSimilarMaterial(form.material ?? '', baseNames);
  // marcas que ela já comprou desta linha, para trocar com um toque
  const knownBrands = sameLine(form.material).flatMap(g => (g.brand ? [g.brand] : []));

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
    // "fio de algodao" digitado vira o "Fio de algodão" já cadastrado: o estoque mostra o nome da compra mais recente
    const group = findGroup(data.material, data.brand);
    data.material = group?.baseName ?? data.material.trim();
    data.brand = group?.brand ?? data.brand?.trim();
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

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <div className="stack">
        <div className="form-grid">
          <div className="full">
            <Input label="Material *" list="material-names" value={form.material ?? ''} onChange={e => apply({ material: e.target.value })} error={materialError} placeholder="Ex.: Barbante nº 4" help="Mesmo nome e mesma marca de uma compra anterior: soma ao estoque dela." fullWidth />
            <datalist id="material-names">
              {baseNames.map(n => (
                <option key={n} value={n} />
              ))}
            </datalist>
            {similar && (
              <Alert tone="info" title={`Já existe “${similar}”. É o mesmo material?`} className="mt-8">
                Com outro nome, as compras ficam separadas no estoque.
                <div className="mt-8">
                  <Button type="button" variant="secondary" size="sm" onClick={() => apply({ material: similar })}>
                    Usar “{similar}”
                  </Button>
                </div>
              </Alert>
            )}
          </div>
          <div className="full">
            <Input label="Marca" optional list="brand-names" value={form.brand ?? ''} onChange={e => { setBrandTyped(true); apply({ brand: e.target.value }); }} placeholder="Ex.: Círculo" help="Cada marca fica separada no estoque, com quantidade e custo próprios." fullWidth />
            <datalist id="brand-names">
              {[...new Set(materials.flatMap(g => (g.brand ? [g.brand] : [])))].map(b => (
                <option key={b} value={b} />
              ))}
            </datalist>
            {knownBrands.length > 1 && (
              <div className="row-wrap mt-8" role="group" aria-label="Marcas que você já comprou">
                <span className="small muted">Você já tem:</span>
                {knownBrands.map(b => (
                  <Button key={b} type="button" variant={materialKey(b) === materialKey(form.brand ?? '') ? 'primary' : 'secondary'} size="sm" onClick={() => { setBrandTyped(true); apply({ brand: b }); }}>
                    {b}
                  </Button>
                ))}
              </div>
            )}
            {!isEdit && prefilledFrom && existing && (
              <p className="small muted mt-8 row" style={{ gap: 6 }}>
                <Copy size={14} /> Soma ao estoque de {existing.name}. Tipo, unidade, cor, mínimo e loja copiados da última compra; confira em “Mais detalhes”.
              </p>
            )}
            {!isEdit && !existing && form.brand?.trim() && knownBrands.length > 0 && (
              <p className="small muted mt-8">Marca nova: {fullMaterialName(form.material ?? '', form.brand)} vira um material separado no estoque.</p>
            )}
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
        </div>

        <div className="card sand flat">
          <h3 style={{ fontSize: 17, marginBottom: 12 }}>Quantidade</h3>
          <Checkbox checked={usePackage} onChange={togglePackage} label="Comprei em novelos, rolos ou pacotes" description="Informe quantos e quanto cada um tem. Ex.: 2 novelos de 100 g." />
          {usePackage ? (
            <div className="form-grid mt-8">
              <Select label="Embalagem" value={form.packageName ?? 'novelo'} onChange={e => applyPackage({ packageName: e.target.value })} fullWidth>
                {PACKAGE_NAMES.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
              <Input label={`Quantos ${form.packageName ?? 'novelo'}s comprou`} type="number" min={0} step="1" inputMode="numeric" value={form.packageCount || ''} onChange={e => applyPackage({ packageCount: parseFloat(e.target.value) || 0 })} error={quantityError} fullWidth />
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
          {isEdit && (
            <div className="form-grid mt-8">
              <Input label="Quantidade restante" type="number" min={0} step="any" inputMode="decimal" value={form.quantityRemaining ?? 0} onChange={e => apply({ quantityRemaining: parseFloat(e.target.value) || 0 })} suffix={unitShort(unit)} help="Ajuste aqui se a contagem estiver diferente." fullWidth />
            </div>
          )}
          {eq && !usePackage && <p className="small muted mt-8">Equivale a {eq}.</p>}
        </div>

        <div className="form-grid">
          <Input
            label="Valor total pago *"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={free ? '' : form.totalPaid || ''}
            onChange={e => apply({ totalPaid: parseFloat(e.target.value) || 0 })}
            disabled={free}
            prefix="R$"
            error={valueError}
            help={paid && purchased > 0 ? `Custo: ${formatUnitCost(form.unitCost ?? 0)} por ${unitShort(unit)}.` : 'O valor de tudo junto, como no cupom.'}
            fullWidth
          />
          {settings && !free && (
            <Select label="Forma de pagamento" value={form.paymentMethod ?? ''} onChange={e => apply({ paymentMethod: e.target.value })} fullWidth>
              <option value="">Selecione…</option>
              {settings.paymentMethods.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          )}
          <div className="full">
            <Checkbox checked={free} onChange={toggleFree} label="Ganhei ou é sobra (sem custo)" description="Entra no estoque com custo R$ 0 e não aparece no Financeiro." />
          </div>
          {!free && (
            <Select label="Pagamento" value={form.paymentStatus} onChange={e => apply({ paymentStatus: e.target.value as Purchase['paymentStatus'] })} fullWidth>
              <option value="quitado">Já paguei</option>
              <option value="a pagar">Vou pagar depois</option>
              <option value="parcial">Paguei uma parte</option>
            </Select>
          )}
        </div>

        <details className="more-details" open={showMore} onToggle={e => setShowMore(e.currentTarget.open)}>
          <summary>
            <span>
              <b>Mais detalhes</b> <span className="muted">(opcional)</span>
              <span className="small muted" style={{ display: 'block' }}>Cor, estoque mínimo, data, parcelas, loja e observações</span>
            </span>
            <ChevronDown size={20} className="chev" />
          </summary>
          <div className="form-grid mt-16">
            <Input label="Cor" optional value={form.color ?? ''} onChange={e => apply({ color: e.target.value })} fullWidth />
            <div className="full">
              <span className="label">Cor exata <span className="opt">(opcional, aparece no estoque)</span></span>
              <ColorPicker name={form.color} hex={form.colorHex} onChange={apply} />
            </div>
            <Input
              label="Estoque mínimo"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={form.minStock ?? 0}
              onChange={e => {
                setMinTouched(true);
                apply({ minStock: parseFloat(e.target.value) || 0 });
              }}
              suffix={unitShort(unit)}
              help={packageEquivalent(form.minStock ?? 0, form.packageName, form.packageSize) ? `Abaixo disso aparece o alerta (≈ ${packageEquivalent(form.minStock ?? 0, form.packageName, form.packageSize)}).` : 'Abaixo disso aparece o alerta.'}
              fullWidth
            />
            <Input label="Data da compra" type="date" value={dateValue(form.date)} onChange={e => e.target.value && apply({ date: new Date(`${e.target.value}T12:00:00`) })} fullWidth />
            {!free && (
              <>
                <Input label="Número de parcelas" type="number" min={1} value={form.installments ?? 1} onChange={e => apply({ installments: parseInt(e.target.value) || 1 })} fullWidth />
                <Input label="Valor da parcela" readOnly value={(form.installmentValue ?? 0).toFixed(2)} prefix="R$" fullWidth />
                <Input label="Data da primeira parcela" type="date" optional value={dateValue(form.firstInstallmentDate)} onChange={e => apply({ firstInstallmentDate: e.target.value ? new Date(`${e.target.value}T12:00:00`) : undefined })} fullWidth />
                <Input label="Data de quitação" type="date" optional value={dateValue(form.paymentCompletionDate)} onChange={e => apply({ paymentCompletionDate: e.target.value ? new Date(`${e.target.value}T12:00:00`) : undefined })} fullWidth />
              </>
            )}
            <Input label="Loja/fornecedor" optional value={form.store ?? ''} onChange={e => apply({ store: e.target.value })} fullWidth />
            <Input label="Link da loja/comprovante" optional value={form.storeLink ?? ''} onChange={e => apply({ storeLink: e.target.value })} fullWidth />
            {settings && (
              <Select label="Status do material" value={form.status} onChange={e => apply({ status: e.target.value as Purchase['status'] })} fullWidth>
                {settings.purchaseStatuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            )}
            <div className="full">
              <TextArea label="Observações" optional value={form.observations ?? ''} onChange={e => apply({ observations: e.target.value })} fullWidth />
            </div>
          </div>
        </details>
      </div>

      {submitted && missing.length > 0 && (
        <Alert tone="error" icon={<AlertTriangle size={20} />} title="Falta preencher" className="mt-16">
          {missing.join(', ').replace(/, ([^,]*)$/, ' e $1')}. O campo está marcado acima.
        </Alert>
      )}
      {saveError && (
        <Alert tone="error" icon={<AlertTriangle size={20} />} title="Não foi possível salvar a compra" className="mt-16">
          {saveError} Seus dados continuam no formulário; tente de novo.
        </Alert>
      )}

      <div className="modal-actions sticky-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar compra'}</Button>
      </div>
    </form>
  );
};
