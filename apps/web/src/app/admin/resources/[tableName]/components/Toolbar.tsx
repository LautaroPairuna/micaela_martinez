'use client'
import React, { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, Trash2, Settings, Search, X, Filter,
} from 'lucide-react'
import DynamicFilterModal, { type Filters } from './DynamicFilterModal'

type Props = {
  readOnly: boolean
  selectedCount: number
  onNew: () => void
  onDeleteSelected: () => void
  onBulkEdit: () => void
  search: string
  setSearch: (v: string) => void
  pageSize: number
  setPageSize: (n: number) => void
  // Nuevas props para filtros
  resource: string
  filters: Filters
  setFilters: (f: Filters) => void
}

export const Toolbar = memo(function Toolbar({
  readOnly,
  selectedCount,
  onNew,
  onDeleteSelected,
  onBulkEdit,
  search,
  setSearch,
  pageSize,
  setPageSize,
  resource,
  filters,
  setFilters,
}: Props) {
  /* estado local para debounce del buscador */
  const [q, setQ] = useState(search)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  useEffect(() => setQ(search), [search])
  useEffect(() => {
    const id = setTimeout(() => setSearch(q), 250)
    return () => clearTimeout(id)
  }, [q, setSearch])

  /* persistir page size */
  useEffect(() => {
    const saved = localStorage.getItem('admin.pageSize')
    if (saved && !Number.isNaN(+saved)) setPageSize(+saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    localStorage.setItem('admin.pageSize', String(pageSize))
  }, [pageSize])

  /* atajos de teclado */
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
      if (!isTyping && e.key === '/') { e.preventDefault(); inputRef.current?.focus(); }
      if (!isTyping && e.key.toLowerCase() === 'n') onNew()
      if (!isTyping && e.key.toLowerCase() === 'b' && selectedCount > 0) onBulkEdit()
      if (!isTyping && (e.key === 'Delete' || e.key === 'Backspace') && selectedCount > 0) onDeleteSelected()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNew, onBulkEdit, onDeleteSelected, selectedCount])

  const disableBulk = useMemo(() => selectedCount === 0, [selectedCount])

  return (
    <div className="
      sticky top-2 z-10
      flex flex-wrap items-center justify-between gap-4 mb-4
      bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-2xl px-6 py-4 shadow-lg shadow-gray-900/5
    ">
      <div className="flex items-center gap-3">
        {!readOnly && (
          <button
            onClick={onNew}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 shadow-lg shadow-green-600/25"
          >
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        )}

        {!readOnly && selectedCount > 0 && (
          <>
            <button
              onClick={onDeleteSelected}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 shadow-lg shadow-red-600/25"
            >
              <Trash2 className="w-4 h-4" /> Eliminar ({selectedCount})
            </button>
            <button
              onClick={onBulkEdit}
              disabled={disableBulk}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-lg shadow-blue-600/25"
            >
              <Settings className="w-4 h-4" /> Editar ({selectedCount})
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search con icono y clear */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar…  ( / )"
            aria-label="Buscar"
            className="pl-10 pr-10 py-3 w-56 sm:w-64 border border-gray-300 rounded-xl
                       bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
          />
          {q && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              aria-label="Limpiar búsqueda"
              onClick={() => { setQ(''); setSearch('') }}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Botón de filtros */}
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className={[
            'flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 relative',
            Object.keys(filters).length > 0
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 focus:ring-blue-500/20'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500/20'
          ].join(' ')}
          title="Abrir filtros avanzados"
        >
          <Filter className="h-4 w-4" />
          <span>Filtros</span>
          {Object.keys(filters).filter(k => filters[k] !== undefined && filters[k] !== null && filters[k] !== '').length > 0 && (
            <span className="bg-white/20 text-xs px-2 py-1 rounded-full font-semibold">
              {Object.keys(filters).filter(k => filters[k] !== undefined && filters[k] !== null && filters[k] !== '').length}
            </span>
          )}
        </button>

        {/* Page size */}
        <select
          value={pageSize}
          onChange={e => setPageSize(+e.target.value)}
          aria-label="Filas por página"
          className="px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 font-medium text-sm"
        >
          {[5, 10, 25, 50].map(n => (
            <option key={n} value={n}>{n} filas</option>
          ))}
        </select>
      </div>
      
      {/* Modal de filtros */}
      <DynamicFilterModal
        resource={resource}
        filters={filters}
        setFilters={setFilters}
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
      />
    </div>
  )
})
