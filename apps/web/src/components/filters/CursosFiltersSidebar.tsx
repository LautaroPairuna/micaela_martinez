// apps/web/src/components/filters/CursosFiltersSidebar.tsx
import Link from 'next/link';
import { FilterSection } from './FilterSection';
import { Nivel, buildCursosPathResetPage } from '@/lib/routes';

export function CursosFiltersSidebar({
  facets,
  state,
}: {
  facets: { niveles?: Array<{ nivel: Nivel; count: number }>; tags?: Array<{ tag: string; count: number }> };
  state: { nivel?: Nivel; tag?: string; q: string; sort: string | null | undefined };
}) {
  const { nivel, tag, q, sort } = state;
  const sortParam = sort; // ya viene null si es 'relevancia'

  const toNivelLabel = (n: Nivel) => (n === 'BASICO' ? 'Básico' : n === 'INTERMEDIO' ? 'Intermedio' : 'Avanzado');

  return (
    <aside className="space-y-6">
      <FilterSection title="Nivel">
        <ul className="px-1 pb-2 text-sm">
          <li>
            <Link
              href={buildCursosPathResetPage({ nivel: undefined, tag, q, sort: sortParam })}
              className={['flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-subtle', !nivel ? 'text-[var(--pink)] font-medium' : ''].join(' ')}
            >
              Todos
            </Link>
          </li>
          {(facets.niveles ?? []).map((n) => {
            const active = nivel === (n.nivel as Nivel);
            return (
              <li key={n.nivel}>
                <Link
                  href={buildCursosPathResetPage({ nivel: n.nivel as Nivel, tag, q, sort: sortParam })}
                  className={['flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-subtle', active ? 'text-[var(--pink)] font-medium' : ''].join(' ')}
                >
                  <span>{toNivelLabel(n.nivel as Nivel)}</span>
                  <span className="text-muted">{n.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </FilterSection>

      {facets.tags?.length ? (
        <FilterSection title="Tags">
          <ul className="px-2 pb-3 flex flex-wrap gap-2 text-xs">
            <li>
              <Link
                href={buildCursosPathResetPage({ nivel, tag: undefined, q, sort: sortParam })}
                className={['rounded-full border border-default px-3 py-1 hover:border-[var(--pink)] hover:text-[var(--pink)]', !tag ? 'text-[var(--pink)] border-[var(--pink)]' : ''].join(' ')}
              >
                #todos
              </Link>
            </li>
            {facets.tags.map((t) => {
              const active = tag === t.tag;
              return (
                <li key={t.tag}>
                  <Link
                    href={buildCursosPathResetPage({ nivel, tag: t.tag, q, sort: sortParam })}
                    className={['rounded-full border border-default px-3 py-1 hover:border-[var(--pink)] hover:text-[var(--pink)]', active ? 'text-[var(--pink)] border-[var(--pink)]' : ''].join(' ')}
                  >
                    #{t.tag}
                  </Link>
                </li>
              );
            })}
          </ul>
        </FilterSection>
      ) : null}
    </aside>
  );
}
