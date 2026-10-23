import React from 'react';
import { PRODUCT_ART, artKeyFor } from './productArtData';
import type { Product } from '../types';

interface ProductArtProps {
  product?: Pick<Product, 'name' | 'category' | 'photo'>;
  /** Para pedidos personalizados, sem produto do catálogo. */
  artKey?: string;
  size?: 'sm' | 'md' | 'md-lg' | 'wide' | 'lg';
  placeholderNote?: boolean;
  alt?: string;
}

/**
 * Foto do produto. Com `photo` (data URL gravada neste aparelho) mostra a foto;
 * sem foto, uma ilustração em linha do ateliê.
 */
export const ProductArt: React.FC<ProductArtProps> = ({ product, artKey, size = 'sm', placeholderNote, alt }) => {
  const key = artKey ?? (product ? artKeyFor(product) : 'novelo');
  const label = alt ?? (product ? `Foto de ${product.name}` : 'Ilustração do produto');
  return (
    <div className={`pic ${size === 'sm' ? 'sm' : size === 'md' ? 'md' : size === 'md-lg' ? 'md-lg' : size === 'wide' ? 'wide' : 'lg'}`}>
      {product?.photo ? (
        <img src={product.photo} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={label}
          preserveAspectRatio="xMidYMid slice"
          dangerouslySetInnerHTML={{ __html: PRODUCT_ART[key] ?? PRODUCT_ART.novelo }}
        />
      )}
      {placeholderNote && !product?.photo && <span className="ph">Sem foto ainda</span>}
    </div>
  );
};
