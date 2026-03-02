import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, MessageCircle, Heart, AtSign, Trash2, Check, CheckCheck, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationsListProps {
  className?: string;
}

const getNotificationIcon = (tipo: AppNotification['tipo']) => {
  switch (tipo) {
    case 'RESPUESTA_RESENA':
      return <MessageCircle className="h-4 w-4" />;
    case 'LIKE_RESENA':
      return <Heart className="h-4 w-4" />;
    case 'MENCION':
      return <AtSign className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};


const getEnhancedMessage = (notification: AppNotification) => {
  const baseMessage = notification.mensaje;
  
  // Mejora Retroactiva: Si es mensaje genérico viejo y tiene metadata, intentar mejorarlo
  if (notification.metadata && baseMessage.includes(':')) {
    const meta = notification.metadata;
    const resourceType = meta.resourceType as string;
    const action = meta.action as string;
    const resourceId = meta.resourceId as string;
    
    // Detectar si es el mensaje genérico viejo "Orden actualizado: 22" o "Nuevo Orden creado: 22"
    // Patrón viejo: [Actor] [verbo] [Recurso] #[ID] o similar
    // Si el mensaje actual NO parece enriquecido (ej: no tiene "Total:" o "cambió a estado:")
    const isGeneric = !baseMessage.includes('Total:') && !baseMessage.includes('cambió a') && !baseMessage.includes('actualizado:');

    if (isGeneric && resourceType && resourceId) {
      if (resourceType === 'Orden') {
        if (action === 'created') return `Orden #${resourceId} creada`;
        if (action === 'updated') return `Orden #${resourceId} actualizada`;
      }
      if (resourceType === 'Producto') {
        return `Producto actualizado: ${meta.resourceName || resourceId}`;
      }
    }
  }

  const withSuffix = formatDistanceToNow(new Date(notification.creadoEn), {
    addSuffix: true,
    locale: es,
  });

  switch (notification.tipo) {
    case 'RESPUESTA_RESENA':
      return `${baseMessage} • Haz clic para ver la conversación completa y responder.`;
    case 'LIKE_RESENA':
      return `${baseMessage} • Tu contenido está generando interés en la comunidad.`;
    case 'MENCION':
      return `${baseMessage} • Alguien quiere tu atención en esta conversación.`;
    case 'SISTEMA':
      // Notificaciones administrativas: mostrar tiempo explícitamente en el mensaje
      return `${baseMessage}`;
    default:
      return `${baseMessage}`;
  }
};

interface NotificationItemProps {
  notification: AppNotification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete, isSelected, onToggleSelect }: NotificationItemProps) {
  const router = useRouter();
  
  const handleClick = () => {
    if (!notification.leida) {
      onMarkAsRead(notification.id);
    }
    
    // Navegar a la URL si existe (con corrección retroactiva de rutas viejas)
    if (notification.url) {
      let finalUrl = notification.url;
      const meta = notification.metadata as any;

      // Corregir rutas viejas de Productos
      if (finalUrl.includes('/productos/')) {
        const slug = meta?.productSlug || meta?.productoId;
        if (slug) finalUrl = `/tienda/producto/${slug}`;
      }

      // Corregir rutas viejas de Cursos
      if (finalUrl.includes('/cursos/') && !finalUrl.includes('/detalle/') && !finalUrl.includes('/player/')) {
        // Asumimos que es /cursos/ID y lo pasamos a /cursos/detalle/ID (o slug si hay)
        const slug = meta?.courseSlug || meta?.cursoId || finalUrl.split('/').pop();
        if (slug) finalUrl = `/cursos/detalle/${slug}`;
      }

      // Corregir rutas viejas de Pedidos (Usuario)
      if (finalUrl.includes('/mi-cuenta/pedidos/') && !finalUrl.includes('?id=')) {
        const orderId = finalUrl.split('/').pop();
        if (orderId && !isNaN(Number(orderId))) {
           finalUrl = `/mi-cuenta/pedidos?id=${orderId}`;
        }
      }

      router.push(finalUrl);
    }
  };

  return (
    <div
      className={cn(
        'group relative p-4 border rounded-xl transition-all duration-300 hover:shadow-lg cursor-pointer',
        notification.leida 
          ? 'bg-transparent border-zinc-800 hover:bg-zinc-900/50' 
          : 'bg-[var(--gold)]/5 border-[var(--gold)]/30 shadow-[0_0_15px_-5px_rgba(212,175,55,0.1)]',
        isSelected && 'ring-1 ring-[var(--gold)] bg-[var(--gold)]/10'
      )}
      onClick={handleClick}
    >
      {/* Indicador de no leída */}
      {!notification.leida && (
        <div className="absolute top-3 right-3 w-2 h-2 bg-[var(--gold)] rounded-full shadow-[0_0_10px_var(--gold)] animate-pulse" />
      )}
      
      <div className="flex items-start gap-4">
        {/* Checkbox para selección múltiple */}
        <div className="flex items-center pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(notification.id);
            }}
            className="w-4 h-4 text-[var(--gold)] bg-zinc-900 border-zinc-700 rounded focus:ring-[var(--gold)] focus:ring-offset-0"
          />
        </div>
        {/* Icono */}
        <div className={cn(
          'flex-shrink-0 p-3 rounded-xl transition-colors duration-300',
          notification.leida 
            ? 'bg-zinc-900/50 border border-zinc-800 text-zinc-500' 
            : 'bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-[var(--gold)]'
        )}>
          {getNotificationIcon(notification.tipo)}
        </div>
        
        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={cn(
                'text-sm font-medium leading-5 mb-1',
                notification.leida ? 'text-zinc-300' : 'text-white font-semibold'
              )}>
                {notification.titulo}
              </h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {getEnhancedMessage(notification)}
              </p>
            </div>
            
            {/* Acciones */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.leida && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="h-8 w-8 p-0 hover:bg-[var(--gold)]/10 text-[var(--gold)] border border-transparent hover:border-[var(--gold)]/30 rounded-lg"
                  title="Marcar como leída"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                className="h-8 w-8 p-0 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 border border-transparent hover:border-red-500/30 rounded-lg transition-all"
                title="Eliminar notificación"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Timestamp */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(notification.creadoEn), {
                addSuffix: true,
                locale: es,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationsList({ className }: NotificationsListProps) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    setFilter,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [currentFilter, setCurrentFilter] = useState<'all' | 'unread'>('all');

  const handleToggleSelect = (id: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
    }
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedNotifications) {
      await deleteNotification(id);
    }
    setSelectedNotifications(new Set());
  };

  const handleFilterChange = (value: string) => {
    const newFilter = value as 'all' | 'unread';
    setCurrentFilter(newFilter);
    setFilter(newFilter);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-12 rounded-2xl border border-zinc-800 bg-zinc-950/50", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("rounded-2xl border border-red-900/30 bg-red-950/10 p-6 text-center", className)}>
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="border-red-800 text-red-400 hover:bg-red-950/30">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header de Filtros y Acciones en masa */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-1">
        
        {/* Tabs de Filtro (Diseño Moderno) */}
        <div className="flex p-1 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-xl">
          <button
            onClick={() => handleFilterChange('all')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300",
              currentFilter === 'all'
                ? "bg-zinc-800 text-white shadow-lg shadow-black/20"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            )}
          >
            Todas
          </button>
          <button
            onClick={() => handleFilterChange('unread')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative",
              currentFilter === 'unread'
                ? "bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 shadow-[0_0_15px_-5px_var(--gold)]"
                : "text-zinc-500 hover:text-[var(--gold)] hover:bg-[var(--gold)]/5"
            )}
          >
            Sin leer
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--gold)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--gold)]"></span>
              </span>
            )}
          </button>
        </div>

        {/* Acciones en Masa */}
        <div className="flex items-center gap-3">
          {selectedNotifications.size > 0 ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
               <span className="text-xs text-zinc-500 font-medium mr-2">
                 {selectedNotifications.size} seleccionada{selectedNotifications.size !== 1 && 's'}
               </span>
               <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteSelected()}
                className="h-9 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
               <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNotifications(new Set())}
                className="h-9 px-3 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 rounded-lg"
              >
                Cancelar
              </Button>
            </div>
          ) : (
             unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-9 px-4 text-[var(--gold)] hover:text-[var(--gold)] hover:bg-[var(--gold)]/10 border border-[var(--gold)]/20 hover:border-[var(--gold)]/40 rounded-lg transition-all duration-300"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Marcar todas como leídas
              </Button>
            )
          )}
        </div>
      </div>

      {/* Lista de Notificaciones */}
      <div className="space-y-3">
        {!Array.isArray(notifications) || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/30">
            <div className="w-20 h-20 mb-6 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center">
              <Bell className="h-8 w-8 text-zinc-700" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">
              Estás al día
            </h3>
            <p className="text-zinc-500 max-w-sm">
              No tienes notificaciones pendientes. Te avisaremos cuando haya novedades importantes.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notifications
              .filter(n => currentFilter === 'all' || !n.leida)
              .map((notification) => (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <NotificationItem
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  isSelected={selectedNotifications.has(notification.id)}
                  onToggleSelect={handleToggleSelect}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}