'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart, cartSelectors } from '@/store/cart';
import { useEffect, useState } from 'react';

export function CartButton() {
  const toggle = useCart(s => s.toggle);
  const items = useCart(s => s.items);
  const hydrated = useCart(s => s.hydrated);

  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!hydrated) return;
    setCount(cartSelectors.count(items));
  }, [items, hydrated]);

  return (
    <button
      type="button"
      onClick={toggle}
      className="relative inline-flex items-center gap-2 rounded-xl2 border border-default px-3 py-1.5 hover:bg-subtle"
      aria-label="Abrir carrito"
    >
      <ShoppingBag className="size-4" />
      <span className="text-sm">Carrito</span>

      {hydrated && count > 0 && (
        <span
          className="
            absolute -top-2 -right-2 min-w-[20px] h-5 px-1
            rounded-full bg-[var(--gold)] text-neutral-950 text-xs
            grid place-items-center ring-1 ring-black/5
          "
          aria-label={`${count} artículos en el carrito`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
