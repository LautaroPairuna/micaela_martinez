'use client';

import { useMemo } from 'react';
import { Target, Clock, BookOpen, CheckCircle2 } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';

type Course = {
  id: string;
  titulo: string;
  modulos?: Module[] | null;
};

type Module = {
  id: string;
  titulo: string;
  lecciones?: Lesson[] | null;
};

type Lesson = {
  id: string;
  titulo: string;
  duracionS?: number | null;
};

type DetailedEnrollmentProgress = {
  /** Mapa lección completada por clave única */
  lessons?: Record<string, boolean>;
  /** Porcentaje 0-100 */
  percentage?: number;
  /** Campos adicionales que pueda enviar el backend */
  [key: string]: unknown;
};

type Enrollment = {
  id: string;
  /** Puede ser porcentaje directo o un objeto con detalle */
  progreso?: number | DetailedEnrollmentProgress;
  completado: boolean;
};

type CourseProgressProps = {
  course: Course;
  enrollment: Enrollment; // se recibe, aunque no lo usamos en el cálculo actual
  lessonProgress: Record<string, boolean>;
  getLessonProgressKey: (moduleId: string, lessonId: string) => string;
};

export function CourseProgress({
  course,
  enrollment: _enrollment, // renombrado para evitar warning de unused
  lessonProgress,
  getLessonProgressKey
}: CourseProgressProps) {
  void _enrollment;
  const stats = useMemo(() => {
    if (!course.modulos?.length) {
      return {
        totalLessons: 0,
        completedLessons: 0,
        totalDuration: 0,
        completedDuration: 0,
        progressPercentage: 0,
        totalModules: 0
      };
    }

    let totalLessons = 0;
    let completedLessons = 0;
    let totalDuration = 0;
    let completedDuration = 0;

    course.modulos.forEach((module) => {
      if (module.lecciones?.length) {
        module.lecciones.forEach((lesson) => {
          totalLessons++;
          totalDuration += lesson.duracionS || 0;

          if (lessonProgress[getLessonProgressKey(module.id, lesson.id)]) {
            completedLessons++;
            completedDuration += lesson.duracionS || 0;
          }
        });
      }
    });

    const progressPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      totalLessons,
      completedLessons,
      totalDuration,
      completedDuration,
      progressPercentage,
      totalModules: course.modulos.length
    };
  }, [course.modulos, lessonProgress, getLessonProgressKey]);

  const isCompleted = stats.progressPercentage === 100;
  const isNearlyCompleted = stats.progressPercentage >= 90;

  return (
    <div className="flex items-center gap-6">
      {/* Progreso circular */}
      <div className="relative">
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
          {/* Círculo de fondo */}
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Círculo de progreso */}
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${
              2 * Math.PI * 28 * (1 - stats.progressPercentage / 100)
            }`}
            className={cn(
              'transition-all duration-500 ease-out',
              isCompleted
                ? 'text-green-500'
                : isNearlyCompleted
                ? 'text-orange-500'
                : 'text-[var(--gold)]'
            )}
          />
        </svg>

        {/* Indicador central */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isCompleted ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <span className="text-xs font-bold text-green-500 mt-0.5">100%</span>
            </div>
          ) : isNearlyCompleted ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="h-5 w-5 text-orange-500" />
              <span className="text-xs font-bold text-orange-500 mt-0.5">
                {stats.progressPercentage}%
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold text-[var(--fg)]">
              {stats.progressPercentage}%
            </span>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="flex-1 space-y-2">
        {/* Progreso de lecciones */}
        <div className="flex items-center justify-between text-sm gap-x-3">
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <Target className="h-4 w-4" />
            <span>Progreso del curso </span>
          </div>
          <span className="font-semibold text-[var(--fg)]">
            {stats.completedLessons} de {stats.totalLessons} lecciones
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-700 ease-out',
              isCompleted
                ? 'bg-gradient-to-r from-green-500 to-green-600'
                : isNearlyCompleted
                ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                : 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)]'
            )}
            style={{ width: `${stats.progressPercentage}%` }}
          />
        </div>

        {/* Información adicional */}
        <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
          <div className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            <span>{stats.totalModules} módulos</span>
          </div>

          {stats.totalDuration > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {formatDuration(stats.completedDuration)} /{' '}
                {formatDuration(stats.totalDuration)}
              </span>
            </div>
          )}

          {isCompleted && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              <span className="font-medium">¡Curso completado!</span>
            </div>
          )}

          {isNearlyCompleted && !isCompleted && (
            <div className="flex items-center gap-1 text-orange-600">
              <CheckCircle2 className="h-3 w-3" />
              <span className="font-medium">¡Casi completado!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
