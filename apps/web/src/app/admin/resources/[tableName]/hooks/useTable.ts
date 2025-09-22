'use client'
import React from 'react'

export function useTable<T extends Record<string, unknown>>(
  data: T[],
  opts?: { initialSort?: [keyof T & string, 'asc' | 'desc'] },
) {
  const [search, setSearch] = React.useState('')
  const [sortBy, setSortBy] = React.useState<string>(opts?.initialSort?.[0] ?? '')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>(opts?.initialSort?.[1] ?? 'asc')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  const filtered = React.useMemo(() => {
    if (!search) return data
    const term = search.toLowerCase()
    return data.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(term)))
  }, [data, search])

  const sorted = React.useMemo(() => {
    if (!sortBy) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortBy] as unknown as string
      const bv = b[sortBy] as unknown as string
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageData   = sorted.slice((page - 1) * pageSize, page * pageSize)

  const toggleSort = (col: string) => {
    setPage(1)
    if (sortBy === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(col); setSortDir('asc') }
  }

  return { search, setSearch, sortBy, sortDir, toggleSort, page, setPage, totalPages, pageSize, setPageSize, pageData }
}
