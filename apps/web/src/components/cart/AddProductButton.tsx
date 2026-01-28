'use client';

import type { ReactNode } from 'react';
import { useCart } from '@/store/cart';
import { ShoppingCart } from 'lucide-react';

type ProductForCartButton = {
  id: string | number;
  slug: string;
  titulo: string;
  precio: number; // precio directo
  stock?: number | null;
  imagen?: string | null;
  imagenes?: Array<{ url?: string | null } | null> | null;
};

export function AddProductButton({
  p,
  className,
  children,
}: {
  p: ProductForCartButton;
  className?: string;
  children?: ReactNode;
}) {
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
      className={`group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ec5a8f] px-4 py-2 text-center text-white transition-all duration-300 hover:bg-[#d6457d] hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
    >
      {outOfStock ? (
        <span className="text-sm text-gray-200">Sin stock</span>
      ) : children ? (
        children
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          <span>Agregar</span>
        </>
      )}
    </button>
  );
}

