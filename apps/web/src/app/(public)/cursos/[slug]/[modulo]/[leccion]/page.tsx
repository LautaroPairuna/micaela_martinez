import type { Metadata } from 'next';
import { getCourseBySlug, getCourseContentBySlug } from '@/lib/sdk/catalogApi';
import { CoursePlayer } from '@/components/courses/CoursePlayer';
import { checkUserEnrollment } from '@/lib/sdk/userApi';
import { auth } from '@/lib/server-auth';
import type {
  Enrollment as EnrollmentType,
  Course as UICourse,
  Module as UIModule,
  Lesson as UILesson,
  LessonContent,
  EnrollmentProgress,
} from '@/types/course';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

type Params = {
  slug: string;
  modulo: string;
  leccion: string;
};

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

// Normaliza cualquier "unknown" al shape esperado por CoursePlayer
function normalizeProgress(input: unknown): EnrollmentProgress {
  if (input && typeof input === 'object') {
    return input as EnrollmentProgress;
  }
  return {} as EnrollmentProgress;
}

// Coerción laxa: convertimos el contenido del backend al tipo de UI.
// Si no podemos inferir nada seguro, devolvemos undefined (el player lo tolera).
function toLessonContent(input: unknown): LessonContent | undefined {
  if (!input) return undefined;
  // Si el backend a veces devuelve string como markdown
  if (typeof input === 'string') {
    return { tipo: 'TEXTO', data: { contenido: input } } as LessonContent;
  }
  // Confía en el backend: casteo directo controlado
  return input as unknown as LessonContent;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const course = await getCourseBySlug(slug);

    if (!course) {
      return {
        title: 'Curso no encontrado',
        description: 'El curso que buscas no existe o no está disponible.',
      };
    }

    return {
      title: `${course.titulo} - Mica Pestañas Academy`,
      description: course.descripcionMD || `Aprende ${course.titulo} con nuestro curso completo.`,
      openGraph: {
        title: course.titulo,
        description: course.descripcionMD || undefined,
        images: course.portadaUrl ? [{ url: course.portadaUrl }] : undefined,
      },
    };
  } catch {
    return {
      title: 'Error - Mica Pestañas Academy',
      description: 'Ha ocurrido un error al cargar el curso.',
    };
  }
}

export default async function CoursePlayerPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params; // evitamos warnings por variables no usadas

  try {
    // Obtener datos del curso primero - usar endpoint protegido si es posible
    let course: BackendCourseDetail | null = null;
    try {
      // Intentar obtener contenido protegido primero
      course = (await getCourseContentBySlug(slug)) as BackendCourseDetail;
    } catch (error: unknown) {
      // Si es error 403 (Forbidden), el usuario no tiene acceso
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error as { status?: number }).status === 403
      ) {
        console.log('User does not have enrollment access to course content');
      } else {
        console.error('Error accessing protected course content:', error);
      }
      // Fallback al endpoint público
      course = (await getCourseBySlug(slug)) as BackendCourseDetail;
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
      );
    }

    // Carga paralela de sesión e inscripción
    const rawEnrollment = await (async () => {
      const userSession = await auth();
      if (userSession?.user?.id) {
        try {
          return await checkUserEnrollment(course.id, userSession.user.id);
        } catch (error) {
          console.error('Error checking enrollment:', error);
          return null;
        }
      }
      return null;
    })();

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
                  contenido: toLessonContent(l.contenido), // ← tip seguro para el CoursePlayer
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
    };

    // Adaptar Inscripcion a Enrollment para CoursePlayer (tip UI)
    const adaptedEnrollment: EnrollmentType = rawEnrollment
      ? {
          id: rawEnrollment.id,
          progreso: normalizeProgress(rawEnrollment.progreso),
          completado: rawEnrollment.estado === 'DESACTIVADA',
          // Filtramos booleanos: si no es string, devolvemos null
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
        };

    return <CoursePlayer course={adaptedCourse} enrollment={adaptedEnrollment} />;
  } catch (error) {
    console.error('Error loading course:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-muted-foreground">Ha ocurrido un error al cargar el curso.</p>
        </div>
      </div>
    );
  }
}
