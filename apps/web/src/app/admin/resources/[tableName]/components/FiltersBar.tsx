'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import {
  Settings, X, DollarSign, Package,
  Tag, FolderOpen, CheckCircle
} from 'lucide-react'
import { FkSelect } from './FkSelect'

export type Filters = Record<string, string | number | boolean | undefined | null>

type Props = {
  resource: string
  filters: Filters
  setFilters: (f: Filters) => void
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

/* ────────────────────── UI helpers ────────────────────── */
function Chip({
  k, v, onRemove,
}: { k: string; v: any; onRemove: (key: string) => void }) {
  const text = typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs
                     bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-200/50
                     shadow-sm hover:shadow-md transition-all duration-200">
      <span className="font-medium">{label(k)}:</span> {text}
      <button
        type="button"
        onClick={() => onRemove(k)}
        className="ml-1 hover:text-blue-900 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
        aria-label={`Quitar filtro ${label(k)}`}
        title="Quitar filtro"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

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
          'px-3 py-1.5 text-xs rounded-lg transition-all duration-200',
          active
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-blue-700 hover:bg-blue-50 hover:shadow-sm'
        ].join(' ')}
      >
        {text}
      </button>
    )
  }
  return (
    <div role="group" aria-label={ariaLabel}
         className="inline-grid grid-cols-3 gap-1 p-1 rounded-xl border border-blue-200 bg-white shadow-sm">
      {btn('all', 'Todos')}
      {btn('yes', 'Sí')}
      {btn('no',  'No')}
    </div>
  )
}

/* ───────────────────────── COMPONENTE ───────────────────────── */
export function FiltersBar({ resource, filters, setFilters }: Props) {
  const [open, setOpen] = React.useState(true)
  const [draft, setDraft] = React.useState<Filters>(filters)
  React.useEffect(() => setDraft(filters), [filters, resource])

  const activeEntries = React.useMemo(() => Object.entries(compact(filters)), [filters])
  const activeCount   = activeEntries.length

  const onApply = () => setFilters(compact(draft))
  const onClear = () => { setDraft({}); setFilters({}) }
  const onRemoveChip = (key: string) => {
    const next = { ...filters }; delete next[key]; setFilters(next)
  }
  const set = (k: string, v: any) => setDraft(d => ({ ...d, [k]: v }))

  const isProductos = resource === 'Productos'

  return (
    <section className="space-y-3">
      {/* Header + chips */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs
                           bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200/50 shadow-sm">
            <Settings className="h-4 w-4" />
            Filtros
          </span>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
            aria-expanded={open}
          >
            {open ? 'Ocultar' : 'Mostrar'}
          </button>
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
              <CheckCircle className="h-4 w-4" /> {activeCount} activo(s)
            </span>
          )}
        </div>

        {activeCount > 0 && (
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 justify-end">
              {activeEntries.map(([k, v]) => (
                <Chip key={k} k={k} v={v} onRemove={onRemoveChip} />
              ))}
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors"
                title="Limpiar todos los filtros"
              >
                Limpiar todo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Panel (glass card) con transición */}
      <div
        className={[
          'overflow-hidden transition-all duration-300',
          open ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
        ].join(' ')}
        aria-hidden={!open}
      >
        <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg p-6">
          {/* Subheader */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {isProductos ? 'Filtros de Productos' : 'Filtros disponibles'}
            </h3>
            <p className="text-xs text-gray-500">
              Ajustá los criterios y presioná <span className="font-medium text-gray-700">Aplicar</span>.
            </p>
          </div>

          {/* Campos */}
          {isProductos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Marca */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Tag className="h-4 w-4 text-blue-500" /> Marca
                </label>
                <FkSelect
                  col="marca_id"
                  value={String(draft.marca_id ?? '')}
                  fixed={false}
                  onChange={(v: string) => set('marca_id', v || undefined)}
                />
              </div>

              {/* Rubro */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <FolderOpen className="h-4 w-4 text-blue-500" /> Rubro
                </label>
                <FkSelect
                  col="rubro_id"
                  value={String(draft.rubro_id ?? '')}
                  fixed={false}
                  onChange={(v: string) => set('rubro_id', v || undefined)}
                />
              </div>

              {/* Moneda */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-blue-500" /> Moneda
                </label>
                <FkSelect
                  col="moneda_id"
                  value={String(draft.moneda_id ?? '')}
                  fixed={false}
                  onChange={(v: string) => set('moneda_id', v || undefined)}
                />
              </div>

              {/* Activo (tri-toggle) */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700">Activo</label>
                <TriToggle
                  value={draft.activo as boolean | undefined}
                  onChange={(v) => set('activo', v)}
                  ariaLabel="Filtrar por activo"
                />
              </div>

              {/* Destacado (tri-toggle) */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700">Destacado</label>
                <TriToggle
                  value={draft.destacado as boolean | undefined}
                  onChange={(v) => set('destacado', v)}
                  ariaLabel="Filtrar por destacado"
                />
              </div>

              {/* Precio ≥ */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-blue-500" /> Precio ≥
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={String(draft.precioMin ?? '')}
                    onChange={e => set('precioMin', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
                  />
                </div>
              </div>

              {/* Precio ≤ */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-blue-500" /> Precio ≤
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="999999"
                  value={String(draft.precioMax ?? '')}
                  onChange={e => set('precioMax', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
                />
              </div>

              {/* Stock ≥ */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Package className="h-4 w-4 text-blue-500" /> Stock ≥
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={String(draft.stockMin ?? '')}
                  onChange={e => set('stockMin', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
                />
              </div>

              {/* Stock ≤ */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Package className="h-4 w-4 text-blue-500" /> Stock ≤
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="999999"
                  value={String(draft.stockMax ?? '')}
                  onChange={e => set('stockMax', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
                />
              </div>
            </div>
          ) : (
            // Fallback genérico
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700">Activo</label>
                <TriToggle
                  value={draft.activo as boolean | undefined}
                  onChange={(v) => set('activo', v)}
                  ariaLabel="Filtrar por activo"
                />
              </div>
            </div>
          )}

          {/* Pie de acciones */}
          <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {activeCount > 0 ? `${activeCount} filtro(s) activo(s)` : 'Sin filtros activos'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClear}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                title="Limpiar filtros"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={onApply}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                title="Aplicar filtros"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FiltersBar
