// src/hooks/useNotifications.ts
import { useNotificationsContext } from '@/contexts/NotificationsContext';

// Re-exportamos los tipos para mantener compatibilidad
export type { Notification } from '@/contexts/NotificationsContext';

export interface NotificationsData {
  notifications: any[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseNotificationsReturn extends NotificationsData {
  setFilter: (filter: 'all' | 'unread') => void;
  loadMore: () => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

/**
 * Hook optimizado para usar notificaciones sin causar bucles infinitos.
 * Ahora usa el contexto global para evitar múltiples peticiones simultáneas.
 */
export function useNotifications(): UseNotificationsReturn {
  const {
    state,
    setFilter,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationsContext();

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
    setFilter,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

/**
 * Hook específico para obtener solo el contador de notificaciones no leídas.
 * Optimizado para componentes que solo necesitan mostrar el badge.
 */
export function useUnreadCount() {
  const { state } = useNotificationsContext();
  
  return {
    unreadCount: state.unreadCount,
    loading: state.loading,
  };
}
