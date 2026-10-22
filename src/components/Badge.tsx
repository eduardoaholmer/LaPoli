import React from 'react';
import { phaseOf } from '../calculations/orders';
import type { OrderStatus } from '../types';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

const variantClass: Record<BadgeVariant, string> = {
  success: 'b-success',
  warning: 'b-warning',
  error: 'b-error',
  info: 'b-info',
  primary: 'b-primary',
  default: 'b-neutral'
};

/** Selo de situação: sempre texto (e, quando possível, ícone). Cor nunca vem sozinha. */
export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', icon }) => (
  <span className={`badge ${variantClass[variant]}`}>
    {icon}
    {children}
  </span>
);

const ORDER_STATUSES = new Set<string>([
  'Cliente escolhendo o produto',
  'Orçamento enviado',
  'Aguardando pagamento do sinal',
  'Sinal recebido',
  'Aguardando compra de materiais',
  'Materiais comprados',
  'Em produção',
  'Produção concluída',
  'Aguardando entrega',
  'Entregue',
  'Cancelado'
]);

const statusVariant = (status: string): BadgeVariant => {
  if (ORDER_STATUSES.has(status)) {
    if (status === 'Aguardando compra de materiais') return 'warning';
    const phase = phaseOf(status as OrderStatus);
    if (phase === 'concluido') return 'success';
    if (phase === 'cancelado') return 'default';
    if (phase === 'orcamento') return 'info';
    if (phase === 'entrega') return 'success';
    return 'primary';
  }
  const lower = status.toLowerCase();
  if (lower.includes('entregue') || lower.includes('concluído') || lower.includes('quitado') || lower === 'pago') return 'success';
  if (lower.includes('atrasado') || lower.includes('cancelado') || lower.includes('esgotado')) return 'error';
  if (lower.includes('aguardando') || lower.includes('parcial') || lower.includes('reservado') || lower === 'pendente' || lower === 'a pagar') return 'warning';
  if (lower === 'exemplo') return 'default';
  return 'info';
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <Badge variant={statusVariant(status)}>{status}</Badge>
);
