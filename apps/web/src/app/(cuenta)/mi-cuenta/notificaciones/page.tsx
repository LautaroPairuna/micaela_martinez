// src/app/(cuenta)/mi-cuenta/notificaciones/page.tsx
'use client';
import { Bell, CheckCircle, Clock, Info, Settings } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/hooks/useNotifications';
import Link from 'next/link';

export default function NotificationsAccountPage() {
  const { notifications } = useNotifications();

  const unreadCount = notifications.filter(n => !n.leida).length;
  const totalCount = notifications.length;
  const readCount = totalCount - unreadCount;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          icon={Bell}
          iconBg="bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)]"
          iconColor="text-black"
          title="Mis Notificaciones"
          description="Mantente al día con todas tus notificaciones y actualizaciones importantes"
          stats={[
            {
              label: 'Sin leer',
              value: unreadCount.toString(),
              icon: Bell,
              color: unreadCount > 0 ? 'text-[var(--gold)]' : 'text-[var(--muted)]',
              bgColor: unreadCount > 0 ? 'bg-[var(--gold)]/10' : 'bg-[var(--subtle)]',
              borderColor: unreadCount > 0 ? 'border-[var(--gold)]/30' : 'border-[var(--border)]'
            },
            {
              label: 'Leídas',
              value: readCount.toString(),
              icon: CheckCircle,
              color: 'text-[var(--muted)]',
              bgColor: 'bg-[var(--subtle)]',
              borderColor: 'border-[var(--border)]'
            },
            {
              label: 'Total',
              value: totalCount.toString(),
              icon: Clock,
              color: 'text-[var(--muted)]',
              bgColor: 'bg-[var(--subtle)]',
              borderColor: 'border-[var(--border)]'
            }
          ]}
        />
        
        <Link href="/mi-cuenta/configuracion-notificaciones">
          <Button
            variant="outline"
            className="flex items-center gap-2 hover:bg-[var(--gold)]/10 hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all duration-200"
          >
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
        </Link>
      </div>

      {/* Información sobre notificaciones */}
      <Card>
        <CardBody className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <Info className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[var(--fg)] mb-3">
                Sobre las notificaciones
              </h3>
              <div className="space-y-3 text-sm text-[var(--muted)]">
                <div className="flex items-start gap-2">
                  <span className="inline-block w-2 h-2 bg-[var(--gold)] rounded-full mt-2 flex-shrink-0"></span>
                  <p><strong className="text-[var(--fg)]">Respuestas:</strong> Recibirás una notificación cuando alguien responda a tus reseñas.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-2 h-2 bg-[var(--gold)] rounded-full mt-2 flex-shrink-0"></span>
                  <p><strong className="text-[var(--fg)]">Likes:</strong> Te notificaremos cuando alguien le dé like a tus reseñas.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-2 h-2 bg-[var(--gold)] rounded-full mt-2 flex-shrink-0"></span>
                  <p><strong className="text-[var(--fg)]">Menciones:</strong> Si alguien te menciona en una reseña o respuesta, lo sabrás al instante.</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted)] flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <strong className="text-[var(--fg)]">Tip:</strong> Haz clic en cualquier notificación para ir directamente al contenido relacionado.
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Lista de notificaciones */}
      <NotificationsList />
    </div>
  );
}