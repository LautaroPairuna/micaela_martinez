import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCourseBySlug, getCourseContentBySlug } from '@/lib/sdk/catalogApi';
import { auth } from '@/lib/server-auth';

import { Price } from '@/components/ui/Price';
import { courseJsonLd } from '@/lib/seo';
import { SafeImage } from '@/components/ui/SafeImage';
import { RatingStars } from '@/components/ui/RatingStars';
import {
  Clock,
  UserRound,
  PlayCircle,
  Award,
  Check,
  ChevronRight,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import type { Nivel } from '@/lib/routes';
import { BuyCourseButton } from '@/components/cart/BuyCourseButton';
import { CourseDetailClient } from '@/components/courses/CourseDetailClient';

// ✅ Wrapper client que limita el sticky hasta el final de la sección
import { CourseDetailStickyShell } from '@/components/courses/CourseDetailStickyShell';

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
type LessonMini = { titulo?: string | null; duracion?: number | null };
type ModuleMini = { titulo?: string | null; lecciones?: LessonMini[] | null };

// Tipos que exige CourseCurriculum
type CurriculumLesson = { titulo: string; duracion?: number };
type CurriculumModule = { titulo: string; lecciones: CurriculumLesson[] };

export async function generateMetadata({
  params,
  searchParams,
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
  params,
  searchParams,
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

  const session = await auth();
  let hasAccess = false;
  if (session?.user?.id) {
    try {
      await getCourseContentBySlug(slug);
      hasAccess = true;
    } catch {
      hasAccess = false;
    }
  }

  // ✅ Normalizamos para que sea Nivel o undefined
  const nivel: Nivel | undefined =
    (['BASICO', 'INTERMEDIO', 'AVANZADO'] as const).includes(c.nivel as Nivel)
      ? (c.nivel as Nivel)
      : undefined;

  const durMin = Math.max(0, Math.floor((c.duracionTotalS || 0) / 60));

  const modules: ModuleMini[] = Array.isArray(c.modulos) ? (c.modulos as ModuleMini[]) : [];
  const modCount =
    typeof c._count?.modulos === 'number' ? c._count.modulos : modules.length;

  const lessonCount = modules.reduce<number>((acc, m) => {
    const ls = Array.isArray(m.lecciones) ? m.lecciones : [];
    return acc + ls.length;
  }, 0);

  // 1. Prioridad: 'queAprenderas' desde DB
  // 2. Fallback: Calculado desde lecciones
  const learningPoints: string[] = [];
  const learningHtml: string | null = typeof c.queAprenderas === 'string' && c.queAprenderas.trim().length > 0 
    ? c.queAprenderas 
    : null;

  if (!learningHtml) {
    if (Array.isArray(c.queAprenderas) && c.queAprenderas.length > 0) {
      learningPoints.push(...(c.queAprenderas as string[]));
    } else {
      const fromLessons = modules
        .flatMap((m) => (Array.isArray(m.lecciones) ? m.lecciones : []))
        .map((l) => l.titulo ?? '')
        .filter((t): t is string => Boolean(t));
      if (fromLessons.length) learningPoints.push(...fromLessons.slice(0, 8));
      else {
        const fromModules = modules
          .map((m) => m.titulo ?? '')
          .filter((t): t is string => Boolean(t));
        learningPoints.push(...fromModules.slice(0, 8));
      }
    }
  }

  // ✅ Normalizamos requisitos para que sea siempre array string[]
  const requisitosList: string[] = [];
  if (typeof c.requisitos === 'string') {
    // Intenta parsear si viene como JSON stringificado o usa saltos de línea
    try {
        const parsed = JSON.parse(c.requisitos);
        if(Array.isArray(parsed)) requisitosList.push(...parsed);
        else requisitosList.push(c.requisitos);
    } catch {
        requisitosList.push(...c.requisitos.split('\n').filter(Boolean));
    }
  } else if (Array.isArray(c.requisitos)) {
     requisitosList.push(...(c.requisitos as string[]));
  }

  // ✅ Normalizamos estructura para CourseCurriculum (titulo siempre string y lecciones siempre [])
  const curriculumModules: CurriculumModule[] = modules.map((m, idx) => {
    const leccionesSrc = Array.isArray(m.lecciones) ? m.lecciones : [];
    const lecciones: CurriculumLesson[] = leccionesSrc.map((l, j) => {
      const titulo = (l?.titulo ?? `Lección ${j + 1}`).toString();
      const dur = l?.duracion;
      return typeof dur === 'number' ? { titulo, duracion: dur } : { titulo };
    });

    return {
      titulo: (m.titulo ?? `Módulo ${idx + 1}`).toString(),
      lecciones,
    };
  });

  const nivelLabel = nivel
    ? nivel === 'BASICO'
      ? 'Básico'
      : nivel === 'INTERMEDIO'
        ? 'Intermedio'
        : 'Avanzado'
    : null;

  const jsonLd = courseJsonLd({
    title: c.titulo,
    slug: c.slug,
    provider: 'Micaela Pestañas',
    image: c.portadaUrl ? abs(c.portadaUrl) : undefined,
  });

  const ratingValue = Number(c.ratingProm) || 0;
  const ratingCount = c.ratingConteo || 0;

  return (
    <article className="min-h-screen bg-[var(--bg)]">
      {/* Hero Section - Estilo Udemy Mejorado */}
      <section className="bg-[var(--bg)] text-[var(--fg)] pt-8 pb-12 border-b border-default relative overflow-hidden">
        {/* Fondo decorativo sutil */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--pink)]/10 to-transparent pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[var(--pink)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm">
            <ol className="flex items-center space-x-2 flex-wrap">
              <li>
                <Link href="/" className="text-[var(--gold)] hover:underline font-medium">
                  Inicio
                </Link>
              </li>
              <li className="text-muted">›</li>
              <li>
                <Link href="/cursos" className="text-[var(--gold)] hover:underline font-medium">
                  Cursos
                </Link>
              </li>
              {nivel && (
                <>
                  <li className="text-muted">›</li>
                  <li>
                    <Link
                      href={`/cursos?nivel=${c.nivel}`}
                      className="text-[var(--gold)] hover:underline font-medium"
                    >
                      {nivelLabel}
                    </Link>
                  </li>
                </>
              )}
              <li className="text-muted">›</li>
              <li className="text-muted truncate max-w-[200px]">{c.titulo}</li>
            </ol>
          </nav>

          <div className="grid lg:grid-cols-[2fr_1fr] gap-12 items-start">
            {/* Contenido principal Hero */}
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight font-display text-[var(--fg)] drop-shadow-[0_2px_4px_rgba(255,192,203,0.1)]">
                {c.titulo}
              </h1>

              {/* Badges en una sola fila */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {/* Rating */}
                {ratingCount > 0 ? (
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[var(--pink)]">{ratingValue.toFixed(1)}</span>
                    <RatingStars value={ratingValue} count={ratingCount} size="sm" />
                    <span className="text-[var(--pink)] underline cursor-pointer hover:text-[var(--pink-light)]">
                      ({ratingCount} valoraciones)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-muted">
                    <RatingStars value={0} count={0} size="sm" />
                    <span>(Sin valoraciones)</span>
                  </div>
                )}

                <span className="text-muted">•</span>

                {/* Estudiantes */}
                <div className="flex items-center gap-1 text-[var(--fg)]">
                  <UserRound className="size-4" />
                  <span>{c.estudiantesCount || 0} estudiantes</span>
                </div>

                <span className="text-muted">•</span>

                {/* Duración */}
                <div className="flex items-center gap-1 text-[var(--fg)]">
                  <Clock className="size-4" />
                  <span>
                    {Math.floor(durMin / 60)}h {durMin % 60}m total
                  </span>
                </div>

                <span className="text-muted">•</span>

                {/* Última actualización */}
                <div className="flex items-center gap-1 text-[var(--fg)]">
                  <AlertCircle className="size-4" />
                  <span>
                    Act.{' '}
                    {c.creadoEn
                      ? new Date(c.creadoEn).toLocaleDateString('es-ES', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Reciente'}
                  </span>
                </div>

                <span className="text-muted">•</span>

                {/* Idioma */}
                <div className="flex items-center gap-1 text-[var(--fg)]">
                  <Globe className="size-4" />
                  <span>Español</span>
                </div>
              </div>

              {/* Resumen / Descripción corta */}
              {c.resumen && (
                <p className="text-lg text-[var(--fg-muted)] leading-relaxed max-w-3xl">
                  {c.resumen}
                </p>
              )}
            </div>

            {/* Espacio reservado para el sidebar en desktop */}
            <div className="hidden lg:block" />
          </div>
        </div>
      </section>

      {/* ✅ Sección principal con sticky limitado */}
      <CourseDetailStickyShell
        childrenLeft={
          <>
            {/* Lo que aprenderás */}
            <div className="border border-[var(--pink)]/20 p-6 rounded-xl bg-[var(--pink)]/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--pink)]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <h2 className="text-2xl font-bold text-[var(--fg)] mb-6 font-display flex items-center gap-2">
                <span className="text-[var(--pink)]">✦</span> Lo que aprenderás
              </h2>
              {learningHtml ? (
                <div 
                  className="prose prose-invert max-w-none text-[var(--fg-muted)] [&_ul]:list-disc [&_ul]:pl-5 [&_li]:marker:text-[var(--pink)]"
                  dangerouslySetInnerHTML={{ __html: learningHtml }}
                />
              ) : (
                <div className="grid md:grid-cols-2 gap-y-3 gap-x-6 relative z-10">
                  {learningPoints.map((point, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="size-5 text-[var(--pink)] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-[var(--fg-muted)]">{point}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contenido del curso */}
            <div>
              <h2 className="text-2xl font-bold text-[var(--fg)] mb-4 font-display">
                Contenido del curso
              </h2>
              <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)] mb-4">
                <span>{modCount} secciones</span> • <span>{lessonCount} clases</span> •{' '}
                <span>{formatDuration(c.duracionTotalS || 0)} de duración total</span>
              </div>

              <div className="border border-default rounded-lg overflow-hidden bg-[var(--bg)]">
                {curriculumModules.map((mod, modIndex) => (
                  <details key={modIndex} className="group border-b border-default last:border-b-0">
                    <summary className="p-4 cursor-pointer hover:bg-white/5 flex items-center justify-between bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <ChevronRight className="size-4 text-[var(--fg-muted)] group-open:rotate-90 transition-transform" />
                        <h3 className="font-bold text-[var(--fg)]">{mod.titulo}</h3>
                      </div>
                      <span className="text-xs text-[var(--fg-muted)]">
                        {mod.lecciones?.length || 0} clases
                      </span>
                    </summary>
                    <div className="px-4 pb-4 pt-2 space-y-2">
                      {mod.lecciones?.map((leccion, lecIndex) => (
                        <div key={lecIndex} className="flex items-center justify-between text-sm pl-7">
                          <div className="flex items-center gap-2 text-[var(--fg-muted)]">
                            <PlayCircle className="size-3.5" />
                            <span className="hover:underline cursor-pointer">{leccion.titulo}</span>
                          </div>
                          <span className="text-xs text-[var(--fg-muted)] opacity-70">
                            {formatDuration((leccion.duracion || 0) * 60)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {/* Requisitos */}
            {requisitosList.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-[var(--fg)] mb-4 font-display">Requisitos</h2>
                <div className="prose prose-invert max-w-none text-[var(--fg-muted)]">
                  <ul className="space-y-2">
                    {requisitosList.map((req, i) => {
                       const text = req.trim().replace(/^[-•*]\s*/, '');
                       return text ? (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-1.5 size-1.5 rounded-full bg-[var(--pink)] flex-shrink-0 shadow-[0_0_8px_var(--pink)]" />
                          <span>{text}</span>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              </div>
            )}

            {/* Descripción */}
            <div>
              <h2 className="text-2xl font-bold text-[var(--fg)] mb-4 font-display">Descripción</h2>
              <div className="prose prose-invert max-w-none text-[var(--fg-muted)] leading-relaxed text-sm">
                {c.descripcionMD ? (
                  <div dangerouslySetInnerHTML={{ __html: c.descripcionMD }} />
                ) : (
                  <p>{c.resumen || 'Sin descripción detallada.'}</p>
                )}
              </div>
            </div>

            {/* Reseñas */}
            <div>
              <CourseDetailClient cursoId={c.id} title="Valoraciones de los estudiantes" className="" />
            </div>
          </>
        }
        childrenRight={
          <div>
            {/* Video Preview */}
            <div className="relative z-10 -mb-2">
              <div className="bg-black aspect-video rounded-t-lg overflow-hidden border border-default border-b-0 shadow-2xl">
                {c.videoPreview ? (
                  <video
                    src={c.videoPreview}
                    poster={c.portadaUrl ? abs(c.portadaUrl)! : undefined}
                    controls={false}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative w-full h-full group cursor-pointer">
                    <SafeImage
                      src={c.portadaUrl ? abs(c.portadaUrl)! : undefined}
                      alt={c.titulo}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                      <div className="bg-white/90 rounded-full p-4 shadow-lg backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <PlayCircle className="size-8 text-black fill-current" />
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 text-center font-bold text-white drop-shadow-md">
                      Vista previa del curso
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="bg-[var(--bg)] border border-default shadow-2xl rounded-b-lg lg:rounded-lg overflow-hidden relative backdrop-blur-sm">
              <div className="p-6 space-y-6">
                <div className="flex items-baseline gap-2">
                  <Price value={c.precio} className="text-3xl font-bold text-[var(--fg)]" />
                </div>

                <div className="space-y-3">
                  {hasAccess ? (
                    <Link
                      href={`/cursos/player/${c.slug}/modulo-1/leccion-1`}
                      className="flex items-center justify-center w-full py-3 bg-[var(--pink)] text-white font-bold text-base hover:bg-[var(--pink-dark)] transition-all shadow-[0_0_20px_rgba(255,192,203,0.3)] hover:shadow-[0_0_30px_rgba(255,192,203,0.5)] rounded-lg"
                    >
                      Ir al curso
                    </Link>
                  ) : (
                    <>
                      <BuyCourseButton
                        c={c}
                        className="w-full py-3 bg-[var(--pink)] text-white font-bold text-base hover:bg-[var(--pink-dark)] transition-all shadow-[0_0_20px_rgba(255,192,203,0.3)] hover:shadow-[0_0_30px_rgba(255,192,203,0.5)] rounded-lg"
                      />
                      <button className="w-full py-3 border border-[var(--pink)]/30 text-[var(--pink)] font-bold text-base hover:bg-[var(--pink)]/10 transition-colors rounded-lg">
                        Añadir al carrito
                      </button>
                    </>
                  )}
                </div>

                <p className="text-center text-xs text-[var(--fg-muted)]">
                  Garantía de reembolso de 30 días
                </p>

                <div className="space-y-3 text-sm text-[var(--fg)] pt-2">
                  <p className="font-bold text-[var(--fg)]">Este curso incluye:</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-3">
                      <PlayCircle className="size-4 text-[var(--fg-muted)]" />
                      <span>
                        {Math.floor(durMin / 60) > 0 ? `${Math.floor(durMin / 60)} horas` : `${durMin} minutos`} de
                        vídeo
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Award className="size-4 text-[var(--fg-muted)]" />
                      <span>Certificado de finalización</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Globe className="size-4 text-[var(--fg-muted)]" />
                      <span>Acceso de por vida</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <UserRound className="size-4 text-[var(--fg-muted)]" />
                      <span>Acceso en dispositivos móviles</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        }
      />

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}
