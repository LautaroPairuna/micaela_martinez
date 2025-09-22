'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import useSWRImmutable from 'swr/immutable'

const fetcher = (u: string) =>
  fetch(u).then(async r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

/** Normaliza la respuesta del endpoint a un array plano. */
function toList(data: any): any[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.rows)) return data.rows
  if (Array.isArray(data?.data)) return data.data
  return []
}

/** Carga catálogos (FKs) tolerando APIs que devuelven array o {rows,total}. */
export function useCatalog(resource: string) {
  const { data, error, isLoading } = useSWRImmutable<any>(
    resource ? `/api/admin/tables/${resource}/records?page=1&pageSize=1000` : null,
    fetcher,
    { revalidateOnFocus: false }
  )
  return {
    options: toList(data),
    error,
    isLoading,
  }
}
