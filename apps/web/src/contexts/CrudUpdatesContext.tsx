'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initializeSocket, type Socket } from '@/lib/socket';

// Tipos para eventos CRUD
export interface CrudUpdateEvent {
  type: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: string | number;
  data?: any;
  timestamp: string;
}

// Tipo para callbacks de actualización
export type CrudUpdateCallback = (event: CrudUpdateEvent) => void;

interface CrudUpdatesContextType {
  isConnected: boolean;
  subscribe: (tableName: string, callback: CrudUpdateCallback) => () => void;
  subscribeAll: (callback: CrudUpdateCallback) => () => void;
}

const CrudUpdatesContext = createContext<CrudUpdatesContextType | undefined>(undefined);

export function CrudUpdatesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  
  // Map para almacenar callbacks por tabla
  const tableCallbacksRef = useRef<Map<string, Set<CrudUpdateCallback>>>(new Map());
  // Set para callbacks globales
  const globalCallbacksRef = useRef<Set<CrudUpdateCallback>>(new Set());

  // Función para suscribirse a actualizaciones de una tabla específica
  const subscribe = useCallback((tableName: string, callback: CrudUpdateCallback) => {
    if (!tableCallbacksRef.current.has(tableName)) {
      tableCallbacksRef.current.set(tableName, new Set());
    }
    tableCallbacksRef.current.get(tableName)!.add(callback);

    // Retornar función de cleanup
    return () => {
      const callbacks = tableCallbacksRef.current.get(tableName);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          tableCallbacksRef.current.delete(tableName);
        }
      }
    };
  }, []);

  // Función para suscribirse a todas las actualizaciones CRUD
  const subscribeAll = useCallback((callback: CrudUpdateCallback) => {
    globalCallbacksRef.current.add(callback);

    // Retornar función de cleanup
    return () => {
      globalCallbacksRef.current.delete(callback);
    };
  }, []);

  // Manejar eventos CRUD recibidos
  const handleCrudUpdate = useCallback((payload: any) => {
    try {
      // Procesar el evento
      const event: CrudUpdateEvent = {
        type: payload.action,
        tableName: payload.resource,
        recordId: payload.id || payload.data?.id,
        data: payload.data,
        timestamp: payload.timestamp,
      };

      // Notificar a los callbacks específicos de la tabla
      const tableCallbacks = tableCallbacksRef.current.get(event.tableName);
      if (tableCallbacks && tableCallbacks.size > 0) {
        tableCallbacks.forEach((callback) => {
          try {
            callback(event);
          } catch (error) {
            console.error('Error en callback de tabla:', error);
          }
        });
      }

      // Notificar a los callbacks globales
      if (globalCallbacksRef.current.size > 0) {
        globalCallbacksRef.current.forEach((callback) => {
          try {
            callback(event);
          } catch (error) {
            console.error('Error en callback global:', error);
          }
        });
      }

      console.log(`[CRUD Update] ${event.type.toUpperCase()} en ${event.tableName} (ID: ${event.recordId})`);
    } catch (error) {
      console.error('Error procesando evento CRUD:', error);
    }
  }, []);

  // Conexión a WebSocket
  useEffect(() => {
    if (!user?.id) {
      console.log('[CrudUpdatesContext] No hay userId, no se conectará WebSocket');
      return;
    }

    console.log('[CrudUpdatesContext] Iniciando conexión WebSocket para userId:', user.id);
    
    try {
      const socket = initializeSocket(String(user.id));
      socketRef.current = socket;

      const onConnect = () => {
        console.log(`[CrudUpdatesContext] ✅ WebSocket conectado exitosamente para usuario ${user.id}`);
        setIsConnected(true);
      };

      const onDisconnect = (reason: string) => {
        console.log(`[CrudUpdatesContext] ❌ WebSocket desconectado. Razón: ${reason}`);
        setIsConnected(false);
      };

      const onConnectError = (error: any) => {
        console.error(`[CrudUpdatesContext] ❌ Error de conexión WebSocket:`, error);
        setIsConnected(false);
      };

      const onCrudUpdate = (data: CrudUpdateEvent) => {
        console.log('[CrudUpdatesContext] 📡 Evento CRUD recibido:', data);
        handleCrudUpdate(data);
      };

      // Escuchar eventos CRUD
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('connect_error', onConnectError);
      socket.on('crud-update', onCrudUpdate);

      return () => {
        console.log('[CrudUpdatesContext] 🧹 Limpiando conexión WebSocket');
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('connect_error', onConnectError);
        socket.off('crud-update', onCrudUpdate);
        socket.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      };
    } catch (error) {
      console.error('[CrudUpdatesContext] Error al crear conexión WebSocket:', error);
      setIsConnected(false);
    }
  }, [user?.id, handleCrudUpdate]);

  const contextValue: CrudUpdatesContextType = {
    isConnected,
    subscribe,
    subscribeAll,
  };

  return (
    <CrudUpdatesContext.Provider value={contextValue}>
      {children}
    </CrudUpdatesContext.Provider>
  );
}

// Hook para usar el contexto
export function useCrudUpdates() {
  const context = useContext(CrudUpdatesContext);
  if (context === undefined) {
    throw new Error('useCrudUpdates must be used within a CrudUpdatesProvider');
  }
  return context;
}

// Hook específico para suscribirse a actualizaciones de una tabla
export function useTableUpdates(tableName: string, callback: CrudUpdateCallback) {
  const { subscribe } = useCrudUpdates();

  useEffect(() => {
    if (!tableName || !callback) return;
    
    const unsubscribe = subscribe(tableName, callback);
    return unsubscribe;
  }, [tableName, callback, subscribe]);
}