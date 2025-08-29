import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCourseBySlug } from '@/lib/api';
import { CourseCurriculum } from '@/components/courses/CourseCurriculum';
import { Price } from '@/components/ui/Price';
import { courseJsonLd } from '@/lib/seo';
import { SafeImage } from '@/components/ui/SafeImage';
import { Card, CardBody } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { RatingStars } from '@/components/ui/RatingStars';
import { Clock, UserRound, PlayCircle, Layers, Award, Check } from 'lucide-react';
import type { Nivel } from '@/lib/routes';
import { buildCursosPrettyPath } from '@/lib/routes';
import { BuyCourseButton } from '@/components/cart/BuyCourseButton';

export const revalidate = 120;

type Params = { slug: string };

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const abs = (u?: string | null) =>
  u ? (u.startsWith('http') ? u : new URL(u, SITE).toString()) : undefined;

function looksLikeCursosFilterSlug(slug: string) {
  // evita /cursos/detalle/nivel-... o tag-... o pagina-... etc.
  return /^(nivel-|tag-|pagina-|orden-)/.test(slug);
}

function qsFromSearch(searchParams?: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === 'string' && v.length) usp.set(k, v);
    }
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

// Tipos mínimos para lectura de API (evitar any)
type LessonMini = { titulo?: string | null; duracionS?: number | null };
type ModuleMini = { titulo?: string | null; lecciones?: LessonMini[] | null };

// Tipos que exige CourseCurriculum
type CurriculumLesson = { titulo: string; duracionS?: number };
type CurriculumModule = { titulo: string; lecciones: CurriculumLesson[] };

export async function generateMetadata({
  params, searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : undefined;

  if (looksLikeCursosFilterSlug(slug)) {
    const url = `/cursos/${slug}${qsFromSearch(sp)}`;
    return {
      title: 'Cursos',
      description: 'Listado de cursos',
      alternates: { canonical: url },
      robots: { index: false, follow: true },
    };
  }

  const c = await getCourseBySlug(slug);
  const desc = (c.resumen || c.descripcionMD || '').toString().slice(0, 160);
  const url = `/cursos/detalle/${c.slug}`;
  return {
    title: `${c.titulo} — Curso online`,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: c.titulo,
      description: desc,
      url: abs(url),
      images: c.portadaUrl ? [{ url: abs(c.portadaUrl)! }] : [],
    },
  };
}

export default async function CursoPage({
  params, searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  if (looksLikeCursosFilterSlug(slug)) {
    const qs = qsFromSearch(sp);
    redirect(`/cursos/${slug}${qs}`);
  }

  const c = await getCourseBySlug(slug);

  // ✅ Normalizamos para que sea Nivel o undefined
  const nivel: Nivel | undefined =
    (['BASICO', 'INTERMEDIO', 'AVANZADO'] as const).includes(c.nivel as Nivel)
      ? (c.nivel as Nivel)
      : undefined;

  const durMin = Math.max(0, Math.floor((c.duracionTotalS || 0) / 60));

  const modules: ModuleMini[] = Array.isArray(c.modulos) ? (c.modulos as ModuleMini[]) : [];
  const modCount =
    typeof c._count?.modulos === 'number'
      ? c._count.modulos
      : modules.length;

  const lessonCount = modules.reduce<number>((acc, m) => {
    const ls = Array.isArray(m.lecciones) ? m.lecciones : [];
    return acc + ls.length;
  }, 0);

  const learningPoints: string[] = (() => {
    const fromLessons = modules
      .flatMap((m) => (Array.isArray(m.lecciones) ? m.lecciones : []))
      .map((l) => l.titulo ?? '')
      .filter((t): t is string => Boolean(t));
    if (fromLessons.length) return fromLessons.slice(0, 8);

    const fromModules = modules
      .map((m) => m.titulo ?? '')
      .filter((t): t is string => Boolean(t));
    return fromModules.slice(0, 8);
  })();

  // ✅ Normalizamos estructura para CourseCurriculum (titulo siempre string y lecciones siempre [])
  const curriculumModules: CurriculumModule[] = modules.map((m, idx) => {
    const leccionesSrc = Array.isArray(m.lecciones) ? m.lecciones : [];
    const lecciones: CurriculumLesson[] = leccionesSrc.map((l, j) => {
      const titulo = (l?.titulo ?? `Lección ${j + 1}`).toString();
      const dur = l?.duracionS;
      return typeof dur === 'number' ? { titulo, duracionS: dur } : { titulo };
    });

    return {
      titulo: (m.titulo ?? `Módulo ${idx + 1}`).toString(),
      lecciones,
    };
  });

  const nivelLabel = nivel
    ? nivel === 'BASICO' ? 'Básico' : nivel === 'INTERMEDIO' ? 'Intermedio' : 'Avanzado'
    : null;

  const jsonLd = courseJsonLd({
    title: c.titulo,
    slug: c.slug,
    provider: 'Micaela Pestañas',
    image: c.portadaUrl ? abs(c.portadaUrl) : undefined,
  });

  return (
    <article className="space-y-10">
      {/* HERO */}
      <section className="relative rounded-xl2 border border-default overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              'radial-gradient(600px 180px at 0% 0%, var(--pink), transparent), radial-gradient(600px 180px at 100% 0%, var(--gold), transparent)',
          }}
        />
        <div className="relative p-6 lg:p-8 grid gap-8 lg:grid-cols-[1fr_380px] items-start">
          <div className="space-y-4">
            <nav aria-label="Breadcrumb" className="text-xs text-muted">
              <ol className="flex items-center gap-1">
                <li><Link href="/cursos" className="hover:text-[var(--pink)]">Cursos</Link></li>
                {nivel && (
                  <>
                    <li>›</li>
                    <li>
                      <Link
                        href={buildCursosPrettyPath({ nivel, page: null })}
                        className="hover:text-[var(--pink)]"
                      >
                        Nivel {nivelLabel}
                      </Link>
                    </li>
                  </>
                )}
              </ol>
            </nav>

            <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">{c.titulo}</h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              {typeof c.ratingProm === 'number' && (
                <span className="inline-flex items-center gap-2">
                  <RatingStars value={Number(c.ratingProm)} count={c.ratingConteo || 0} size="sm" />
                </span>
              )}
              {c.instructor?.nombre && (
                <span className="inline-flex items-center gap-1">
                  · <UserRound className="size-4" /> <b className="text-[var(--fg)]">{c.instructor.nombre}</b>
                </span>
              )}
              {durMin > 0 && (
                <span className="inline-flex items-center gap-1">
                  · <Clock className="size-4" /> {durMin} min
                </span>
              )}
              {nivel && <Pill size="sm">Nivel: {nivelLabel}</Pill>}
              {modCount > 0 && <Pill size="sm"><Layers className="size-3" /> {modCount} módulos</Pill>}
            </div>

            {c.resumen && <p className="text-sm text-muted max-w-2xl">{c.resumen}</p>}

            {/* CTA móvil */}
            <div className="lg:hidden">
              <Card>
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Price value={c.precio/100} />
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Award className="size-4" /> Acceso de por vida
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <BuyCourseButton c={c} />
                    <Link href="/cursos" className="rounded-xl2 border border-default px-3 py-2 hover:bg-subtle">Explorar</Link>
                  </div>
                  <ul className="text-xs text-muted space-y-1">
                    <li>• {lessonCount} lecciones</li>
                    <li>• {durMin} min</li>
                    <li>• {modCount} módulos</li>
                  </ul>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Columna de compra */}
          <aside className="hidden lg:block lg:sticky lg:top-24 h-max">
            <Card>
              <CardBody className="space-y-4">
                <SafeImage
                  src={c.portadaUrl ? abs(c.portadaUrl)! : undefined}
                  alt={c.titulo}
                  className="w-full aspect-video object-cover rounded-xl2"
                />
                <div className="flex items-center justify-between">
                  <Price value={c.precio/100} />
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Award className="size-4" /> Acceso de por vida
                  </span>
                </div>
                <BuyCourseButton c={c} />
                <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                  <div className="rounded-xl2 border border-default p-2 flex items-center gap-2">
                    <PlayCircle className="size-4" /> {lessonCount} lecciones
                  </div>
                  <div className="rounded-xl2 border border-default p-2 flex items-center gap-2">
                    <Clock className="size-4" /> {durMin} min
                  </div>
                  <div className="rounded-xl2 border border-default p-2 col-span-2 flex items-center gap-2">
                    <Layers className="size-4" /> {modCount} módulos
                  </div>
                </div>
              </CardBody>
            </Card>
          </aside>
        </div>
      </section>

      {/* Contenido */}
      <section className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {learningPoints.length > 0 && (
            <Card>
              <CardBody className="space-y-3">
                <h2 className="text-lg font-medium">Lo que aprenderás</h2>
                <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {learningPoints.map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="size-4 mt-0.5 text-[var(--gold)]" />
                      <span className="text-muted">{t}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody className="space-y-3">
              <h2 className="text-lg font-medium">Contenido del curso</h2>
              <CourseCurriculum modules={curriculumModules} />
            </CardBody>
          </Card>

          {c.descripcionMD && (
            <Card>
              <CardBody className="space-y-3">
                <h2 className="text-lg font-medium">Descripción</h2>
                <div className="prose prose-sm max-w-none text-muted">
                  <p className="whitespace-pre-line">{c.descripcionMD}</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardBody className="space-y-3">
              <h3 className="text-sm font-medium">Este curso incluye</h3>
              <ul className="text-sm text-muted space-y-2">
                <li className="flex items-center gap-2"><PlayCircle className="size-4" /> {lessonCount} lecciones on-demand</li>
                <li className="flex items-center gap-2"><Layers className="size-4" /> {modCount} módulos estructurados</li>
                <li className="flex items-center gap-2"><Clock className="size-4" /> {durMin} min de contenido</li>
                <li className="flex items-center gap-2"><Award className="size-4" /> Certificado de finalización</li>
              </ul>
            </CardBody>
          </Card>

          {c.instructor?.nombre && (
            <Card>
              <CardBody className="space-y-2">
                <h3 className="text-sm font-medium">Instructor</h3>
                <div className="text-sm">
                  <p className="font-medium">{c.instructor.nombre}</p>
                </div>
              </CardBody>
            </Card>
          )}
        </aside>
      </section>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}
