import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';
import { getMe, listEnrollments } from '@/lib/sdk/userApi';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { CoursesGridClient } from '@/components/courses/CoursesGridClient';

import { getCourses, getCourseFacets } from '@/lib/sdk/catalogApi';


import {
  buildCursosPrettyPath,
  buildCursosPathResetPage,
  parseCursosPretty,
  migrateCursosLegacyToPretty,
  sanitizeCursoSort,

} from '@/lib/routes';

import { CourseCard } from '@/components/courses/CourseCard';
import { CursosFiltersSidebar } from '@/components/filters/CursosFiltersSidebar';
import { FilterChips } from '@/components/filters/FilterChips';
import { SortBar } from '@/components/filters/SortBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiltersDrawer } from '@/components/filters/FiltersDrawer';
import { Pagination } from '@/components/ui/Pagination';
import { FadeIn } from '@/components/ui/Motion';

// Derivamos los tipos desde CourseCard para no desincronizarnos
type CourseMinimal = ComponentProps<typeof CourseCard>['c'];
type InscripcionMini = NonNullable<
  ComponentProps<typeof CourseCard>['inscripcion']
>;

// Lo que llega del API (extiende lo que necesita la card)
type CourseFromApi = CourseMinimal & {
  inscripcionActual?: InscripcionMini | null | boolean;
};

export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ filters?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const { filters } = await params;
  const qs = await searchParams;

  // Migrar legacy si es necesario
  const legacyRedirect = migrateCursosLegacyToPretty(filters, qs);
  if (legacyRedirect) {
    redirect(legacyRedirect);
  }

  const { nivel, tag } = parseCursosPretty(filters);
  const query = qs.q || '';

  let title = 'Cursos';
  let description = 'Descubre nuestros cursos de maquillaje y belleza.';

  if (nivel) {
    const nivelLabel = nivel === 'BASICO' ? 'Básico' : nivel === 'INTERMEDIO' ? 'Intermedio' : 'Avanzado';
    title = `Cursos ${nivelLabel}`;
    description = `Cursos de nivel ${nivelLabel.toLowerCase()} en maquillaje y belleza.`;
  }

  if (tag) {
    title = `Cursos de ${tag}`;
    description = `Cursos especializados en ${tag}.`;
  }

  if (query) {
    title = `Cursos: "${query}"`;
    description = `Resultados de búsqueda para "${query}" en cursos de maquillaje.`;
  }

  return {
    title: `${title} - Mica Pestañas Academy`,
    description,
  };
}

export default async function CursosBuscarPage({
  params,
  searchParams,
}: {
  params: Promise<{ filters?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { filters } = await params;
  const qs = await searchParams;

  // Migrar legacy si es necesario
  const legacyRedirect = migrateCursosLegacyToPretty(filters, qs);
  if (legacyRedirect) {
    redirect(legacyRedirect);
  }

  const { nivel, tag, sort, page } = parseCursosPretty(filters);
  const query = qs.q || '';
  const sortSanitized = sanitizeCursoSort(sort);

  // Fetch data
  const [coursesResp, facetsResp] = await Promise.all([
    getCourses({
      nivel,
      tag,
      q: query,
      sort: sortSanitized,
      page,
      perPage: 6,
    }),
    getCourseFacets({ nivel, tag, q: query }),
  ]);

  const courses = coursesResp.items as CourseFromApi[];
  const meta = coursesResp.meta ?? {};
  const facets = facetsResp;

  const totalPages = Math.ceil((meta.total ?? 0) / (meta.perPage ?? 1));
  const currentPage = meta.page ?? 1;

  // Estado para sidebar
  const sidebarState = {
    nivel,
    tag,
    q: query,
    sort: sortSanitized === 'relevancia' ? null : sortSanitized,
  };

  // Chips de filtros activos
  const activeFilters: Array<{ label: string; href: string }> = [];
  
  if (nivel) {
    const nivelLabel = nivel === 'BASICO' ? 'Básico' : nivel === 'INTERMEDIO' ? 'Intermedio' : 'Avanzado';
    activeFilters.push({
      label: `Nivel: ${nivelLabel}`,
      href: buildCursosPathResetPage({ nivel: undefined, tag, q: query, sort: sidebarState.sort }),
    });
  }
  
  if (tag) {
    activeFilters.push({
      label: `Tag: ${tag}`,
      href: buildCursosPathResetPage({ nivel, tag: undefined, q: query, sort: sidebarState.sort }),
    });
  }

  // Opciones de ordenamiento
  const sortOptions = [
    { value: 'relevancia', label: 'Relevancia' },
    { value: 'novedades', label: 'Más recientes' },
    { value: 'precio_asc', label: 'Precio: menor a mayor' },
    { value: 'precio_desc', label: 'Precio: mayor a menor' },
    { value: 'rating_desc', label: 'Mejor valorados' },
  ];

  const qc = new QueryClient();
  const me = await getMe({ cache: 'no-store' });
  const isLoggedIn = !!me?.id;
  if (isLoggedIn) {
    await qc.prefetchQuery({ queryKey: ['enrollments'], queryFn: () => listEnrollments({ cache: 'no-store' }) });
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)]">
      {/* Header con búsqueda */}
      <section className="border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4">
            {/* Breadcrumb */}
            <nav className="text-sm text-[var(--muted)]">
              <Link href="/" className="hover:text-[var(--fg)]">Inicio</Link>
              <span className="mx-2">›</span>
              <Link href="/cursos" className="hover:text-[var(--fg)]">Cursos</Link>
              {nivel && (
                <>
                  <span className="mx-2">›</span>
                  <Link 
                    href={buildCursosPrettyPath({ nivel, tag: undefined, q: '', sort: null, page: null })}
                    className="hover:text-[var(--fg)] underline"
                  >
                    Nivel {nivel === 'BASICO' ? 'Básico' : nivel === 'INTERMEDIO' ? 'Intermedio' : 'Avanzado'}
                  </Link>
                </>
              )}
              {tag && (
                <>
                  <span className="mx-2">›</span>
                  <span className="text-[var(--gold)]">{tag}</span>
                </>
              )}
              {query && (
                <>
                  <span className="mx-2">›</span>
                  <span>Búsqueda: &quot;{query}&quot;</span>
                </>
              )}
              {sortSanitized && sortSanitized !== 'relevancia' && (
                <>
                  <span className="mx-2">›</span>
                  <span className="text-[var(--accent)]">
                    Orden: {sortSanitized === 'novedades' ? 'Más recientes' : 
                           sortSanitized === 'precio_asc' ? 'Precio: menor a mayor' :
                           sortSanitized === 'precio_desc' ? 'Precio: mayor a menor' :
                           sortSanitized === 'rating_desc' ? 'Mejor valorados' : sortSanitized}
                  </span>
                </>
              )}
            </nav>

            {/* Título y búsqueda */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-[var(--fg)]">
                  {query ? `Resultados para "${query}"` : 'Buscar Cursos'}
                </h1>
                <p className="text-[var(--muted)] mt-1">
                  {meta.total} {meta.total === 1 ? 'curso encontrado' : 'cursos encontrados'}
                </p>
              </div>

              {/* Barra de búsqueda */}
              <div className="relative max-w-md w-full lg:w-auto">
                <form method="GET" action="/cursos">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
                    <input
                      type="search"
                      name="q"
                      defaultValue={query}
                      placeholder="Buscar cursos..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent"
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
            <CursosFiltersSidebar facets={facets} state={sidebarState} />
          </div>

          {/* Contenido principal */}
          <div className="space-y-6">
            {/* Filtros activos y ordenamiento */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* Drawer de filtros - Mobile */}
                <div className="lg:hidden">
                  <FiltersDrawer>
                    <CursosFiltersSidebar facets={facets} state={sidebarState} />
                  </FiltersDrawer>
                </div>

                {/* Chips de filtros activos */}
                {activeFilters.length > 0 && (
                  <FilterChips items={activeFilters} />
                )}
              </div>

              {/* Ordenamiento */}
              <div className="flex items-center gap-2">
                <SortBar
                  current={sortSanitized}
                  options={sortOptions}
                  hrefFor={(value: string | null) => buildCursosPathResetPage({
                  nivel,
                  tag,
                  q: query,
                  sort: value === 'relevancia' ? null : (value as string),
                })}
                />
              </div>
            </div>

            {/* Grid de cursos */}
            {courses.length > 0 ? (
              <FadeIn>
                <HydrationBoundary state={dehydrate(qc)}>
                  <CoursesGridClient courses={courses} isLoggedIn={isLoggedIn} />
                </HydrationBoundary>
              </FadeIn>
            ) : (
              <EmptyState
                title="No se encontraron cursos"
                description="Intenta ajustar los filtros o buscar con otros términos."
                primary={{
                  href: "/cursos",
                  label: "Ver todos los cursos"
                }}
              />
            )}

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  hrefFor={(page: number | null) => buildCursosPrettyPath({
                    nivel,
                    tag,
                    q: query,
                    sort: sidebarState.sort,
                    page: page === 1 ? null : page,
                  })}
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