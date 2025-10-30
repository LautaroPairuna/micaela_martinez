'use client';

import { useCallback, useEffect } from 'react';
import { useCrudUpdates, type CrudUpdateEvent } from '@/contexts/CrudUpdatesContext';

/**
 * Hook personalizado para suscribirse a actualizaciones CRUD de una tabla específica
 * @param tableName - Nombre de la tabla a monitorear
 * @param onUpdate - Callback que se ejecuta cuando hay actualizaciones
 * @param options - Opciones de configuración
 */
export function useTableUpdates(
  tableName: string,
  onUpdate: (event: CrudUpdateEvent) => void,
  options: {
    // Filtrar por tipo de operación
    operations?: ('create' | 'update' | 'delete')[];
    // Debounce en milisegundos para evitar actualizaciones excesivas
    debounce?: number;
    // Habilitar logging para debugging
    debug?: boolean;
  } = {}
) {
  const { subscribe, isConnected } = useCrudUpdates();
  const { operations, debounce = 0, debug = false } = options;

  const handleUpdate = useCallback(
    (event: CrudUpdateEvent) => {
      // Filtrar por operaciones si se especifica
      if (operations && !operations.includes(event.type)) {
        return;
      }

      if (debug) {
        console.log(`[useTableUpdates] ${tableName}:`, event);
      }

      // Aplicar debounce si se especifica
      if (debounce > 0) {
        const timeoutId = setTimeout(() => {
          onUpdate(event);
        }, debounce);

        // Cleanup del timeout anterior si existe
        return () => clearTimeout(timeoutId);
      } else {
        onUpdate(event);
      }
    },
    [tableName, onUpdate, operations, debounce, debug]
  );

  // Usar useEffect para manejar la suscripción correctamente
  useEffect(() => {
    // ✅ Suscribirse siempre, independientemente del estado de conexión
    // El contexto manejará internamente si hay conexión o no
    const unsubscribe = subscribe(tableName, handleUpdate);
    
    return () => {
      unsubscribe();
    };
  }, [subscribe, tableName, handleUpdate])

  return {
    isConnected,
  };
}

/**
 * Hook para suscribirse a todas las actualizaciones CRUD del sistema
 * @param onUpdate - Callback que se ejecuta cuando hay actualizaciones
 * @param options - Opciones de configuración
 */
export function useAllTableUpdates(
  onUpdate: (event: CrudUpdateEvent) => void,
  options: {
    // Filtrar por tablas específicas
    tables?: string[];
    // Filtrar por tipo de operación
    operations?: ('create' | 'update' | 'delete')[];
    // Debounce en milisegundos
    debounce?: number;
    // Habilitar logging
    debug?: boolean;
  } = {}
) {
  const { subscribeAll, isConnected } = useCrudUpdates();
  const { tables, operations, debounce = 0, debug = false } = options;

  const handleUpdate = useCallback(
    (event: CrudUpdateEvent) => {
      // Filtrar por tablas si se especifica
      if (tables && !tables.includes(event.tableName)) {
        return;
      }

      // Filtrar por operaciones si se especifica
      if (operations && !operations.includes(event.type)) {
        return;
      }

      if (debug) {
        console.log(`[useAllTableUpdates]`, event);
      }

      // Aplicar debounce si se especifica
      if (debounce > 0) {
        const timeoutId = setTimeout(() => {
          onUpdate(event);
        }, debounce);

        return () => clearTimeout(timeoutId);
      } else {
        onUpdate(event);
      }
    },
    [tables, operations, debounce, debug, onUpdate]
  );

  // Usar useEffect para manejar la suscripción correctamente
  useEffect(() => {
    // ✅ Suscribirse siempre, independientemente del estado de conexión
    // El contexto manejará internamente si hay conexión o no
    const unsubscribe = subscribeAll(handleUpdate);
    return unsubscribe;
  }, [subscribeAll, handleUpdate]);

  return {
    isConnected,
  };
}

/**
 * Hook para obtener el estado de conexión WebSocket
 */
export function useWebSocketStatus() {
  const { isConnected } = useCrudUpdates();
  return { isConnected };
}