import React from 'react';
import type { Product } from '../types';
import { piecesPossible, pluralize, type MaterialGroup, type Reservation } from '../calculations/materials';

/** "Dá para fazer 3" com o estoque livre (já descontado o que os pedidos confirmados vão usar). */
export const PiecesHint: React.FC<{ product: Product; groups: MaterialGroup[]; reserved: Map<string, Reservation>; long?: boolean }> = ({ product, groups, reserved, long }) => {
  const possible = piecesPossible(product, groups, reserved);
  if (!possible) return null;
  const { count, limiting } = possible;
  return (
    <span className={`small ${count === 0 ? 'neg' : count <= 2 ? 'warn' : 'pos'}`}>
      {count === 0 ? 'Sem material livre' : `Dá para fazer ${count} ${pluralize('peça', count)}`}
      {long && limiting && <span className="muted"> · {count === 0 ? 'falta' : 'limite:'} {limiting}</span>}
    </span>
  );
};
