import type { Metadata } from 'next';
import { getCourseBySlug, getCourseContentBySlug } from '@/lib/sdk/catalogApi';
import type { CourseDetail } from '@/lib/sdk/catalogApi';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/server-auth';
import { CoursePlayer } from '@/components/courses/CoursePlayer';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

type Params = {
  slug: string;
  modulo: string;
  leccion: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, modulo, leccion } = await params;
  
  try {
    const course = await getCourseBySlug(slug);
    if (!course) {
      return {
        title: 'Curso no encontrado',
      };
    }

    // Extraer número de módulo y lección de los parámetros
    const moduleNumber = modulo.replace('modulo-', '');
    const lessonNumber = leccion.replace('leccion-', '');

    return {
      title: `${course.titulo} - Módulo ${moduleNumber}, Lección ${lessonNumber}`,
      description: course.resumen || `Lección ${lessonNumber} del módulo ${moduleNumber} del curso ${course.titulo}`,
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Curso',
    };
  }
}

export default async function LessonPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, modulo, leccion } = await params;

  try {
    // Validar que el curso existe
    const course = await getCourseBySlug(slug);
    if (!course) {
      notFound();
    }

    // Validar formato de parámetros
    if (!modulo.startsWith('modulo-') || !leccion.startsWith('leccion-')) {
      notFound();
    }

    // Extraer números de módulo y lección
    const moduleNumber = parseInt(modulo.replace('modulo-', ''));
    const lessonNumber = parseInt(leccion.replace('leccion-', ''));

    if (isNaN(moduleNumber) || isNaN(lessonNumber) || moduleNumber < 1 || lessonNumber < 1) {
      notFound();
    }

    // Autenticación y acceso al contenido protegido
    const session = await auth();
    if (!session?.user?.id) {
      redirect(`/cursos/detalle/${slug}`);
    }

    // Intentar obtener contenido protegido para confirmar acceso
    let fullCourse: Awaited<ReturnType<typeof getCourseContentBySlug>> | null = null;
    try {
      fullCourse = await getCourseContentBySlug(slug);
    } catch {
      redirect(`/cursos/detalle/${slug}`);
    }

    if (!fullCourse) {
      redirect(`/cursos/detalle/${slug}`);
    }

    // Adaptar el curso para CoursePlayer
    const adaptedCourse = {
      id: fullCourse.id,
      slug: fullCourse.slug,
      titulo: fullCourse.titulo,
      descripcion: fullCourse.descripcionMD ?? null,
      imagenUrl: fullCourse.portadaUrl ?? null,
      instructor: fullCourse.instructor
        ? {
            id: fullCourse.instructor.nombre || 'unknown',
            nombre: fullCourse.instructor.nombre || 'Instructor',
          }
        : null,
      modulos: fullCourse.modulos
        ? fullCourse.modulos.map((moduloItem: NonNullable<CourseDetail['modulos']>[number], index: number) => ({
            id: moduloItem.id,
            titulo: moduloItem.titulo || `Módulo ${index + 1}`,
            orden: index + 1,
            lecciones: moduloItem.lecciones
              ? moduloItem.lecciones.map((leccionItem: NonNullable<NonNullable<CourseDetail['modulos']>[number]['lecciones']>[number], leccionIndex: number) => ({
                  id: leccionItem.id,
                  titulo: leccionItem.titulo || `Lección ${leccionIndex + 1}`,
                  descripcion: null as string | null,
                  rutaSrc: leccionItem.rutaSrc || null,
                  duracionS: leccionItem.duracionS ?? null,
                  orden: leccionIndex + 1,
                  contenido: leccionItem.contenido ?? null,
                  tipo:
                    leccionItem.tipo ??
                    (leccionItem.rutaSrc && leccionItem.rutaSrc.trim() !== '' && leccionItem.rutaSrc.startsWith('http')
                      ? ('VIDEO' as const)
                      : ('TEXTO' as const)),
                }))
              : null,
          }))
        : null,
    };

    // Renderizar el player directamente; ProgressProvider viene del layout superior
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <CoursePlayer course={adaptedCourse} enrollment={{ id: 'temp-enrollment', progreso: 0, completado: false, ultimaLeccionId: null }} />
      </div>
    );
  } catch (error) {
    console.error('Error in lesson page:', error);
    notFound();
  }
}
