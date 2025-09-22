import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, MessageCircle, Heart, AtSign, Trash2, Check, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';

interface NotificationsListProps {
  className?: string;
}

const getNotificationIcon = (tipo: Notification['tipo']) => {
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

const getNotificationColor = (tipo: Notification['tipo']) => {
  switch (tipo) {
    case 'RESPUESTA_RESENA':
      return 'text-blue-600';
    case 'LIKE_RESENA':
      return 'text-red-600';
    case 'MENCION':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
};

const getEnhancedMessage = (notification: Notification) => {
  const baseMessage = notification.mensaje;
  const timeAgo = formatDistanceToNow(new Date(notification.creadoEn), {
    addSuffix: false,
    locale: es,
  });

  switch (notification.tipo) {
    case 'RESPUESTA_RESENA':
      return `${baseMessage} • Haz clic para ver la conversación completa y responder.`;
    case 'LIKE_RESENA':
      return `${baseMessage} • Tu contenido está generando interés en la comunidad.`;
    case 'MENCION':
      return `${baseMessage} • Alguien quiere tu atención en esta conversación.`;
    default:
      return `${baseMessage} • Mantente al día con las últimas actualizaciones.`;
  }
};

interface NotificationItemProps {
  notification: Notification;
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
    
    // Navegar a la URL si existe
    if (notification.url) {
      router.push(notification.url);
    }
  };

  return (
    <div
      className={cn(
        'group relative p-4 border rounded-lg transition-all duration-200 hover:shadow-lg cursor-pointer',
        notification.leida 
          ? 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--subtle)]' 
          : 'bg-gradient-to-r from-[var(--gold)]/5 to-[var(--gold)]/10 border-[var(--gold)]/20 shadow-sm hover:shadow-[var(--gold)]/20',
        isSelected && 'ring-2 ring-[var(--gold)] bg-[var(--gold)]/5'
      )}
      onClick={handleClick}
    >
      {/* Indicador de no leída */}
      {!notification.leida && (
        <div className="absolute top-3 right-3 w-3 h-3 bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] rounded-full shadow-lg ring-2 ring-[var(--gold)]/30 animate-pulse" />
      )}
      
      <div className="flex items-start gap-3">
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
            className="w-4 h-4 text-[var(--gold)] bg-[var(--card)] border-[var(--border)] rounded focus:ring-[var(--gold)] focus:ring-2"
          />
        </div>
        {/* Icono */}
        <div className={cn(
          'flex-shrink-0 p-3 rounded-xl shadow-sm',
          notification.leida 
            ? 'bg-[var(--subtle)] border border-[var(--border)]' 
            : 'bg-gradient-to-br from-[var(--gold)]/10 to-[var(--gold)]/20 border border-[var(--gold)]/30'
        )}>
          <div className={cn(
            notification.leida ? 'text-[var(--muted)]' : 'text-[var(--gold)]'
          )}>
            {getNotificationIcon(notification.tipo)}
          </div>
        </div>
        
        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={cn(
                'text-sm font-medium leading-5',
                notification.leida ? 'text-[var(--fg)]' : 'text-[var(--fg)] font-semibold'
              )}>
                {notification.titulo}
              </h4>
              <p className="text-sm text-[var(--muted)] mt-1 leading-5">
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
                  className="h-7 w-7 p-0 hover:bg-[var(--gold)]/10 text-[var(--gold)] hover:text-[var(--gold-dark)] rounded-md"
                  title="Marcar como leída"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                className="h-7 w-7 p-0 hover:bg-red-500/20 text-red-500 hover:text-red-600 border border-red-400 hover:border-red-500 rounded-md transition-all"
                title="Eliminar notificación"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Timestamp */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-[var(--muted)]">
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

  if (loading && notifications.length === 0) {
    return (
      <Card className={className}>
        <CardBody className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardBody className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => setFilter(currentFilter)} variant="outline">
              Reintentar
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardBody>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-[var(--fg)]">Notificaciones</h3>
            {unreadCount > 0 && (
              <Pill tone="warning" className="px-2 py-1 text-xs font-medium">
                {unreadCount} sin leer
              </Pill>
            )}
          </div>
          
          <Tabs value={currentFilter} onValueChange={handleFilterChange}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="unread">Sin leer</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center justify-between mb-4">
          {selectedNotifications.size > 0 ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--subtle)]"
              >
                {selectedNotifications.size === notifications.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteSelected}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border border-red-200 hover:border-red-300"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar ({selectedNotifications.size})
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-[var(--gold)] hover:text-[var(--gold-dark)] hover:bg-[var(--gold)]/10"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Marcar todas como leídas
                </Button>
              )}
            </div>
          )}
        </div>

        {!Array.isArray(notifications) || notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
              <Bell className="h-8 w-8 text-[var(--gold)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--fg)] mb-2">
              No tienes notificaciones
            </h3>
            <p className="text-[var(--muted)]">
              Cuando recibas notificaciones de respuestas, likes o menciones, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {Array.isArray(notifications) && notifications.map((notification) => (
              <NotificationItem
                 key={notification.id}
                 notification={notification}
                 onMarkAsRead={markAsRead}
                 onDelete={deleteNotification}
                 isSelected={selectedNotifications.has(notification.id)}
                 onToggleSelect={handleToggleSelect}
               />
            ))}
            {pagination.page < pagination.totalPages && (
              <div className="flex justify-center mt-4">
                <Button onClick={loadMore} disabled={loading} variant="outline">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Cargar más
                </Button>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}