import Link from 'next/link';
import { FilterSection } from './FilterSection';
import { buildTiendaPrettyPath } from '@/lib/routes';
import { PriceFilterClient } from './PriceFilterClient';

type MarcaFacet = { id: string; slug?: string; nombre: string; count: number };
type CategoriaFacet = { id: string; slug?: string; nombre: string; count: number };

const cx = (...cls: Array<string | false | null | undefined>) =>
  cls.filter(Boolean).join(' ');

export function TiendaFiltersSidebar({
  facets,
  state,
}: {
  facets: { marcas?: MarcaFacet[]; categorias?: CategoriaFacet[] };
  state: {
    categoria?: string;
    marca?: string;
    q: string;
    minPrice?: number;
    maxPrice?: number;
    // sort para construir hrefs; si es 'relevancia' debe venir null
    sort: string | null | undefined;
  };
}) {
  const { categoria, marca, q, minPrice, maxPrice, sort } = state;
  const hasAnyFilter =
    !!(categoria || marca || (minPrice && minPrice > 0) || (maxPrice && maxPrice > 0));

  const clearHref = buildTiendaPrettyPath({
    categoria: undefined,
    marca: undefined,
    q,
    minPrice: undefined,
    maxPrice: undefined,
    sort,
    page: null,
  });

  return (
    <aside className="space-y-4 sm:space-y-6">
      {/* Limpiar filtros (se muestra solo si hay alguno aplicado) */}
      {hasAnyFilter && (
        <div className="flex justify-end">
          <Link
            href={clearHref}
            className="rounded-xl2 border border-default px-3 py-1.5 text-sm hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          >
            Limpiar filtros
          </Link>
        </div>
      )}

      {/* Precio */}
      <FilterSection title="Precio">
        <div className="px-2 pb-2 space-y-2 sm:space-y-3">
          <PriceFilterClient categoria={categoria} marca={marca} q={q} sort={sort ?? null} minPrice={minPrice} maxPrice={maxPrice} />
        </div>
      </FilterSection>

      {/* Marcas */}
      {facets.marcas?.length ? (
        <FilterSection title="Marcas">
          <ul className="px-1 pb-2 text-sm">
            <li>
              {(() => {
                const active = !marca;
                const href = buildTiendaPrettyPath({
                  categoria,
                  marca: undefined,
                  q,
                  minPrice,
                  maxPrice,
                  sort,
                });
                return (
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center justify-between rounded-md px-2 py-2 sm:py-1.5 transition-colors hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pink)]',
                      active && 'text-[color:var(--pink)] font-medium bg-subtle/50'
                    )}
                  >
                    Todas
                  </Link>
                );
              })()}
            </li>

            {facets.marcas.map((m) => {
              const slug = m.slug || m.id;
              const active = slug === marca;
              const href = buildTiendaPrettyPath({
                categoria,
                marca: slug,
                q,
                minPrice,
                maxPrice,
                sort,
              });

              return (
                <li key={m.id}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center justify-between rounded-md px-2 py-2 sm:py-1.5 transition-colors hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pink)]',
                      active && 'text-[color:var(--pink)] font-medium bg-subtle/50'
                    )}
                  >
                    <span className="truncate">{m.nombre}</span>
                    <span
                      className={cx(
                        'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px]',
                        active ? 'border border-[color:var(--pink)] text-[color:var(--pink)]' : 'border border-default text-muted'
                      )}
                    >
                      {m.count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </FilterSection>
      ) : null}

      {/* Categorías */}
      {facets.categorias?.length ? (
        <FilterSection title="Categorias">
          <ul className="px-1 pb-2 text-sm">
            <li>
              {(() => {
                const active = !categoria;
                const href = buildTiendaPrettyPath({
                  categoria: undefined,
                  marca,
                  q,
                  minPrice,
                  maxPrice,
                  sort,
                });
                return (
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center justify-between rounded-md px-2 py-2 sm:py-1.5 transition-colors hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pink)]',
                      active && 'text-[color:var(--pink)] font-medium bg-subtle/50'
                    )}
                  >
                    Todas
                  </Link>
                );
              })()}
            </li>

            {facets.categorias.map((c) => {
              const slug = c.slug || c.id;
              const active = slug === categoria;
              const href = buildTiendaPrettyPath({
                categoria: slug,
                marca,
                q,
                minPrice,
                maxPrice,
                sort,
              });

              return (
                <li key={c.id}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center justify-between rounded-md px-2 py-2 sm:py-1.5 transition-colors hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]',
                      active && 'text-[color:var(--gold)] font-medium bg-subtle/50'
                    )}
                  >
                    <span className="truncate">{c.nombre}</span>
                    <span
                      className={cx(
                        'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px]',
                        active ? 'border border-[color:var(--pink)] text-[color:var(--pink)]' : 'border border-default text-muted'
                      )}
                    >
                      {c.count}
                    </span>
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
