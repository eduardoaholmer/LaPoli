import React, { useState } from 'react';
import { purchaseService } from '../data/services';
import { generateId } from '../types';
import { calculatePercentUsed, updatePurchaseStatus } from '../calculations';
import { formatQuantity, planCount, planMovement, unitShort, type LotMovement, type MaterialGroup } from '../calculations/materials';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { Alert } from '../components/ui';
import { notify } from '../utils/notify';
import { Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  kind: 'perda' | 'ajuste';
  groups: MaterialGroup[];
  initialKey?: string;
  onClose: () => void;
  onDone: () => void;
}

const parseQuantity = (value: string): number => parseFloat(value.replace(',', '.'));

/**
 * Perda (fio emaranhado, olhos quebrados) ou ajuste de contagem ("contei e tenho X"). Não entra no caixa,
 * e fica registrado na compra (`movements`) para o cálculo do restante não desfazer o ajuste.
 */
export const StockMovementModal: React.FC<Props> = ({ isOpen, kind, groups, initialKey, onClose, onDone }) => {
  const [key, setKey] = useState(initialKey ?? groups[0]?.key ?? '');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();

  const group = groups.find(g => g.key === key);
  const isLoss = kind === 'perda';
  const q = parseQuantity(quantity);
  const fmt = (n: number) => (group ? formatQuantity(n, group.unit, group.packageName, group.packageSize) : '');

  // prévia do ajuste: quem conta o armário sabe quanto tem, não quanto sumiu
  const diff = !isLoss && group && q >= 0 ? q - group.remaining : NaN;
  const countHelp = !group || isNaN(diff)
    ? 'Conte o que tem no armário. O app calcula a diferença.'
    : diff === 0
      ? 'Igual ao que o app já mostra.'
      : diff < 0
        ? `Vai tirar ${fmt(-diff)} do estoque.`
        : `Vai somar ${fmt(diff)} ao estoque.`;

  const apply = async (plan: LotMovement[], reason: string) => {
    const date = new Date();
    // uma compra por vez: cada lote guarda a sua parte da perda/ajuste
    for (const { lot, quantity: take } of plan) {
      const remaining = lot.quantityRemaining - take;
      await purchaseService.update(lot.id, {
        quantityRemaining: remaining,
        percentUsed: calculatePercentUsed(lot.quantityPurchased, remaining),
        status: updatePurchaseStatus({ ...lot, quantityRemaining: remaining }),
        movements: [...(lot.movements || []), { id: generateId(), date, type: kind, quantity: take, note: reason }]
      });
    }
  };

  const save = async () => {
    if (!group) return setError('Escolha o material.');
    if (isLoss) {
      if (!(q > 0)) return setError('Informe a quantidade.');
      if (group.remaining <= 0) return setError('Este material já está zerado no estoque.');
      const plan = planMovement(group, q);
      await apply(plan, note.trim() || 'Perda');
      const taken = plan.reduce((sum, m) => sum + m.quantity, 0);
      notify({
        type: 'success',
        message: 'Perda registrada',
        detail: taken < q
          ? `${group.name}: −${formatQuantity(taken, group.unit)}. Era tudo o que havia no estoque; o material ficou zerado.`
          : `${group.name}: −${formatQuantity(taken, group.unit)}`
      });
    } else {
      if (!(q >= 0)) return setError('Informe quanto você tem agora (0 se acabou).');
      const plan = planCount(group, q);
      if (!plan.length) return setError('A contagem é igual à do app. Nada a ajustar.');
      await apply(plan, note.trim() || 'Contagem do armário');
      notify({ type: 'success', message: 'Contagem ajustada', detail: `${group.name}: ${fmt(group.remaining)} → ${fmt(q)}` });
    }
    setQuantity('');
    setNote('');
    setError(undefined);
    onDone();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLoss ? 'Registrar perda' : 'Ajustar contagem'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="full">
          <Select
            label="Material"
            value={key}
            onChange={e => {
              setKey(e.target.value);
              setError(undefined);
            }}
            fullWidth
          >
            {groups.map(g => (
              <option key={g.key} value={g.key}>
                {g.name} ({formatQuantity(g.remaining, g.unit, g.packageName, g.packageSize)})
              </option>
            ))}
          </Select>
        </div>
        {isLoss ? (
          <Input label="Quantidade perdida" type="number" min={0} step="any" inputMode="decimal" value={quantity} onChange={e => setQuantity(e.target.value)} suffix={group ? unitShort(group.unit) : undefined} error={error} fullWidth />
        ) : (
          <>
            {group && (
              <p className="full small muted" style={{ margin: 0 }}>
                O app mostra <b className="num">{fmt(group.remaining)}</b>.
              </p>
            )}
            <Input
              label="Quanto você tem agora?"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={quantity}
              onChange={e => {
                setQuantity(e.target.value);
                setError(undefined);
              }}
              suffix={group ? unitShort(group.unit) : undefined}
              error={error}
              help={countHelp}
              fullWidth
            />
          </>
        )}
        <Input label="Motivo" optional value={note} onChange={e => setNote(e.target.value)} placeholder={isLoss ? 'Ex.: fio emaranhado' : 'Ex.: contei o armário'} fullWidth />
      </div>
      <Alert tone="info" icon={<Info size={20} />} className="mt-16">
        {isLoss ? 'Perdas diminuem o estoque' : 'Ajustes corrigem o estoque'}, mas <b>não entram no caixa</b>.
      </Alert>
    </Modal>
  );
};
