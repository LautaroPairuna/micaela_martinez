/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

/* ────────────────────────────── 1. IMPORTS ─────────────────────────────── */
import React, { useMemo, useCallback, useReducer, useEffect } from 'react'

// Función auxiliar para obtener etiquetas descriptivas de los registros
function getItemLabel(row: Row): string {
  // Evita `any`: leemos la propiedad de forma segura
  const rec = row as Record<string, unknown>
  
  // Campos comunes que podrían contener nombres descriptivos
  for (const field of ['nombre', 'titulo', 'descripcion', 'name', 'title', 'label', 'producto']) {
    if (typeof rec[field] === 'string' && rec[field]) {
      return `${String(rec[field])} (ID: ${rec['id']})`
    }
  }
  
  // Si no encontramos nada, usamos el ID
  return `ID: ${String(rec['id'])}`
}
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import {
  ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Calendar, FileText,
  Pencil, Trash2, Eye,
  ArrowUp, ArrowDown, HelpCircle
} from 'lucide-react'
import { HiDocumentText } from 'react-icons/hi'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { useRelations } from './hooks/useRelations'
import { useMultipleChildCounts } from './hooks/useChildCounts'
import { useServerTable } from './hooks/useServerTable'

import { Modal } from './components/Modal'
import { ConfirmModal } from './components/ConfirmModal'
import { DetailContent } from './components/DetailContent'
import { MediaCell as FotoCell } from './components/MediaCell'
import { PdfCell } from './components/PdfCell'
import { isFileField } from './utils/fileFieldDetection'
import { Form, BulkForm } from './components/Form'
import { Toolbar } from './components/Toolbar'

import {
  DEFAULT_COLUMNS, HIDDEN_COLUMNS, READ_ONLY_RESOURCES, relationLabels,
} from './config'
import { getDefaultColumns, getHiddenColumns } from './utils/adminColumns'
import { buildFD, sanitize } from './utils/formData'
import { getForeignKey } from './utils/foreignKeys'
import type { Row, IdLike, Json } from './types'

/* ───────────────────────── 2. HELPERS / CONSTANTES ──────────────────────── */
const fetcher = (u: string) =>
  fetch(u).then(async r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

const dateFmt = new Intl.DateTimeFormat('es-AR')
const csrfHdr = () => ({
  'X-CSRF-Token': document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/)?.[1] ?? '',
})

// columnas largas → clamp
const LONG_TEXT_COLS = new Set(['descripcion', 'detalle', 'especificaciones', 'condiciones'])

const compact = (o: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(o ?? {}).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  )

const shallowEqual = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const A = compact(a)
  const B = compact(b)
  const aKeys = Object.keys(A)
  const bKeys = Object.keys(B)
  if (aKeys.length !== bKeys.length) return false
  for (const k of aKeys) if (A[k] !== B[k]) return false
  return true
}

// Usar la función utilitaria compartida
const guessFK = getForeignKey

const getNestedValue = (obj: any, path: string): unknown => {
  if (!path.includes('.')) {
    return obj[path]
  }
  
  return path.split('.').reduce((current, key) => {
    return current?.[key]
  }, obj)
}

/* ───────────────────────── 3. UI STATE ───────────────────────── */
interface UiState {
  selected: IdLike[]
  createOpen: boolean
  editRow: Row | 'bulk' | null
  detailRow: Row | null
  confirmRows: Row[] | null
}
type UiAction =
  | { type: 'toggleSelect'; id: IdLike }
  | { type: 'selectAll'; ids: IdLike[] }
  | { type: 'resetSelect' }
  | { type: 'openCreate'; open: boolean }
  | { type: 'openEdit'; row: Row | 'bulk' | null }
  | { type: 'openDetail'; row: Row | null }
  | { type: 'confirmDelete'; rows: Row[] | null }

const uiReducer = (s: UiState, a: UiAction): UiState => {
  switch (a.type) {
    case 'toggleSelect':
      return {
        ...s,
        selected: s.selected.includes(a.id)
          ? s.selected.filter(i => i !== a.id)
          : [...s.selected, a.id],
      }
    case 'selectAll':
      return { ...s, selected: s.selected.length === a.ids.length ? [] : a.ids }
    case 'resetSelect':
      return { ...s, selected: [] }
    case 'openCreate':
      return { ...s, createOpen: a.open }
    case 'openEdit':
      return { ...s, editRow: a.row }
    case 'openDetail':
      return { ...s, detailRow: a.row }
    case 'confirmDelete':
      return { ...s, confirmRows: a.rows }
  }
}

/* ───────────────────────── 4. FILTERS TIPOS ───────────────────────── */
type UIFilters = Record<string, string | number | boolean | undefined | null>
const compactFilters = (o: UIFilters): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  ) as Record<string, string | number | boolean>

/* ╭────────────────────── 5. MAIN COMPONENT ────────────────────╮ */
export default function ResourceDetailClient({ tableName }: { tableName: string }) {
  // ============ TODOS LOS HOOKS AL INICIO ============
  // Leer filtros desde URL
  const searchParams = useSearchParams()
  const filtersParam = searchParams.get('filters')
  
  // Parsear filtros iniciales desde URL
  const initialFilters = useMemo(() => {
    if (!filtersParam) return {}
    try {
      return JSON.parse(decodeURIComponent(filtersParam))
    } catch {
      return {}
    }
  }, [filtersParam])
  
  // Estado local
  const [child, setChild] = React.useState<{
    childTable: string
    foreignKey: string
    parentId: IdLike
  } | null>(null)
  
  const [ui, dispatch] = useReducer(uiReducer, {
    selected: [],
    createOpen: false,
    editRow: null,
    detailRow: null,
    confirmRows: null,
  })
  
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [sortBy, setSortBy] = React.useState('id')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')
  const [search, setSearch] = React.useState('')
  const [uiFilters, setUIFilters] = React.useState<UIFilters>(initialFilters)
  
  // Hooks de datos
  const { data: parentResp, error: parentError, isValidating: loadingParent } =
    useSWR<any>(`/api/admin/tables/${tableName}/records?page=1&pageSize=50`, fetcher, {
      revalidateOnFocus: false,
      keepPreviousData: true,
    })
  
  const relations = useRelations(tableName)
  
  // ============ VALORES DERIVADOS ============
  const readOnly = READ_ONLY_RESOURCES.includes(tableName)
  const parentRows: any[] = Array.isArray(parentResp) ? parentResp : (parentResp?.rows ?? [])
  const resource = child ? child.childTable : tableName
  const hidden = getHiddenColumns(HIDDEN_COLUMNS as Record<string, readonly string[]>, resource)
  
  // Memos y callbacks
  const baseClean = useMemo(() => compactFilters(uiFilters), [uiFilters])
  const effectiveFilters = useMemo(
    () => (child ? { ...baseClean, [child.foreignKey]: child.parentId } : baseClean),
    [baseClean, child]
  )
  
  // Hooks de servidor
  const { rows: data, total, validating, refresh: serverTableRefresh } = useServerTable<Row>(resource, {
    page, pageSize, sortBy, sortDir,
    search,
    qFields: resource === 'Productos' ? ['producto','descripcion'] : undefined,
    filters: effectiveFilters,
  })
  
  // Hook para obtener conteos de hijos para todos los registros visibles
  const childTables = relations.map(r => r.childTable)
  const parentIds = (data as Row[])?.map((row: any) => row.id) || []
  
  // Forzamos revalidación del cache para asegurar conteos actualizados
  const { counts: multiChildCounts, loading: countsLoading } = useMultipleChildCounts(
    tableName,
    parentIds,
    childTables,
    parentIds.length > 0 && childTables.length > 0 // Obtener conteos cuando hay datos y relaciones
  )
  
  // Log para depuración de conteos
  useEffect(() => {
    if (multiChildCounts && Object.keys(multiChildCounts).length > 0) {
      console.log('📊 [DEBUG] Conteos de hijos recibidos:', multiChildCounts);
    }
  }, [multiChildCounts])




  
  // Effects
  useEffect(() => { 
    dispatch({ type: 'resetSelect' })
    setPage(1)
  }, [tableName, child])
  
  // Actualizar filtros cuando cambien los searchParams o al entrar a un hijo
  useEffect(() => {
    // Si estamos en un hijo, aseguramos que los filtros se muestren como activos
    if (child) {
      const childFilters = {
        ...initialFilters,
        [child.foreignKey]: child.parentId
      };
      setUIFilters(childFilters);
    } else {
      setUIFilters(initialFilters);
    }
  }, [initialFilters, child])
  
  const setFiltersSmart = useCallback(
    (next: UIFilters) => {
      setUIFilters(prev => {
        const prevClean = compactFilters(prev)
        const nextClean = compactFilters(next)
        if (!shallowEqual(prevClean, nextClean)) setPage(1)
        return next
      })
    },
    []
  )
  
  const rawCols = useMemo(() => {
    const def = getDefaultColumns(DEFAULT_COLUMNS as Record<string, readonly string[]>, resource)
    return def ?? Object.keys((data as Row[])[0] ?? {})
  }, [data, resource])
  
  const visibleCols = useMemo(() => rawCols.filter(c => !hidden.includes(c)), [rawCols, hidden])
  
  const orderedColumns = useMemo(() => {
    if (tableName === 'Productos' && !child) {
      const first = ['id', 'producto', 'precio']
      return [...first, ...visibleCols.filter(c => !first.includes(c))]
    }
    return visibleCols
  }, [visibleCols, tableName, child])
  
  const refreshAll = useCallback(() => {
    serverTableRefresh()
  }, [serverTableRefresh])
  
  // CRUD Callbacks
  const doUpdate = useCallback(
    async (id: IdLike, body: Record<string, Json>) => {
      const url  = `/api/admin/tables/${resource}/records/${id}`
      const data = sanitize(body)
      const init: RequestInit =
        data.foto instanceof File
          ? { method: 'PUT', body: buildFD(data), headers: csrfHdr() }
          : {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...csrfHdr() },
              body: JSON.stringify(data),
            }
      const res = await fetch(url, init)
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error || 'Error')
    },
    [resource],
  )

  const handleCreate = useCallback(
    async (raw: Record<string, Json>) => {
      try {
        const clean = (() => {
          const c = sanitize(raw)
          delete c.id
          return c
        })()
        const endpoint = `/api/admin/tables/${resource}/records`
        const init: RequestInit =
          clean.foto instanceof File
            ? { method: 'POST', body: buildFD(clean), headers: csrfHdr() }
            : {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...csrfHdr() },
                body: JSON.stringify(clean),
              }
        const res = await fetch(endpoint, init)
        const out = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(out.error || 'Error')
        
        // Registrar evento en el sistema de actividad
        try {
          await fetch('/api/admin/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHdr() },
            body: JSON.stringify({
              type: 'content_updated',
              description: `Nuevo ${resource} creado: "${clean.nombre || clean.titulo || 'Sin nombre'}"`,
              source: 'admin',
              metadata: { ...clean, action: 'CREATE' }
            }),
          });
        } catch (activityError) {
          console.error('Error al registrar actividad:', activityError);
        }
        
        toast.success('Registro creado')
        dispatch({ type: 'openCreate', open: false })
        refreshAll()
      } catch (e: any) {
        toast.error(e.message)
      }
    },
    [resource, refreshAll],
  )

  const handleUpdate = useCallback(
    async (id: IdLike, raw: Record<string, Json>) => {
      try {
        await doUpdate(id, raw)
        
        // Registrar evento en el sistema de actividad
        try {
          await fetch('/api/admin/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHdr() },
            body: JSON.stringify({
              type: 'content_updated',
              description: `${resource} actualizado: ID ${id} - "${raw.nombre || raw.titulo || 'Sin nombre'}"`,
              source: 'admin',
              metadata: { id, ...raw, action: 'UPDATE' }
            }),
          });
        } catch (activityError) {
          console.error('Error al registrar actividad:', activityError);
        }
        
        toast.success(`Registro ${id} actualizado`)
        dispatch({ type: 'openEdit', row: null })
        refreshAll()
      } catch (e: any) {
        toast.error(e.message)
      }
    },
    [doUpdate, refreshAll, resource],
  )

  const handleBulk = useCallback(
    async (field: string, val: Json) => {
      if (!field) { toast.error('Definí el campo a modificar'); return }
      try {
        const results = await Promise.allSettled(
          ui.selected.map(id => doUpdate(id, { [field]: val }))
        )
        const failed = results.filter(r => r.status === 'rejected')
        if (failed.length) toast.error(`Fallaron ${failed.length} de ${results.length}`)
        else toast.success(`Actualizados ${ui.selected.length} registro(s)`)
        dispatch({ type: 'openEdit', row: null })
        dispatch({ type: 'resetSelect' })
        refreshAll()
      } catch (e: any) {
        toast.error(e.message)
      }
    },
    [ui.selected, doUpdate, refreshAll],
  )

  const deleteOne = useCallback(
    async (id: IdLike, forced?: string) => {
      const tgt = forced || resource
      const res = await fetch(`/api/admin/tables/${tgt}/records/${id}`, {
        method: 'DELETE',
        headers: csrfHdr(),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error || 'Error')
    },
    [resource],
  )

  const confirmDelete = useCallback(async () => {
    if (!ui.confirmRows) return
    try {
      const results = await Promise.allSettled(
        ui.confirmRows.map(r =>
          deleteOne(
            r.id as IdLike,
            r.tableName !== resource ? r.tableName as string : undefined
          )
        )
      )
      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length) toast.error(`Fallaron ${failed.length} de ${results.length}`)
      else toast.success(`Eliminados ${ui.confirmRows.length} registro(s)`)
      dispatch({ type: 'confirmDelete', rows: null })
      refreshAll()
    } catch (e: any) {
      toast.error(e.message)
    }
  }, [ui.confirmRows, deleteOne, resource, refreshAll])

  // Render helpers
  const parsedDatos = useMemo(() => {
    if (resource !== 'Pedidos') return {} as Record<string, any[]>
    const m: Record<string, any[]> = {}
    ;(data as Row[]).forEach(r => {
      const raw = (r as any).datos
      if (!raw) return
      try {
        m[String(r.id)] = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch {
        m[String(r.id)] = []
      }
    })
    return m
  }, [data, resource])

  const renderCell = useCallback(
    (val: unknown, col: string, rowId: number) => {
      if (val == null) return <span className="text-gray-400">null</span>

      if (resource === 'Pedidos' && col === 'datos') {
        const items = parsedDatos[String(rowId)] ?? []
        if (items.length)
          return (
            <div className="text-sm text-indigo-700 leading-tight">
              {items.slice(0, 5).map((it: any, i: number) => (
                <div key={i}>
                  <span className="font-medium">{it.cant || it.qty || 1}×</span>{' '}
                  {it.name || it.nombre || it.producto || `Ítem ${i + 1}`}
                </div>
              ))}
              {items.length > 5 && (
                <div className="text-xs text-gray-500">
                  … y {items.length - 5} más
                </div>
              )}
            </div>
          )
      }

      // Lógica especial para lecciones y columna rutaSrc
      if (resource === 'Leccion' && col === 'rutaSrc') {
        const currentRow = (data as Row[]).find((r: any) => r.id === rowId)
        const tipoLeccion = currentRow?.tipo as string
        
        // Para lecciones de texto y quiz, no mostrar nada (ocultar completamente)
        if (tipoLeccion === 'TEXTO' || tipoLeccion === 'QUIZ') {
          return null
        }
        
        // Para lecciones de documento, cambiar extensión a .pdf y mostrar componente PDF
        if (tipoLeccion === 'DOCUMENTO' && typeof val === 'string' && val.trim()) {
          const fileName = val.replace(/\.[^.]+$/, '.pdf') // Cambiar extensión a .pdf
          return <PdfCell tableName={tableName} childRelation={child} fileName={fileName} />
        }
        
        // Para lecciones de video, mostrar miniatura del video
        if (tipoLeccion === 'VIDEO' && typeof val === 'string' && val.trim()) {
          return <FotoCell tableName={tableName} childRelation={child} fileName={val} />
        }
        
        // Si hay valor pero no coincide con el tipo esperado
        if (typeof val === 'string' && val.trim()) {
          return <FotoCell tableName={tableName} childRelation={child} fileName={val} />
        }
        
        return <span className="text-gray-400">-</span>
      }

      if (isFileField(col) && typeof val === 'string' && val.trim())
        return <FotoCell tableName={tableName} childRelation={child} fileName={val} />

      if (val instanceof Date)
        return (
          <span className="flex items-center">
            <Calendar className="h-4 w-4 mr-1 text-blue-400" />
            {dateFmt.format(val)}
          </span>
        )

      // Manejo especial para contenido JSON de lecciones
        if (resource === 'Leccion' && col === 'contenido') {
          try {
            let content: any
            
            if (typeof val === 'string') {
              content = JSON.parse(val)
            } else if (typeof val === 'object') {
              content = val
            } else {
              throw new Error('Tipo no soportado')
            }
            
            // Formato unificado: {tipo: 'QUIZ', data: {preguntas: [...]}}
            if (content.tipo === 'QUIZ' && content.data?.preguntas) {
              return (
                <div className="flex items-center text-xs">
                  <HelpCircle className="h-4 w-4 mr-1 text-purple-500" />
                  <span className="text-purple-700 font-medium">
                    Quiz: {content.data.preguntas.length} pregunta{content.data.preguntas.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )
            }
            // Formato legacy: {preguntas: [...]}
            else if (content.preguntas) {
              return (
                <div className="flex items-center text-xs">
                  <HelpCircle className="h-4 w-4 mr-1 text-purple-500" />
                  <span className="text-purple-700 font-medium">
                    Quiz: {content.preguntas.length} pregunta{content.preguntas.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )
            } else if (content.contenido && Array.isArray(content.contenido)) {
              // Formato nuevo: bloques estructurados
              const totalText = content.contenido.map((b: any) => b.contenido || '').join(' ')
              const preview = totalText.substring(0, 50)
              return (
                <div className="flex items-center text-xs">
                  <FileText className="h-4 w-4 mr-1 text-green-500" />
                  <span className="text-green-700 truncate" title={totalText}>
                    Estructurado: {preview}{totalText.length > 50 ? '...' : ''}
                  </span>
                </div>
              )
            } else if (content.contenido && typeof content.contenido === 'string') {
              // Formato legacy: contenido como string
              const preview = content.contenido.substring(0, 50)
              return (
                <div className="flex items-center text-xs">
                  <FileText className="h-4 w-4 mr-1 text-blue-500" />
                  <span className="text-blue-700 truncate" title={content.contenido}>
                    {preview}{content.contenido.length > 50 ? '...' : ''}
                  </span>
                </div>
              )
            } else if (content.texto) {
              const preview = content.texto.substring(0, 50)
              return (
                <div className="flex items-center text-xs">
                  <FileText className="h-4 w-4 mr-1 text-blue-500" />
                  <span className="text-blue-700 truncate" title={content.texto}>
                    {preview}{content.texto.length > 50 ? '...' : ''}
                  </span>
                </div>
              )
            } else if (content.bloques && Array.isArray(content.bloques)) {
              const totalText = content.bloques.map((b: any) => b.contenido || b.texto || '').join(' ')
              const preview = totalText.substring(0, 50)
              return (
                <div className="flex items-center text-xs">
                  <FileText className="h-4 w-4 mr-1 text-blue-500" />
                  <span className="text-blue-700 truncate" title={totalText}>
                    {preview}{totalText.length > 50 ? '...' : ''}
                  </span>
                </div>
              )
            }
          } catch (e) {
            // Fallback para JSON malformado
          }
        }

      if (typeof val === 'object')
        return (
          <span className="flex items-center">
            <HiDocumentText className="h-4 w-4 mr-1 text-green-500" />
            {JSON.stringify(val).slice(0, 40)}…
          </span>
        )

      if (typeof val === 'boolean')
        return val ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )

      // Renderizado específico para columna 'rol' como texto simple
      if (col.toLowerCase() === 'rol' || col.toLowerCase() === 'role') {
        return (
          <span className="text-gray-800 font-medium">
            {String(val)}
          </span>
        )
      }

      const s = String(val)
      const colLower = col.toLowerCase()
      if (LONG_TEXT_COLS.has(colLower)) {
        return (
          <span
            className="block whitespace-normal break-words text-gray-800"
            style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            title={s}
          >
            {s}
          </span>
        )
      }

      return (
        <span className="block whitespace-normal break-words truncate" title={s}>
          {s}
        </span>
      )
    },
    [tableName, child, resource, parsedDatos],
  )

  /* ╭───────────────────────── UI / Títulos ─────────────────────╮ */
  const humanize = (s: string) =>
    s.replace(/^Cfg/, '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
     .replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())

  // Detectar si estamos filtrando por un padre desde URL o estado child
  const isFilteredByParent = child || Object.keys(effectiveFilters).some(key => key.endsWith('Id') && effectiveFilters[key])
  const parentId = child?.parentId || Object.entries(effectiveFilters).find(([key, value]) => key.endsWith('Id') && value)?.[1]
  const parentTable = child ? tableName : Object.entries(effectiveFilters).find(([key, value]) => key.endsWith('Id') && value)?.[0]?.replace('Id', '')
  
  const parentRow = (parentRows as any[]).find(r => r.id === parentId)
  const displayName = parentRow?.producto ?? parentRow?.nombre ?? parentRow?.name ?? parentRow?.titulo ?? `#${parentId}`
  const baseLabel  = humanize(tableName)
  const currentResource = child ? child.childTable : tableName
  const childLabel = isFilteredByParent ? humanize(relationLabels[currentResource as keyof typeof relationLabels] ?? currentResource) : ''
  const friendlyTitle = isFilteredByParent && parentId ? `${childLabel} de ${displayName}` : baseLabel
  const eyebrow = isFilteredByParent ? humanize(parentTable || tableName) : 'Gestión'

  useEffect(() => {
    const prev = document.title
    document.title = `Admin · ${friendlyTitle}`
    return () => { document.title = prev }
  }, [friendlyTitle])

  const totalPages = Math.max(1, Math.ceil((total ?? 0) / pageSize))
  const toggleSort = (col: string) => {
    setPage(1)
    if (sortBy === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(col); setSortDir('asc') }
  }

  const setSearchSafe = React.useCallback((next: string) => {
  setSearch(prev => {
    if (prev === next) return prev;  // no cambió => no resetear page
    setPage(1);
    return next;
  });
}, []);

  const setPageSizeSafe = React.useCallback((next: number) => {
    setPageSize(prev => {
      if (prev === next) return prev;
      setPage(1);
      return next;
    });
  }, []);

  // Manejo de error después de todos los hooks para cumplir con las reglas de React
  if (parentError) {
    return <div className="p-4 text-red-500">Error al cargar datos</div>
  }

  /* ╭────────────────────────── RENDER ────────────────────────╮ */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[18px] uppercase tracking-wide text-indigo-600/80">
            {eyebrow}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {friendlyTitle}
          </h1>
        </div>
        {(loadingParent || validating) && (
          <span className="text-indigo-600 text-sm animate-pulse">cargando…</span>
        )}
      </header>

      {/* BREADCRUMB cuando hay filtro por padre */}
      {isFilteredByParent && (
        <div className="flex items-center space-x-4 mb-2">
          {child ? (
            <button onClick={() => setChild(null)} className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150 font-medium">
              ← Volver a {humanize(parentTable || tableName)}
            </button>
          ) : (
            <Link href={`/admin/resources/${tableName}`} className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150 font-medium">
              ← Volver a {baseLabel}
            </Link>
          )}
          <h2 className="text-xl font-semibold">
             {childLabel} de {displayName}
          </h2>
        </div>
      )}

      {/* ╭──────────────────── CARD PRINCIPAL ───────────────────╮ */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-gray-200 border border-gray-100 p-4 md:p-6 space-y-4">
        <ToastContainer position="top-right" autoClose={3000} />

        {/* Toolbar + Filtros (server-side) */}
        <Toolbar
          readOnly={readOnly}
          selectedCount={ui.selected.length}
          onNew={() => dispatch({ type: 'openCreate', open: true })}
          onDeleteSelected={() =>
            dispatch({
              type: 'confirmDelete',
              rows: (data as Row[]).filter((r: any) => ui.selected.includes(r.id)),
            })
          }
          onBulkEdit={() => dispatch({ type: 'openEdit', row: 'bulk' })}
          search={search}
          setSearch={setSearchSafe}
          pageSize={pageSize}
          setPageSize={setPageSizeSafe}
          resource={resource}
          filters={uiFilters}
          setFilters={setFiltersSmart}
        />

        {/* Los filtros ahora están en el modal del Toolbar */}

        {/* Tabla */}
        <div className="relative overflow-x-auto">
          {data.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Sin resultados</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200" role="grid">
              <thead className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700">
                <tr>
                  {/* Columnas fijas */}
                  <th className="sticky left-0 z-20 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
                    <input
                      type="checkbox"
                      checked={ui.selected.length === data.length && data.length > 0}
                      onChange={() =>
                        dispatch({
                          type: 'selectAll',
                          ids: (data as Row[]).map(r => r.id as IdLike),
                        })
                      }
                      aria-label="Seleccionar todos"
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                  </th>
                  <th className="sticky left-12 z-20 px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-gradient-to-r from-blue-600 to-blue-700">
                    Acciones
                  </th>

                  {orderedColumns.flatMap(col => {
                    const th = (
                      <th
                        key={col}
                        onClick={() => toggleSort(col)}
                        aria-sort={sortBy === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer select-none"
                      >
                        {col}
                        {sortBy === col &&
                          (sortDir === 'asc' ? (
                            <ArrowUp className="inline h-4 w-4 ml-1 text-white" />
                          ) : (
                            <ArrowDown className="inline h-4 w-4 ml-1 text-white" />
                          ))}
                      </th>
                    )

                    if (tableName === 'Productos' && !child && col === 'precio') {
                      const relThs = relations.map(r => (
                        <th
                          key={'c-' + r.childTable}
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                        >
                          {relationLabels[r.childTable as keyof typeof relationLabels] ?? r.childTable}
                        </th>
                      ))
                      return [th, ...relThs]
                    }
                    return th
                  })}

                  {tableName !== 'Productos' && !child && relations.map(r => (
                    <th
                      key={r.childTable}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                    >
                      {relationLabels[r.childTable as keyof typeof relationLabels] ?? r.childTable}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {(data as Row[]).map((row: any) => (
                  <tr key={row.id} className="odd:bg-gray-50 even:bg-white hover:bg-blue-50 transition-colors duration-150">
                    {/* checkbox - fijo */}
                    <td className="sticky left-0 z-10 px-4 py-2 odd:bg-gray-50 even:bg-white">
                      <input
                        type="checkbox"
                        checked={ui.selected.includes(row.id)}
                        onChange={() => dispatch({ type: 'toggleSelect', id: row.id })}
                        aria-label={`Seleccionar fila ${row.id}`}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </td>

                    {/* acciones - fijo */}
                    <td className="sticky left-12 z-10 px-4 py-2 align-middle odd:bg-gray-50 even:bg-white">
                      <div className="inline-flex items-center gap-2">
                        <button
                          title="Ver"
                          onClick={() => dispatch({ type: 'openDetail', row })}
                          className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-md transition-all duration-150 border border-blue-200"
                          aria-label={`Ver fila ${row.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          title="Editar"
                          onClick={() => dispatch({ type: 'openEdit', row })}
                          className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-md transition-all duration-150 border border-green-200"
                          aria-label={`Editar fila ${row.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {!readOnly && (
                          <button
                            title="Eliminar"
                            onClick={() => dispatch({ type: 'confirmDelete', rows: [row] })}
                            className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 hover:shadow-md transition-all duration-150 border border-red-200"
                            aria-label={`Eliminar fila ${row.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* celdas data + relaciones */}
                    {orderedColumns.flatMap(col => {
                      // Aplicar estilos especiales para contenido de lecciones
                      const isLessonContent = resource === 'Leccion' && (col === 'contenido' || LONG_TEXT_COLS.has(col.toLowerCase()))
                      const cellClasses = isLessonContent 
                        ? "px-4 py-2 text-sm text-gray-800 border-b border-indigo-100 max-w-[300px] overflow-hidden"
                        : "px-4 py-2 whitespace-nowrap text-sm text-gray-800 border-b border-indigo-100 max-w-[220px]"
                      
                      const td = (
                        <td
                          key={col}
                          className={cellClasses}
                        >
                          {renderCell(getNestedValue(row, col), col, row.id)}
                        </td>
                      )

                      if (tableName === 'Productos' && !child && col === 'precio') {
                        const childrenTds = relations
                          .filter(rel => rel.childTable !== 'Favorito') // Filtramos para no mostrar los Favoritos
                          .map(rel => (
                          <td
                            key={'c-' + rel.childTable}
                            className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 border-b border-indigo-100"
                          >
                            <Link
                              href={`/admin/resources/${rel.childTable}?filters=${encodeURIComponent(JSON.stringify({ [guessFK(rel.childTable, tableName)]: row.id }))}`}
                              className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs hover:bg-green-200 transition flex items-center gap-1"
                              aria-label={`Ver ${
                                relationLabels[rel.childTable as keyof typeof relationLabels] ?? rel.childTable
                              } de ${row.id}`}
                            >
                              {relationLabels[rel.childTable as keyof typeof relationLabels] ?? rel.childTable}
                              {countsLoading ? (
                                 <span className="bg-indigo-400 text-white px-2 py-1 rounded-full text-xs font-semibold animate-pulse shadow-sm">
                                    •••
                                 </span>
                               ) : (
                                 <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm transition-colors ${
                                   (multiChildCounts?.[row.id]?.[rel.childTable] || 0) > 0 
                                     ? 'bg-emerald-500 text-white' 
                                     : 'bg-gray-300 text-gray-600'
                                 }`}>
                                   {/* Mostramos el contador específico para este padre */}
                                   {multiChildCounts?.[row.id]?.[rel.childTable] || 0}
                                 </span>
                               )}
                            </Link>
                          </td>
                        ))
                        return [td, ...childrenTds]
                      }

                      return td
                    })}

                    {/* relaciones al final para otras tablas */}
                    {tableName !== 'Productos' && !child && relations.map(rel => (
                      <td
                        key={rel.childTable}
                        className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 border-b border-gray-200"
                      >
                        <button
                              onClick={() => setChild({
                                childTable: rel.childTable,
                                foreignKey: guessFK(rel.childTable, tableName),
                                parentId: row.id
                              })}
                              className="bg-green-100 text-green-800 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors duration-150 shadow-sm flex items-center gap-2"
                              aria-label={`Ver ${
                                relationLabels[rel.childTable as keyof typeof relationLabels] ?? rel.childTable
                              } de ${row.id}`}
                            >
                              {relationLabels[rel.childTable as keyof typeof relationLabels] ?? rel.childTable}
                              {countsLoading ? (
                                 <span className="bg-indigo-400 text-white px-2 py-1 rounded-full text-xs font-semibold animate-pulse shadow-sm">
                                   •••
                                 </span>
                               ) : (
                                 <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm transition-colors ${
                                   (multiChildCounts?.[row.id]?.[rel.childTable] || 0) > 0 
                                     ? 'bg-emerald-500 text-white' 
                                     : 'bg-gray-300 text-gray-600'
                                 }`}>
                                   {multiChildCounts?.[row.id]?.[rel.childTable] || 0}
                                 </span>
                               )}
                            </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* paginación (server) */}
        {data.length > 0 && (
          <footer className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors duration-150 shadow-sm"
              aria-label="Página anterior"
            >
              <ChevronLeft className="inline h-4 w-4 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Página {page} de {totalPages} — {total} registro(s)
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors duration-150 shadow-sm"
              aria-label="Página siguiente"
            >
              <ChevronRight className="inline h-4 w-4 text-gray-600" />
            </button>
          </footer>
        )}
      </div>

      {/* ╭──────────────────────── MODALES ───────────────────────╮ */}
      {ui.detailRow && (
        <Modal 
          title={`Detalle de ${resource}: ${getItemLabel(ui.detailRow as Row)}`} 
          onClose={() => dispatch({ type: 'openDetail', row: null })}
        >
          <DetailContent row={ui.detailRow as Row} />
        </Modal>
      )}

      {ui.createOpen && (
        <Modal title={`Crear nuevo ${resource}`} onClose={() => dispatch({ type: 'openCreate', open: false })}>
          <Form
            resource={resource}
            initial={child ? { [child.foreignKey]: child.parentId } : {}}
            columns={getDefaultColumns(DEFAULT_COLUMNS as Record<string, readonly string[]>, resource) ?? orderedColumns}
            fixedFk={child?.foreignKey}
            onSubmit={handleCreate}
          />
        </Modal>
      )}

      {ui.editRow && ui.editRow !== 'bulk' && (
        <Modal 
          title={`Editar ${resource}: ${getItemLabel(ui.editRow as Row)}`} 
          onClose={() => dispatch({ type: 'openEdit', row: null })}
        >
          <Form
            resource={resource}
            initial={ui.editRow as Row}
            columns={getDefaultColumns(DEFAULT_COLUMNS as Record<string, readonly string[]>, resource) ?? orderedColumns}
            fixedFk={child?.foreignKey}
            onSubmit={d => handleUpdate((ui.editRow as Row).id as IdLike, d)}
          />
        </Modal>
      )}

      {ui.editRow === 'bulk' && (
        <Modal title={`Edición masiva (${ui.selected.length})`} onClose={() => dispatch({ type: 'openEdit', row: null })}>
          <BulkForm 
            onSubmit={handleBulk} 
            selectedItems={(data as Row[]).filter((r: any) => ui.selected.includes(r.id))}
          />
        </Modal>
      )}

      {ui.confirmRows && (
        <ConfirmModal
          items={ui.confirmRows}
          onCancel={() => dispatch({ type: 'confirmDelete', rows: null })}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  )
}
