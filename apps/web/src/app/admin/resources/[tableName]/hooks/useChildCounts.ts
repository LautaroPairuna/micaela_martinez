'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { adminApi } from '@/lib/sdk/adminApi'
import { getForeignKey } from '../utils/foreignKeys'

/* ───────────────────────── Tipos auxiliares ───────────────────────── */

type Id = string | number

type TableDataResponse = {
  total?: number
  meta?: { total?: number }
}

type BatchCountRequest = {
  parentTable: string
  parentId: Id
  childTable: string
  foreignKey: string
  directChildrenOnly?: boolean
  _directChildrenOnly?: boolean
  _parentSpecific?: boolean
}

type BatchCountResponse = {
  counts: Record<Id, Record<string, number>>
  errors?: Array<{ parentId: Id; childTable: string; message?: string }>
}

interface UseChildCountsResult {
  counts: Record<string, number>
  loading: boolean
  error: unknown
}

/* ───────────────────────── useChildCounts (1 padre) ───────────────────────── */

export function useChildCounts(
  parentTable: string,
  parentId: Id,
  childTables: string[],
  enabled = true
): UseChildCountsResult {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const childTablesKey = useMemo(
    () => childTables.slice().sort().join(','),
    [childTables]
  )

  // Función para obtener conteo de una tabla hija específica
  const fetchChildCount = useCallback(
    async (childTable: string): Promise<number> => {
      try {
        const foreignKey = getForeignKey(childTable, parentTable)
        const response = (await adminApi.getTableData(childTable, {
          page: 1,
          limit: 1,
          filters: JSON.stringify({ [foreignKey]: parentId }),
        })) as TableDataResponse
        return response.meta?.total ?? response.total ?? 0
      } catch (err) {
        console.warn(`Error obteniendo conteo para ${childTable}:`, err)
        return 0
      }
    },
    [parentId, parentTable]
  )

  useEffect(() => {
    if (!enabled || !parentId || childTables.length === 0) {
      setCounts({})
      setLoading(false)
      return
    }

    const fetchAllCounts = async () => {
      setLoading(true)
      setError(null)

      try {
        const countPromises = childTables.map(async (childTable) => {
          const count = await fetchChildCount(childTable)
          return { childTable, count }
        })

        const results = await Promise.allSettled(countPromises)
        const newCounts: Record<string, number> = {}

        results.forEach((result, index) => {
          const childTable = childTables[index]
          if (result.status === 'fulfilled') {
            newCounts[childTable] = result.value.count
          } else {
            newCounts[childTable] = 0
            console.warn(
              `Error obteniendo conteo para ${childTable}:`,
              (result as PromiseRejectedResult).reason
            )
          }
        })

        setCounts(newCounts)
      } catch (err) {
        setError(err)
        console.error('Error obteniendo conteos de hijos:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAllCounts()
  }, [enabled, parentId, parentTable, childTablesKey, childTables.length, fetchChildCount])

  return { counts, loading, error }
}

/* ───────────────────────── useMultipleChildCounts (N padres) ───────────────────────── */

export function useMultipleChildCounts(
  parentTable: string,
  parentIds: Id[],
  childTables: string[],
  enabled = true
) {
  const cacheKey =
    enabled && parentIds.length > 0 && childTables.length > 0
      ? `multi-child-counts-${parentTable}-${parentIds.join(',')}-${childTables
          .slice()
          .sort()
          .join(',')}`
      : null

  const { data, error, isLoading } = useSWR<Record<Id, Record<string, number>>>(
    cacheKey,
    async () => {
      // Preparar requests para el endpoint batch
      const requests: BatchCountRequest[] = parentIds.flatMap((parentId) =>
        childTables.map((childTable) => ({
          parentTable,
          parentId,
          childTable,
          foreignKey: getForeignKey(childTable, parentTable),
          directChildrenOnly: true,
        }))
      )

      try {
        // Forzamos flags para asegurar sólo hijos directos
        const batchRequests: BatchCountRequest[] = requests.map((req) => ({
          ...req,
          directChildrenOnly: true,
          _directChildrenOnly: true,
          _parentSpecific: true,
        }))

        const response = (await adminApi.getBatchCounts(
          batchRequests
        )) as BatchCountResponse

        if (response.errors && response.errors.length > 0) {
          console.warn('Batch counts tuvo algunos errores:', response.errors)
        }

        return response.counts
      } catch (err) {
        console.error(
          'Batch counts falló, haciendo fallback a requests individuales:',
          err
        )

        const result: Record<Id, Record<string, number>> = {}

        parentIds.forEach((parentId) => {
          result[parentId] = {}
          childTables.forEach((childTable) => {
            result[parentId][childTable] = 0
          })
        })

        const countPromises = parentIds.flatMap((parentId) =>
          childTables.map(async (childTable) => {
            try {
              const foreignKey = getForeignKey(childTable, parentTable)
              const filtersObj = {
                [foreignKey]: parentId,
                _directChildrenOnly: true,
                _parentSpecific: true,
              }

              const resp = (await adminApi.getTableData(childTable, {
                page: 1,
                limit: 1,
                filters: JSON.stringify(filtersObj),
              })) as TableDataResponse

              return {
                parentId,
                childTable,
                count: resp.meta?.total ?? resp.total ?? 0,
              }
            } catch (e) {
              console.error(
                `Error obteniendo conteo para ${childTable} (padre ${parentId}):`,
                e
              )
              return { parentId, childTable, count: 0 }
            }
          })
        )

        const results = await Promise.allSettled(countPromises)

        results.forEach((r) => {
          if (r.status === 'fulfilled') {
            const { parentId, childTable, count } = r.value
            if (!result[parentId]) result[parentId] = {}
            result[parentId][childTable] = count
          }
        })

        return result
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 60000,
      dedupingInterval: 15000,
    }
  )

  return {
    counts: data || {},
    loading: isLoading,
    error,
  }
}

/* ───────────────────────── useChildCountsSWR (cache sencillo) ───────────────────────── */

export function useChildCountsSWR(
  parentTable: string,
  parentId: Id,
  childTables: string[],
  enabled = true
) {
  const cacheKey =
    enabled && parentId && childTables.length > 0
      ? `child-counts-${parentTable}-${parentId}-${childTables
          .slice()
          .sort()
          .join(',')}`
      : null

  const { data, error, isLoading } = useSWR<Record<string, number>>(
    cacheKey,
    async () => {
      const countPromises = childTables.map(async (childTable) => {
        try {
          const foreignKey = getForeignKey(childTable, parentTable)
          const response = (await adminApi.getTableData(childTable, {
            page: 1,
            limit: 1,
            filters: JSON.stringify({ [foreignKey]: parentId }),
          })) as TableDataResponse
          return {
            childTable,
            count: response.meta?.total ?? response.total ?? 0,
          }
        } catch (err) {
          console.warn(`Error obteniendo conteo para ${childTable}:`, err)
          return { childTable, count: 0 }
        }
      })

      const results = await Promise.allSettled(countPromises)
      const counts: Record<string, number> = {}

      results.forEach((result, index) => {
        const childTable = childTables[index]
        if (result.status === 'fulfilled') {
          counts[childTable] = result.value.count
        } else {
          counts[childTable] = 0
        }
      })

      return counts
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 30000,
      dedupingInterval: 10000,
    }
  )

  return {
    counts: data || {},
    loading: isLoading,
    error,
  }
}
