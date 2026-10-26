import React, { useEffect, useState } from 'react';
import { Copy, Info, MessageCircle, WifiOff } from 'lucide-react';
import type { Order } from '../types';
import { dateInputValue, formatCurrency } from '../calculations';
import { registerPayment, type PaymentKind } from '../data/orderActions';
import { Button } from '../components/Button';
import { Input, Select, TextArea } from '../components/Input';
import { Modal } from '../components/Modal';
import { Alert, Chips } from '../components/ui';
import { notify } from '../utils/notify';
import { MESSAGE_TEMPLATES, suggestedTemplate, whatsappUrl } from './orderMessages';

/* ------------------------------------------------------------------
   Mensagem de WhatsApp: sugestões editáveis. Nada é enviado automaticamente.
   ------------------------------------------------------------------ */
export const MessageModal: React.FC<{ order: Order | null; onClose: () => void }> = ({ order, onClose }) => {
  const [tpl, setTpl] = useState('orcamento');
  const [text, setText] = useState('');

  useEffect(() => {
    if (!order) return;
    const id = suggestedTemplate(order.status);
    setTpl(id);
    setText(MESSAGE_TEMPLATES.find(t => t.id === id)?.build(order) ?? '');
  }, [order]);

  if (!order) return null;

  const choose = (id: string) => {
    setTpl(id);
    setText(MESSAGE_TEMPLATES.find(t => t.id === id)?.build(order) ?? '');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      notify({ type: 'info', message: 'Mensagem copiada', detail: 'Cole no WhatsApp para enviar.' });
    } catch {
      notify({ type: 'error', message: 'Não foi possível copiar', detail: 'Selecione o texto e copie manualmente.' });
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Mensagem para ${order.clientName.split(' ')[0]}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          <Button variant="secondary" icon={<Copy size={18} />} onClick={copy}>Copiar texto</Button>
          <a className="btn btn-primary" href={whatsappUrl(order.clientPhone, text)} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={18} />
            Abrir no WhatsApp
          </a>
        </>
      }
    >
      <Chips label="Tipo de mensagem" value={tpl} onChange={choose} options={MESSAGE_TEMPLATES.map(t => ({ value: t.id, label: t.label }))} />
      <div className="mt-16">
        <TextArea label="Texto da mensagem (edite à vontade)" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 170 }} fullWidth />
      </div>
      <Alert tone="neutral" icon={<WifiOff size={20} />} className="mt-16">
        O LaPoli <b>nunca envia</b> a mensagem sozinho. “Abrir no WhatsApp” só abre a conversa com o texto preenchido e precisa de internet. O resto do sistema funciona sem internet.
      </Alert>
    </Modal>
  );
};

/* ------------------------------------------------------------------
   Registrar pagamento (sinal ou saldo)
   ------------------------------------------------------------------ */
export const PaymentModal: React.FC<{
  order: Order | null;
  paymentMethods: string[];
  onClose: () => void;
  onDone: () => void;
}> = ({ order, paymentMethods, onClose, onDone }) => {
  const [kind, setKind] = useState<PaymentKind>('sinal');
  const [method, setMethod] = useState('');

  useEffect(() => {
    if (!order) return;
    setKind(order.paymentStatus === 'pendente' ? 'sinal' : 'saldo');
    setMethod(order.paymentMethod ?? '');
  }, [order]);

  if (!order) return null;
  const balance = Math.max(0, order.agreedPrice - order.signalAmount);
  const value = kind === 'sinal' ? order.signalAmount : balance;
  const already = kind === 'sinal' ? order.paymentStatus !== 'pendente' : order.paymentStatus === 'pago';

  const save = async () => {
    await registerPayment(order, kind, method || undefined);
    notify({ type: 'success', message: `${kind === 'sinal' ? 'Sinal' : 'Saldo'} de ${formatCurrency(value)} registrado`, detail: `Pedido de ${order.clientName}` });
    onDone();
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={`Registrar pagamento · ${order.clientName}`} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={already}>Registrar</Button></>}>
      <div className="seg block">
        <button type="button" aria-pressed={kind === 'sinal'} onClick={() => setKind('sinal')}>Sinal ({formatCurrency(order.signalAmount)})</button>
        <button type="button" aria-pressed={kind === 'saldo'} onClick={() => setKind('saldo')}>Saldo ({formatCurrency(balance)})</button>
      </div>
      <div className="mt-16">
        <Select label="Forma de pagamento" value={method} onChange={e => setMethod(e.target.value)} fullWidth>
          <option value="">Selecione…</option>
          {paymentMethods.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </Select>
      </div>
      {already && (
        <Alert tone="info" icon={<Info size={20} />} className="mt-16">
          {kind === 'sinal' ? 'O sinal deste pedido já está marcado como recebido.' : 'Este pedido já está totalmente pago.'}
        </Alert>
      )}
      <Alert tone="info" icon={<Info size={20} />} className="mt-16">
        O pagamento entra no <b>caixa</b> na data de hoje. Ele só vira <b>faturamento</b> quando o pedido for entregue.
      </Alert>
    </Modal>
  );
};

/** Pequeno campo de data reutilizado nos formulários de pedido. */
export const DateField: React.FC<{ label: string; value?: Date; onChange: (d: Date | undefined) => void; optional?: boolean }> = ({ label, value, onChange, optional }) => (
  <Input
    label={label}
    type="date"
    optional={optional}
    value={dateInputValue(value)}
    onChange={e => onChange(e.target.value ? new Date(`${e.target.value}T12:00:00`) : undefined)}
    fullWidth
  />
);
