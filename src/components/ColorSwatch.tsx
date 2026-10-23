import React from 'react';
import { materialSwatch } from '../calculations/colors';

/** Bolinha com a cor do material. Se a cor não foi reconhecida, fica tracejada e neutra (cor aproximada). */
export const ColorSwatch: React.FC<{ name?: string; hex?: string; size?: 'sm' | 'lg' | 'xl' }> = ({ name, hex, size = 'sm' }) => {
  const { css, exact } = materialSwatch(name, hex);
  return (
    <span
      className={`swatch ${size === 'sm' ? '' : size} ${exact ? '' : 'approx'}`}
      style={{ background: css }}
      title={exact ? name || css : `Cor aproximada${name ? ` de "${name}"` : ''}: escolha a cor exata ao editar a compra`}
      role="img"
      aria-label={name ? `Cor ${name}` : 'Cor do material'}
    />
  );
};
