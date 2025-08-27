import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';

import { getProducts, getProductFacets } from '@/lib/api';
import {
  buildTiendaPrettyPath,
  buildTiendaPathResetPage,
  parseTiendaPretty,
  migrateTiendaLegacyToPretty,
  sanitizeProductoSort,
} from '@/lib/routes';

import { ProductCard } from '@/components/catalog/ProductCard';
import { TiendaFiltersSidebar } from '@/components/filters/TiendaFiltersSidebar';
import { FilterChips } from '@/components/filters/FilterChips';
import { SortBar } from '@/components/filters/SortBar';
import { SortOptionsList } from '@/components/filters/SortOptionsList';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiltersDrawer } from '@/components/filters/FiltersDrawer';

export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ filters?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const { filters } = await params;
  const sp = await searchParams;

  const { categoria, marca, sort: sortSeg, page } = parseTiendaPretty(filters);
  const sort = sortSeg ?? sanitizeProductoSort(sp.sort);

  const title = [
    'Tienda',
    categoria && `· ${categoria}`,
    marca && `· ${marca}`,
    sort !== 'relevancia' && `· Orden ${sort}`,
    page && page > 1 && `· Página ${page}`,
  ]
    .filter(Boolean)
    .join(' ');

  const canonical = buildTiendaPrettyPath({
    categoria,
    marca,
    q: sp.q,
    minPrice: sp.minPrice,
    maxPrice: sp.maxPrice,
    sort,
    page: page && page > 1 ? page : null,
  });

  const robots = page && page > 1 ? { index: false, follow: true } : undefined;
  return {
    title,
    description: 'Compra productos de cosmética seleccionados por Micaela.',
    alternates: { canonical },
    robots,
  };
}

export default async function TiendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ filters?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const PAGE_SIZE = 8;

  const { filters } = await params;
  const sp = await searchParams;

  // Migración legacy → pretty
  const toPretty = migrateTiendaLegacyToPretty(filters, sp);
  if (toPretty) redirect(toPretty);

  const { categoria, marca, sort: sortSeg, page: prettyPage } = parseTiendaPretty(filters);

  // Canónico de ?sort=
  if (typeof sp.sort !== 'undefined') {
    const clean = buildTiendaPrettyPath({
      categoria,
      marca,
      q: sp.q ?? null,
      minPrice: sp.minPrice ?? null,
      maxPrice: sp.maxPrice ?? null,
      sort: sanitizeProductoSort(sp.sort),
      page: prettyPage > 1 ? prettyPage : null,
    });
    redirect(clean);
  }

  const q = sp.q || '';
  const sort = sortSeg ?? 'relevancia';
  const page = Number(sp.page || prettyPage || 1);
  const minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;

  const [{ items, meta }, facets] = await Promise.all([
    getProducts({ q, categoria, marca, minPrice, maxPrice, sort, page, perPage: PAGE_SIZE }),
    getProductFacets({ q, categoria, marca, minPrice, maxPrice }),
  ]);

  const currentPage = meta?.page ?? page;
  const totalPages  = meta?.pages ?? 1;

  // Chips (usar labels si existen)
  const marcaLabel = marca
    ? facets?.marcas?.find((m:any) => (m.slug || m.id) === marca)?.nombre || marca
    : null;
  const categoriaLabel = categoria
    ? facets?.categorias?.find((c:any) => (c.slug || c.id) === categoria)?.nombre || categoria
    : null;

  const chips: Array<{ label: string; href: string }> = [];
  if (marca) {
    chips.push({
      label: `Marca: ${marcaLabel}`,
      href: buildTiendaPathResetPage({ categoria, marca: undefined, q, minPrice, maxPrice, sort }),
    });
  }
  if (categoria) {
    chips.push({
      label: `Categoría: ${categoriaLabel}`,
      href: buildTiendaPathResetPage({ categoria: undefined, marca, q, minPrice, maxPrice, sort }),
    });
  }
  if (typeof minPrice === 'number' || typeof maxPrice === 'number') {
    const priceLabel =
      typeof minPrice === 'number' && typeof maxPrice === 'number'
        ? `Precio: ${minPrice}–${maxPrice}`
        : typeof minPrice === 'number'
          ? `Precio: desde ${minPrice}`
          : `Precio: hasta ${maxPrice}`;
    chips.push({
      label: priceLabel,
      href: buildTiendaPathResetPage({ categoria, marca, q, minPrice: undefined, maxPrice: undefined, sort }),
    });
  }
  if (q) {
    chips.push({
      label: `Búsqueda: “${q}”`,
      href: buildTiendaPathResetPage({ categoria, marca, q: '', minPrice, maxPrice, sort }),
    });
  }

  const clearHref =
    chips.length > 0
      ? buildTiendaPrettyPath({
          categoria: undefined,
          marca: undefined,
          q: '',
          minPrice: null,
          maxPrice: null,
          sort: null,
          page: null,
        })
      : undefined;

  const noResults = !items?.length;

  // Badge del botón móvil
  const appliedCount =
    (categoria ? 1 : 0) +
    (marca ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (q ? 1 : 0);

  const sortOptions = [
    { value: 'relevancia',  label: 'Relevancia' },
    { value: 'novedades',   label: 'Novedades' },
    { value: 'precio_asc',  label: 'Precio ↑' },
    { value: 'precio_desc', label: 'Precio ↓' },
    { value: 'rating_desc', label: 'Mejor valorados' },
  ] as const;

  return (
    <div className="max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8">
      {/* grid padre con min-w-0 para permitir encogimiento sin “trabar” */}
      <section className="grid grid-cols-12 gap-6 min-w-0">
        {/* Sidebar fijo: visible solo en lg+ */}
        <aside className="hidden lg:block lg:col-span-2 min-w-0">
          <TiendaFiltersSidebar
            facets={facets}
            state={{ categoria, marca, q, minPrice, maxPrice, sort }}
          />
        </aside>

        {/* Columna principal con min-w-0 */}
        <div className="col-span-12 lg:col-span-10 space-y-4 min-w-0">
          <header className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl font-semibold font-display">Catalogo</h1>

            {/* Botón Filtros (drawer) visible < lg */}
            <div className="ml-auto flex items-center gap-2 min-w-0">
              <FiltersDrawer badgeCount={appliedCount}>
                <div className="space-y-6">
                  {/* ORDEN dentro del drawer */}
                  <SortOptionsList
                    current={sort}
                    options={sortOptions as any}
                    hrefFor={(v) =>
                      buildTiendaPrettyPath({
                        categoria,
                        marca,
                        q,
                        minPrice,
                        maxPrice,
                        sort: v ?? null,
                        page: null,
                      })
                    }
                  />
                  {/* FILTROS */}
                  <TiendaFiltersSidebar
                    facets={facets}
                    state={{ categoria, marca, q, minPrice, maxPrice, sort }}
                  />
                </div>
              </FiltersDrawer>

              {/* SortBar visible solo en lg+ */}
              <div className="hidden lg:block min-w-0">
                <SortBar
                  current={sort}
                  options={sortOptions as any}
                  hrefFor={(v) =>
                    buildTiendaPrettyPath({
                      categoria,
                      marca,
                      q,
                      minPrice,
                      maxPrice,
                      sort: v ?? null,
                      page: null,
                    })
                  }
                />
              </div>
            </div>
          </header>

          <FilterChips items={chips} clearHref={clearHref} />

          {noResults ? (
            <EmptyState
              icon={<Search className="size-6 text-muted" />}
              title="No encontramos productos con esos filtros"
              description="Probá quitar algún filtro o ajustar el rango de precio."
              primary={clearHref ? { href: clearHref, label: 'Limpiar filtros' } : undefined}
              secondary={{ href: '/tienda', label: 'Ir a la tienda' }}
            />
          ) : (
            <>
              {/* Grilla de productos — min-w-0 para evitar “rigidez” en cambios de ancho */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 items-stretch min-w-0">
                {items.map((p: any) => <ProductCard key={p.id} p={p} />)}
              </div>

              {totalPages > 1 && (
                <nav className="flex justify-center gap-2 mt-4" aria-label="Paginación">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    const href = buildTiendaPrettyPath({
                      categoria, marca, q, minPrice, maxPrice, sort,
                      page: pageNum > 1 ? pageNum : null,
                    });
                    const active = currentPage === pageNum;
                    return (
                      <Link
                        key={i}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={`px-3 py-1 rounded-xl2 border ${
                          active
                            ? 'border-[color:var(--gold)] text-[color:var(--gold)]'
                            : 'border-default hover:bg-subtle'
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
