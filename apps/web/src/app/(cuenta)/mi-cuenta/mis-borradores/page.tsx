'use client';
import { DraftsList } from '@/components/reviews/DraftsList';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { FileText, Info, Clock, Save } from 'lucide-react';
import { useReviewDraft } from '@/hooks/useReviewDraft';

export default function MisBorradoresPage() {
  // Simulamos obtener la cantidad de borradores (esto debería venir del hook real)
  const draftsCount = 0; // Placeholder - esto debería calcularse desde el localStorage o estado
  
  return (
    <div className="space-y-8">
      <PageHeader
        icon={FileText}
        iconBg="bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)]"
        iconColor="text-black"
        title="Mis Borradores"
        description="Gestiona tus borradores de reseñas guardados automáticamente"
        stats={[
          {
            label: 'Borradores',
            value: draftsCount.toString(),
            icon: FileText,
            color: draftsCount > 0 ? 'text-[var(--gold)]' : 'text-[var(--muted)]',
            bgColor: draftsCount > 0 ? 'bg-[var(--gold)]/10' : 'bg-[var(--subtle)]',
            borderColor: draftsCount > 0 ? 'border-[var(--gold)]/30' : 'border-[var(--border)]'
          },
          {
            label: 'Autoguardado',
            value: '3s',
            icon: Save,
            color: 'text-[var(--muted)]',
            bgColor: 'bg-[var(--subtle)]',
            borderColor: 'border-[var(--border)]'
          },
          {
            label: 'Retención',
            value: '7d',
            icon: Clock,
            color: 'text-[var(--muted)]',
            bgColor: 'bg-[var(--subtle)]',
            borderColor: 'border-[var(--border)]'
          }
        ]}
      />

      {/* Información sobre el autoguardado */}
      <Card>
        <CardBody className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <Info className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[var(--fg)] mb-3">
                ¿Cómo funciona el autoguardado?
              </h3>
              <div className="space-y-3 text-sm text-[var(--muted)]">
                <div className="flex items-start gap-2">
                  <span className="inline-block w-2 h-2 bg-[var(--gold)] rounded-full mt-2 flex-shrink-0"></span>
                  <p><strong className="text-[var(--fg)]">Autoguardado:</strong> Tus borradores se guardan automáticamente cada 3 segundos mientras escribes.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-2 h-2 bg-[var(--gold)] rounded-full mt-2 flex-shrink-0"></span>
                  <p><strong className="text-[var(--fg)]">Almacenamiento:</strong> Los borradores se almacenan localmente en tu dispositivo.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-2 h-2 bg-[var(--gold)] rounded-full mt-2 flex-shrink-0"></span>
                  <p><strong className="text-[var(--fg)]">Retención:</strong> Se eliminan automáticamente después de 7 días de inactividad.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-2 h-2 bg-[var(--gold)] rounded-full mt-2 flex-shrink-0"></span>
                  <p><strong className="text-[var(--fg)]">Recuperación:</strong> Puedes cargar un borrador en cualquier momento para continuar escribiendo.</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted)] flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <strong className="text-[var(--fg)]">Tip:</strong> Los borradores se eliminan automáticamente cuando publicas la reseña.
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Lista de borradores */}
      <Card>
        <CardBody className="p-0">
          <DraftsList />
        </CardBody>
      </Card>

      {/* Consejos adicionales */}
      <Card className="mt-6">
        <CardBody>
          <h3 className="font-semibold text-[var(--fg)] mb-3">
            💡 Consejos para aprovechar mejor los borradores
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-[var(--muted)]">
            <div>
              <h4 className="font-medium text-[var(--fg)] mb-2">Escritura sin presión</h4>
              <p>
                Puedes tomarte tu tiempo para escribir reseñas detalladas sin preocuparte por perder tu progreso.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-[var(--fg)] mb-2">Múltiples dispositivos</h4>
              <p>
                Los borradores se guardan por dispositivo. Si cambias de dispositivo, no verás los borradores anteriores.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-[var(--fg)] mb-2">Privacidad</h4>
              <p>
                Tus borradores solo se almacenan en tu dispositivo y nunca se envían a nuestros servidores hasta que publiques.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-[var(--fg)] mb-2">Limpieza automática</h4>
              <p>
                Los borradores antiguos se eliminan automáticamente para mantener tu almacenamiento local limpio.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}