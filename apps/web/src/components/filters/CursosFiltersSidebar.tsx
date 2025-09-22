// apps/web/src/components/filters/CursosFiltersSidebar.tsx
import Link from 'next/link';
import { FilterSection } from './FilterSection';
import { Nivel, buildCursosPathResetPage, buildCursosPrettyPath } from '@/lib/routes';

const cx = (...cls: Array<string | false | null | undefined>) =>
  cls.filter(Boolean).join(' ');

export function CursosFiltersSidebar({
  facets,
  state,
}: {
  facets: { niveles?: Array<{ nivel: Nivel; count: number }>; tags?: Array<{ tag: string; count: number }> };
  state: { nivel?: Nivel; tag?: string; q: string; sort: string | null | undefined };
}) {
  const { nivel, tag, q, sort } = state;
  const sortParam = sort; // ya viene null si es 'relevancia'

  const hasAnyFilter = !!(nivel || tag);

  const clearHref = buildCursosPrettyPath({
    nivel: undefined,
    tag: undefined,
    q,
    sort: sortParam,
    page: null,
  });

  const toNivelLabel = (n: Nivel) => (n === 'BASICO' ? 'Básico' : n === 'INTERMEDIO' ? 'Intermedio' : 'Avanzado');

  return (
    <aside className="space-y-4 sm:space-y-6">
      {/* Limpiar filtros (se muestra solo si hay alguno aplicado) */}
      {hasAnyFilter && (
        <div className="flex justify-end">
          <Link
            href={clearHref}
            className="rounded-xl2 border border-default px-3 py-1.5 text-sm hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground"
          >
            Limpiar filtros
          </Link>
        </div>
      )}

      <FilterSection title="Nivel">
        <ul className="px-1 pb-2 text-sm">
          <li>
            {(() => {
              const active = !nivel;
              const href = buildCursosPathResetPage({ nivel: undefined, tag, q, sort: sortParam });
              return (
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'flex items-center justify-between rounded-md px-2 py-2 sm:py-1.5 transition-colors hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground',
                    active && 'text-foreground font-medium bg-subtle/50'
                  )}
                >
                  Todos
                </Link>
              );
            })()}
          </li>
          {(facets.niveles ?? []).map((n) => {
            const active = nivel === (n.nivel as Nivel);
            const href = buildCursosPathResetPage({ nivel: n.nivel as Nivel, tag, q, sort: sortParam });
            return (
              <li key={n.nivel}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'flex items-center justify-between rounded-md px-2 py-2 sm:py-1.5 transition-colors hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground',
                    active && 'text-foreground font-medium bg-subtle/50'
                  )}
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
          <ul className="px-1 pb-2 text-sm">
            <li>
              {(() => {
                const active = !tag;
                const href = buildCursosPathResetPage({ nivel, tag: undefined, q, sort: sortParam });
                return (
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center justify-between rounded-md px-2 py-2 sm:py-1.5 transition-colors hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground',
                      active && 'text-foreground font-medium bg-subtle/50'
                    )}
                  >
                    Todos
                  </Link>
                );
              })()}
            </li>
            {(facets.tags ?? []).map((t) => {
              const active = tag === t.tag;
              const href = buildCursosPathResetPage({ nivel, tag: t.tag, q, sort: sortParam });
              return (
                <li key={t.tag}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center justify-between rounded-md px-2 py-2 sm:py-1.5 transition-colors hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground',
                      active && 'text-foreground font-medium bg-subtle/50'
                    )}
                  >
                    <span>{t.tag}</span>
                    <span className="text-muted">{t.count}</span>
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
