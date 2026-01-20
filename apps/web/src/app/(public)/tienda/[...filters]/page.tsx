import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';

import { safeGetProductsSmart, safeGetProductFacets, type ProductFacets } from '@/lib/sdk/catalogApi';
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
import { Pagination } from '@/components/ui/Pagination';

export const revalidate = 60;

/* ================= Tipos auxiliares ================= */
type ProductoSort = 'relevancia' | 'novedades' | 'precio_asc' | 'precio_desc' | 'rating_desc';

/** Debe coincidir estructuralmente con lo que espera TiendaFiltersSidebar */
// Usamos ProductFacets de catalogApi

type ProductCardProps = ComponentProps<typeof ProductCard>;
type Product = ProductCardProps extends { p: infer T } ? T & { id?: string | number } : never;

function findLabel<T extends { id: string; slug?: string; nombre: string }>(
  list: T[] | undefined,
  key: string
) {
  const item = list?.find((it) => (it.slug ?? it.id) === key);
  return item?.nombre ?? key;
}

/* ================= Metadata ================= */
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

/* ================= Page ================= */
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
  const sort = (sortSeg ?? 'relevancia') as ProductoSort;
  const page = Number(sp.page || prettyPage || 1);
  const minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;

  const facets = (await safeGetProductFacets({ q, categoria, marca, minPrice, maxPrice })) as ProductFacets;

  const appliedCategoria = Array.isArray(facets?.categorias) && facets.categorias.length > 0
    ? (categoria && facets.categorias.some((c) => (c.slug ?? c.id) === categoria) ? categoria : undefined)
    : undefined;
  const appliedMarca = Array.isArray(facets?.marcas) && facets.marcas.length > 0
    ? (marca && facets.marcas.some((m) => (m.slug ?? m.id) === marca) ? marca : undefined)
    : undefined;

  const productsRes = (await safeGetProductsSmart({
    q,
    categoria: appliedCategoria,
    marca: appliedMarca,
    minPrice,
    maxPrice,
    sort,
    page,
    perPage: PAGE_SIZE,
  })) as unknown as { items: Product[]; meta?: { page?: number; pages?: number } };

  const { items, meta } = productsRes;

  const currentPage = meta?.page ?? page;
  const totalPages = meta?.pages ?? 1;

  // debug logs removed for clean console

  // Chips (usar labels si existen)
  const useFacets: ProductFacets = (() => {
    const hasServer = (Array.isArray(facets?.marcas) && facets.marcas.length > 0) || (Array.isArray(facets?.categorias) && facets.categorias.length > 0);
    if (hasServer) return facets;
    const marcasMap = new Map<string, { id: string; slug?: string; nombre: string; count: number }>();
    const categoriasMap = new Map<string, { id: string; slug?: string; nombre: string; count: number }>();
    items.forEach((p: Product) => {
      const m = p.marca?.nombre?.trim();
      if (m) {
        const prev = marcasMap.get(m) ?? { id: m, nombre: m, count: 0 };
        prev.count += 1;
        marcasMap.set(m, prev);
      }
      const c = p.categoria?.nombre?.trim();
      if (c) {
        const prev = categoriasMap.get(c) ?? { id: c, nombre: c, count: 0 };
        prev.count += 1;
        categoriasMap.set(c, prev);
      }
    });
    return { marcas: Array.from(marcasMap.values()), categorias: Array.from(categoriasMap.values()) } as ProductFacets;
  })();

  const marcaLabel = appliedMarca ? findLabel(useFacets?.marcas, appliedMarca) : null;
  const categoriaLabel = appliedCategoria ? findLabel(useFacets?.categorias, appliedCategoria) : null;

  const chips: Array<{ label: string; href: string }> = [];
  if (appliedMarca) {
    chips.push({
      label: `Marca: ${marcaLabel}`,
      href: buildTiendaPathResetPage({ categoria: appliedCategoria, marca: undefined, q, minPrice, maxPrice, sort }),
    });
  }
  if (appliedCategoria) {
    chips.push({
      label: `Categoría: ${categoriaLabel}`,
      href: buildTiendaPathResetPage({ categoria: undefined, marca: appliedMarca, q, minPrice, maxPrice, sort }),
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
      href: buildTiendaPathResetPage({
        categoria,
        marca,
        q,
        minPrice: undefined,
        maxPrice: undefined,
        sort,
      }),
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
    (appliedCategoria ? 1 : 0) + (appliedMarca ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (q ? 1 : 0);

  const sortOptions: { value: ProductoSort; label: string }[] = [
    { value: 'relevancia', label: 'Relevancia' },
    { value: 'novedades', label: 'Novedades' },
    { value: 'precio_asc', label: 'Precio ↑' },
    { value: 'precio_desc', label: 'Precio ↓' },
    { value: 'rating_desc', label: 'Mejor valorados' },
  ];

  return (
    <div className="min-h-screen w-full bg-[var(--bg)]">
      {/* Header con búsqueda */}
      <section className="border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4">
            {/* Breadcrumb */}
            <nav className="text-sm text-[var(--muted)]">
              <Link href="/" className="hover:text-[var(--pink)]">
                Inicio
              </Link>
              <span className="mx-2">›</span>
              <Link href="/tienda" className="hover:text-[var(--pink)]">
                Tienda
              </Link>
              {appliedCategoria && (
                <>
                  <span className="mx-2">›</span>
                  <Link
                    href={buildTiendaPrettyPath({
                      categoria: appliedCategoria,
                      marca: undefined,
                      q: '',
                      minPrice: null,
                      maxPrice: null,
                      sort: null,
                      page: null,
                    })}
                    className="hover:text-[var(--pink)] underline"
                  >
                    {findLabel(facets?.categorias, appliedCategoria) || 'Categoría'}
                  </Link>
                </>
              )}
              {appliedMarca && (
                <>
                  <span className="mx-2">›</span>
                  <Link
                    href={buildTiendaPrettyPath({
                      categoria: undefined,
                      marca: appliedMarca,
                      q: '',
                      minPrice: null,
                      maxPrice: null,
                      sort: null,
                      page: null,
                    })}
                    className="hover:text-[var(--pink)] underline"
                  >
                    {findLabel(facets?.marcas, appliedMarca) || 'Marca'}
                  </Link>
                </>
              )}
              {q && (
                <>
                  <span className="mx-2">›</span>
                  <span>
                    Búsqueda: &quot;{q}&quot;
                  </span>
                </>
              )}
              {(minPrice || maxPrice) && (
                <>
                  <span className="mx-2">›</span>
                  <span>
                    {minPrice && maxPrice
                      ? `$${minPrice} - $${maxPrice}`
                      : minPrice
                      ? `Desde $${minPrice}`
                      : `Hasta $${maxPrice}`}
                  </span>
                </>
              )}
              {sort && sort !== 'relevancia' && (
                <>
                  <span className="mx-2">›</span>
                  <span className="text-[var(--accent)]">
                    Orden:{' '}
                    {sort === 'novedades'
                      ? 'Más recientes'
                      : sort === 'precio_asc'
                      ? 'Precio: menor a mayor'
                      : sort === 'precio_desc'
                      ? 'Precio: mayor a menor'
                      : sort === 'rating_desc'
                      ? 'Mejor valorados'
                      : sort}
                  </span>
                </>
              )}
            </nav>

            {/* Título y búsqueda */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-[var(--fg)]">
                  {q ? `Resultados para "${q}"` : 'Catálogo de Productos'}
                </h1>
                <p className="text-[var(--muted)] mt-1">
                  {items.length} {items.length === 1 ? 'producto encontrado' : 'productos encontrados'}
                </p>
              </div>

              {/* Barra de búsqueda */}
              <div className="relative max-w-md w-full lg:w-auto">
                <form method="GET" action="/tienda">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
                    <input
                      type="search"
                      name="q"
                      defaultValue={q}
                      placeholder="Buscar productos..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pink)] focus:border-transparent"
                    />
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido principal */}
      <section className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Sidebar de filtros - Desktop */}
            <div className="hidden lg:block">
              <TiendaFiltersSidebar
                facets={useFacets}
                state={{ categoria: appliedCategoria, marca: appliedMarca, q, minPrice, maxPrice, sort }}
              />
            </div>

            {/* Contenido principal */}
            <div className="space-y-6">
              {/* Filtros activos y ordenamiento */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Drawer de filtros - Mobile */}
                  <div className="lg:hidden">
                    <FiltersDrawer badgeCount={appliedCount}>
                      <div className="space-y-6">
                        {/* ORDEN dentro del drawer */}
                        <SortOptionsList
                          current={sort}
                          options={sortOptions}
                          hrefFor={(v) =>
                            buildTiendaPrettyPath({
                              categoria: appliedCategoria,
                              marca: appliedMarca,
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
                          facets={useFacets}
                          state={{ categoria: appliedCategoria, marca: appliedMarca, q, minPrice, maxPrice, sort }}
                        />
                      </div>
                    </FiltersDrawer>
                  </div>

                  {/* Chips de filtros activos */}
                  {chips.length > 0 && <FilterChips items={chips} clearHref={clearHref} />}
                </div>

                {/* Ordenamiento */}
                <div className="flex items-center gap-2">
                  <div className="hidden lg:block">
                    <SortBar
                      current={sort}
                      options={sortOptions}
                      hrefFor={(v) =>
                        buildTiendaPrettyPath({
                          categoria: appliedCategoria,
                          marca: appliedMarca,
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
              </div>

              {/* Grid de productos */}
              {noResults ? (
                <EmptyState
                  icon={<Search className="size-6 text-muted" />}
                  title="No encontramos productos con esos filtros"
                  description="Probá quitar algún filtro o ajustar el rango de precio."
                  primary={clearHref ? { href: clearHref, label: 'Limpiar filtros' } : undefined}
                  secondary={{ href: '/tienda', label: 'Ir a la tienda' }}
                />
              ) : (
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {items.map((p: Product, i) => (
                    <ProductCard key={String(p.id ?? i)} p={p} />
                  ))}
                </div>
              )}

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    hrefFor={(page) =>
                      buildTiendaPrettyPath({
                        categoria: appliedCategoria,
                        marca: appliedMarca,
                        q,
                        minPrice,
                        maxPrice,
                        sort,
                        page,
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
