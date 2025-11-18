'use client'
import React from 'react'
import {
  Settings, X, DollarSign, Package,
  Tag, CheckCircle, Folder
} from 'lucide-react'
import { FkSelect } from './FkSelect'
import { fkConfig, relationLabels } from '../config'

export type Filters = Record<string, string | number | boolean | undefined | null>

type Props = {
  resource: string
  filters: Filters
  setFilters: (f: Filters) => void
  child?: {
    childTable: string
    foreignKey: string
    parentId: string | number
  } | null
}

/* Utils */
const isVoid = (v: any) => v === '' || v == null
const compact = (obj: Filters) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => !isVoid(v)))

// Normalizador para lookup en fkConfig
function toCamelFK(key: string): string {
  if (!key) return key
  if (!key.includes('_')) return key
  return key
    .toLowerCase()
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/Id$/, 'Id')
}

/* Etiquetas legibles */
const label = (k: string, child?: Props['child']) => {
  // Si estamos en una tabla hija y el filtro es la clave foránea, mostrar información más descriptiva
  if (child && k === child.foreignKey) {
    const parentCfg = fkConfig[child.foreignKey as keyof typeof fkConfig]
    const parentTableName = parentCfg?.resource || 'Registro';
    const childTableLabel = relationLabels[child.childTable as keyof typeof relationLabels] || child.childTable;
    return `${childTableLabel} de ${parentTableName} #${child.parentId}`;
  }

  // Etiquetas estándar
  const standardLabels = {
    marcaId: 'Marca',
    categoriaId: 'Categoría',
    precioMin: 'Precio ≥',
    precioMax: 'Precio ≤',
    stockMin: 'Stock ≥',
    stockMax: 'Stock ≤',
    activo: 'Activo',
    destacado: 'Destacado',
    publicado: 'Publicado',
  } as Record<string, string>;

  // Usar configuración de FK si está disponible (acepta camelCase)
  const camelKey = toCamelFK(k)
  if (fkConfig[camelKey as keyof typeof fkConfig]) {
    return fkConfig[camelKey as keyof typeof fkConfig].fieldLabel;
  }

  return standardLabels[k] ?? k;
}

/* ────────────────────── UI helpers ────────────────────── */
function Chip({
  k, v, onRemove, child,
}: { k: string; v: any; onRemove: (key: string) => void; child?: Props['child'] }) {
  const text = typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs
                     bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-200/50
                     shadow-sm hover:shadow-md transition-all duration-200">
      <span className="font-medium">{label(k, child)}:</span> {text}
      <button
        type="button"
        onClick={() => onRemove(k)}
        className="ml-1 hover:text-blue-900 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
        aria-label={`Quitar filtro ${label(k, child)}`}
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
export function FiltersBar({ resource, filters, setFilters, child }: Props) {
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

  const isProductos = resource === 'Producto'

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
                <Chip key={k} k={k} v={v} onRemove={onRemoveChip} child={child} />
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
                  col="marcaId"
                  value={String(draft.marcaId ?? '')}
                  fixed={false}
                  onChange={(v: string) => set('marcaId', v || undefined)}
                />
              </div>

              {/* Categoría */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Folder className="h-4 w-4 text-blue-500" /> Categoría
                </label>
                <FkSelect
                  col="categoriaId"
                  value={String(draft.categoriaId ?? '')}
                  fixed={false}
                  onChange={(v: string) => set('categoriaId', v || undefined)}
                />
              </div>

              {/* Precio mínimo */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-blue-500" /> Precio mínimo
                </label>
                <input
                  type="number"
                  value={String(draft.precoMin ?? draft.precioMin ?? '')}
                  onChange={e => set('precioMin', e.target.value || undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900 shadow-sm"
                />
              </div>

              {/* Precio máximo */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-blue-500" /> Precio máximo
                </label>
                <input
                  type="number"
                  value={String(draft.precioMax ?? '')}
                  onChange={e => set('precioMax', e.target.value || undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900 shadow-sm"
                />
              </div>

              {/* Stock mínimo */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Package className="h-4 w-4 text-blue-500" /> Stock mínimo
                </label>
                <input
                  type="number"
                  value={String(draft.stockMin ?? '')}
                  onChange={e => set('stockMin', e.target.value || undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900 shadow-sm"
                />
              </div>

              {/* Stock máximo */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Package className="h-4 w-4 text-blue-500" /> Stock máximo
                </label>
                <input
                  type="number"
                  value={String(draft.stockMax ?? '')}
                  onChange={e => set('stockMax', e.target.value || undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900 shadow-sm"
                />
              </div>

              {/* Publicado (tri-toggle) */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700">Publicado</label>
                <TriToggle
                  value={draft.publicado as boolean | undefined}
                  onChange={(v) => set('publicado', v)}
                  ariaLabel="Publicado"
                />
              </div>

              {/* Destacado (tri-toggle) */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700">Destacado</label>
                <TriToggle
                  value={draft.destacado as boolean | undefined}
                  onChange={(v) => set('destacado', v)}
                  ariaLabel="Destacado"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Ejemplo de filtro genérico - se puede extender por recurso */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Tag className="h-4 w-4 text-blue-500" /> Buscar por título
                </label>
                <input
                  value={String((draft as any).titulo ?? '')}
                  onChange={e => set('titulo', e.target.value || undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900 shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onApply}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={onClear}
              className="px-4 py-2 text-sm font-medium bg-white text-blue-700 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FiltersBar
