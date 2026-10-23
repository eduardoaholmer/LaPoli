import type { Order, OrderStatus } from '../types';
import { formatCurrency, formatDate } from '../calculations';
import { orderPending } from '../calculations/orders';

/** Mensagens prontas por etapa (as mesmas de antes). */
export const orderStatusMessages: Record<OrderStatus, string> = {
  'Cliente escolhendo o produto': 'Olá! Vi que você está interessada no produto. Gostaria de mais informações ou quer que eu prepare um orçamento?',
  'Orçamento enviado': 'Olá! Enviei o orçamento para você. Fico aguardando seu retorno. Qualquer dúvida, é só chamar! 💕',
  'Aguardando pagamento do sinal': 'Olá! Já estou com os materiais separados para começar seu pedido. Aguardo o pagamento do sinal para iniciar a produção.',
  'Sinal recebido': 'Obrigada pelo sinal! Já estou começando a produção do seu pedido. Vou te avisar quando estiver pronto! 🧶',
  'Aguardando compra de materiais': 'Olá! Já estou organizando a compra dos materiais para seu pedido. Em breve estarei produzindo!',
  'Materiais comprados': 'Materiais comprados! Agora vou começar a produção do seu pedido. Em breve te aviso! ✨',
  'Em produção': 'Seu pedido está sendo produzido com carinho! Já estou em X% do trabalho. Em breve estará pronto! 🧶',
  'Produção concluída': 'Seu pedido está pronto! 🎉 Agora é só aguardar a entrega. Te aviso quando for despachar!',
  'Aguardando entrega': 'Seu pedido está pronto e aguardando entrega! Vamos combinar o horário/local? 📦',
  Entregue: 'Obrigada pela preferência! Espero que tenha gostado do produto. Volte sempre! 💕',
  Cancelado: 'Pedido cancelado conforme solicitado. Se mudar de ideia, estarei à disposição!'
};

export interface MessageTemplate {
  id: string;
  label: string;
  build: (o: Order) => string;
}

const first = (name: string) => name.trim().split(' ')[0];

/** Sugestões editáveis. O sistema nunca envia nada: a pessoa revisa, copia ou abre o WhatsApp e envia. */
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'orcamento',
    label: 'Orçamento',
    build: o =>
      `Olá, ${first(o.clientName)}! Tudo bem? Aqui é da LaPoli Crochê.\nSegue o orçamento: ${o.product} (${o.quantity} ${o.quantity > 1 ? 'unidades' : 'unidade'}) por ${formatCurrency(o.agreedPrice)}. O prazo de entrega é ${formatDate(o.deadline)}. Para reservar, peço um sinal de ${formatCurrency(o.signalAmount)}. Posso confirmar?`
  },
  {
    id: 'confirmacao',
    label: 'Confirmação',
    build: o =>
      `Olá, ${first(o.clientName)}! Recebi o sinal de ${formatCurrency(o.signalAmount)}, obrigada! Seu pedido (${o.product}) está confirmado para ${formatDate(o.deadline)}. Qualquer detalhe novo é só me avisar.`
  },
  {
    id: 'producao',
    label: 'Em produção',
    build: o =>
      `Olá, ${first(o.clientName)}! Passando para contar que seu pedido (${o.product}) já está em produção. Previsão de entrega: ${formatDate(o.deadline)}. Se quiser ver o andamento, mando uma foto!`
  },
  {
    id: 'pronto',
    label: 'Pronto',
    build: o =>
      `Olá, ${first(o.clientName)}! Seu pedido (${o.product}) ficou pronto!${orderPending(o) > 0 ? ` O saldo de ${formatCurrency(orderPending(o))} pode ser pago na retirada.` : ''} Qual o melhor horário para você?`
  },
  {
    id: 'etapa',
    label: 'Mensagem da etapa',
    build: o => orderStatusMessages[o.status] || ''
  },
  {
    id: 'resumo',
    label: 'Resumo do pedido',
    build: o =>
      `*ORÇAMENTO - LaPoli Crochet*\n\n*Produto:* ${o.product}\n*Cliente:* ${o.clientName}\n\n*Valores:*\n• Preço combinado: ${formatCurrency(o.agreedPrice)}\n• Sinal: ${formatCurrency(o.signalAmount)}\n• Saldo: ${formatCurrency(Math.max(0, o.agreedPrice - o.signalAmount))}\n\n*Datas:*\n• Data do pedido: ${formatDate(o.date)}\n• Prazo de entrega: ${formatDate(o.deadline)}\n\n*Etapa:* ${o.status}\n---\nGerado em ${new Date().toLocaleDateString('pt-BR')}`
  }
];

/** Mensagem sugerida para o momento em que o pedido está. */
export const suggestedTemplate = (status: OrderStatus): string => {
  if (['Cliente escolhendo o produto', 'Orçamento enviado', 'Aguardando pagamento do sinal'].includes(status)) return 'orcamento';
  if (status === 'Sinal recebido') return 'confirmacao';
  if (['Aguardando compra de materiais', 'Materiais comprados', 'Em produção'].includes(status)) return 'producao';
  return 'pronto';
};

/** Cobrança educada do sinal ou do saldo. O sistema nunca envia: abre o WhatsApp para a pessoa revisar. */
export const chargeMessage = (o: Order, kind: 'sinal' | 'saldo'): string => {
  if (kind === 'sinal') {
    return `Olá, ${first(o.clientName)}! Tudo bem? Aqui é da LaPoli Crochê. Para começar o seu pedido (${o.product}), falta o sinal de ${formatCurrency(o.signalAmount)}. Posso te passar os dados para o pagamento?`;
  }
  const balance = Math.max(0, o.agreedPrice - o.signalAmount);
  return `Olá, ${first(o.clientName)}! Tudo bem? Aqui é da LaPoli Crochê. Passando para lembrar do saldo de ${formatCurrency(balance)} do seu pedido (${o.product}), combinado para ${formatDate(o.deadline)}. Posso te passar os dados para o pagamento?`;
};

export const whatsappUrl = (phone: string, text?: string): string => {
  const digits = phone.replace(/\D/g, '');
  const number = digits.startsWith('55') && digits.length > 11 ? digits : `55${digits}`;
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
