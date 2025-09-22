'use client'

// Solo devuelve la lista de tablas hijas para un parent dado.
// Sin SWR, sin fetch, sin counts → cero errores de hooks/ESLint.
import { relationMap } from '../config'

/** Vista indexable del relationMap sin perder readonly */
type RelationMapIndexable = Record<string, readonly string[]>
const REL_MAP = relationMap as unknown as RelationMapIndexable

export function useRelations(parent: string): { childTable: string }[] {
  const children: readonly string[] = REL_MAP[parent] ?? []
  return children.map(child => ({ childTable: child }))
}
