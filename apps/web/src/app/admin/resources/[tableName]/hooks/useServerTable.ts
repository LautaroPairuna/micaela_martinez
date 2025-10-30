// src/app/admin/resources/[tableName]/hooks/useServerTable.ts
'use client'
import useSWR from 'swr'
import { useTableUpdates } from '@/hooks/useTableUpdates'
import { useCallback } from 'react'

export type Primitive = string | number | boolean
export type FilterValue = Primitive | Primitive[]
export type Filters = Record<string, FilterValue>

export interface ServerTableParams {
  page: number
  pageSize: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  search?: string
  qFields?: string[]
  filters?: Record<string, unknown>
}

export interface ServerTableResult<T> {
  rows: T[]
  total: number
  validating: boolean
  refresh: () => void
}

const fetcher = async <T,>(u: string, options?: { method?: string; body?: string }): Promise<T> => {
  const fetchOptions: RequestInit = {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    ...(options?.body ? { body: options.body } : {}),
  }
  
  const r = await fetch(u, fetchOptions)
  if (!r.ok) throw new Error(`HTTP ${r.status} al cargar ${u}`)
  return (await r.json()) as T
}

// stringify estable: misma key si el contenido no cambió (aunque cambie orden de claves)
function stableStringify(obj: unknown): string {
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`
  if (obj && typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b))
    return `{${entries.map(([k,v]) => JSON.stringify(k)+':'+stableStringify(v)).join(',')}}`
  }
  return JSON.stringify(obj)
}

export function useServerTable<T extends Record<string, unknown>>(
  resource: string,
  { page, pageSize, sortBy, sortDir, search, qFields, filters = {} }: ServerTableParams
): ServerTableResult<T> {
  const hasFilters = Object.keys(filters).length > 0
  
  // Parámetros base para la URL (sin filtros)
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(sortBy ? { sortBy } : {}),
    ...(sortDir ? { sortDir } : {}),
    ...(search ? { q: search } : {}),
    ...(qFields && qFields.length ? { qFields: qFields.join(',') } : {}),
  })

  // Construir la URL base sin filtros
  const baseUrl = resource
    ? `/api/admin/tables/${encodeURIComponent(resource)}/records?${qs.toString()}`
    : null

  // Crear una clave única que incluya los filtros para SWR
  const key = baseUrl ? `${baseUrl}#${hasFilters ? stableStringify(filters) : ''}` : null

  // Función fetcher personalizada que maneja POST con filtros
  const customFetcher = async (swrKey: string) => {
    if (!baseUrl) throw new Error('No resource specified')
    
    if (hasFilters) {
      // Usar POST /search cuando hay filtros, enviándolos en el body
      const searchUrl = `/api/admin/tables/${encodeURIComponent(resource)}/search`
      return fetcher<{ data: T[]; meta: { total: number } }>(
        searchUrl,
        {
          method: 'POST',
          body: JSON.stringify({
            page,
            pageSize,
            sortBy,
            sortDir,
            search,
            qFields,
            filters
          })
        }
      )
    } else {
      // Usar GET cuando no hay filtros
      return fetcher<{ data: T[]; meta: { total: number } }>(baseUrl)
    }
  }

  const { data, isValidating, mutate } = useSWR<{ data: T[]; meta: { total: number } }>(
    key,
    customFetcher,
    { 
      keepPreviousData: true, 
      revalidateOnFocus: false, // ❌ Desactivar revalidación en focus para evitar consultas innecesarias
      revalidateOnReconnect: true, // ✅ Mantener revalidación en reconexión
      refreshInterval: 0, // ❌ Sin polling automático - usamos WebSocket para actualizaciones
      dedupingInterval: 30000, // ✅ Aumentar deduplicación a 30s para evitar consultas duplicadas
      focusThrottleInterval: 60000, // ✅ Aumentar throttle a 1 minuto
      errorRetryCount: 2, // ✅ Limitar reintentos en caso de error
      errorRetryInterval: 5000, // ✅ Esperar 5s entre reintentos
      shouldRetryOnError: (error) => {
        // ✅ No reintentar en errores 4xx (problemas de permisos/datos)
        if (error?.status >= 400 && error?.status < 500) return false;
        return true;
      }
    }
  )

  // Integrar actualizaciones CRUD en tiempo real
  const refreshData = useCallback(() => {
    console.log(`[useServerTable] Refrescando datos para tabla: ${resource}`);
    void mutate()
  }, [mutate, resource])

  // Suscribirse a actualizaciones de la tabla específica con debug habilitado
  useTableUpdates(resource, refreshData, { debug: true })

  return {
    rows: data?.data ?? [],
    total: data?.meta?.total ?? 0,
    validating: isValidating,
    refresh: refreshData,
  }
}
