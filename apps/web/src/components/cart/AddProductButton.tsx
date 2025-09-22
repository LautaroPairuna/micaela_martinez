'use client';

import { useCart } from '@/store/cart';

type ProductForCartButton = {
  id: string | number;
  slug: string;
  titulo: string;
  precio: number; // precio directo
  stock?: number | null;
  imagen?: string | null;
  imagenes?: Array<{ url?: string | null } | null> | null;
};

export function AddProductButton({ p, className }: { p: ProductForCartButton; className?: string }) {
  const addProduct = useCart((s) => s.addProduct);

  const outOfStock = typeof p.stock === 'number' && p.stock <= 0;
  const image =
    (Array.isArray(p.imagenes) ? p.imagenes?.[0]?.url ?? null : null) ??
    p.imagen ??
    null;
  const maxQty = typeof p.stock === 'number' ? p.stock : null;

  const handleAddToCart = async () => {
    try {
      await addProduct({
        id: String(p.id),
        slug: p.slug,
        title: p.titulo,
        price: p.precio,
        image,
        maxQty,
        quantity: 1,
      });
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
    }
  };

  return (
    <button
      disabled={outOfStock}
      onClick={handleAddToCart}
      className={`rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 px-4 py-2 text-center transition-all duration-300 hover:from-gray-700 hover:to-gray-600 hover:border-[var(--gold)]/50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${className || ''}`}
    >
      <span className="text-sm font-medium text-gray-200 transition-colors hover:text-[var(--gold)]">
        {outOfStock ? 'Sin stock' : 'Agregar al carrito'}
      </span>
    </button>
  );
}

