'use client';

import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { SubscriptionCancelButton } from '@/components/subscription/SubscriptionCancelButton';
import { GraduationCap, Clock, PlayCircle, BookOpen, Award, TrendingUp } from 'lucide-react';
import { useMemo, useCallback } from 'react';

type EnrollmentProgreso = {
  porcentaje?: number | null;
  subscription?: {
    duration?: string | number | null;
  } | null;
} | null;

type CursoLight = {
  slug?: string | null;
  titulo?: string | null;
  portadaUrl?: string | null;
  _count?: { modulos?: number | null } | null;
  modulos?: Array<{
    id: string;
    titulo?: string;
    orden?: number;
    lecciones?: Array<{
      id: string;
      titulo?: string;
      orden?: number;
    }>;
  }>;
} | null;

type EnrollmentRow = {
  id: string | number;
  cursoId: string | number;
  creadoEn?: string | Date | null;
  estado: 'ACTIVADA' | 'DESACTIVADA' | string;
  curso?: CursoLight;
  progreso?: unknown;
};

type EnrollmentCardProps = {
  enrollment: EnrollmentRow;
  lessonProgress?: Record<string, boolean>;
  getLessonProgressKey?: (moduleId: string, lessonId: string) => string;
  courseModules?: Array<{
    id: string;
    lecciones?: Array<{ id: string }>;
  }>;
};

// Función para procesar el progreso del servidor (igual que en ProgressContext)
function flattenServerProgress(input: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  if (!input || typeof input !== 'object') return out
  try {
    const prog = input as Record<string, Record<string, unknown>>
    for (const modKey of Object.keys(prog)) {
      if (modKey === 'porcentaje' || modKey === 'subscription' || modKey === 'completado') continue;
      const mod = prog[modKey]
      if (!mod || typeof mod !== 'object') continue
      for (const lessonKey of Object.keys(mod)) {
        const lessonData = mod[lessonKey]
        const completed = !!(lessonData && typeof lessonData === 'object' && 'completed' in lessonData && (lessonData as { completed: boolean }).completed)
        out[`${modKey}-${lessonKey}`] = completed
      }
    }
  } catch {}
  return out
}

export function EnrollmentCard({ 
  enrollment, 
  lessonProgress = {}, 
  getLessonProgressKey,
  courseModules = []
}: EnrollmentCardProps) {
  const course = enrollment.curso ?? null;
  const isCompleted = enrollment.estado === 'DESACTIVADA';

  // Usar la misma lógica que CoursePlayer para procesar el progreso
  const serverProgress = useMemo(() => {
    return flattenServerProgress(enrollment.progreso);
  }, [enrollment.progreso]);

  // Helper para un único log consolidado
  const logProgressSummary = useCallback((
    params: {
      enrollmentId: string | number;
      modulesSource: 'course.modulos' | 'courseModules' | 'none';
      serverProgress: Record<string, boolean>;
      modulesToUse: Array<{
        id: string | number;
        lecciones?: Array<{ id: string | number }>;
      }>;
      totals: { percentage: number; completedLessons: number; totalLessons: number };
      lessonProgress?: Record<string, boolean>;
    }
  ) => {
    try {
      const completedKeys = Object.keys(params.serverProgress).filter(
        (k) => params.serverProgress[k]
      );
      // Muestra un muestreo compacto de módulos/lecciones (para evitar logs gigantes)
      const sampleModules = (params.modulesToUse || []).slice(0, 3).map((m) => ({
        id: m?.id,
        lessons: (m?.lecciones || [])
          .slice(0, 5)
          .map((l) => {
            const key = getLessonProgressKey
              ? getLessonProgressKey(String(m?.id), String(l?.id))
              : `${m?.id}-${l?.id}`;
            const isDone = !!(
              params.serverProgress[key] || (params.lessonProgress && params.lessonProgress[key])
            );
            return { id: l?.id, completed: isDone };
          }),
      }));

      console.log('📊 EnrollmentCard Progress Summary', {
        enrollmentId: params.enrollmentId,
        modulesSource: params.modulesSource,
        modulesTotal: params.modulesToUse?.length || 0,
        serverCompletedKeys: completedKeys,
        totals: params.totals,
        sampleModules,
      });
    } catch (e) {
      console.warn('📊 EnrollmentCard Progress Summary logging failed:', e);
    }
  }, [getLessonProgressKey]);

  // Calcular progreso en tiempo real usando la lógica de CoursePlayer
  const realTimeProgress = useMemo(() => {
    const modulesToUse = (course?.modulos && course.modulos.length > 0)
      ? course.modulos
      : (courseModules && courseModules.length > 0 ? courseModules : []);

    if (!modulesToUse.length) {
      const totals = { percentage: 0, completedLessons: 0, totalLessons: 0 };
      logProgressSummary({
        enrollmentId: enrollment.id,
        modulesSource: 'none',
        serverProgress,
        modulesToUse,
        totals,
        lessonProgress,
      });
      return totals;
    }

    let totalLessons = 0;
    let completedLessons = 0;

    modulesToUse.forEach((module) => {
      if (module.lecciones?.length) {
        module.lecciones.forEach((lesson) => {
          totalLessons++;
          const progressKey = getLessonProgressKey ? getLessonProgressKey(String(module.id), String(lesson.id)) : `${module.id}-${lesson.id}`;
          
          // Usar el progreso del servidor procesado (igual que CoursePlayer)
          // Preferir estado del cliente si existe (override en tiempo real)
          const hasClientState = Object.prototype.hasOwnProperty.call(lessonProgress, progressKey);
          const isCompletedNow = hasClientState
            ? !!lessonProgress[progressKey]
            : !!serverProgress[progressKey];
          if (isCompletedNow) {
            completedLessons++;
          }
        });
      } else {
        // módulo sin lecciones
      }
    });

    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    logProgressSummary({
      enrollmentId: enrollment.id,
      modulesSource: course?.modulos && course?.modulos?.length > 0 ? 'course.modulos' : 'courseModules',
      serverProgress,
      modulesToUse,
      totals: { percentage, completedLessons, totalLessons },
      lessonProgress,
    });
    
    return { percentage, completedLessons, totalLessons };
  }, [course?.modulos, serverProgress, courseModules, lessonProgress, getLessonProgressKey, enrollment.id, logProgressSummary]);

  const progressPct = realTimeProgress.percentage;

  // Datos de suscripción (cuando viene desde progreso.subscription)
  const progreso = enrollment.progreso as EnrollmentProgreso;
  const subscription = progreso?.subscription ?? null;
  const hasSubscription = Boolean(subscription);
  const durationMonths = Number(subscription?.duration ?? 3);
  const diasTotales = Number.isFinite(durationMonths) ? durationMonths * 30 : 90; // fallback

  const ctaHref = useMemo(() => {
    if (isCompleted || !course?.slug) return `/cursos/${course?.slug ?? enrollment.cursoId}`;
    const modulesToUse = (course?.modulos && course.modulos.length > 0)
      ? course.modulos
      : (courseModules && courseModules.length > 0 ? courseModules : []);
    if (!modulesToUse.length) return `/cursos/${course.slug}`;
    for (let mIdx = 0; mIdx < modulesToUse.length; mIdx++) {
      const module = modulesToUse[mIdx] as { id: string; orden?: number; lecciones?: Array<{ id: string; orden?: number }> };
      const lessons = module.lecciones ?? [];
      for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
        const lesson = lessons[lIdx];
        const modId = String(module.id);
        const key = getLessonProgressKey ? getLessonProgressKey(modId, String(lesson.id)) : `${modId}-${lesson.id}`;
        const hasClientState = Object.prototype.hasOwnProperty.call(lessonProgress, key);
        const isDone = hasClientState ? !!lessonProgress[key] : !!serverProgress[key];
        if (!isDone) {
          const moduloSlugNum = typeof module.orden === 'number' && module.orden ? module.orden : mIdx + 1;
          const leccionSlugNum = typeof lesson.orden === 'number' && lesson.orden ? lesson.orden : lIdx + 1;
          return `/cursos/player/${course.slug}/modulo-${moduloSlugNum}/leccion-${leccionSlugNum}`;
        }
      }
    }
    return `/cursos/player/${course.slug}/modulo-1/leccion-1`;
  }, [isCompleted, course?.slug, course?.modulos, courseModules, lessonProgress, serverProgress, getLessonProgressKey, enrollment.cursoId]);

  return (
    <Card
      key={enrollment.id}
      className="group relative hover:shadow-xl transition-all duration-300 border-[var(--border)] bg-[var(--bg)] overflow-hidden hover:border-[var(--gold)]/30"
    >
      <CardBody className="p-0">
        {/* Botón de cancelación de suscripción */}
        {hasSubscription ? (
          <div className="absolute top-4 right-4 z-10">
            <SubscriptionCancelButton orderId={String(enrollment.id)} />
          </div>
        ) : null}

        <div className="flex flex-col lg:flex-row">
          {/* Imagen del curso */}
          <div className="lg:w-80 h-48 lg:h-auto relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            {course?.portadaUrl ? (
              <SafeImage
                src={course.portadaUrl}
                alt={course?.titulo || 'Curso'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--gold)]/10 to-[var(--gold)]/20">
                <BookOpen className="h-12 w-12 text-[var(--gold)]" />
              </div>
            )}

            {/* Badge de estado */}
            <div className="absolute top-4 left-4">
              {isCompleted ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/95 text-white text-xs font-medium backdrop-blur-sm shadow-lg">
                  <Award className="h-3 w-3" />
                  Completado
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--gold)]/95 text-black text-xs font-medium backdrop-blur-sm shadow-lg">
                  <PlayCircle className="h-3 w-3" />
                  En progreso
                </div>
              )}
            </div>

            {/* Progreso visual */}
            {!isCompleted && progressPct > 0 ? (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-700">
                <div
                  className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-200)] transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            ) : null}
          </div>

          {/* Contenido del curso */}
          <div className="flex-1 p-6 lg:p-8">
            <div className="space-y-5">
              {/* Header del curso */}
              <div>
                <h3 className="text-xl lg:text-2xl font-bold text-[var(--fg)] group-hover:text-[var(--gold)] transition-colors line-clamp-2 leading-tight">
                  {course?.titulo || 'Curso sin título'}
                </h3>
                <p className="text-[var(--muted)] mt-3 line-clamp-2 text-sm lg:text-base leading-relaxed">
                  Curso • {course?._count?.modulos || 0} módulos
                </p>
              </div>

              {/* Métricas del curso */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-[var(--muted)]">
                  <Clock className="h-4 w-4" />
                  <span>{course?._count?.modulos || 0} módulos</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--muted)]">
                  <BookOpen className="h-4 w-4" />
                  <span>Nivel intermedio</span>
                </div>
                {enrollment.creadoEn && (
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <GraduationCap className="h-4 w-4" />
                    <span>
                      Inscrito{' '}
                      {new Date(enrollment.creadoEn).toLocaleDateString('es-AR', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>

                    {/* Información de suscripción junto a la fecha */}
                    {hasSubscription && (
                      <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-[var(--gold)] text-xs">
                        <Clock className="h-3 w-3" />
                        {`${diasTotales} días`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Progreso detallado */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)] font-medium">
                    {isCompleted ? 'Curso completado' : 'Progreso del curso'}
                  </span>
                  <span className="font-bold text-[var(--fg)] text-base">
                    {isCompleted ? '100%' : `${Math.round(progressPct)}%`}
                  </span>
                </div>

                {!isCompleted && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] transition-all duration-700 ease-out shadow-sm"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-3 pt-4">
                <Link
                  href={ctaHref}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] hover:from-[var(--gold-dark)] hover:to-[var(--gold)] text-black font-bold rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-105 transform shadow-lg ring-1 ring-[var(--gold)]/20"
                >
                  {isCompleted ? (
                    <>
                      <Award className="h-4 w-4" />
                      Revisar curso
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      Continuar aprendiendo
                    </>
                  )}
                </Link>

                {isCompleted && (
                  <button className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[var(--border)] hover:border-[var(--gold)] hover:bg-[var(--gold)]/10 text-[var(--fg)] rounded-xl transition-all duration-300 font-semibold hover:shadow-lg hover:scale-105 transform">
                    <TrendingUp className="h-4 w-4" />
                    Ver certificado
                  </button>
                )}

                {/* Botón de favoritos */}
                <button className="inline-flex items-center justify-center w-12 h-12 border-2 border-[var(--border)] hover:border-[var(--gold)] hover:bg-[var(--gold)]/5 text-[var(--muted)] hover:text-[var(--gold)] rounded-xl transition-all duration-300 hover:scale-105 transform">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}