'use client';

import { useCart } from '@/store/cart';

type CourseForCartButton = {
  id: string | number;
  slug: string;
  titulo: string;
  precio: number; // en centavos
  portadaUrl?: string | null;
};

export function BuyCourseButton({ c }: { c: CourseForCartButton }) {
  const addCourse = useCart((s) => s.addCourse);

  return (
    <button
      onClick={() =>
        addCourse({
          id: String(c.id),
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
