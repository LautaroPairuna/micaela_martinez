// src/app/(cuenta)/mi-cuenta/notificaciones/page.tsx
'use client';
import { Bell, Info, MessageSquare, Package, UserCheck, BarChart, Lightbulb } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationsAccountPage() {
  const { notifications } = useNotifications();
  const { user } = useAuth();
  // Adaptar verificación de rol al formato que use useAuth (roles array o rol string)
  const isAdmin = user && 'rol' in user 
    ? (user as any).rol === 'ADMIN' 
    : user?.roles?.includes('ADMIN');

  const unreadCount = notifications.filter(n => !n.leida).length;
  const totalCount = notifications.length;
  const readCount = totalCount - unreadCount;

  return (
    <div className="space-y-8">
      {/* Header (se mantiene igual) */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1">
          <PageHeader
            icon={Bell}
            iconBg="bg-transparent border border-[var(--pink)]/40"
            iconColor="text-[var(--pink)]"
            title="Mis Notificaciones"
            description={isAdmin ? "Panel de actividad y alertas del sistema" : "Mantente al día con todas tus actualizaciones"}
            stats={[]} 
          />
        </div>
        
        {/* Stats compactas a la derecha o abajo */}
        <div className="flex gap-3">
             <div className="px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800 flex flex-col items-center">
                <span className={`text-lg font-bold ${unreadCount > 0 ? 'text-[var(--gold)]' : 'text-zinc-500'}`}>{unreadCount}</span>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Sin leer</span>
             </div>
             <div className="px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800 flex flex-col items-center">
                <span className="text-lg font-bold text-zinc-300">{totalCount}</span>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Total</span>
             </div>
        </div>
      </div>

      {/* Información sobre notificaciones (Diferenciada por rol) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6 relative overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <Bell className="w-32 h-32 text-[var(--pink)]" />
        </div>
        
        <div className="flex items-start gap-5 relative z-10">
          <div className="p-3 rounded-xl bg-[var(--pink)]/10 border border-[var(--pink)]/20 shadow-[0_0_15px_-5px_var(--pink)]">
            <Info className="h-6 w-6 text-[var(--pink)]" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {isAdmin ? 'Centro de Control' : 'Tu actividad al día'}
              </h3>
              <p className="text-sm text-zinc-400">
                {isAdmin 
                  ? 'Aquí recibirás alertas críticas sobre el estado de la plataforma y actividades de usuarios.' 
                  : 'Aquí verás actualizaciones sobre tus cursos, compras y respuestas de la comunidad.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-400">
              {isAdmin ? (
                // Contenido para ADMIN
                <>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="mt-0.5 text-[var(--gold)]">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="block text-zinc-200 mb-0.5">Pedidos y Ventas</strong>
                      <p className="text-xs">Alertas de nuevas órdenes, cambios de estado y pagos recibidos.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="mt-0.5 text-[var(--gold)]">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="block text-zinc-200 mb-0.5">Usuarios</strong>
                      <p className="text-xs">Registros de nuevos alumnos y actualizaciones de perfiles.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="mt-0.5 text-[var(--gold)]">
                      <BarChart className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="block text-zinc-200 mb-0.5">Sistema</strong>
                      <p className="text-xs">Reportes de stock crítico y cambios en catálogo.</p>
                    </div>
                  </div>
                </>
              ) : (
                // Contenido para USUARIO
                <>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="mt-0.5 text-[var(--gold)]">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="block text-zinc-200 mb-0.5">Respuestas</strong>
                      <p className="text-xs">Avisos cuando instructores o alumnos respondan tus dudas.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="mt-0.5 text-[var(--gold)]">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="block text-zinc-200 mb-0.5">Compras</strong>
                      <p className="text-xs">Estado de tus pedidos y confirmaciones de pago.</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-800/50 flex items-center gap-2 text-xs text-zinc-500">
              <Lightbulb className="h-4 w-4 text-[var(--gold)]" />
              <p><strong className="text-zinc-400">Tip:</strong> Haz clic en una notificación para ver los detalles completos.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de notificaciones */}
      <NotificationsList />
    </div>
  );
}
