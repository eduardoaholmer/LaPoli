import { describe, expect, it } from 'vitest';
import { chargeMessage, whatsappUrl } from './orderMessages';
import type { Order } from '../types';

const order = { clientName: 'Maria Souza', product: 'Leão Amigurumi', agreedPrice: 180, signalAmount: 90, deadline: new Date(2026, 10, 5, 12) } as Order;

describe('chargeMessage', () => {
  it('cobra o sinal com o primeiro nome e o valor', () => {
    const msg = chargeMessage(order, 'sinal');
    expect(msg).toContain('Olá, Maria!');
    expect(msg).toContain('Leão Amigurumi');
    expect(msg).toMatch(/sinal de R\$\s90,00/);
  });

  it('cobra o saldo (preço − sinal) com o prazo', () => {
    const msg = chargeMessage(order, 'saldo');
    expect(msg).toMatch(/saldo de R\$\s90,00/);
    expect(msg).toContain('05/11/2026');
  });

  it('nunca cobra saldo negativo', () => {
    expect(chargeMessage({ ...order, signalAmount: 200 }, 'saldo')).toMatch(/saldo de R\$\s0,00/);
  });

  it('monta o link do WhatsApp com DDI 55', () => {
    expect(whatsappUrl('(51) 99999-0000', 'oi')).toBe('https://wa.me/5551999990000?text=oi');
  });
});
