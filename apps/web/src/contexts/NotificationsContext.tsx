'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initializeSocket, type Socket } from '@/lib/socket';

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
  metadata?: Record<string, unknown>;
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
  live: boolean; // conexión websocket activa
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
  | { type: 'UPDATE_UNREAD_COUNT'; payload: number }
  | { type: 'PUSH_NOTIFICATION'; payload: Notification }
  | { type: 'UPDATE_LIVE_STATUS'; payload: boolean };

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  filter: 'all',
  live: false,
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
    case 'PUSH_NOTIFICATION': {
      const notif = action.payload;
      const notifications = [notif, ...state.notifications];
      const total = state.pagination.total + 1;
      const totalPages = Math.max(1, Math.ceil(total / state.pagination.limit));
      return {
        ...state,
        notifications,
        pagination: { ...state.pagination, total, totalPages },
        unreadCount: notif.leida ? state.unreadCount : state.unreadCount + 1,
      };
    }
    case 'UPDATE_LIVE_STATUS':
      return { ...state, live: action.payload };
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
  pushNotification: (payload: Partial<Notification>) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// Provider
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationsReducer, initialState);
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

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

  // Conexión a WebSocket para notificaciones en vivo
  useEffect(() => {
    // Conectar solo si hay usuario
    if (!user?.id) return;

    try {
      const socket = initializeSocket(String(user.id));
      socketRef.current = socket;

      const onConnect = () => dispatch({ type: 'UPDATE_LIVE_STATUS', payload: true });
      const onDisconnect = () => dispatch({ type: 'UPDATE_LIVE_STATUS', payload: false });
      const onNewNotification = (payload: {
        id?: string | number;
        mensaje?: string;
        leida?: boolean;
        tipo?: string;
        fecha?: string;
        usuarioId?: string;
        creadoEn?: string;
        url?: string;
        titulo?: string;
        metadata?: Record<string, unknown>;
      }) => {
        // Normalizar payload al tipo Notification que espera el contexto
        const normalized: Notification = {
          id: String(payload.id ?? crypto.randomUUID()),
          mensaje: String(payload.mensaje ?? ''),
          leida: Boolean(payload.leida ?? false),
          tipo: String(payload.tipo ?? 'SISTEMA'),
          fecha: String(payload.creadoEn ?? payload.fecha ?? new Date().toISOString()),
          usuarioId: String(payload.usuarioId ?? user.id),
          creadoEn: String(payload.creadoEn ?? new Date().toISOString()),
          url: payload.url ?? undefined,
          titulo: payload.titulo ?? undefined,
          metadata: payload.metadata ?? undefined,
        };
        dispatch({ type: 'PUSH_NOTIFICATION', payload: normalized });
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('nueva-notificacion', onNewNotification);

      // Refrescar la lista inicial tras conectar para sincronizar
      fetchNotifications(1, false);

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('nueva-notificacion', onNewNotification);
        socket.disconnect();
        socketRef.current = null;
        dispatch({ type: 'UPDATE_LIVE_STATUS', payload: false });
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
      dispatch({ type: 'UPDATE_LIVE_STATUS', payload: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const contextValue: NotificationsContextType = {
    state,
    fetchNotifications,
    fetchUnreadCount,
    setFilter,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    pushNotification: (payload: Partial<Notification>) => {
      const normalized: Notification = {
        id: String(payload.id ?? crypto.randomUUID()),
        mensaje: String(payload.mensaje ?? ''),
        leida: Boolean(payload.leida ?? false),
        tipo: String(payload.tipo ?? 'SISTEMA'),
        fecha: String(payload.fecha ?? new Date().toISOString()),
        usuarioId: String(payload.usuarioId ?? user?.id ?? 'admin'),
        creadoEn: String(payload.creadoEn ?? new Date().toISOString()),
        url: payload.url,
        titulo: payload.titulo,
        metadata: payload.metadata,
      }
      dispatch({ type: 'PUSH_NOTIFICATION', payload: normalized })
    },
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