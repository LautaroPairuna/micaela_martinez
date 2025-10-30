import type { Metadata } from 'next';
import { getCourseBySlug } from '@/lib/sdk/catalogApi';
import { notFound } from 'next/navigation';

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

    // El CoursePlayer ya está montado en el layout y maneja la navegación
    // Esta página solo valida que los parámetros sean correctos
    return null;
  } catch (error) {
    console.error('Error in lesson page:', error);
    notFound();
  }
}
