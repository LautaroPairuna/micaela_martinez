'use client';

import { useCart } from '@/store/cart';

export function AddProductButton({ p }: { p: any }) {
  const addProduct = useCart(s => s.addProduct);
  const outOfStock = typeof p.stock === 'number' && p.stock <= 0;

  return (
    <button
      disabled={outOfStock}
      onClick={() =>
        addProduct({
          id: p.id,
          slug: p.slug,
          title: p.titulo,
          priceCents: p.precio,
          image: p.imagenes?.[0]?.url ?? p.imagen ?? null,
          maxQty: typeof p.stock === 'number' ? p.stock : null,
          quantity: 1,
        })
      }
      className="rounded-xl2 px-3 py-2 border border-default bg-[var(--gold)] text-neutral-950 hover:brightness-95 disabled:opacity-50"
    >
      {outOfStock ? 'Sin stock' : 'Agregar al carrito'}
    </button>
  );
}
