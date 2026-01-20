'use client';

import Link from 'next/link';
import { Menu, X, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
import type { Course, Lesson, Module } from '@/types/course';

type CourseHeaderProps = {
  course: Course;
  currentLesson: Lesson;
  currentModule: Module;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  actualVideoDuration?: number | null;
  getLessonDuration?: (lesson: Lesson) => number | null;
};



export function CourseHeader({ 
  course, 
  currentLesson, 
  currentModule, 
  onToggleSidebar, 
  sidebarOpen,
  actualVideoDuration,
  getLessonDuration
}: CourseHeaderProps) {
  // Usar función helper si está disponible, sino fallback al comportamiento anterior
  const displayDuration = getLessonDuration 
    ? (getLessonDuration(currentLesson) || 0)
    : (actualVideoDuration || currentLesson.duracionS || 0);
  return (
    <header className="bg-[var(--bg)] border-b border-[var(--border)]">
      <div className="px-4 py-4 lg:px-6 lg:py-5">
        <div className="flex items-center justify-between">
          {/* Lado izquierdo - Navegación y título */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Botón volver */}
            <Link href={course.slug ? `/cursos/detalle/${course.slug}` : '/mi-cuenta/mi-aprendizaje'}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Volver al curso</span>
              </Button>
            </Link>

            {/* Toggle sidebar para móvil */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="lg:hidden hover:bg-[var(--bg-hover)] transition-colors"
              aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>

            {/* Indicador móvil minimalista */}
            <div className="lg:hidden flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--gold)]"></div>
                <span className="text-sm font-medium text-[var(--muted)] truncate">
                  {currentModule.titulo} • Lección {currentLesson.orden}
                </span>
              </div>
            </div>

            {/* Información completa del curso - desktop */}
            <div className="hidden lg:flex flex-col flex-1 min-w-0">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm mb-1" aria-label="Navegación del curso">
                <span className="font-medium text-[var(--gold)] truncate">{course.titulo}</span>
                <span className="text-[var(--muted)]">→</span>
                <span className="text-[var(--muted)] truncate">{currentModule.titulo}</span>
              </nav>
              
              {/* Título de la lección actual */}
              <h1 className="text-lg lg:text-xl font-bold text-[var(--fg)] leading-tight truncate">
                {currentLesson.titulo}
              </h1>
            </div>
          </div>

          {/* Lado derecho - Información adicional */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Duración de la lección */}
            {displayDuration !== null && displayDuration > 0 && (
              <div className="flex items-center gap-2 bg-[var(--bg-subtle)] px-3 py-2 rounded-lg border border-[var(--border)]">
                <Clock className="h-4 w-4 text-[var(--gold)]" />
                <span className="text-sm font-medium text-[var(--fg)]">
                  {formatDuration(displayDuration)}
                </span>
              </div>
            )}


          </div>
        </div>
      </div>
    </header>
  );
}
