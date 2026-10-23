import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PurchaseForm } from './PurchaseForm';
import type { Purchase, Settings } from '../types';
import { groupMaterials } from '../calculations/materials';

const settings = { units: ['gramas', 'metros'], materialTypes: ['fio'], paymentMethods: ['Pix'], purchaseStatuses: ['disponível'] } as unknown as Settings;

const setup = (onSave: (d: unknown) => void | Promise<void>, purchases: Purchase[] = []) => {
  Element.prototype.scrollIntoView = vi.fn();
  render(<PurchaseForm settings={settings} materials={groupMaterials(purchases)} onSave={onSave} onCancel={() => {}} />);
};

const fill = () => {
  fireEvent.change(screen.getByLabelText(/^Material/), { target: { value: 'Fio de teste' } });
  fireEvent.change(screen.getByLabelText(/^Quantidade comprada/), { target: { value: '200' } });
  fireEvent.change(screen.getByLabelText(/^Valor total pago/), { target: { value: '30' } });
};

const submit = () => act(async () => { fireEvent.click(screen.getByRole('button', { name: /Salvar compra|Salvando/ })); });

describe('PurchaseForm: salvar', () => {
  it('sem material e sem quantidade, não salva e diz o que falta perto do botão', async () => {
    const onSave = vi.fn();
    setup(onSave);
    await submit();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Falta preencher')).toBeInTheDocument();
    expect(screen.getByText(/Material e Quantidade comprada/)).toBeInTheDocument();
  });

  it('com os dados preenchidos, entrega a compra para salvar', async () => {
    const onSave = vi.fn();
    setup(onSave);
    fill();
    await submit();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ material: 'Fio de teste', quantityPurchased: 200, totalPaid: 30 });
    expect(screen.queryByText('Falta preencher')).not.toBeInTheDocument();
  });

  it('se gravar falhar, mostra o motivo, mantém os dados e deixa tentar de novo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSave = vi.fn().mockRejectedValueOnce(new Error('QuotaExceededError: sem espaço')).mockResolvedValueOnce(undefined);
    setup(onSave);
    fill();
    await submit();
    expect(screen.getByText('Não foi possível salvar a compra')).toBeInTheDocument();
    expect(screen.getByText(/QuotaExceededError: sem espaço/)).toBeInTheDocument();
    expect((screen.getByLabelText(/^Material/) as HTMLInputElement).value).toBe('Fio de teste');
    expect(screen.getByRole('button', { name: 'Salvar compra' })).toBeEnabled();

    await submit(); // segunda tentativa
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Não foi possível salvar a compra')).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

describe('PurchaseForm: unidade do material', () => {
  const fioEmGramas = { id: 'p1', date: new Date(), material: 'Fio de teste', type: 'fio', unit: 'gramas', quantityPurchased: 100, quantityRemaining: 100, minStock: 0 } as Purchase;

  it('avisa quando o material já existe em outra unidade e deixa trocar com um toque', () => {
    setup(vi.fn(), [fioEmGramas]);
    fireEvent.change(screen.getByLabelText(/^Material/), { target: { value: 'fio de teste' } });
    expect(screen.queryByText(/está em g no estoque/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Unidade de medida/), { target: { value: 'metros' } });
    expect(screen.getByText(/está em g no estoque/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Usar g' }));
    expect((screen.getByLabelText(/^Unidade de medida/) as HTMLSelectElement).value).toBe('gramas');
    expect(screen.queryByText(/está em g no estoque/)).not.toBeInTheDocument();
  });
});
