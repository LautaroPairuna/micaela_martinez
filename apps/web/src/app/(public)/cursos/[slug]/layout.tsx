// src/app/(public)/cursos/[slug]/layout.tsx
export const dynamic = 'force-dynamic'

import React from 'react'
import { ProgressProvider } from '@/components/courses/ProgressContext'
import { CoursePlayer } from '@/components/courses/CoursePlayer'
import { getCourseBySlug, getCourseContentBySlug } from '@/lib/sdk/catalogApi'
import { checkUserEnrollment } from '@/lib/sdk/userApi'
import { auth } from '@/lib/server-auth'
import type {
  Enrollment as EnrollmentType,
  Course as UICourse,
  Module as UIModule,
  Lesson as UILesson,
  LessonContent,
  EnrollmentProgress,
} from '@/types/course'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

// —— Tipos mínimos del backend que realmente usamos en este archivo —— //
type BackendInstructor = {
  id?: string;
  nombre?: string;
};

type BackendLesson = {
  id: string;
  titulo?: string;
  rutaSrc?: string | null;
  duracionS?: number | null;
  contenido?: unknown;
  tipo?: 'VIDEO' | 'TEXTO' | 'DOCUMENTO' | 'QUIZ' | string;
};

type BackendModule = {
  id: string;
  titulo?: string;
  lecciones?: BackendLesson[] | null;
};

type BackendCourseDetail = {
  id: string;
  slug: string;
  titulo: string;
  resumen?: string | null;
  portadaUrl?: string | null;
  instructor?: BackendInstructor | null;
  modulos?: BackendModule[] | null;
};

function normalizeProgress(input: unknown): EnrollmentProgress {
  if (typeof input === 'number') return input;
  if (typeof input === 'object' && input !== null) return input as EnrollmentProgress;
  return {};
}

function toLessonContent(input: unknown): LessonContent | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') return input;
  if (typeof input === 'object') return input as LessonContent;
  return undefined;
}

export default async function CourseLayout({ children, params }: LayoutProps) {
  const { slug } = await params

  try {
    // Obtener datos del curso primero - usar endpoint protegido si es posible
    let course: BackendCourseDetail | null = null
    try {
      // Intentar obtener contenido protegido primero
      course = (await getCourseContentBySlug(slug)) as BackendCourseDetail
    } catch (error: unknown) {
      // Si es error 403 (Forbidden), el usuario no tiene acceso
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error as { status?: number }).status === 403
      ) {
        console.log('User does not have enrollment access to course content')
      } else {
        console.error('Error accessing protected course content:', error)
      }
      // Fallback al endpoint público
      course = (await getCourseBySlug(slug)) as BackendCourseDetail
    }

    if (!course) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Curso no encontrado</h1>
            <p className="text-muted-foreground">
              El curso que buscas no existe o no está disponible.
            </p>
          </div>
        </div>
      )
    }

    // Carga paralela de sesión e inscripción
    const rawEnrollment = await (async () => {
      const userSession = await auth()
      if (userSession?.user?.id) {
        try {
          return await checkUserEnrollment(course.id, userSession.user.id)
        } catch (error) {
          console.error('Error checking enrollment:', error)
          return null
        }
      }
      return null
    })()

    // Adaptar CourseDetail a Course para CoursePlayer (y tiparlo como UI)
    const adaptedCourse: UICourse = {
      id: course.id,
      slug: course.slug,
      titulo: course.titulo,
      descripcion: course.resumen ?? null,
      imagenUrl: course.portadaUrl ?? null,
      instructor: course.instructor
        ? {
            id: course.instructor.id ?? 'unknown',
            nombre: course.instructor?.nombre || ''
          }
        : null,
      modulos: Array.isArray(course.modulos)
        ? (course.modulos.map((m, index): UIModule => ({
            id: m.id,
            titulo: m.titulo || `Módulo ${index + 1}`,
            orden: index + 1,
            lecciones: Array.isArray(m.lecciones)
              ? (m.lecciones.map((l, leccionIndex): UILesson => ({
                  id: l.id,
                  titulo: l.titulo || `Lección ${leccionIndex + 1}`,
                  descripcion: null,
                  rutaSrc: l.rutaSrc || null,
                  duracionS: l.duracionS ?? null,
                  orden: leccionIndex + 1,
                  contenido: toLessonContent(l.contenido),
                  tipo: (() => {
                    const backendTipo = l.tipo?.toUpperCase();
                    if (
                      backendTipo === 'VIDEO' ||
                      backendTipo === 'TEXTO' ||
                      backendTipo === 'DOCUMENTO' ||
                      backendTipo === 'QUIZ'
                    ) {
                      return backendTipo as 'VIDEO' | 'TEXTO' | 'DOCUMENTO' | 'QUIZ';
                    }
                    if (l.rutaSrc && l.rutaSrc.trim() !== '' && l.rutaSrc.startsWith('http')) {
                      return 'VIDEO' as const;
                    }
                    const tipos = ['TEXTO', 'DOCUMENTO', 'QUIZ'] as const;
                    return tipos[leccionIndex % tipos.length];
                  })(),
                })) as UILesson[])
              : undefined,
          })) as UIModule[])
        : undefined,
    }

    // Adaptar Inscripcion a Enrollment para CoursePlayer (tip UI)
    const adaptedEnrollment: EnrollmentType = rawEnrollment
      ? {
          id: rawEnrollment.id,
          progreso: normalizeProgress(rawEnrollment.progreso),
          completado: rawEnrollment.estado === 'DESACTIVADA',
          ultimaLeccionId: (() => {
            const raw = (rawEnrollment.progreso as Record<string, unknown> | undefined) as
              | { ultimaLeccionId?: unknown }
              | undefined;
            const v = raw?.ultimaLeccionId;
            return typeof v === 'string' ? v : null;
          })(),
        }
      : {
          id: 'temp',
          progreso: normalizeProgress({}),
          completado: false,
          ultimaLeccionId: null,
        }

    // Proveedor cliente que mantiene el estado entre navegaciones dentro del curso
    return (
      <ProgressProvider enrollmentId={adaptedEnrollment.id} initialProgress={adaptedEnrollment.progreso}>
        <CoursePlayer course={adaptedCourse} enrollment={adaptedEnrollment}>
          {children}
        </CoursePlayer>
      </ProgressProvider>
    )
  } catch (error) {
    console.error('Error loading course:', error)
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-muted-foreground">Ha ocurrido un error al cargar el curso.</p>
        </div>
      </div>
    )
  }
}