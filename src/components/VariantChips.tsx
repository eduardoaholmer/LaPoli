import React from 'react';
import { formatQuantity, type MaterialGroup } from '../calculations/materials';
import { ColorSwatch } from './ColorSwatch';

/** Quanto tem de cada cor (só quando o material tem mais de uma); cor abaixo do mínimo fica destacada. */
export const VariantChips: React.FC<{ group: MaterialGroup }> = ({ group }) =>
  group.variants.length > 1 ? (
    <div className="variant-chips">
      {group.variants.map(v => {
        const low = v.minStock > 0 && v.remaining < v.minStock;
        return (
          <span key={v.key} className={`vchip ${low ? 'low' : ''}`} title={low ? `Abaixo do mínimo de ${formatQuantity(v.minStock, group.unit)}` : undefined}>
            <ColorSwatch name={v.name} hex={v.hex} />
            {v.name} <b className="num">{formatQuantity(v.remaining, group.unit)}</b>
          </span>
        );
      })}
    </div>
  ) : null;
