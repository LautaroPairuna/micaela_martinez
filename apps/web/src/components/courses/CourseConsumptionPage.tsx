'use client';

import Link from 'next/link';
import { CoursePlayer } from './CoursePlayer';
import { CourseCurriculum } from './CourseCurriculum';
import { Card, CardBody } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { Price } from '@/components/ui/Price';
import { BuyCourseButton } from '@/components/cart/BuyCourseButton';
import { useEffect, useState } from 'react';
import { getUserSubscriptionInfo } from '@/lib/services/subscription.service';
import { Lock, Play, Clock, BookOpen, Award, User, CheckCircle } from 'lucide-react';

type CourseDetail = {
  id: string;
  slug: string;
  titulo: string;
  descripcionMD?: string | null;
  precio: number;
  portadaUrl?: string | null;
  nivel?: 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
  resumen?: string | null;
  duracionTotalS?: number | null;
  duracionTipo?: string | null;
  modulos?: Array<{
    id: string;
    titulo?: string | null;
    lecciones?: Array<{
      id: string;
      titulo?: string | null;
      duracionS?: number | null;
      rutaSrc?: string | null;
      tipo?: 'VIDEO' | 'TEXTO' | 'DOCUMENTO' | 'QUIZ';
      contenido?: unknown;
    }> | null;
  }> | null;
  instructor?: { nombre?: string | null } | null;
};

type ServerSession = {
  user: {
    id: string;
    email?: string | null;
    nombre?: string | null;
  };
} | null;

type CourseConsumptionPageProps = {
  course: CourseDetail;
  session: ServerSession;
  hasAccess: boolean;
  leccionSlug?: string;
  moduloSlug?: string;
};

export function CourseConsumptionPage({
  course,
  session,
  hasAccess,
  leccionSlug,
  moduloSlug,
}: CourseConsumptionPageProps) {
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  
  // Estado para almacenar información de acceso
  const [accessInfo, setAccessInfo] = useState<{
    accessType: 'enrollment' | 'subscription' | null;
    hasAccess: boolean;
  } | null>(null);

  // Verificar si el usuario tiene una suscripción activa
  useEffect(() => {
    if (session) {
      const checkSubscription = async () => {
        try {
          const subscriptionInfo = await getUserSubscriptionInfo();
          setHasActiveSubscription(subscriptionInfo.isActive);
          
          // Verificar tipo de acceso
          if (hasAccess) {
            setAccessInfo({
              hasAccess: true,
              accessType: 'enrollment'
            });
          } else if (subscriptionInfo.isActive) {
            setAccessInfo({
              hasAccess: true,
              accessType: 'subscription'
            });
          } else {
            setAccessInfo({
              hasAccess: false,
              accessType: null
            });
          }
        } catch (error) {
          console.error('Error al verificar suscripción:', error);
        }
      };
      
      checkSubscription();
    }
  }, [session, hasAccess]);
  
  // Calcular estadísticas del curso
  const totalLessons =
    course.modulos?.reduce((acc, modulo) => acc + (modulo.lecciones?.length || 0), 0) || 0;

  const totalDuration =
    course.modulos?.reduce(
      (acc, modulo) =>
        acc +
        (modulo.lecciones?.reduce((lessonAcc, leccion) => lessonAcc + (leccion.duracionS || 0), 0) ||
          0),
      0
    ) || 0;

  const durationMinutes = Math.round(totalDuration / 60);
  const moduleCount = course.modulos?.length || 0;

  // Si el usuario tiene acceso completo, mostrar el reproductor
  if (hasAccess && session) {
    // Adaptar el curso para CoursePlayer
    const adaptedCourse = {
      id: course.id,
      slug: course.slug,
      titulo: course.titulo,
      descripcion: course.descripcionMD ?? null,
      imagenUrl: course.portadaUrl ?? null,
      instructor: course.instructor
        ? {
            id: course.instructor.nombre || 'unknown',
            nombre: course.instructor.nombre || 'Instructor',
          }
        : null,
      modulos: course.modulos
        ? course.modulos.map((modulo, index) => ({
            id: modulo.id, // Usar ID real del backend
            titulo: modulo.titulo || `Módulo ${index + 1}`,
            orden: index + 1,
            lecciones: modulo.lecciones
              ? modulo.lecciones.map((leccion, leccionIndex) => ({
                  id: leccion.id, // Usar ID real del backend
                  titulo: leccion.titulo || `Lección ${leccionIndex + 1}`,
                  descripcion: null as string | null,
                  rutaSrc: leccion.rutaSrc || null,
                  duracionS: leccion.duracionS ?? null,
                  orden: leccionIndex + 1,
                  // El contenido ya viene parseado desde la API
                  contenido: leccion.contenido ?? null,
                  tipo:
                    leccion.tipo ??
                    (leccion.rutaSrc && leccion.rutaSrc.trim() !== '' && leccion.rutaSrc.startsWith('http')
                      ? ('VIDEO' as const)
                      : ('TEXTO' as const)),
                }))
              : null,
          }))
        : null,
    };

    const enrollment = {
      id: 'temp-enrollment',
      progreso: 0,
      completado: false,
      ultimaLeccionId: null,
    };

    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <CoursePlayer
          course={adaptedCourse}
          enrollment={enrollment}
        />
      </div>
    );
  }

  // Vista para usuarios sin acceso (no autenticados o sin inscripción)
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header del curso */}
      <div className="bg-gradient-to-r from-gray-900 to-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
            {/* Información principal */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="text-3xl lg:text-4xl font-bold text-white">{course.titulo}</h1>
                {course.resumen && (
                  <p className="text-lg text-gray-300 max-w-3xl">{course.resumen}</p>
                )}
              </div>

              {/* Estadísticas */}
              <div className="flex flex-wrap gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{totalLessons} lecciones</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{durationMinutes} minutos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  <span>{moduleCount} módulos</span>
                </div>
                {course.duracionTipo && course.duracionTotalS && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Duración: {course.duracionTotalS} {course.duracionTipo}</span>
                  </div>
                )}

              </div>

              {/* Estado de acceso */}
              {!session ? (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-blue-400" />
                    <div>
                      <h3 className="font-medium text-blue-300">Inicia sesión para acceder</h3>
                      <p className="text-sm text-blue-400">
                        Necesitas una cuenta para ver el contenido del curso
                      </p>
                    </div>
                  </div>
                </div>
              ) : accessInfo?.accessType === 'enrollment' ? (
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <h3 className="font-medium text-green-300">Acceso completo</h3>
                      <p className="text-sm text-green-400">
                        Tienes acceso a este curso por inscripción directa
                      </p>
                    </div>
                  </div>
                </div>
              ) : hasActiveSubscription ? (
                <div className="bg-[var(--gold)]/20 border border-[var(--gold)] rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[var(--gold)]" />
                    <div>
                      <h3 className="font-medium text-[var(--gold)]">Acceso por suscripción</h3>
                      <p className="text-sm text-[var(--gold)]/80">
                        Tienes acceso a este curso mediante tu suscripción activa
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-yellow-400" />
                    <div>
                      <h3 className="font-medium text-yellow-300">Acceso restringido</h3>
                      <p className="text-sm text-yellow-400">
                        Necesitas inscribirte en este curso o tener una suscripción activa para acceder al contenido
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Panel de compra/acceso */}
            <Card className="sticky top-8">
              <CardBody className="space-y-4">
                {/* Imagen de portada */}
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-808">
                  {course.portadaUrl ? (
                    <SafeImage
                      src={course.portadaUrl}
                      alt={course.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Precio y beneficios */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <Price value={course.precio / 100} className="text-2xl font-bold" />
                      <span className="text-sm text-gray-400">Suscripción mensual</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Award className="w-4 h-4" />
                      <span>Renovación automática</span>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="space-y-2">
                    {!session ? (
                      <>
                        <Link
                          href={`/auth/login?callbackUrl=/cursos/${course.slug}`}
                          className="w-full bg-[var(--gold)] text-black font-medium py-3 px-4 rounded-lg hover:bg-[var(--gold)]/90 transition-colors text-center block"
                        >
                          Iniciar Sesión
                        </Link>
                        <Link
                          href="/auth/register"
                          className="w-full border border-gray-600 text-gray-300 font-medium py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors text-center block"
                        >
                          Crear Cuenta
                        </Link>
                      </>
                    ) : (
                      <BuyCourseButton
                        c={{
                          id: course.id,
                          slug: course.slug,
                          titulo: course.titulo,
                          precio: course.precio,
                          portadaUrl: course.portadaUrl,
                        }}
                      />
                    )}
                  </div>

                  {/* Características */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div className="bg-gray-800 rounded p-2 flex items-center gap-2">
                      <Play className="w-3 h-3" />
                      <span>{totalLessons} lecciones</span>
                    </div>
                    <div className="bg-gray-800 rounded p-2 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{durationMinutes} min</span>
                    </div>
                    <div className="bg-gray-800 rounded p-2 col-span-2 flex items-center gap-2">
                      <BookOpen className="w-3 h-3" />
                      <span>{moduleCount} módulos</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Contenido del curso */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Contenido principal */}
          <div className="space-y-8">
            {/* Descripción */}
            {course.descripcionMD && (
              <Card>
                <CardBody>
                  <h2 className="text-xl font-semibold mb-4">Descripción del curso</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="whitespace-pre-line text-gray-300">{course.descripcionMD}</p>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Currículo del curso */}
            <Card>
              <CardBody>
                <h2 className="text-xl font-semibold mb-4">Contenido del curso</h2>
                {course.modulos && course.modulos.length > 0 ? (
                  <CourseCurriculum
                    modules={course.modulos.map((modulo, index) => ({
                      titulo: modulo.titulo || `Módulo ${index + 1}`,
                      lecciones:
                        modulo.lecciones?.map((leccion, leccionIndex) => ({
                          titulo: leccion.titulo || `Lección ${leccionIndex + 1}`,
                          duracionS: leccion.duracionS || 0,
                        })) || [],
                    }))}
                  />
                ) : (
                  <p className="text-gray-500">No hay contenido disponible para mostrar.</p>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Sidebar adicional */}
          <div className="space-y-6">

          </div>
        </div>
      </div>
    </div>
  );
}
