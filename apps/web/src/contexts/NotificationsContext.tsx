'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

// Definimos nuestro propio tipo Notification
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

// Función auxiliar para llamadas a la API
const apiProxy = async <T,>(url: string, options?: RequestInit): Promise<T> => {
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

// Tipos de respuesta del backend
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

// Estado del contexto
export interface NotificationsState {
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
  filter: 'all' | 'unread';
}

// Acciones del reducer
type NotificationsAction =
  | { type: 'FETCH_START' }
  | {
      type: 'FETCH_SUCCESS';
      payload: {
        notifications: Notification[];
        pagination: NotificationsState['pagination'];
        unreadCount: number;
      };
    }
  | {
      type: 'FETCH_MORE_SUCCESS';
      payload: { notifications: Notification[]; pagination: NotificationsState['pagination'] };
    }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SET_FILTER'; payload: 'all' | 'unread' }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'DELETE_NOTIFICATION'; payload: string }
  | { type: 'UPDATE_UNREAD_COUNT'; payload: number };

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  filter: 'all',
};

function notificationsReducer(state: NotificationsState, action: NotificationsAction): NotificationsState {
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
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
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
    case 'UPDATE_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };
    default:
      return state;
  }
}

// Contexto
interface NotificationsContextType {
  state: NotificationsState;
  fetchNotifications: (page?: number, loadMore?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  setFilter: (filter: 'all' | 'unread') => void;
  loadMore: () => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// Provider
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationsReducer, initialState);

  const fetchNotifications = useCallback(
    async (page = 1, loadMore = false) => {
      dispatch({ type: 'FETCH_START' });

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(state.pagination.limit),
          onlyUnread: String(state.filter === 'unread'),
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
    [state.pagination.limit, state.filter]
  );

  const fetchUnreadCount = useCallback(async () => {
    try {
      const unreadData = await apiProxy<UnreadCountResponse>('/notifications/unread-count');
      dispatch({ type: 'UPDATE_UNREAD_COUNT', payload: unreadData.count });
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  const setFilter = useCallback((filter: 'all' | 'unread') => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiProxy(`/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      dispatch({ type: 'MARK_AS_READ', payload: notificationId });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiProxy('/notifications/read-all', { method: 'PUT' });
      dispatch({ type: 'MARK_ALL_AS_READ' });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await apiProxy(`/notifications/${notificationId}`, { method: 'DELETE' });
      dispatch({ type: 'DELETE_NOTIFICATION', payload: notificationId });
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (state.pagination.page < state.pagination.totalPages) {
      fetchNotifications(state.pagination.page + 1, true);
    }
  }, [state.pagination.page, state.pagination.totalPages, fetchNotifications]);

  // Solo cargar el contador de no leídas al montar el componente
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const contextValue: NotificationsContextType = {
    state,
    fetchNotifications,
    fetchUnreadCount,
    setFilter,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
}

// Hook para usar el contexto
export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
}