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
      return `${baseMessage} • ${withSuffix}`;
    default:
      return `${baseMessage} • Mantente al día con las últimas actualizaciones.`;
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
    
    // Navegar a la URL si existe
    if (notification.url) {
      router.push(notification.url);
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

  if (loading && notifications.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-zinc-800 bg-zinc-950/50", className)}>
        <div className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("rounded-2xl border border-red-900/30 bg-red-950/10", className)}>
        <div className="p-6">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={() => setFilter(currentFilter)} variant="outline" className="border-red-800 text-red-400 hover:bg-red-950/30">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-zinc-800 bg-zinc-950/50", className)}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20">
                {unreadCount} sin leer
              </span>
            )}
          </div>
          
          <Tabs value={currentFilter} onValueChange={handleFilterChange}>
            <TabsList className="bg-zinc-900 border border-zinc-800">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400"
              >
                Todas
              </TabsTrigger>
              <TabsTrigger 
                value="unread"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-[var(--gold)] text-zinc-400"
              >
                Sin leer
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center justify-between mb-6">
          {selectedNotifications.size > 0 ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                {selectedNotifications.size === notifications.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteSelected}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/30"
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
                  className="text-[var(--gold)] hover:text-[var(--gold)] hover:bg-[var(--gold)]/10 border border-transparent hover:border-[var(--gold)]/30"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Marcar todas como leídas
                </Button>
              )}
            </div>
          )}
        </div>

        {!Array.isArray(notifications) || notifications.length === 0 ? (
          <div className="p-12 text-center border-t border-zinc-800/50 mt-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Bell className="h-8 w-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">
              No tienes notificaciones
            </h3>
            <p className="text-zinc-500 max-w-sm mx-auto">
              Cuando recibas notificaciones de respuestas, likes o menciones, aparecerán aquí.
            </p>
          </div>
        ) : (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
          >
            <AnimatePresence mode="popLayout">
              {Array.isArray(notifications) && notifications.map((notification) => (
                <motion.div key={notification.id} variants={item} layout>
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
            {pagination.page < pagination.totalPages && (
              <div className="flex justify-center mt-6">
                <Button onClick={loadMore} disabled={loading} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Cargar más
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}