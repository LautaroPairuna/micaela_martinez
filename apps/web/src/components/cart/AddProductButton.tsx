'use client';

import { useCart } from '@/store/cart';

type ProductForCartButton = {
  id: string | number;
  slug: string;
  titulo: string;
  precio: number; // en centavos
  stock?: number | null;
  imagen?: string | null;
  imagenes?: Array<{ url?: string | null } | null> | null;
};

export function AddProductButton({ p }: { p: ProductForCartButton }) {
  const addProduct = useCart((s) => s.addProduct);

  const outOfStock = typeof p.stock === 'number' && p.stock <= 0;
  const image =
    (Array.isArray(p.imagenes) ? p.imagenes?.[0]?.url ?? null : null) ??
    p.imagen ??
    null;
  const maxQty = typeof p.stock === 'number' ? p.stock : null;

  return (
    <button
      disabled={outOfStock}
      onClick={() =>
        addProduct({
          id: String(p.id),
          slug: p.slug,
          title: p.titulo,
          priceCents: p.precio,
          image,
          maxQty,
          quantity: 1,
        })
      }
      className="rounded-xl2 px-3 py-2 border border-default bg-[var(--gold)] text-neutral-950 hover:brightness-95 disabled:opacity-50"
    >
      {outOfStock ? 'Sin stock' : 'Agregar al carrito'}
    </button>
  );
}
