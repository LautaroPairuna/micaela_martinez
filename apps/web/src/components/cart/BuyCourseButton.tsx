'use client';

import { useCart } from '@/store/cart';

export function BuyCourseButton({ c }: { c: any }) {
  const addCourse = useCart(s => s.addCourse);
  return (
    <button
      onClick={() =>
        addCourse({
          id: c.id,
          slug: c.slug,
          title: c.titulo,
          priceCents: c.precio,
          image: c.portadaUrl ?? null,
        })
      }
      className="rounded-xl2 px-3 py-2 border border-default bg-[var(--gold)] text-neutral-950 hover:brightness-95"
    >
      Comprar curso
    </button>
  );
}
