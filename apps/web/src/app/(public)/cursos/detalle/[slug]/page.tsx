import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCourseBySlug } from '@/lib/sdk/catalogApi';

import { Price } from '@/components/ui/Price';
import { courseJsonLd } from '@/lib/seo';
import { SafeImage } from '@/components/ui/SafeImage';
import { RatingStars } from '@/components/ui/RatingStars';
import { Clock, UserRound, PlayCircle, Award, Check, ChevronRight } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import type { Nivel } from '@/lib/routes';
import { BuyCourseButton } from '@/components/cart/BuyCourseButton';
import { CourseDetailClient } from '@/components/courses/CourseDetailClient';


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
    <article className="min-h-screen bg-[var(--bg)]">
      {/* Hero Section - Estilo Udemy */}
      <section className="bg-gradient-to-br from-[var(--bg)] to-black/20 text-[var(--fg)] py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link href="/" className="text-muted hover:text-[var(--fg)] transition-colors">
                  Inicio
                </Link>
              </li>
              <li className="text-muted">›</li>
              <li>
                <Link href="/cursos" className="text-muted hover:text-[var(--fg)] transition-colors">
                  Cursos
                </Link>
              </li>
              {nivel && (
                <>
                  <li className="text-muted">›</li>
                  <li>
                    <Link 
                      href={`/cursos?nivel=${c.nivel}`} 
                      className="text-muted hover:text-[var(--fg)] transition-colors"
                    >
                      {nivelLabel}
                    </Link>
                  </li>
                </>
              )}
              {c.tags && Array.isArray(c.tags) && c.tags.length > 0 && (
                <>
                  <li className="text-muted">›</li>
                  <li>
                    <Link 
                      href={`/cursos?tag=${encodeURIComponent(c.tags[0])}`} 
                      className="text-muted hover:text-[var(--fg)] transition-colors"
                    >
                      {c.tags[0]}
                    </Link>
                  </li>
                </>
              )}
              <li className="text-muted">›</li>
              <li className="text-[var(--fg)] font-medium">{c.titulo}</li>
            </ol>
          </nav>

          <div className="grid lg:grid-cols-[2fr_1fr] gap-8 items-start">
            {/* Contenido principal */}
            <div className="space-y-8">
              {/* Título principal */}
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight max-w-4xl">
                {c.titulo}
              </h1>
              


              {/* Metadatos */}
              <div className="flex flex-wrap items-center gap-6 text-base">
                {typeof c.ratingProm === 'number' && (
                  <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full">
                    <span className="text-[var(--gold)] font-bold text-lg">{c.ratingProm.toFixed(1)}</span>
                    <RatingStars value={Number(c.ratingProm)} count={c.ratingConteo || 0} size="sm" />
                    <span className="text-muted">({c.ratingConteo || 0})</span>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full">
                  <UserRound className="size-5 text-[var(--gold)]" />
                  <span className="text-muted font-medium">{c.ratingConteo || 199} estudiantes</span>
                </div>
              </div>

              {/* Instructor y metadatos adicionales */}
              <div className="flex flex-wrap items-center gap-6 text-base text-muted">

                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full">
                  <Clock className="size-5 text-[var(--gold)]" />
                  <span className="font-medium">{Math.floor(durMin/60)}h {durMin%60}m</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full">
                  <span>🌐</span>
                  <span className="font-medium">Español</span>
                </div>
              </div>
            </div>

            {/* Vista previa del curso - Solo desktop */}
            <div className="hidden lg:block">
              <div className="relative bg-white/5 rounded-lg overflow-hidden">
                <SafeImage
                  src={c.portadaUrl ? abs(c.portadaUrl)! : undefined}
                  alt={c.titulo}
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="text-center">
                    <PlayCircle className="size-16 text-[var(--fg)] mb-2 mx-auto" />
                    <p className="text-[var(--fg)] font-medium">Vista previa de este curso</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
            {/* Columna principal */}
             <div className="space-y-12">
               {/* Lo que aprenderás */}
               <div className="bg-white/5 backdrop-blur-sm border border-default p-8 rounded-2xl">
                 <h2 className="text-3xl font-bold text-[var(--fg)] mb-6">Lo que aprenderás</h2>
                 <div className="grid md:grid-cols-2 gap-4">
                   {learningPoints.slice(0, 8).map((point, i) => (
                     <div key={i} className="flex items-start gap-4">
                       <div className="w-6 h-6 bg-[var(--gold)]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                         <Check className="size-4 text-[var(--gold)]" />
                       </div>
                       <span className="text-[var(--fg)] leading-relaxed">{point}</span>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Contenido del curso */}
               <div className="bg-white/5 backdrop-blur-sm border border-default p-8 rounded-2xl">
                 <h2 className="text-3xl font-bold text-[var(--fg)] mb-6">Contenido del curso</h2>
                 <div className="mb-6 text-base text-muted">
                   {modCount} secciones • {lessonCount} clases • {formatDuration(c.duracionTotalS || 0)} de duración total
                 </div>
                 
                 <div className="border border-default rounded-xl overflow-hidden">
                   {curriculumModules.map((mod, modIndex) => (
                     <details key={modIndex} className="border-b border-default last:border-b-0">
                       <summary className="p-4 cursor-pointer hover:bg-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <ChevronRight className="size-4 text-muted" />
                           <div>
                             <h3 className="font-medium text-[var(--fg)]">
                               {mod.titulo || `Módulo ${modIndex + 1}`}
                             </h3>
                             <p className="text-sm text-muted">
                               {mod.lecciones?.length || 0} clases • {formatDuration(mod.lecciones?.reduce((acc, l) => acc + (l.duracionS || 0), 0) || 0)}
                             </p>
                           </div>
                         </div>
                       </summary>
                       <div className="px-4 pb-4">
                         {mod.lecciones?.map((leccion, lecIndex) => (
                           <div key={lecIndex} className="flex items-center gap-3 py-2 text-sm">
                             <PlayCircle className="size-4 text-muted" />
                             <span className="text-[var(--fg)]">{leccion.titulo}</span>
                             <span className="text-muted ml-auto">{formatDuration(leccion.duracionS || 0)}</span>
                           </div>
                         ))}
                       </div>
                     </details>
                   ))}
                 </div>
               </div>

               {/* Requisitos */}
               {c.requisitos && (
                 <div className="bg-white/5 backdrop-blur-sm border border-default p-8 rounded-2xl">
                   <h2 className="text-3xl font-bold text-[var(--fg)] mb-6">Requisitos</h2>
                   <div className="prose max-w-none text-[var(--fg)] leading-relaxed">
                     <div dangerouslySetInnerHTML={{ __html: c.requisitos.split('\n').map(req => req.trim()).filter(req => req).map(req => `<div class="flex items-start gap-4 mb-4"><div class="w-2 h-2 bg-[var(--gold)] rounded-full mt-3 flex-shrink-0"></div><span class="text-[var(--fg)] leading-relaxed">${req}</span></div>`).join('') }} />
                   </div>
                 </div>
               )}

               {/* Descripción */}
               <div className="bg-white/5 backdrop-blur-sm border border-default p-8 rounded-2xl">
                 <h2 className="text-3xl font-bold text-[var(--fg)] mb-6">Descripción</h2>
                 <div className="prose max-w-none text-[var(--fg)] leading-relaxed">
                   {(c.resumen || c.descripcionMD) ? (
                     <div dangerouslySetInnerHTML={{ __html: c.resumen || c.descripcionMD || '' }} />
                   ) : (
                     <p className="text-lg">Este curso te proporcionará todas las habilidades necesarias para dominar {c.titulo.toLowerCase()}. Aprenderás desde los conceptos básicos hasta técnicas avanzadas, con ejercicios prácticos y proyectos reales.</p>
                   )}
                 </div>
               </div>
             </div>

            {/* Sidebar de compra - Estilo Udemy */}
            <aside className="hidden lg:block">
              <div className="sticky top-6">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-default rounded-3xl shadow-2xl p-8">
                  {/* Precio */}
                  <div className="mb-8 text-center">
                    <div className="mb-2">
                      <Price value={c.precio} className="text-4xl font-bold text-[var(--fg)]" />
                    </div>
                    <p className="text-muted text-sm">Pago único • Acceso de por vida</p>
                  </div>

                  {/* Botón de compra */}
                  <BuyCourseButton c={c} className="w-full mb-4 py-6 font-bold bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] hover:from-[var(--gold-dark)] hover:to-[var(--gold)] text-black text-lg rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200" />
                  
                  <button className="w-full py-4 border border-default text-[var(--fg)] font-bold rounded-xl hover:bg-white/5 transition-colors mb-6">
                    Añadir al carrito
                  </button>

                  <div className="text-center mb-6">
                    <p className="text-xs text-muted flex items-center justify-center gap-2">
                      <span className="w-4 h-4 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Check className="size-2.5 text-green-500" />
                      </span>
                      Garantía de devolución de dinero de 30 días
                    </p>
                  </div>

                  {/* Este curso incluye */}
                  <div className="border-t border-default pt-6">
                    <h3 className="font-bold text-[var(--fg)] mb-4 text-lg">Este curso incluye:</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 bg-[var(--gold)]/20 rounded-lg flex items-center justify-center">
                          <PlayCircle className="size-4 text-[var(--gold)]" />
                        </div>
                        <span className="text-[var(--fg)] font-medium">{durMin < 60 ? `${durMin} minutos` : `${Math.floor(durMin/60)} horas`} de vídeo bajo demanda</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <UserRound className="size-4 text-blue-500" />
                        </div>
                        <span className="text-[var(--fg)] font-medium">{lessonCount} artículos</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <Clock className="size-4 text-green-500" />
                        </div>
                        <span className="text-[var(--fg)] font-medium">Recursos descargables</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Award className="size-4 text-purple-500" />
                        </div>
                        <span className="text-[var(--fg)] font-medium">Acceso completo de por vida</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                          <PlayCircle className="size-4 text-orange-500" />
                        </div>
                        <span className="text-[var(--fg)] font-medium">Acceso en dispositivos móviles y TV</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 bg-[var(--gold)]/20 rounded-lg flex items-center justify-center">
                          <Check className="size-4 text-[var(--gold)]" />
                        </div>
                        <span className="text-[var(--fg)] font-medium">Certificado de finalización</span>
                      </div>
                    </div>
                  </div>

                  {/* Compartir curso */}
                  <div className="border-t border-default pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--fg)]">Compartir este curso</span>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-white/5 rounded">
                          <Check className="size-4 text-muted" />
                        </button>
                        <button className="p-2 hover:bg-white/5 rounded">
                          <Award className="size-4 text-muted" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL - Diseño mejorado */}
      <section className="bg-gradient-to-b from-transparent to-[var(--gold)]/5">
        <div className="container-fluid container-xl">
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            <div className="space-y-8">
              {/* Sistema de Reseñas */}
              <div className="bg-gradient-to-br from-[var(--gold)]/8 to-[var(--gold)]/4 p-6 rounded-xl border border-[var(--gold)]/20">
                <CourseDetailClient
                  cursoId={c.id}
                  title="Reseñas del curso"
                  className=""
                />
              </div>
            </div>

            {/* Sidebar complementario - Solo en desktop */}
            <aside className="hidden lg:block space-y-6">
              {/* CTA de soporte */}
              <div className="bg-gradient-to-br from-[var(--gold)]/8 to-[var(--gold)]/4 p-5 rounded-xl border border-[var(--gold)]/20">
                <h3 className="font-bold text-[var(--fg)] mb-3 text-sm">¿Tienes dudas?</h3>
                <p className="text-xs text-muted mb-3">
                  Nuestro equipo está aquí para ayudarte con cualquier pregunta sobre el curso.
                </p>
                <Link 
                  href="/contacto" 
                  className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--gold)] text-black font-medium rounded-lg hover:bg-[var(--gold-dark)] transition-colors text-xs"
                >
                  Contactar soporte
                </Link>
              </div>

              {/* Estadísticas del curso */}
              <div className="bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-default">
                <h3 className="font-bold text-[var(--fg)] mb-4">Estadísticas</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Estudiantes</span>
                    <span className="font-bold text-[var(--fg)]">
                       {c.estudiantesCount ? 
                         (c.estudiantesCount >= 1000 ? 
                           `${Math.floor(c.estudiantesCount / 1000)}k+` : 
                           c.estudiantesCount.toLocaleString()
                         ) : 
                         '0'
                       }
                     </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Calificación</span>
                    <span className="font-bold text-[var(--gold)]">
                       {c.ratingProm && c.ratingConteo ? 
                         `${Number(c.ratingProm) % 1 === 0 ? Number(c.ratingProm).toFixed(0) : Number(c.ratingProm).toFixed(1)}/5 ⭐` : 
                         'Sin calificaciones'
                       }
                     </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Última actualización</span>
                    <span className="font-bold text-[var(--fg)]">
                       {c.creadoEn ? 
                         new Date(c.creadoEn).toLocaleDateString('es-ES', {
                           year: 'numeric',
                           month: 'short'
                         }) : 
                         'No disponible'
                       }
                     </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}
