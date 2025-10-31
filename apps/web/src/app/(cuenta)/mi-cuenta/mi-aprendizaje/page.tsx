// src/app/(cuenta)/mi-cuenta/mi-aprendizaje/page.tsx
import { listEnrollments } from '@/lib/sdk/userApi';
import { getUserSubscriptionInfo } from '@/lib/services/subscription.service';
import { getMe } from '@/lib/sdk/userApi';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { MiAprendizajeClient } from './MiAprendizajeClient';

export const dynamic = 'force-dynamic';
// Se eliminó revalidate=0 porque causa conflicto con 'use client'

/** Tipos mínimos necesarios para evitar any y cubrir el uso real en la UI */
type EnrollmentProgreso = {
  porcentaje?: number | null;
  subscription?: {
    duration?: string | number | null;
  } | null;
} | null;

type CursoLight = {
  id?: string | number | null;
  slug?: string | null;
  titulo?: string | null;
  portadaUrl?: string | null;
  _count?: { modulos?: number | null } | null;
  modulos?: Array<{ id: string | number }> | null;
} | null;

type EnrollmentRow = {
  id: string | number;
  cursoId: string | number;
  creadoEn?: string | Date | null;
  estado: 'ACTIVADA' | 'DESACTIVADA' | string;
  curso?: CursoLight;
  progreso?: unknown;
};

async function MiAprendizajePage() {
  const user = await getMe();
  if (!user) {
    redirect('/auth/login');
  }

  const [enrollments, subscriptionInfo] = await Promise.all([
    listEnrollments(),
    getUserSubscriptionInfo(),
  ]);

  // Debug consolidado: resumen por inscripción (evitar spam de logs)
  const summarizeProgress = (prog: unknown) => {
    const summary = { modulesWithProgress: 0, lessonsCompleted: 0, sampleKeys: [] as string[] };
    if (!prog || typeof prog !== 'object') return summary;
    try {
      const obj = prog as Record<string, Record<string, unknown>>;
      for (const modKey of Object.keys(obj)) {
        if (modKey === 'porcentaje' || modKey === 'subscription' || modKey === 'completado') continue;
        const mod = obj[modKey];
        if (mod && typeof mod === 'object') {
          const lessonKeys = Object.keys(mod);
          if (lessonKeys.length > 0) {
            summary.modulesWithProgress++;
            for (const lessonKey of lessonKeys) {
              const entry = (mod as Record<string, unknown>)[lessonKey];
              if (entry && typeof entry === 'object' && 'completed' in entry && (entry as { completed: boolean }).completed) {
                summary.lessonsCompleted++;
                if (summary.sampleKeys.length < 8) {
                  summary.sampleKeys.push(`${modKey}-${lessonKey}`);
                }
              }
            }
          }
        }
      }
    } catch {}
    return summary;
  };

  const consolidated = enrollments.map((e) => {
    const prog = summarizeProgress(e.progreso);
    const course = e.curso as CursoLight;
    return {
      enrollmentId: e.id,
      cursoId: e.cursoId,
      estado: e.estado,
      curso: {
        id: course?.id,
        slug: course?.slug,
        titulo: course?.titulo,
        modulesCount: course?._count?.modulos ?? (Array.isArray(course?.modulos) ? course.modulos.length : undefined),
      },
      progress: prog,
    };
  });

  console.log('📊 MiAprendizaje Summary:', consolidated);

  return (
    <MiAprendizajeClient 
      initialRows={enrollments} 
      subscriptionInfo={subscriptionInfo} 
    />
  );
}

export default function MiAprendizajePageWrapper() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <MiAprendizajePage />
    </Suspense>
  );
}
