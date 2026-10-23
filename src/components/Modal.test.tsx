import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Modal } from './Modal';

const wait = (ms: number) => act(() => new Promise<void>(r => setTimeout(r, ms)));

// O pai passa uma função nova de onClose a cada render, como as telas fazem.
const Harness: React.FC<{ onClosed?: () => void }> = ({ onClosed }) => {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(true);
  return (
    <Modal
      isOpen={open}
      onClose={() => {
        onClosed?.();
        setOpen(false);
      }}
      title="Teste"
    >
      <input aria-label="primeiro" />
      <input aria-label="segundo" value={text} onChange={e => setText(e.target.value)} />
    </Modal>
  );
};

describe('Modal', () => {
  it('digitar em um campo não devolve o foco ao primeiro campo nem ao botão que abriu', async () => {
    render(<Harness />);
    await wait(60); // o foco inicial vai para o primeiro campo
    const second = screen.getByLabelText('segundo');
    second.focus();

    for (const ch of '4821') {
      fireEvent.change(second, { target: { value: (second as HTMLInputElement).value + ch } });
      await wait(60); // mais que os 30 ms do foco inicial: antes do conserto o foco pulava aqui
      expect(document.activeElement).toBe(second);
    }
    expect((second as HTMLInputElement).value).toBe('4821');
  });

  it('Esc chama o onClose mais recente', async () => {
    const onClosed = vi.fn();
    render(<Harness onClosed={onClosed} />);
    await wait(60);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Modal com formulário preenchido', () => {
  const Guarded: React.FC<{ onClosed: () => void }> = ({ onClosed }) => {
    const [open, setOpen] = useState(true);
    return (
      <Modal isOpen={open} onClose={() => { onClosed(); setOpen(false); }} title="Compra" confirmClose>
        <input aria-label="campo" />
      </Modal>
    );
  };

  it('tocar fora pergunta antes; "Continuar preenchendo" mantém o modal aberto', async () => {
    const onClosed = vi.fn();
    const { container } = render(<Guarded onClosed={onClosed} />);
    fireEvent.mouseDown(container.ownerDocument.querySelector('.overlay')!);
    expect(screen.getByText('Sair sem salvar?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar preenchendo' }));
    expect(onClosed).not.toHaveBeenCalled();
    expect(screen.queryByText('Sair sem salvar?')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Esc pergunta; "Sair sem salvar" fecha', async () => {
    const onClosed = vi.fn();
    render(<Guarded onClosed={onClosed} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClosed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sair sem salvar' }));
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
