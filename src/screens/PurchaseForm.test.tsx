import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PurchaseForm } from './PurchaseForm';
import type { Purchase, Settings } from '../types';
import { groupMaterials } from '../calculations/materials';

const settings = { units: ['gramas', 'metros', 'unidades'], materialTypes: ['fio', 'olhos'], paymentMethods: ['Pix'], purchaseStatuses: ['disponível'] } as unknown as Settings;

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
    expect(screen.getByText(/Material, Quantidade comprada e Valor pago/)).toBeInTheDocument();
  });

  it('com os dados preenchidos, entrega a compra para salvar', async () => {
    const onSave = vi.fn();
    setup(onSave);
    fill();
    await submit();
    expect(onSave).toHaveBeenCalledTimes(1);
    // compra paga na hora é o caso comum: não pode virar "conta a pagar" no Financeiro
    expect(onSave.mock.calls[0][0]).toMatchObject({ material: 'Fio de teste', quantityPurchased: 200, quantityRemaining: 200, totalPaid: 30, paymentStatus: 'quitado' });
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

describe('PurchaseForm: compra rápida', () => {
  const lastLot = {
    id: 'p1', date: new Date(2026, 0, 1), material: 'Fio Círculo', type: 'fio', unit: 'gramas', color: 'Caramelo', brand: 'Círculo',
    store: 'Armarinho', minStock: 300, packageName: 'novelo', packageSize: 100, quantityPurchased: 300, quantityRemaining: 50
  } as Purchase;

  it('sem valor pago não salva, a não ser que o material tenha sido ganho', async () => {
    const onSave = vi.fn();
    setup(onSave);
    fireEvent.change(screen.getByLabelText(/^Material/), { target: { value: 'Retalhos' } });
    fireEvent.change(screen.getByLabelText(/^Quantidade comprada/), { target: { value: '50' } });
    await submit();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Informe quanto pagou/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Ganhei ou é sobra/));
    await submit();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ totalPaid: 0, paymentStatus: 'quitado' });
  });

  it('recompra: escolher um material que existe copia tipo, unidade, novelo, cor, mínimo e loja', async () => {
    const onSave = vi.fn();
    setup(onSave, [lastLot]);
    fireEvent.change(screen.getByLabelText(/^Material/), { target: { value: 'fio circulo' } });
    expect(screen.getByText(/copiados da última compra/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Quantos novelos/), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/^Valor total pago/), { target: { value: '45' } });
    await submit();
    expect(onSave.mock.calls[0][0]).toMatchObject({
      material: 'Fio Círculo', type: 'fio', unit: 'gramas', color: 'Caramelo', brand: 'Círculo', store: 'Armarinho',
      minStock: 300, packageName: 'novelo', packageSize: 100, packageCount: 3, quantityPurchased: 300, quantityRemaining: 300
    });
  });

  it('material novo: o mínimo sugerido acompanha a unidade', async () => {
    const onSave = vi.fn();
    setup(onSave);
    fireEvent.change(screen.getByLabelText(/^Material/), { target: { value: 'Olho 12 mm' } });
    fireEvent.change(screen.getByLabelText(/^Unidade de medida/), { target: { value: 'unidades' } });
    fireEvent.change(screen.getByLabelText(/^Quantidade comprada/), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(/^Valor total pago/), { target: { value: '10' } });
    await submit();
    expect(onSave.mock.calls[0][0]).toMatchObject({ unit: 'unidades', minStock: 4 });
  });

  it('nome quase igual a um existente sugere usar o nome que já existe', () => {
    setup(vi.fn(), [lastLot]);
    fireEvent.change(screen.getByLabelText(/^Material/), { target: { value: 'Fio Circlo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Usar “Fio Círculo”' }));
    expect((screen.getByLabelText(/^Material/) as HTMLInputElement).value).toBe('Fio Círculo');
  });

  it('avisa a tela quando algo foi preenchido', () => {
    const onDirty = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    render(<PurchaseForm settings={settings} materials={[]} onSave={vi.fn()} onCancel={() => {}} onDirtyChange={onDirty} />);
    expect(onDirty).toHaveBeenLastCalledWith(false);
    fireEvent.change(screen.getByLabelText(/^Material/), { target: { value: 'F' } });
    expect(onDirty).toHaveBeenLastCalledWith(true);
  });
});
