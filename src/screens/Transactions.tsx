import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Check, ExternalLink, Search } from 'lucide-react';
import { purchaseService, transactionService } from '../data/services';
import type { Purchase } from '../types';
import type { Transaction, TransactionType } from '../types/financial';
import { transactionStatus } from '../types/financial';
import { formatCurrency, formatDate } from '../calculations';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { Chips, Tabs } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { SkeletonGrid } from '../components/Skeleton';
import { ScreenLayout } from '../components/ScreenLayout';
import { notify } from '../utils/notify';

const INCOME_CATEGORIES = ['Pedidos de clientes', 'Vendas avulsas', 'Outras receitas'];
const EXPENSE_CATEGORIES = ['Materiais', 'Embalagens e etiquetas', 'Ferramentas', 'Frete e entregas', 'Taxas e comissões', 'Marketing e divulgação', 'Impostos e taxas', 'Contas fixas', 'Retirada da dona', 'Outras'];
const ACCOUNTS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência'];

interface TransactionFormModalProps {
  isOpen: boolean;
  initialType: TransactionType;
  onClose: () => void;
  onSaved: () => void;
}

/** Lançamento manual rápido: tipo, valor, categoria, data e conta bastam. */
export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ isOpen, initialType, onClose, onSaved }) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [account, setAccount] = useState(ACCOUNTS[0]);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setCategory('');
      setError(undefined);
    }
  }, [isOpen, initialType]);

  const categories = type === 'receita' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const save = async () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!description.trim()) return setError('Descreva o lançamento.');
    if (!(value > 0)) return setError('Informe um valor.');
    if (!category) return setError('Escolha uma categoria.');

    await transactionService.create({
      type,
      description: description.trim(),
      amount: value,
      category,
      date: new Date(`${date}T00:00:00`),
      paymentDate: new Date(`${date}T00:00:00`),
      account
    });
    notify({ type: 'success', message: 'Lançamento registrado', detail: `${description.trim()}: ${formatCurrency(value)}` });
    setDescription('');
    setAmount('');
    onSaved();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'receita' ? 'Nova entrada' : 'Nova saída'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="full">
          <Chips label="Tipo" value={type} onChange={setType} options={[{ value: 'receita', label: 'Entrada' }, { value: 'despesa', label: 'Saída' }]} />
        </div>
        <Input label="Descrição" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex.: Agulhas de crochê" fullWidth error={error} />
        <Input label="Valor" type="number" min={0} step="0.01" inputMode="decimal" prefix="R$" value={amount} onChange={e => setAmount(e.target.value)} fullWidth />
        <Select label="Categoria" value={category} onChange={e => setCategory(e.target.value)} fullWidth>
          <option value="">Escolha…</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} fullWidth />
        <Select label="Conta" value={account} onChange={e => setAccount(e.target.value)} fullWidth>
          {ACCOUNTS.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
      </div>
    </Modal>
  );
};

type MoveTab = 'realizado' | 'previsto';

export const TransactionsScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<MoveTab>('realizado');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [formOpen, setFormOpen] = useState<TransactionType | null>(null);

  const load = async () => {
    const [t, p] = await Promise.all([transactionService.getAll(), purchaseService.getAll()]);
    setTransactions(t);
    setPurchases(p);
    setLoaded(true);
  };

  useEffect(() => {
    void load();
  }, []);

  const originLink = (t: Transaction): string | null => {
    if (t.origin === 'pedido_sinal' || t.origin === 'pedido_saldo') return `/orders/${t.originId}`;
    if (t.origin === 'compra') return `/stock/${encodeURIComponent(purchases.find(p => p.id === t.originId)?.material ?? '')}`;
    return null;
  };

  const categories = useMemo(() => Array.from(new Set(transactions.map(t => t.category))).sort(), [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter(t => (tab === 'realizado' ? !!t.paymentDate : !t.paymentDate))
      .filter(t => category === 'all' || t.category === category)
      .filter(t => !q || t.description.toLowerCase().includes(q))
      .sort((a, b) => {
        const da = new Date(tab === 'realizado' ? (a.paymentDate as Date) : a.date).getTime();
        const db = new Date(tab === 'realizado' ? (b.paymentDate as Date) : b.date).getTime();
        return tab === 'realizado' ? db - da : da - db;
      });
  }, [transactions, tab, category, search]);

  const total = filtered.reduce((s, t) => s + (t.type === 'receita' ? t.amount : -t.amount), 0);

  const markPaid = async (t: Transaction) => {
    await transactionService.update(t.id, { paymentDate: new Date() });
    notify({ type: 'success', message: t.type === 'receita' ? 'Recebimento confirmado' : 'Pagamento confirmado' });
    await load();
  };

  if (!loaded) {
    return (
      <ScreenLayout title="Movimentações">
        <SkeletonGrid count={3} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      title="Movimentações"
      subtitle="Entradas e saídas, uma única vez cada. Pagamentos de pedidos e compras já aparecem sozinhos."
      action={
        <>
          <Button variant="secondary" icon={<ArrowUpRight size={18} />} onClick={() => setFormOpen('despesa')}>Nova saída</Button>
          <Button icon={<ArrowDownLeft size={18} />} onClick={() => setFormOpen('receita')}>Nova entrada</Button>
        </>
      }
    >
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'realizado', label: 'Realizado' }, { value: 'previsto', label: 'Previsto' }]} />

      <div className="row-wrap mt-16">
        <Input icon={<Search size={16} />} placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar movimentação" />
      </div>
      {categories.length > 0 && (
        <Chips
          label="Categoria"
          value={category}
          onChange={setCategory}
          options={[{ value: 'all', label: 'Todas' }, ...categories.map(c => ({ value: c, label: c }))]}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={tab === 'realizado' ? 'Nenhuma movimentação ainda' : 'Nada previsto'}
          description="Registre uma compra, receba um sinal ou lance uma despesa para começar."
          action={{ label: 'Lançar movimentação', onClick: () => setFormOpen('receita') }}
        />
      ) : (
        <div className="card pad-0 mt-16">
          <div className="rows" style={{ padding: '0 12px 8px' }}>
            {filtered.map(t => {
              const link = originLink(t);
              const status = transactionStatus(t);
              return (
                <div key={t.id} className="li" style={{ padding: 12 }}>
                  <span className={`dot-ic ${t.type === 'receita' ? 's' : 'n'}`}>
                    {t.type === 'receita' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </span>
                  <div className="grow">
                    <div className="t" style={{ fontWeight: 500 }}>{t.description}</div>
                    <div className="s">
                      {formatDate(tab === 'realizado' ? (t.paymentDate as Date) : t.date)} · {t.category} · {t.account}
                      {status === 'atrasado' && <span className="neg"> · atrasado</span>}
                      {t.installmentNumber && ` · parcela ${t.installmentNumber}/${t.totalInstallments}`}
                    </div>
                  </div>
                  <b className={`num ${t.type === 'receita' ? 'pos' : ''}`}>
                    {t.type === 'receita' ? '+' : '−'}{formatCurrency(t.amount)}
                  </b>
                  {tab === 'previsto' && (t.origin === 'compra' || t.origin === 'manual') && (
                    <Button size="sm" variant="secondary" icon={<Check size={16} />} onClick={() => markPaid(t)}>
                      {t.type === 'receita' ? 'Recebido' : 'Pago'}
                    </Button>
                  )}
                  {link && (
                    <Link className="btn btn-ghost btn-icon btn-sm" to={link} aria-label="Abrir origem" title="Abrir origem">
                      <ExternalLink size={16} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
          <div className="kv total" style={{ padding: '12px 24px' }}>
            <span className="k">Total do filtro</span>
            <span className="v">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      <TransactionFormModal isOpen={formOpen !== null} initialType={formOpen ?? 'receita'} onClose={() => setFormOpen(null)} onSaved={load} />
    </ScreenLayout>
  );
};
