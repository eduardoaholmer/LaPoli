import React from 'react';
import { Palette } from 'lucide-react';
import { YARN_COLORS, isHexColor } from '../calculations/colors';

interface ColorPickerProps {
  name?: string;
  hex?: string;
  onChange: (patch: { color?: string; colorHex?: string }) => void;
}

const sameColor = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const isPaletteName = (name?: string) => !!name && YARN_COLORS.some(c => c.name.toLowerCase() === name.trim().toLowerCase());

/** Paleta de cores de fio + "outra cor". Escolher da paleta preenche o nome se ele estiver vazio. */
export const ColorPicker: React.FC<ColorPickerProps> = ({ name, hex, onChange }) => {
  const pick = (c: { name: string; hex: string }) => {
    if (sameColor(hex, c.hex)) return onChange({ colorHex: undefined }); // clicar de novo desmarca
    // só troca o nome quando está vazio ou é o nome de outra cor da paleta (nunca apaga um nome digitado)
    onChange({ colorHex: c.hex, ...(!name?.trim() || isPaletteName(name) ? { color: c.name } : {}) });
  };

  return (
    <div className="color-picker" role="group" aria-label="Escolher a cor">
      {YARN_COLORS.map(c => (
        <button key={c.name} type="button" className="opt" style={{ background: c.hex }} title={c.name} aria-label={c.name} aria-pressed={sameColor(hex, c.hex)} onClick={() => pick(c)} />
      ))}
      <label className="custom">
        <input type="color" aria-label="Outra cor" value={isHexColor(hex) ? hex : '#C97B5F'} onChange={e => onChange({ colorHex: e.target.value })} />
        <Palette size={14} aria-hidden="true" /> Outra cor
      </label>
    </div>
  );
};
