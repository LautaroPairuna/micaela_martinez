'use client';

import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { SubscriptionCoursesList } from '@/components/subscription/SubscriptionCoursesList';
import { SubscriptionInfoCard } from '@/components/subscription/SubscriptionInfoCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { GraduationCap, BookOpen } from 'lucide-react';
import { EnrollmentProgressProvider, useEnrollmentProgress } from '@/components/courses/EnrollmentProgressProvider';
import { EnrollmentCard } from '@/components/courses/EnrollmentCard';

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
  progreso?: unknown;
};

type SubscriptionInfo = {
  isActive: boolean;
  nextPaymentDate: string | null;
  subscriptionId: string | null;
  frequency: string | null;
  frequencyType: string | null;
  orderId?: string | null;
  includedCourses: Array<{
    id: string;
    slug?: string;
    titulo?: string;
    portadaUrl?: string;
    [key: string]: unknown;
  }>;
};

type MiAprendizajeClientProps = {
  initialRows: EnrollmentRow[];
  subscriptionInfo: SubscriptionInfo;
};

function MiAprendizajeContent({ initialRows, subscriptionInfo }: MiAprendizajeClientProps) {
  const { lessonProgress, courseModules, getLessonProgressKey } = useEnrollmentProgress();

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
        <SubscriptionCoursesList 
          courses={subscriptionInfo.includedCourses.map(course => ({
            id: course.id,
            title: course.titulo || '',
            slug: course.slug || '',
            image: course.portadaUrl
          }))} 
          className="mb-8" 
        />
      )}

      <PageHeader
        icon={GraduationCap}
        iconBg="bg-transparent border border-[var(--pink)]/40"
        iconColor="text-[var(--pink)]"
        title="Mi Aprendizaje"
        description={
          initialRows.length > 0
            ? `${initialRows.length} curso${initialRows.length !== 1 ? 's' : ''} en tu biblioteca de aprendizaje`
            : 'Continuá desarrollando tus habilidades profesionales'
        }
        stats={
          initialRows
            ? [
                {
                  label: 'Cursos inscritos',
                  value: initialRows.length,
                  icon: BookOpen,
                  color: 'text-[var(--muted)]',
                  bgColor: 'bg-[var(--subtle)]',
                  borderColor: 'border-[var(--border)]',
                },
              ]
            : undefined
        }
      />

      {initialRows.length === 0 ? (
        <Card className="border-[var(--border)] bg-[var(--bg)]">
          <CardBody className="text-center py-16">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/10 flex items-center justify-center">
                <GraduationCap className="h-10 w-10 text-[var(--gold)]" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-[var(--fg)]">¡Comenzá tu viaje de aprendizaje!</h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  Aún no tenés cursos en tu biblioteca. Explorá nuestra selección de cursos profesionales y
                  comenzá a desarrollar nuevas habilidades hoy mismo.
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
          {initialRows.map((enrollment) => {
            const courseId = String(enrollment.cursoId || '');
            const modules = courseModules[courseId] || [];
            
            return (
              <EnrollmentCard
                key={enrollment.id}
                enrollment={enrollment}
                lessonProgress={lessonProgress}
                getLessonProgressKey={getLessonProgressKey}
                courseModules={modules}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MiAprendizajeClient({ initialRows, subscriptionInfo }: MiAprendizajeClientProps) {
  return (
    <EnrollmentProgressProvider>
      <MiAprendizajeContent initialRows={initialRows} subscriptionInfo={subscriptionInfo} />
    </EnrollmentProgressProvider>
  );
}
