import type { Metadata } from 'next';
import { getCourseBySlug, getCourseContentBySlug } from '@/lib/sdk/catalogApi';
import { auth } from '@/lib/server-auth';
import { CourseConsumptionPage } from '@/components/courses/CourseConsumptionPage';
import Link from 'next/link';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

type Params = { slug: string };

type CourseBasic = Awaited<ReturnType<typeof getCourseBySlug>>;
type CourseFull = Awaited<ReturnType<typeof getCourseContentBySlug>>;
type CourseData = CourseBasic | CourseFull | null;

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

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ leccion?: string; modulo?: string }>;
}) {
  const { slug } = await params;
  const { leccion, modulo } = await searchParams;

  // Obtener sesión del usuario
  const session = await auth();

  let course: CourseData = null;
  let error: string | null = null;
  let hasAccess = false;

  try {
    // Primero intentar obtener información básica del curso (endpoint público)
    course = await getCourseBySlug(slug);

    // Si el usuario está autenticado, intentar obtener el contenido completo
    if (session?.user?.id) {
      try {
        const courseWithContent = await getCourseContentBySlug(slug);
        course = courseWithContent;
        hasAccess = true;
      } catch (contentErr: unknown) {
        // Si falla el contenido protegido, mantener la info básica pero marcar sin acceso
        const is403 =
          contentErr instanceof Error
            ? contentErr.message.includes('403')
            : false;

        if (is403) {
          hasAccess = false;
        } else {
          console.error('Error loading course content:', contentErr);
          hasAccess = false;
        }
      }
    }
  } catch (err: unknown) {
    error = 'Curso no encontrado.';
    console.error('Error loading course:', err);
  }

  // Si hay error, mostrar página de error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/cursos"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver a Cursos
          </Link>
        </div>
      </div>
    );
  }

  // Si no hay sesión, mostrar información básica del curso con opción de login
  if (!session?.user?.id) {
    return (
      <CourseConsumptionPage
        course={course as NonNullable<CourseBasic>}
        session={null}
        hasAccess={false}
      />
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Curso No Encontrado</h1>
          <p className="text-gray-600 mb-6">
            El curso que buscas no existe o ha sido eliminado.
          </p>
          <Link
            href="/cursos"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ver Todos los Cursos
          </Link>
        </div>
      </div>
    );
  }

  // Renderizar el componente con el estado de acceso correcto
  return (
    <CourseConsumptionPage
      course={course as NonNullable<CourseData>}
      session={session}
      hasAccess={hasAccess}
    />
  );
}
