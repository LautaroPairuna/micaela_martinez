// src/app/(cuenta)/mi-cuenta/mi-aprendizaje/page.tsx
import Link from 'next/link';
import { listEnrollments } from '@/lib/sdk/userApi';
import { Card, CardBody } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { SubscriptionCoursesList } from '@/components/subscription/SubscriptionCoursesList';
import { getUserSubscriptionInfo } from '@/lib/services/subscription.service';
import { SubscriptionCancelButton } from '@/components/subscription/SubscriptionCancelButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { GraduationCap, Clock, PlayCircle, BookOpen, Award, TrendingUp } from 'lucide-react';
import { SubscriptionInfoCard } from '@/components/subscription/SubscriptionInfoCard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Tipos mínimos necesarios para evitar any y cubrir el uso real en la UI */
type EnrollmentProgreso = {
  porcentaje?: number | null;
  subscription?: {
    duration?: string | number | null;
  } | null;
} | null;

type CursoLight = {
  slug?: string | null;
  titulo?: string | null;
  portadaUrl?: string | null;
  _count?: { modulos?: number | null } | null;
} | null;

type EnrollmentRow = {
  id: string | number;
  cursoId: string | number;
  creadoEn?: string | Date | null;
  estado: 'ACTIVADA' | 'DESACTIVADA' | string;
  curso?: CursoLight;
  progreso?: EnrollmentProgreso;
};

export default async function MiAprendizajePage() {
  const rows = (await listEnrollments()) as EnrollmentRow[];
  const subscriptionInfo = await getUserSubscriptionInfo();

  // Obtener el ID de la orden asociada a la suscripción (desde el backend)
  const orderId = subscriptionInfo.orderId || null;

  return (
    <div className="space-y-8">
      {/* Mostrar información de suscripción si está activa */}
      {subscriptionInfo.isActive && (
        <div className="mb-8">
          <SubscriptionInfoCard
            subscriptionInfo={{
              ...subscriptionInfo,
              orderId,
            }}
          />
        </div>
      )}

      {subscriptionInfo.isActive && subscriptionInfo.includedCourses.length > 0 && (
        <SubscriptionCoursesList courses={subscriptionInfo.includedCourses} className="mb-8" />
      )}

      <PageHeader
        icon={GraduationCap}
        iconBg="bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)]"
        iconColor="text-black"
        title="Mi Aprendizaje"
        description={
          rows.length > 0
            ? `${rows.length} curso${rows.length !== 1 ? 's' : ''} en tu biblioteca de aprendizaje`
            : 'Continuá desarrollando tus habilidades profesionales'
        }
        stats={
          rows
            ? [
                {
                  label: 'Cursos inscritos',
                  value: rows.length,
                  icon: BookOpen,
                  color: 'text-[var(--muted)]',
                  bgColor: 'bg-[var(--subtle)]',
                  borderColor: 'border-[var(--border)]',
                },
                {
                  label: 'Completados',
                  value: rows.filter((r) => r.estado === 'DESACTIVADA').length,
                  icon: Award,
                  color: 'text-[var(--gold)]',
                  bgColor: 'bg-[var(--gold)]/10',
                  borderColor: 'border-[var(--gold)]/30',
                },
                {
                  label: 'En progreso',
                  value: rows.filter((r) => r.estado === 'ACTIVADA').length,
                  icon: TrendingUp,
                  color: 'text-[var(--muted)]',
                  bgColor: 'bg-[var(--subtle)]',
                  borderColor: 'border-[var(--border)]',
                },
              ]
            : undefined
        }
      />

      {rows.length === 0 ? (
        <Card className="text-center py-16">
          <CardBody>
            <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
              <div className="p-6 rounded-full bg-gradient-to-br from-[var(--subtle)] to-[var(--subtle)]/50">
                <BookOpen className="h-12 w-12 text-[var(--muted)]" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold">Aún no tienes cursos</h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  Explorá nuestro catálogo y comenzá tu journey de aprendizaje profesional.
                </p>
              </div>
              <Link
                href="/cursos"
                className="inline-flex items-center justify-center rounded-xl px-8 py-3 text-black font-semibold shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/60"
                style={{
                  background:
                    'linear-gradient(135deg, var(--gold) 0%, var(--gold-200) 50%, var(--gold) 100%)',
                  backgroundSize: '200% 200%',
                }}
              >
                <GraduationCap className="h-5 w-5 mr-2" />
                Explorar Cursos
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6">
          {rows.map((enrollment) => {
            const course = enrollment.curso ?? null;
            const progressPct = Math.max(
              0,
              Math.min(100, Math.round(enrollment.progreso?.porcentaje ?? 0)),
            );
            const isCompleted = enrollment.estado === 'DESACTIVADA';

            // Datos de suscripción (cuando viene desde progreso.subscription)
            const subscription = enrollment.progreso?.subscription ?? null;
            const hasSubscription = Boolean(subscription);
            const durationMonths = Number(subscription?.duration ?? 3);
            const diasTotales = Number.isFinite(durationMonths) ? durationMonths * 30 : 90; // fallback

            return (
              <Card
                key={enrollment.id}
                className="group relative hover:shadow-xl transition-all duration-300 border-[var(--border)] bg-[var(--bg)] overflow-hidden hover:border-[var(--gold)]/30"
              >
                <CardBody className="p-0">
                  {/* Botón de cancelación de suscripción */}
                  {hasSubscription ? (
                    <div className="absolute top-4 right-4 z-10">
                      {/* 👇 Normalizo a string para cumplir con SubscriptionCancelButtonProps */}
                      <SubscriptionCancelButton orderId={String(enrollment.id)} />
                    </div>
                  ) : null}

                  <div className="flex flex-col lg:flex-row">
                    {/* Imagen del curso */}
                    <div className="lg:w-80 h-48 lg:h-auto relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                      {course?.portadaUrl ? (
                        <SafeImage
                          src={course.portadaUrl}
                          alt={course?.titulo || 'Curso'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--gold)]/10 to-[var(--gold)]/20">
                          <BookOpen className="h-12 w-12 text-[var(--gold)]" />
                        </div>
                      )}

                      {/* Badge de estado */}
                      <div className="absolute top-4 left-4">
                        {isCompleted ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/95 text-white text-xs font-medium backdrop-blur-sm shadow-lg">
                            <Award className="h-3 w-3" />
                            Completado
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--gold)]/95 text-black text-xs font-medium backdrop-blur-sm shadow-lg">
                            <PlayCircle className="h-3 w-3" />
                            En progreso
                          </div>
                        )}
                      </div>

                      {/* Progreso visual */}
                      {!isCompleted && progressPct > 0 ? (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-700">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-200)]"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      ) : null}
                    </div>

                    {/* Contenido del curso */}
                    <div className="flex-1 p-6 lg:p-8">
                      <div className="space-y-5">
                        {/* Header del curso */}
                        <div>
                          <h3 className="text-xl lg:text-2xl font-bold text-[var(--fg)] group-hover:text-[var(--gold)] transition-colors line-clamp-2 leading-tight">
                            {course?.titulo || 'Curso sin título'}
                          </h3>
                          <p className="text-[var(--muted)] mt-3 line-clamp-2 text-sm lg:text-base leading-relaxed">
                            Curso • {course?._count?.modulos || 0} módulos
                          </p>
                        </div>

                        {/* Métricas del curso */}
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 text-[var(--muted)]">
                            <Clock className="h-4 w-4" />
                            <span>{course?._count?.modulos || 0} módulos</span>
                          </div>
                          <div className="flex items-center gap-2 text-[var(--muted)]">
                            <BookOpen className="h-4 w-4" />
                            <span>Nivel intermedio</span>
                          </div>
                          {enrollment.creadoEn && (
                            <div className="flex items-center gap-2 text-[var(--muted)]">
                              <GraduationCap className="h-4 w-4" />
                              <span>
                                Inscrito{' '}
                                {new Date(enrollment.creadoEn).toLocaleDateString('es-AR', {
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>

                              {/* Información de suscripción junto a la fecha */}
                              {hasSubscription && (
                                <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-[var(--gold)] text-xs">
                                  <Clock className="h-3 w-3" />
                                  {`${diasTotales} días`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Progreso detallado */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--muted)] font-medium">
                              {isCompleted ? 'Curso completado' : 'Progreso del curso'}
                            </span>
                            <span className="font-bold text-[var(--fg)] text-base">
                              {isCompleted ? '100%' : `${Math.round(progressPct)}%`}
                            </span>
                          </div>

                          {!isCompleted && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden shadow-inner">
                              <div
                                className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] transition-all duration-700 ease-out shadow-sm"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-3 pt-4">
                          <Link
                            href={`/cursos/${course?.slug ?? enrollment.cursoId}`}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] hover:from-[var(--gold-dark)] hover:to-[var(--gold)] text-black font-bold rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-105 transform shadow-lg ring-1 ring-[var(--gold)]/20"
                          >
                            {isCompleted ? (
                              <>
                                <Award className="h-4 w-4" />
                                Revisar curso
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-4 w-4" />
                                Continuar aprendiendo
                              </>
                            )}
                          </Link>

                          {isCompleted && (
                            <button className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[var(--border)] hover:border-[var(--gold)] hover:bg-[var(--gold)]/10 text-[var(--fg)] rounded-xl transition-all duration-300 font-semibold hover:shadow-lg hover:scale-105 transform">
                              <TrendingUp className="h-4 w-4" />
                              Ver certificado
                            </button>
                          )}

                          {/* Botón de favoritos */}
                          <button className="inline-flex items-center justify-center w-12 h-12 border-2 border-[var(--border)] hover:border-[var(--gold)] hover:bg-[var(--gold)]/5 text-[var(--muted)] hover:text-[var(--gold)] rounded-xl transition-all duration-300 hover:scale-105 transform">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
