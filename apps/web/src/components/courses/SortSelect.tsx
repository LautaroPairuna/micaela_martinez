'use client';

import { useRouter } from 'next/navigation';
import { buildCursosPrettyPath, type Nivel, type CursoSort } from '@/lib/routes';

type Props = {
  id?: string;
  nivel?: Nivel;
  tag?: string | null;
  q?: string;
  sort: CursoSort;     // tipado fuerte
  className?: string;
  replaceMode?: boolean; // opcional: true = replace en vez de push
};

export default function SortSelect({
  id,
  nivel,
  tag,
  q = '',
  sort,
  className,
  replaceMode = false,
}: Props) {
  const router = useRouter();

  return (
    <select
      id={id}
      defaultValue={sort}
      aria-label="Ordenar resultados"
      className={className}
      onChange={(e) => {
        const v = e.target.value as CursoSort;
        if (v === sort) return; // evita navegación innecesaria

        const href = buildCursosPrettyPath({
          nivel,
          tag: tag ?? undefined,
          q,
          sort: v === 'relevancia' ? null : v, // no mandar el sort por defecto
          page: null,                           // reset de paginación
        });

        if (replaceMode) {
          router.replace(href);
        } else {
          router.push(href);
        }
      }}
    >
      <option value="relevancia">Relevancia</option>
      <option value="novedades">Novedades</option>
      <option value="precio_asc">Precio ↑</option>
      <option value="precio_desc">Precio ↓</option>
      <option value="rating_desc">Mejor valorados</option>
    </select>
  );
}
