import React, { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from './Button';

/**
 * Lista editada item por item (categorias, formas de pagamento…): cada item vira um chip com "remover"
 * e um campo adiciona o próximo. Substitui a caixa de texto "um por linha".
 */
export const ListEditor: React.FC<{ label: string; items: string[]; onChange: (items: string[]) => void; placeholder?: string }> = ({ label, items, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  const id = useId();
  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (!items.some(i => i.toLowerCase() === value.toLowerCase())) onChange([...items, value]);
    setDraft('');
  };
  return (
    <div className="field list-editor">
      <label htmlFor={id}>{label}</label>
      <div className="chips">
        {items.map(item => (
          <span key={item} className="chip on-soft">
            {item}
            <button type="button" aria-label={`Remover ${item}`} onClick={() => onChange(items.filter(i => i !== item))}>
              <X size={14} />
            </button>
          </span>
        ))}
        {!items.length && <span className="small muted">Nenhum item ainda.</span>}
      </div>
      <div className="row mt-8">
        <input
          id={id}
          className="input"
          value={draft}
          placeholder={placeholder ?? 'Novo item'}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" icon={<Plus size={16} />} onClick={add} disabled={!draft.trim()}>
          Adicionar
        </Button>
      </div>
    </div>
  );
};
