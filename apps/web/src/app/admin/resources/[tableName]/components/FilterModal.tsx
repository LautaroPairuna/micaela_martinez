'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react'
import {
  Settings, X, DollarSign, Package,
  Tag, Folder, CheckCircle, Filter
} from 'lucide-react'
import { FkSelect } from './FkSelect'

export type Filters = Record<string, string | number | boolean | undefined | null>

type Props = {
  resource: string
  filters: Filters
  setFilters: (f: Filters) => void
  isOpen: boolean
  onClose: () => void
}

/* Utils */
const isVoid = (v: any) => v === '' || v == null
const compact = (obj: Filters) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => !isVoid(v)))

/* Etiquetas legibles */
const label = (k: string) =>
  ({
    marca_id: 'Marca',
    rubro_id: 'Rubro', 
    moneda_id: 'Moneda',
    precioMin: 'Precio ≥',
    precioMax: 'Precio ≤',
    stockMin: 'Stock ≥',
    stockMax: 'Stock ≤',
    activo: 'Activo',
    destacado: 'Destacado',
  } as Record<string, string>)[k] ?? k

/** Toggle 3-estados: Todos / Sí / No */
function TriToggle({
  value, onChange, ariaLabel,
}: { value: boolean | undefined; onChange: (v: boolean | undefined) => void; ariaLabel: string }) {
  const current = value === undefined ? 'all' : value ? 'yes' : 'no'
  const btn = (key: 'all'|'yes'|'no', text: string) => {
    const active = current === key
    return (
      <button
        type="button"
        onClick={() => onChange(key === 'all' ? undefined : key === 'yes')}
        className={[
          'px-4 py-2 text-sm rounded-xl transition-all duration-200 font-medium',
          active
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
            : 'text-blue-700 hover:bg-blue-50 border border-blue-200 hover:border-blue-300'
        ].join(' ')}
      >
        {text}
      </button>
    )
  }
  return (
    <div role="group" aria-label={ariaLabel}
         className="inline-grid grid-cols-3 gap-1 p-1 rounded-2xl bg-gray-100/50 border border-gray-200">
      {btn('all', 'Todos')}
      {btn('yes', 'Sí')}
      {btn('no',  'No')}
    </div>
  )
}

/* Chip para filtros activos */
function FilterChip({
  k, v, onRemove,
}: { k: string; v: any; onRemove: (key: string) => void }) {
  const text = typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm
                     bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800
                     ring-1 ring-inset ring-blue-200 font-medium shadow-sm">
      <span className="text-blue-600 font-semibold">{label(k)}:</span> {text}
      <button
        type="button"
        onClick={() => onRemove(k)}
        className="ml-1 hover:text-blue-900 transition-colors duration-200 hover:bg-blue-200/50 rounded-full p-0.5"
        aria-label={`Quitar filtro ${label(k)}`}
        title="Quitar filtro"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

/* ───────────────────────── COMPONENTE MODAL ───────────────────────── */
export function FilterModal({ resource, filters, setFilters, isOpen, onClose }: Props) {
  const [draft, setDraft] = useState<Filters>(filters)
  
  useEffect(() => {
    if (isOpen) {
      setDraft(filters)
    }
  }, [filters, isOpen])

  const activeEntries = React.useMemo(() => Object.entries(compact(filters)), [filters])
  const activeCount = activeEntries.length

  const onApply = () => {
    setFilters(compact(draft))
    onClose()
  }
  
  const onClear = () => {
    setDraft({})
    setFilters({})
  }
  
  const onRemoveChip = (key: string) => {
    const next = { ...filters }
    delete next[key]
    setFilters(next)
  }
  
  const set = (k: string, v: any) => setDraft(d => ({ ...d, [k]: v }))

  const isProductos = resource === 'Productos'

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 left-80 bg-black/80 backdrop-blur-md z-[9998] transition-all duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 left-80 z-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200/50 animate-in fade-in-0 zoom-in-95 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl">
                <Filter className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Filtros Avanzados</h2>
                <p className="text-sm text-gray-600">Personaliza la búsqueda de {resource}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
              aria-label="Cerrar modal"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Filtros activos */}
          {activeCount > 0 && (
            <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Filtros activos ({activeCount})
                </span>
                <button
                  onClick={onClear}
                  className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors duration-200 hover:bg-red-50 px-3 py-1 rounded-lg"
                >
                  Limpiar todos
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeEntries.map(([k, v]) => (
                  <FilterChip key={k} k={k} v={v} onRemove={onRemoveChip} />
                ))}
              </div>
            </div>
          )}

          {/* Contenido del modal */}
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="space-y-6">
              {/* Filtros específicos para Productos */}
              {isProductos && (
                <>
                  {/* Marca y Rubro */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Tag className="h-4 w-4 text-blue-500" />
                        Marca
                      </label>
                      <FkSelect
                        col="marca_id"
                        value={draft.marca_id as string}
                        onChange={v => set('marca_id', v)}
                        fixed={false}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Folder className="h-4 w-4 text-blue-500" />
                        Rubro
                      </label>
                      <FkSelect
                        col="rubro_id"
                        value={draft.rubro_id as string}
                        onChange={v => set('rubro_id', v)}
                        fixed={false}
                      />
                    </div>
                  </div>

                  {/* Rangos de precio */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Rango de precio
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="Precio mínimo"
                        value={String(draft.precioMin ?? '')}
                        onChange={e => set('precioMin', e.target.value ? +e.target.value : undefined)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 font-medium"
                      />
                      <input
                        type="number"
                        placeholder="Precio máximo"
                        value={String(draft.precioMax ?? '')}
                        onChange={e => set('precioMax', e.target.value ? +e.target.value : undefined)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Rangos de stock */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Package className="h-4 w-4 text-purple-500" />
                      Rango de stock
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="Stock mínimo"
                        value={String(draft.stockMin ?? '')}
                        onChange={e => set('stockMin', e.target.value ? +e.target.value : undefined)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <input
                        type="number"
                        placeholder="Stock máximo"
                        value={String(draft.stockMax ?? '')}
                        onChange={e => set('stockMax', e.target.value ? +e.target.value : undefined)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Estados booleanos */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Estado activo
                      </label>
                      <TriToggle
                        value={draft.activo as boolean | undefined}
                        onChange={v => set('activo', v)}
                        ariaLabel="Filtrar por estado activo"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <CheckCircle className="h-4 w-4 text-yellow-500" />
                        Producto destacado
                      </label>
                      <TriToggle
                        value={draft.destacado as boolean | undefined}
                        onChange={v => set('destacado', v)}
                        ariaLabel="Filtrar por producto destacado"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Mensaje para otras tablas */}
              {!isProductos && (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Los filtros específicos para {resource} estarán disponibles próximamente.</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200/50 bg-gradient-to-r from-gray-50 to-gray-100/50">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-all duration-200 hover:bg-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500/20"
            >
              Cancelar
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClear}
                className="px-5 py-2.5 text-red-600 hover:text-red-700 font-medium transition-all duration-200 hover:bg-red-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                Limpiar filtros
              </button>
              <button
                onClick={onApply}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/25 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default FilterModal