'use client'

import React, { useState, useEffect } from 'react'
import { Settings, X, Filter } from 'lucide-react'
import { FkSelect } from './FkSelect'
import { HierarchicalCategorySelect } from './HierarchicalCategorySelect'
import { GenericHierarchicalSelect } from '@/components/admin/GenericHierarchicalSelect'
import { getTableFilters, hasTableFilters, type FilterField } from '../config/filterConfig'
import { fkConfig, relationLabels } from '../config'
import { createPortal } from 'react-dom'

export type Filters = Record<string, string | number | boolean | undefined | null>
type FilterValue = Filters[string]

type Props = {
  resource: string
  filters: Filters
  setFilters: (f: Filters) => void
  isOpen: boolean
  onClose: () => void
  child?: {
    childTable: string
    foreignKey: string
    parentId: string | number
  } | null
}

/* Utils */
const isVoid = (v: unknown): boolean => v === '' || v == null
const compact = (obj: Filters): Filters =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => !isVoid(v))) as Filters

/* Componente TriToggle para valores booleanos */
function TriToggle({
  value, onChange, ariaLabel,
}: { value: boolean | undefined; onChange: (v: boolean | undefined) => void; ariaLabel: string }) {
  const states = [
    { value: undefined as boolean | undefined, label: 'Todos', bg: 'bg-gray-100', text: 'text-gray-600' },
    { value: true, label: 'Sí', bg: 'bg-green-100', text: 'text-green-700' },
    { value: false, label: 'No', bg: 'bg-red-100', text: 'text-red-700' },
  ]
  const currentIndex = states.findIndex(s => s.value === value)
  const current = states[currentIndex] || states[0]

  return (
    <button
      type="button"
      onClick={() => {
        const nextIndex = (currentIndex + 1) % states.length
        onChange(states[nextIndex].value)
      }}
      className={`px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border-2 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
        current.bg
      } ${current.text} border-transparent hover:border-gray-300`}
      aria-label={ariaLabel}
    >
      {current.label}
    </button>
  )
}

/* Componente FilterChip para mostrar filtros activos */
function FilterChip({
  field, value, onRemove, child,
}: { field: FilterField; value: FilterValue; onRemove: (key: string) => void; child?: Props['child'] }) {
  const displayValue = (): string => {
    if (field.type === 'boolean') {
      return value === true ? 'Sí' : value === false ? 'No' : 'Todos'
    }
    if (field.type === 'select' && field.options) {
      const option = field.options.find(opt => String(opt.value) === String(value))
      return option?.label ?? String(value ?? '')
    }
    return String(value ?? '')
  }

  const getFieldLabel = (): string => {
    // Si es un filtro de tabla hija, mostrar información más descriptiva
    if (child && field.key === child.foreignKey) {
      const childLabel = relationLabels[child.childTable as keyof typeof relationLabels] ?? child.childTable
      const parentLabel = relationLabels[child.childTable.replace(/s$/, '') as keyof typeof relationLabels] ?? 'Elemento'
      return `${childLabel} de ${parentLabel} #${child.parentId}`
    }

    // Si hay configuración FK para este campo, usar su etiqueta
    const fkEntry = fkConfig[field.key as keyof typeof fkConfig]
    if (fkEntry?.fieldLabel) {
      return fkEntry.fieldLabel
    }

    return field.label
  }

  return (
    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-sm font-medium">
      {field.icon && <field.icon className="h-3 w-3" />}
      <span>{getFieldLabel()}: {displayValue()}</span>
      <button
        onClick={() => onRemove(field.key)}
        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
        aria-label={`Remover filtro ${getFieldLabel()}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

/* Componente principal */
export function DynamicFilterModal({ resource, filters, setFilters, isOpen, onClose, child }: Props) {
  const [draft, setDraft] = useState<Filters>(filters)
  const filterFields = getTableFilters(resource)
  const hasFilters = hasTableFilters(resource)

  useEffect(() => setDraft(filters), [filters, resource])

  const activeEntries = React.useMemo(() => {
    return filterFields
      .map(field => ({ field, value: filters[field.key] }))
      .filter(({ value }) => !isVoid(value))
  }, [filters, filterFields])

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

  const set = (k: string, v: FilterValue) => setDraft(d => ({ ...d, [k]: v }))

  if (!isOpen) return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 left-0 md:left-80 bg-black/80 backdrop-blur-md z-[9998] transition-all duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 left-0 md:left-80 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200/50 animate-in fade-in-0 zoom-in-95 duration-300">
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

          {/* Chips de filtros activos */}
          {activeEntries.length > 0 && (
            <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Filtros activos:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeEntries.map(({ field, value }) => (
                  <FilterChip
                    key={field.key}
                    field={field}
                    value={value as FilterValue}
                    onRemove={onRemoveChip}
                    child={child}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Contenido */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {hasFilters ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      {field.icon && <field.icon className="h-4 w-4 text-blue-500" />}
                      {field.label}
                    </label>

                    {/* Campo de texto */}
                    {field.type === 'text' && (
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={String(draft[field.key] ?? '')}
                        onChange={e => set(field.key, e.target.value || undefined)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 font-medium bg-white text-gray-900"
                      />
                    )}

                    {/* Campo numérico */}
                    {field.type === 'number' && (
                      <input
                        type="number"
                        placeholder={field.placeholder}
                        min={field.min}
                        max={field.max}
                        value={String(draft[field.key] ?? '')}
                        onChange={e => set(field.key, e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 font-medium bg-white text-gray-900"
                      />
                    )}

                    {/* Campo booleano */}
                    {field.type === 'boolean' && (
                      <TriToggle
                        value={draft[field.key] as boolean | undefined}
                        onChange={(v) => set(field.key, v)}
                        ariaLabel={`Filtrar por ${field.label}`}
                      />
                    )}

                    {/* Select con opciones fijas */}
                    {field.type === 'select' && field.options && (
                      <select
                        value={String(draft[field.key] ?? '')}
                        onChange={e => set(field.key, e.target.value || undefined)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 font-medium bg-white text-gray-900"
                      >
                        <option value="">Todos</option>
                        {field.options.map(option => (
                          <option key={String(option.value)} value={String(option.value)}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Select con foreign key */}
                    {field.type === 'select' && field.fkTable && (
                      <FkSelect
                        col={field.key}
                        value={(draft[field.key] as string) ?? ''}
                        onChange={(v) => set(field.key, v)}
                        fixed={false}
                      />
                    )}

                    {/* Selector jerárquico de categorías (legacy) */}
                    {field.type === 'hierarchical_select' && field.fkTable === 'Categoria' && (
                      <HierarchicalCategorySelect
                        value={(draft[field.key] as string) ?? ''}
                        onChange={(v) => set(field.key, v)}
                        placeholder={field.placeholder || 'Seleccionar categoría'}
                        className="w-full"
                      />
                    )}

                    {/* Selector jerárquico genérico */}
                    {field.type === 'hierarchical_select' && field.fkTable && field.fkTable !== 'Categoria' && (
                      <GenericHierarchicalSelect
                        tableName={field.fkTable}
                        value={(draft[field.key] as string) ?? undefined}
                        onChange={(v) => set(field.key, v)}
                        placeholder={field.placeholder || `Seleccionar ${field.fkTable.toLowerCase()}`}
                        className="w-full"
                        allowClear
                        showChildrenCount
                      />
                    )}

                    {/* Campo de fecha */}
                    {field.type === 'date' && (
                      <input
                        type="date"
                        value={String(draft[field.key] ?? '')}
                        onChange={e => set(field.key, e.target.value || undefined)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 font-medium bg-white text-gray-900"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Filtros no configurados</h3>
                <p className="text-gray-500">Los filtros específicos para {resource} estarán disponibles próximamente.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200/50 bg-gradient-to-r from-gray-50 to-gray-100/50">
            <button
              onClick={onClear}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/20 rounded-xl hover:bg-white/50"
            >
              Limpiar todo
            </button>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/20 rounded-xl hover:bg-white/50"
              >
                Cancelar
              </button>
              <button
                onClick={onApply}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:scale-105"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

export default DynamicFilterModal
