import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCourses, getCourseFacets } from '@/lib/api';
import {
  buildCursosPrettyPath,
  buildCursosPathResetPage,
  parseCursosPretty,
  migrateCursosLegacyToPretty,
  sanitizeCursoSort,
  type Nivel,
} from '@/lib/routes';
import { CourseCard } from '@/components/courses/CourseCard';
import { CursosFiltersSidebar } from '@/components/filters/CursosFiltersSidebar';
import { FilterChips } from '@/components/filters/FilterChips';
import { SortBar } from '@/components/filters/SortBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search } from 'lucide-react';

export const revalidate = 60;

export async function generateMetadata({
  params, searchParams,
}:{ params: Promise<{ filters?: string[] }>, searchParams: Promise<Record<string,string|undefined>> }): Promise<Metadata> {
  const { filters } = await params;
  const sp = await searchParams;

  const { nivel, tag, sort: sortSeg, page } = parseCursosPretty(filters);
  const sort = sortSeg ?? sanitizeCursoSort(sp.sort);

  const nivelLabel = nivel === 'BASICO' ? 'Básico' : nivel === 'INTERMEDIO' ? 'Intermedio' : nivel === 'AVANZADO' ? 'Avanzado' : null;
  const title = ['Cursos', nivelLabel && `· ${nivelLabel}`, tag && `· #${tag}`, sort && sort !== 'relevancia' && `· Orden ${sort}`, page>1 && `· Página ${page}`].filter(Boolean).join(' ');
  const canonical = buildCursosPrettyPath({
    nivel, tag,
    q: sp.q,
    sort,
    page: page > 1 ? page : null,
  });
  const robots = page > 1 ? { index: false, follow: true } : undefined;
  return { title, description: 'Cursos de pestañas al estilo Udemy.', alternates: { canonical }, robots };
}

export default async function CursosPage({
  params, searchParams
}:{ params: Promise<{ filters?: string[] }>, searchParams: Promise<Record<string,string|undefined>> }) {

  const { filters } = await params;
  const sp = await searchParams;

  // 1) Legacy → pretty  +  ?sort= → segmento
  const toPretty = migrateCursosLegacyToPretty(filters, sp);
  if (toPretty) redirect(toPretty);

  const parsed = parseCursosPretty(filters);

  if (typeof sp.sort !== 'undefined') {
    const clean = buildCursosPrettyPath({
      nivel: parsed.nivel,
      tag: parsed.tag,
      q: (sp.q || '').toString(),
      sort: sanitizeCursoSort(sp.sort),
      page: parsed.page > 1 ? parsed.page : null,
    });
    redirect(clean);
  }

  const { nivel, tag, sort: sortSeg, page } = parsed;
  const q = sp.q || '';
  const sort = sortSeg ?? 'relevancia';

  const [{ items, meta }, facets] = await Promise.all([
    getCourses({ q, nivel, tag, sort, page }),
    getCourseFacets({ q, nivel, tag }),
  ]);

  const currentPage = meta?.page ?? page;
  const totalPages  = meta?.pages ?? 1;

  const toNivelLabel = (n: Nivel) =>
    n === 'BASICO' ? 'Básico' : n === 'INTERMEDIO' ? 'Intermedio' : 'Avanzado';
  const nivelLabel = nivel ? toNivelLabel(nivel) : null;

  // Chips
  const chips: Array<{ label: string; href: string }> = [];
  if (nivel) chips.push({
    label: `Nivel: ${nivelLabel}`,
    href: buildCursosPathResetPage({ nivel: undefined, tag, q, sort }),
  });
  if (tag) chips.push({
    label: `#${tag}`,
    href: buildCursosPathResetPage({ nivel, tag: undefined, q, sort }),
  });
  if (q) chips.push({
    label: `Búsqueda: “${q}”`,
    href: buildCursosPathResetPage({ nivel, tag, q: '', sort }),
  });
  const clearHref = chips.length
    ? buildCursosPrettyPath({ nivel: undefined, tag: undefined, q: '', sort: null, page: null })
    : undefined;

  const noResults = !items?.length;
  const topNiveles = Array.isArray(facets?.niveles)
    ? [...facets.niveles].sort((a:any,b:any)=>b.count-a.count).slice(0,3)
    : [];
  const topTags = Array.isArray(facets?.tags)
    ? [...facets.tags].sort((a:any,b:any)=>b.count-a.count).slice(0,8)
    : [];

  return (
    <section className="grid gap-6 md:grid-cols-[200px_1fr]">
      <CursosFiltersSidebar
        facets={facets}
        state={{ nivel, tag, q, sort }}
      />

      <div className="space-y-4">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold font-display">Cursos</h1>
          <SortBar
            current={sort}
            options={[
              { value: 'relevancia', label: 'Relevancia' },
              { value: 'novedades',  label: 'Novedades' },
              { value: 'precio_asc', label: 'Precio ↑' },
              { value: 'precio_desc',label: 'Precio ↓' },
              { value: 'rating_desc',label: 'Mejor valorados' },
            ]}
            hrefFor={(v) => buildCursosPrettyPath({
              nivel, tag, q,
              sort: v ?? null,
              page: null,
            })}
          />
        </header>

        <FilterChips items={chips} clearHref={clearHref} />

        {noResults ? (
          <EmptyState
            icon={<Search className="size-6 text-muted" />}
            title="No encontramos cursos con esos filtros"
            description="Probá cambiar el nivel, quitar el tag o ajustar tu búsqueda."
            primary={clearHref ? { href: clearHref, label: 'Limpiar filtros' } : undefined}
            secondary={{ href: '/cursos', label: 'Ver todos los cursos' }}
          >
            <div className="grid gap-4 sm:grid-cols-2 text-left">
              <div className="rounded-xl2 border border-default p-4">
                <h3 className="text-sm font-medium mb-2">Sugerencias rápidas</h3>
                <ul className="text-sm space-y-1">
                  {nivel && (
                    <li><a className="hover:text-[var(--pink)]" href={buildCursosPathResetPage({ nivel: undefined, tag, q, sort })}>Quitar filtro de nivel</a></li>
                  )}
                  {tag && (
                    <li><a className="hover:text-[var(--pink)]" href={buildCursosPathResetPage({ nivel, tag: undefined, q, sort })}>Quitar tag</a></li>
                  )}
                  {q && (
                    <li><a className="hover:text-[var(--pink)]" href={buildCursosPathResetPage({ nivel, tag, q: '', sort })}>Quitar búsqueda</a></li>
                  )}
                </ul>
              </div>
              <div className="rounded-xl2 border border-default p-4">
                <h3 className="text-sm font-medium mb-2">Explorar populares</h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  {topNiveles.map((n:any) => (
                    <a key={`n-${n.nivel}`} href={buildCursosPathResetPage({ nivel: n.nivel, tag, q, sort })} className="rounded-full border border-default px-3 py-1 hover:border-[var(--pink)] hover:text-[var(--pink)]">
                      {n.nivel === 'BASICO' ? '#básico' : n.nivel === 'INTERMEDIO' ? '#intermedio' : '#avanzado'}
                    </a>
                  ))}
                  {topTags.map((t:any) => (
                    <a key={`t-${t.tag}`} href={buildCursosPathResetPage({ nivel, tag: t.tag, q, sort })} className="rounded-full border border-default px-3 py-1 hover:border-[var(--pink)] hover:text-[var(--pink)]">
                      #{t.tag}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </EmptyState>
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
              {items.map((c: any) => (
                <CourseCard key={c.id} c={c} inscripcion={c.inscripcionActual ?? null} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="flex justify-center gap-2 mt-4" aria-label="Paginación">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  const href = buildCursosPrettyPath({
                    nivel, tag, q, sort,
                    page: pageNum > 1 ? pageNum : null,
                  });
                  const active = currentPage === pageNum;
                  return (
                    <Link key={i} href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`px-3 py-1 rounded-xl2 border ${active ? 'border-[var(--pink)] text-[var(--pink)]' : 'border-default hover:bg-subtle'}`}>
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
  );
}
