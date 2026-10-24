import React, { useState } from 'react';
import { applyLotMovements } from '../data/stockUsage';
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
  const [colorKey, setColorKey] = useState<string | undefined>();
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();

  const group = groups.find(g => g.key === key);
  // material com várias cores: a perda/contagem é de uma cor (o total junto não diz qual acabou)
  const variants = group && group.variants.length > 1 ? group.variants : [];
  const variant = variants.find(v => v.key === colorKey) ?? variants[0];
  const scope = variant ?? group;
  const label = group ? `${group.name}${variant ? ` (${variant.name})` : ''}` : '';
  const isLoss = kind === 'perda';
  const q = parseQuantity(quantity);
  const fmt = (n: number) => (group ? formatQuantity(n, group.unit, group.packageName, group.packageSize) : '');

  // prévia do ajuste: quem conta o armário sabe quanto tem, não quanto sumiu
  const diff = !isLoss && scope && q >= 0 ? q - scope.remaining : NaN;
  const countHelp = !group || isNaN(diff)
    ? 'Conte o que tem no armário. O app calcula a diferença.'
    : diff === 0
      ? 'Igual ao que o app já mostra.'
      : diff < 0
        ? `Vai tirar ${fmt(-diff)} do estoque.`
        : `Vai somar ${fmt(diff)} ao estoque.`;

  const apply = (plan: LotMovement[], reason: string) => applyLotMovements(plan, { type: kind, note: reason });

  const save = async () => {
    if (!group || !scope) return setError('Escolha o material.');
    if (isLoss) {
      if (!(q > 0)) return setError('Informe a quantidade.');
      if (scope.remaining <= 0) return setError(variant ? 'Esta cor já está zerada no estoque.' : 'Este material já está zerado no estoque.');
      const plan = planMovement(scope, q);
      await apply(plan, note.trim() || 'Perda');
      const taken = plan.reduce((sum, m) => sum + m.quantity, 0);
      notify({
        type: 'success',
        message: 'Perda registrada',
        detail: taken < q
          ? `${label}: −${formatQuantity(taken, group.unit)}. Era tudo o que havia no estoque; ficou zerado.`
          : `${label}: −${formatQuantity(taken, group.unit)}`
      });
    } else {
      if (!(q >= 0)) return setError('Informe quanto você tem agora (0 se acabou).');
      const plan = planCount(scope, q);
      if (!plan.length) return setError('A contagem é igual à do app. Nada a ajustar.');
      await apply(plan, note.trim() || 'Contagem do armário');
      notify({ type: 'success', message: 'Contagem ajustada', detail: `${label}: ${fmt(scope.remaining)} → ${fmt(q)}` });
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
              setColorKey(undefined);
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
        {variants.length > 0 && (
          <div className="full">
            <Select label="Cor" value={variant?.key ?? ''} onChange={e => { setColorKey(e.target.value); setError(undefined); }} fullWidth>
              {variants.map(v => (
                <option key={v.key} value={v.key}>
                  {v.name} ({formatQuantity(v.remaining, group!.unit, group!.packageName, group!.packageSize)})
                </option>
              ))}
            </Select>
          </div>
        )}
        {isLoss ? (
          <Input label="Quantidade perdida" type="number" min={0} step="any" inputMode="decimal" value={quantity} onChange={e => setQuantity(e.target.value)} suffix={group ? unitShort(group.unit) : undefined} error={error} fullWidth />
        ) : (
          <>
            {scope && (
              <p className="full small muted" style={{ margin: 0 }}>
                O app mostra <b className="num">{fmt(scope.remaining)}</b>{variant ? ` de ${variant.name.toLowerCase()}` : ''}.
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
