'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

interface CategoryWithCount {
  id: string
  nombre: string
  parentId: string | null
  childrenCount: number
  imagenUrl?: string
}

interface UseCategoryChildCountsResult {
  categories: CategoryWithCount[]
  loading: boolean
  error: Error | null
  mutate: () => void
}

/**
 * Hook para obtener categorías con sus contadores de hijos
 */
export function useCategoryChildCounts(): UseCategoryChildCountsResult {
  const { data, error, isLoading, mutate } = useSWR<CategoryWithCount[], Error>(
    '/api/catalog/categorias/con-conteos',
    async (url: string): Promise<CategoryWithCount[]> => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Error al cargar categorías con conteos')
      }
      const json = (await response.json()) as CategoryWithCount[] | unknown
      return Array.isArray(json) ? (json as CategoryWithCount[]) : []
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 segundos
    }
  )

  return {
    categories: data ?? [],
    loading: isLoading,
    error: error ?? null,
    mutate
  }
}

/**
 * Hook para obtener el conteo de hijos de una categoría específica
 * @param categoryId - ID de la categoría padre
 */
export function useSingleCategoryChildCount(categoryId: string | null): {
  count: number
  loading: boolean
  error: Error | null
  mutate: () => void
} {
  const { data, error, isLoading, mutate } = useSWR<number, Error>(
    categoryId ? `/api/catalog/categorias/${categoryId}/hijos/conteo` : null,
    async (url: string): Promise<number> => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Error al cargar conteo de hijos')
      }
      const result = (await response.json()) as { count?: number } | unknown
      if (result && typeof result === 'object' && 'count' in result) {
        const c = (result as { count?: number }).count
        return typeof c === 'number' ? c : 0
      }
      return 0
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
    }
  )

  return {
    count: data ?? 0,
    loading: isLoading,
    error: error ?? null,
    mutate
  }
}

/**
 * Hook para obtener conteos múltiples de categorías
 * @param categoryIds - Array de IDs de categorías
 */
export function useMultipleCategoryChildCounts(categoryIds: string[]): {
  counts: Record<string, number>
  loading: boolean
  error: Error | null
} {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!categoryIds.length) {
      setCounts({})
      return
    }

    const fetchCounts = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/catalog/categorias/conteos-multiples', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ categoryIds })
        })

        if (!response.ok) {
          throw new Error('Error al cargar conteos múltiples')
        }

        const data = (await response.json()) as Record<string, number> | unknown
        setCounts((typeof data === 'object' && data !== null) ? (data as Record<string, number>) : {})
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error desconocido'))
        console.error('Error fetching multiple category child counts:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCounts()
  }, [categoryIds])

  return {
    counts,
    loading,
    error
  }
}

export default useCategoryChildCounts
