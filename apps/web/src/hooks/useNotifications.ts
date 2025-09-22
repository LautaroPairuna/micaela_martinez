// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback, useReducer } from 'react';

// Definimos nuestro propio tipo Notification en lugar de importarlo de @prisma/client
export interface Notification {
  id: string;
  mensaje: string;
  leida: boolean;
  tipo: string;
  fecha: string;
  usuarioId: string;
  creadoEn: string;
  url?: string;
  titulo?: string;
}

// Simulamos useSession para el frontend
const useSession = () => {
  return {
    me: { id: '1', nombre: 'Usuario' },
  };
};

// Función auxiliar para llamadas a la API
const apiProxy = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const baseUrl = '/api';
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Error en la petición: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
};

// --- Tipos de respuesta esperados del backend ---
interface NotificationsMeta {
  page: number;
  limit: number;
  total: number;
  lastPage: number;
}

interface NotificationsListResponse {
  data: Notification[];
  meta: NotificationsMeta;
}

interface UnreadCountResponse {
  count: number;
}

export interface NotificationsData {
  notifications: Notification[];
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

type State = NotificationsData;

type Action =
  | { type: 'FETCH_START' }
  | {
      type: 'FETCH_SUCCESS';
      payload: {
        notifications: Notification[];
        pagination: State['pagination'];
        unreadCount: number;
      };
    }
  | {
      type: 'FETCH_MORE_SUCCESS';
      payload: { notifications: Notification[]; pagination: State['pagination'] };
    }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SET_FILTER'; payload: 'all' | 'unread' }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'DELETE_NOTIFICATION'; payload: string };

const initialState: State = {
  notifications: [],
  unreadCount: 0,
  loading: true,
  error: null,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        notifications: action.payload.notifications,
        pagination: action.payload.pagination,
        unreadCount: action.payload.unreadCount,
      };
    case 'FETCH_MORE_SUCCESS':
      return {
        ...state,
        loading: false,
        notifications: [...state.notifications, ...action.payload.notifications],
        pagination: action.payload.pagination,
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'MARK_AS_READ': {
      const notif = state.notifications.find((n) => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, leida: true } : n
        ),
        unreadCount:
          notif && !notif.leida
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
      };
    }
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, leida: true })),
        unreadCount: 0,
      };
    case 'DELETE_NOTIFICATION': {
      const notif = state.notifications.find((n) => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload
        ),
        unreadCount:
          notif && !notif.leida
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
      };
    }
    default:
      return state;
  }
}

export function useNotifications(limit = 20): UseNotificationsReturn {
  const { me: user } = useSession();
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    pagination: { ...initialState.pagination, limit },
  });
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(
    async (page = 1, loadMore = false) => {
      if (!user) return;

      dispatch({ type: 'FETCH_START' });

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          onlyUnread: String(filter === 'unread'),
        });

        const [notificationsData, unreadData] = await Promise.all([
          apiProxy<NotificationsListResponse>(
            `/notifications?${params.toString()}`
          ),
          apiProxy<UnreadCountResponse>('/notifications/unread-count'),
        ]);

        const pagination = {
          page: notificationsData.meta.page,
          limit: notificationsData.meta.limit,
          total: notificationsData.meta.total,
          totalPages: notificationsData.meta.lastPage,
        };

        if (loadMore) {
          dispatch({
            type: 'FETCH_MORE_SUCCESS',
            payload: {
              notifications: notificationsData.data,
              pagination,
            },
          });
        } else {
          dispatch({
            type: 'FETCH_SUCCESS',
            payload: {
              notifications: notificationsData.data,
              pagination,
              unreadCount: unreadData.count,
            },
          });
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Error desconocido';
        dispatch({ type: 'FETCH_ERROR', payload: errorMsg });
        console.error('Error fetching notifications:', err);
      }
    },
    [user, limit, filter]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;
      try {
        await apiProxy(`/notifications/${notificationId}/read`, {
          method: 'PUT',
        });
        dispatch({ type: 'MARK_AS_READ', payload: notificationId });
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    },
    [user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await apiProxy('/notifications/read-all', { method: 'PUT' });
      dispatch({ type: 'MARK_ALL_AS_READ' });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [user]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!user) return;
      try {
        await apiProxy(`/notifications/${notificationId}`, { method: 'DELETE' });
        dispatch({ type: 'DELETE_NOTIFICATION', payload: notificationId });
      } catch (err) {
        console.error('Error deleting notification:', err);
      }
    },
    [user]
  );

  const loadMore = () => {
    if (state.pagination.page < state.pagination.totalPages) {
      fetchNotifications(state.pagination.page + 1, true);
    }
  };

  return {
    ...state,
    setFilter,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
