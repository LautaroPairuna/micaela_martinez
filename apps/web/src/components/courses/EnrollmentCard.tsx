'use client';

import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { SubscriptionCancelButton } from '@/components/subscription/SubscriptionCancelButton';
import { Clock, PlayCircle, BookOpen, Award, Loader2 } from 'lucide-react';
import { useMemo, useCallback, useState } from 'react';
import { toast } from 'react-toastify';

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
  portada?: string | null;
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
  const [isDownloading, setIsDownloading] = useState(false);

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
  
  // Estado completado: explícito o 100% (o todas las lecciones completadas)
  const isCompleted = enrollment.estado === 'DESACTIVADA' || progressPct >= 100 || (realTimeProgress.totalLessons > 0 && realTimeProgress.completedLessons >= realTimeProgress.totalLessons);

  // Datos de suscripción (cuando viene desde progreso.subscription)
  const progreso = enrollment.progreso as EnrollmentProgreso;
  const subscription = progreso?.subscription ?? null;
  const hasSubscription = Boolean(subscription);
  const durationMonths = Number(subscription?.duration ?? 3);
  const diasTotales = Number.isFinite(durationMonths) ? durationMonths * 30 : 90; // fallback

  const handleDownloadCertificate = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const response = await fetch(`/api/certificates/course/${enrollment.cursoId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'No se pudo descargar el certificado');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificado-${course?.slug || 'curso'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Certificado descargado con éxito');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Error al descargar');
    } finally {
      setIsDownloading(false);
    }
  }, [enrollment.cursoId, course?.slug, isDownloading]);

  const ctaHref = useMemo(() => {
    // Si está completado, redirigir al player para repasar
    if (isCompleted && course?.slug) return `/cursos/player/${course.slug}`;
    // Si falta el slug, redirigir a la ficha del curso (fallback)
    if (!course?.slug) return `/cursos/${enrollment.cursoId}`;
    
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

  // Resolver la imagen usando la misma lógica que CourseCard
  const courseImageUrl = course?.portadaUrl || (course?.portada ? `/uploads/curso/${course.portada}` : null);

  return (
    <Card
      key={enrollment.id}
      className="group relative h-full flex flex-col overflow-hidden border border-white/10 bg-[#09090b] hover:border-[var(--gold)] hover:shadow-[0_0_30px_-5px_rgba(197,164,109,0.15)] transition-all duration-300 ease-out rounded-xl"
    >
      {/* Imagen de Portada (Cabeza) */}
      <div className="relative w-full aspect-video overflow-hidden bg-[#09090b]">
        {/* Fondo borroso (efecto relleno) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {courseImageUrl && (
            <SafeImage
              src={courseImageUrl}
              alt=""
              ratio="auto"
              className="w-full h-full opacity-50 blur-2xl scale-110"
              imgClassName="w-full h-full object-cover"
              fit="cover"
              withBg={false}
              skeleton={false}
              hoverZoom={false}
            />
          )}
        </div>

        {/* Imagen principal */}
        <div className="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-[1.02]">
          {courseImageUrl ? (
            <SafeImage
              src={courseImageUrl}
              alt={course?.titulo || 'Curso'}
              ratio="auto"
              className="w-full h-full"
              imgClassName="w-full h-full object-contain drop-shadow-2xl"
              fit="contain"
              rounded="none"
              withBg={false}
              skeleton={false}
              hoverZoom={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
              <BookOpen className="h-12 w-12 text-[var(--gold)]/20" strokeWidth={1.5} />
            </div>
          )}
        </div>
        
        {/* Overlay sutil para profundidad */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-40 pointer-events-none" />

        {/* Badge de estado (Superpuesto en la imagen) */}
        <div className="absolute bottom-3 left-3 z-30">
           {isCompleted ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/90 text-white text-[10px] font-bold backdrop-blur-md shadow-lg border border-green-400/20">
              <Award className="h-3 w-3" />
              COMPLETADO
            </div>
           ) : progressPct > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--gold)] text-black text-[10px] font-bold backdrop-blur-md shadow-lg border border-white/10">
              <PlayCircle className="h-3 w-3 fill-black/10" />
              EN PROGRESO
            </div>
           ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/90 text-zinc-300 text-[10px] font-bold backdrop-blur-md shadow-lg border border-white/10">
              <PlayCircle className="h-3 w-3" />
              NO INICIADO
            </div>
           )}
        </div>
      </div>

      {/* Contenido principal */}
      <CardBody className="relative flex flex-col gap-3 flex-1 p-4 sm:p-5 lg:p-6">
        {/* Botón de opciones (3 puntos) movido aquí para no tapar la imagen */}
        {hasSubscription ? (
          <div className="absolute top-4 right-4 z-30">
            <SubscriptionCancelButton orderId={String(enrollment.id)} />
          </div>
        ) : null}

        <div className="flex flex-col gap-1 pr-8">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 uppercase tracking-wide text-white group-hover:text-[var(--gold)] transition-colors duration-300">
            {course?.titulo || 'Curso sin título'}
          </h3>
        </div>
            
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[var(--gold)]" />
            <span>{course?._count?.modulos || 0} módulos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-[var(--gold)]" />
            <span>Intermedio</span>
          </div>
          {hasSubscription && (
            <div className="flex items-center gap-1.5 text-[var(--gold)] bg-[var(--gold)]/10 px-2 py-0.5 rounded border border-[var(--gold)]/20">
              <Clock className="h-3 w-3" />
              <span>{diasTotales} días</span>
            </div>
          )}
        </div>

        {/* Progreso */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider font-bold text-zinc-500">
            <span>Avance</span>
            <span className={isCompleted ? "text-green-400" : "text-white"}>
              {isCompleted ? '100%' : `${Math.round(progressPct)}%`}
            </span>
          </div>

          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full shadow-[0_0_10px_rgba(var(--gold-rgb),0.3)] transition-all duration-700 ease-out ${isCompleted ? 'bg-green-500 shadow-green-500/30' : 'bg-gradient-to-r from-[var(--gold)] to-[#b88a44]'}`}
              style={{ width: `${isCompleted ? 100 : progressPct}%` }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto pt-6 space-y-2">
          {isCompleted ? (
            <>
              <button
                onClick={handleDownloadCertificate}
                disabled={isDownloading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-200)] text-black font-bold text-sm shadow-lg shadow-[var(--gold)]/10 hover:shadow-[var(--gold)]/30 hover:-translate-y-0.5 transition-all duration-300 group/btn disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Descargando...
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4" />
                    Descargar Certificado
                  </>
                )}
              </button>
              
              <Link
                href={ctaHref}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white font-medium text-xs transition-all duration-200 border border-white/5 hover:border-white/10"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Repasar curso
              </Link>
            </>
          ) : (
            <Link
              href={ctaHref}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-200)] text-black font-bold text-sm shadow-lg shadow-[var(--gold)]/10 hover:shadow-[var(--gold)]/30 hover:-translate-y-0.5 transition-all duration-300 group/btn"
            >
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-30"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-black/80"></span>
              </span>
              {progressPct > 0 ? 'Continuar aprendiendo' : 'Empezar'}
            </Link>
          )}
        </div>
      </CardBody>
    </Card>
  );
}