import React, { useState } from 'react';
import { purchaseService } from '../data/services';
import type { Purchase } from '../types';
import { generateId } from '../types';
import { calculatePercentUsed, updatePurchaseStatus } from '../calculations';
import { formatQuantity, pickLotForMovement, unitShort, type MaterialGroup } from '../calculations/materials';
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

/**
 * Perda (fio emaranhado, olhos quebrados) ou ajuste de contagem. Diminui o estoque, não entra no caixa,
 * e fica registrado na compra (`movements`) para o cálculo do restante não desfazer o ajuste.
 */
export const StockMovementModal: React.FC<Props> = ({ isOpen, kind, groups, initialKey, onClose, onDone }) => {
  const [key, setKey] = useState(initialKey ?? groups[0]?.key ?? '');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();

  const group = groups.find(g => g.key === key);
  const isLoss = kind === 'perda';

  const save = async () => {
    const q = parseFloat(quantity.replace(',', '.'));
    if (!group) return setError('Escolha o material.');
    if (!(q > 0)) return setError('Informe a quantidade.');
    const lot = pickLotForMovement(group, q) as Purchase | undefined;
    if (!lot) return setError('Este material ainda não tem compras.');
    const remaining = Math.max(0, lot.quantityRemaining - q);
    const withLoss: Purchase = { ...lot, quantityRemaining: remaining };
    await purchaseService.update(lot.id, {
      quantityRemaining: remaining,
      percentUsed: calculatePercentUsed(lot.quantityPurchased, remaining),
      status: updatePurchaseStatus(withLoss),
      movements: [...(lot.movements || []), { id: generateId(), date: new Date(), type: kind, quantity: Math.min(q, lot.quantityRemaining), note: note.trim() || (isLoss ? 'Perda' : 'Ajuste de contagem') }]
    });
    notify({ type: 'success', message: isLoss ? 'Perda registrada' : 'Contagem ajustada', detail: `${group.name}: −${formatQuantity(q, group.unit)}` });
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
          <Select label="Material" value={key} onChange={e => setKey(e.target.value)} fullWidth>
            {groups.map(g => (
              <option key={g.key} value={g.key}>
                {g.name} ({formatQuantity(g.remaining, g.unit, g.packageName, g.packageSize)})
              </option>
            ))}
          </Select>
        </div>
        <Input label={isLoss ? 'Quantidade perdida' : 'Quantidade a retirar'} type="number" min={0} step="any" inputMode="decimal" value={quantity} onChange={e => setQuantity(e.target.value)} suffix={group ? unitShort(group.unit) : undefined} error={error} help={isLoss ? undefined : 'Para aumentar o estoque, registre uma compra.'} fullWidth />
        <Input label="Motivo" optional value={note} onChange={e => setNote(e.target.value)} placeholder={isLoss ? 'Ex.: fio emaranhado' : 'Ex.: contagem física'} fullWidth />
      </div>
      <Alert tone="info" icon={<Info size={20} />} className="mt-16">
        Perdas e ajustes diminuem o estoque, mas <b>não entram no caixa</b>.
      </Alert>
    </Modal>
  );
};
