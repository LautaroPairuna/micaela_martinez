'use client'

import { useState, useMemo } from 'react'
import { adminApi } from '@/lib/sdk/adminApi'
import useSWR from 'swr'

/* ========= Tipos ========= */

// Registro jerárquico genérico, con index signature segura
export interface HierarchicalRecord {
  id: string
  parentId?: string | null
  parent_id?: string | null
  hijos?: HierarchicalRecord[]
  children?: HierarchicalRecord[]
  // Campos adicionales arbitrarios
  [key: string]: unknown
}

type ParentIdKey = 'parentId' | 'parent_id'
type ChildrenKey = 'hijos' | 'children'

interface ApiListResponse<T> {
  data: T[]
}

export interface UseHierarchicalSelectOptions {
  tableName: string
  enabled?: boolean
  revalidateOnFocus?: boolean
  dedupingInterval?: number
}

export interface UseHierarchicalSelectResult {
  data: HierarchicalRecord[]
  hierarchicalData: HierarchicalRecord[]
  isLoading: boolean
  error: unknown
  expandedItems: Set<string>
  setExpandedItems: (items: Set<string>) => void
  toggleExpanded: (itemId: string) => void
  expandAll: () => void
  collapseAll: () => void
  findRecord: (id: string) => HierarchicalRecord | null
  getPath: (id: string) => string[]
  getDisplayPath: (id: string, displayFields?: string[]) => string
  getChildren: (parentId: string) => HierarchicalRecord[]
  getParent: (childId: string) => HierarchicalRecord | null
  isParent: (id: string) => boolean
  isChild: (id: string) => boolean
  getLevel: (id: string) => number
  refresh: () => void
}

/* ========= Hook ========= */

/**
 * Hook para manejar datos jerárquicos (padre-hijo) con utilidades de navegación y render.
 */
export function useHierarchicalSelect({
  tableName,
  enabled = true,
  revalidateOnFocus = false,
  dedupingInterval = 30000
}: UseHierarchicalSelectOptions): UseHierarchicalSelectResult {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Carga de datos
  const { data: response, error, isLoading, mutate } = useSWR<ApiListResponse<HierarchicalRecord>>(
    enabled ? `admin-hierarchical-${tableName}` : null,
    () => adminApi.getTableData(tableName, { page: 1, limit: 1000 }),
    { revalidateOnFocus, dedupingInterval }
  )

  // Memo estable para records (evita que cambie la referencia en cada render)
  const records = useMemo<HierarchicalRecord[]>(
    () => (Array.isArray(response?.data) ? response!.data : []),
    [response]
  )

  // Detectar campo de parentId dinámicamente
  const getParentIdField = (record: HierarchicalRecord): ParentIdKey | null => {
    if (Object.prototype.hasOwnProperty.call(record, 'parentId')) return 'parentId'
    if (Object.prototype.hasOwnProperty.call(record, 'parent_id')) return 'parent_id'
    return null
  }

  // Detectar campo de hijos dinámicamente
  const getChildrenField = (record: HierarchicalRecord): ChildrenKey => {
    if (Object.prototype.hasOwnProperty.call(record, 'hijos')) return 'hijos'
    if (Object.prototype.hasOwnProperty.call(record, 'children')) return 'children'
    return 'hijos' // default
  }

  // Construir estructura jerárquica
  const hierarchicalData = useMemo<HierarchicalRecord[]>(() => {
    if (records.length === 0) return []

    const parentIdField = getParentIdField(records[0])
    if (!parentIdField) return records

    const parents = records.filter((r) => !r[parentIdField])
    const children = records.filter((r) => !!r[parentIdField])

    const buildHierarchy = (parentId: string): HierarchicalRecord[] => {
      return children
        .filter((child) => (child[parentIdField] as string | null) === parentId)
        .map((child) => {
          const key = getChildrenField(child)
          return {
            ...child,
            [key]: buildHierarchy(child.id)
          }
        })
    }

    return parents.map((parent) => {
      const key = getChildrenField(parent)
      return {
        ...parent,
        [key]: buildHierarchy(parent.id)
      }
    })
  }, [records])

  /* ========= Utilidades ========= */

  const toggleExpanded = (itemId: string) => {
    const next = new Set(expandedItems)
    if (next.has(itemId)) {
      next.delete(itemId)
    } else {
      next.add(itemId)
    }
    setExpandedItems(next)
  }

  const expandAll = () => {
    const all = new Set<string>()
    const collect = (items: HierarchicalRecord[]) => {
      items.forEach((item) => {
        all.add(item.id)
        const key = getChildrenField(item)
        const kids = (item[key] as HierarchicalRecord[]) ?? []
        if (kids.length) collect(kids)
      })
    }
    collect(hierarchicalData)
    setExpandedItems(all)
  }

  const collapseAll = () => setExpandedItems(new Set())

  const findRecord = (id: string): HierarchicalRecord | null => {
    const dfs = (items: HierarchicalRecord[]): HierarchicalRecord | null => {
      for (const it of items) {
        if (it.id === id) return it
        const key = getChildrenField(it)
        const kids = (it[key] as HierarchicalRecord[]) ?? []
        const found = dfs(kids)
        if (found) return found
      }
      return null
    }
    return dfs(hierarchicalData)
  }

  const getPath = (id: string): string[] => {
    const dfs = (items: HierarchicalRecord[], path: string[] = []): string[] | null => {
      for (const it of items) {
        const nextPath = [...path, it.id]
        if (it.id === id) return nextPath
        const key = getChildrenField(it)
        const kids = (it[key] as HierarchicalRecord[]) ?? []
        const found = dfs(kids, nextPath)
        if (found) return found
      }
      return null
    }
    return dfs(hierarchicalData) ?? []
  }

  const getDisplayPath = (id: string, displayFields: string[] = ['nombre', 'titulo', 'id']): string => {
    const pathIds = getPath(id)
    const displayNames = pathIds.map((pid) => {
      const rec = findRecord(pid)
      if (!rec) return pid
      for (const f of displayFields) {
        const v = rec[f]
        if (typeof v === 'string' && v.trim()) return v.trim()
      }
      return rec.id ?? 'Sin nombre'
    })
    return displayNames.join(' > ')
  }

  const getChildren = (parentId: string): HierarchicalRecord[] => {
    const parent = findRecord(parentId)
    if (!parent) return []
    const key = getChildrenField(parent)
    return (parent[key] as HierarchicalRecord[]) ?? []
  }

  const getParent = (childId: string): HierarchicalRecord | null => {
    // Búsqueda O(n). Si necesitás O(1), construí un índice por id→parentId.
    const child = records.find((r) => r.id === childId)
    if (!child) return null
    const parentKey = getParentIdField(child)
    if (!parentKey) return null
    const pId = child[parentKey]
    if (!pId || typeof pId !== 'string') return null
    return records.find((r) => r.id === pId) ?? null
  }

  const isParent = (id: string): boolean => getChildren(id).length > 0
  const isChild = (id: string): boolean => getParent(id) !== null
  const getLevel = (id: string): number => Math.max(0, getPath(id).length - 1)

  const refresh = () => {
    void mutate()
  }

  return {
    data: records,
    hierarchicalData,
    isLoading,
    error,
    expandedItems,
    setExpandedItems,
    toggleExpanded,
    expandAll,
    collapseAll,
    findRecord,
    getPath,
    getDisplayPath,
    getChildren,
    getParent,
    isParent,
    isChild,
    getLevel,
    refresh
  }
}

export default useHierarchicalSelect
