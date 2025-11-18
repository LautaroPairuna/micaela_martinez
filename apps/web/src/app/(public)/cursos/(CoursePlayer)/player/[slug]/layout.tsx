export const dynamic = 'force-dynamic'

import React from 'react'
import { ProgressProvider } from '@/components/courses/ProgressContext'
import { getCourseBySlug } from '@/lib/sdk/catalogApi'
import { checkUserEnrollment } from '@/lib/sdk/userApi'
import { auth } from '@/lib/server-auth'
import type { EnrollmentProgress } from '@/types/course'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

// —— Tipos mínimos del backend que realmente usamos en este archivo —— //
type BackendCourseDetail = {
  id: string;
  slug: string;
  titulo: string;
  resumen?: string | null;
  portadaUrl?: string | null;
  instructor?: { id?: string; nombre?: string } | null;
  modulos?: Array<{ id: string; titulo?: string; lecciones?: unknown[] | null }> | null;
};

function normalizeProgress(input: unknown): EnrollmentProgress {
  if (typeof input === 'number') return input;
  if (typeof input === 'object' && input !== null) return input as EnrollmentProgress;
  return {};
}

export default async function CourseLayout({ children, params }: LayoutProps) {
  const { slug } = await params

  try {
    const course = (await getCourseBySlug(slug)) as BackendCourseDetail | null

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

    const userSession = await auth()
    const rawEnrollment = userSession?.user?.id
      ? await checkUserEnrollment(course.id, userSession.user.id).catch(() => null)
      : null

    // Adaptar Inscripcion a Enrollment para CoursePlayer (tip UI)
    const adaptedEnrollment = rawEnrollment
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

    return (
      <ProgressProvider enrollmentId={adaptedEnrollment.id} initialProgress={adaptedEnrollment.progreso}>
        {children}
      </ProgressProvider>
    )
  } catch {
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