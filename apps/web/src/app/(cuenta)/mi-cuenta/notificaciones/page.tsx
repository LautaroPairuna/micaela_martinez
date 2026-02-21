// src/app/(cuenta)/mi-cuenta/notificaciones/page.tsx
'use client';
import { Bell, CheckCircle, Clock, Info, Settings, MessageSquare, Heart, AtSign } from 'lucide-react';
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
          iconBg="bg-transparent border border-[var(--pink)]/40"
          iconColor="text-[var(--pink)]"
          title="Mis Notificaciones"
          description="Mantente al día con todas tus notificaciones y actualizaciones importantes"
          stats={[
            {
              label: 'Sin leer',
              value: unreadCount.toString(),
              icon: Bell,
              color: unreadCount > 0 ? 'text-[var(--gold)]' : 'text-zinc-400',
              bgColor: unreadCount > 0 ? 'bg-[var(--gold)]/10' : 'bg-zinc-800',
              borderColor: unreadCount > 0 ? 'border-[var(--gold)]/30' : 'border-zinc-700'
            },
            {
              label: 'Leídas',
              value: readCount.toString(),
              icon: CheckCircle,
              color: 'text-zinc-400',
              bgColor: 'bg-zinc-800',
              borderColor: 'border-zinc-700'
            },
            {
              label: 'Total',
              value: totalCount.toString(),
              icon: Clock,
              color: 'text-zinc-400',
              bgColor: 'bg-zinc-800',
              borderColor: 'border-zinc-700'
            }
          ]}
        />
        
        <Link href="/mi-cuenta/configuracion-notificaciones">
          <Button
            variant="outline"
            className="flex items-center gap-2 border-[var(--pink)] text-[var(--pink)] hover:bg-[var(--pink)]/10 hover:border-[var(--pink)] hover:text-[var(--pink)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pink)]/40"
          >
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
        </Link>
      </div>

      {/* Información sobre notificaciones */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Info className="h-6 w-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-3">
              Sobre las notificaciones
            </h3>
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded-full bg-[var(--gold)]/20 text-[var(--gold)]">
                  <MessageSquare className="h-3 w-3" />
                </div>
                <div>
                  <strong className="block text-zinc-200 mb-0.5">Respuestas y Comentarios</strong>
                  <p>Recibe alertas instantáneas cuando alguien responda a tus reseñas o preguntas en los cursos.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded-full bg-[var(--gold)]/20 text-[var(--gold)]">
                  <Heart className="h-3 w-3" />
                </div>
                <div>
                  <strong className="block text-zinc-200 mb-0.5">Interacciones y Likes</strong>
                  <p>Entérate cuando otros usuarios valoren tus aportes y reseñas con un "Me gusta".</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded-full bg-[var(--gold)]/20 text-[var(--gold)]">
                  <AtSign className="h-3 w-3" />
                </div>
                <div>
                  <strong className="block text-zinc-200 mb-0.5">Menciones Directas</strong>
                  <p>Te avisaremos cuando seas mencionado explícitamente en una conversación o debate.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 flex items-center gap-2">
                <span className="text-lg">💡</span>
                <strong className="text-zinc-300">Tip:</strong> Haz clic en cualquier notificación para ir directamente al contenido relacionado.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de notificaciones */}
      <NotificationsList />
    </div>
  );
}
