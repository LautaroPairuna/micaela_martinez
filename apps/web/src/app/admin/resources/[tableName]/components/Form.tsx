// apps/web/src/app/admin/resources/[tableName]/components/Form.tsx
'use client'
import React, { memo, FormEvent } from 'react'
import { FkSelect } from './FkSelect'
import MediaDropzone from './MediaDropzone'
import { fkConfig } from '../config'
import type { Json } from '../types'

// Definición local de folderNames ya que no está exportado en adminConstants
const folderNames = {
  Producto: 'producto',
  ProductoImagen: 'producto-imagenes',
  Usuario: 'usuario',
  Curso: 'cursos',
  Leccion: 'leccion',
  Marca: 'marcas',
  Categoria: 'categorias',
} as const

import {
  isFileField,
  getAllowedFileTypes,
  getAllowedFileTypesByLessonType,
  type FileType,
} from '../utils/fileFieldDetection'

import { TextContentEditor } from './TextContentEditor'
import { QuizContentEditor } from './QuizContentEditor'
import { VideoContentEditor } from './VideoContentEditor'
import { DocContentEditor } from './DocContentEditor'
import { useToast } from '@/contexts/ToastContext'

/* ───────────────────────── Tipos locales ───────────────────────── */

type TipoLeccion = 'TEXTO' | 'VIDEO' | 'QUIZ' | 'DOCUMENTO'

type FormP = {
  initial: Record<string, unknown>
  columns: string[]
  fixedFk?: string
  onSubmit: (d: Record<string, Json>) => void
  /** nombre del recurso Prisma: p.ej. 'Producto', 'Leccion' */
  resource?: string
}

/** Tipo de una pregunta del quiz (lo mínimo que validamos) */
type QuizQuestion = {
  pregunta?: string
  opciones?: unknown[]
  respuesta?: number
  respuestaCorrecta?: number
}

/** Texto “legacy” aceptado por TextContentEditor */
type LegacyTextContent = {
  texto: string
  formato?: {
    negrita?: boolean
    cursiva?: boolean
    subrayado?: boolean
    alineacion?: 'left' | 'center' | 'right'
  }
}

/* ───────────── Helpers de tipo/parseo seguros ───────────── */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function parseJsonSafe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** Normaliza un valor desconocido para `TextContentEditor`: string o {texto,...} */
function normalizeTextEditorValue(v: unknown): string | LegacyTextContent {
  if (typeof v === 'string') return v

  if (isRecord(v)) {
    // ya viene en formato legacy esperado
    if (typeof v.texto === 'string') {
      return {
        texto: v.texto,
        formato: isRecord(v.formato)
          ? (v.formato as LegacyTextContent['formato'])
          : undefined,
      }
    }
    // viene con { contenido }
    if (typeof v.contenido === 'string') {
      return {
        texto: v.contenido,
        formato: isRecord(v.formato)
          ? (v.formato as LegacyTextContent['formato'])
          : undefined,
      }
    }
  }
  return ''
}

/* ───────────── Validación específica para Lección ───────────── */

function validateLessonForm(formData: Record<string, unknown>): string | null {
  const tipoLeccion = (formData.tipo as TipoLeccion) || 'TEXTO'
  const titulo = String(formData.titulo ?? '').trim()
  const rutaSrc = formData.rutaSrc
  const duracionS = Number(formData.duracionS ?? 0)
  const contenido = String(formData.contenido ?? '').trim()

  if (!titulo) return 'El título de la lección es obligatorio'

  switch (tipoLeccion) {
    case 'VIDEO': {
      if (!rutaSrc) return 'La URL o archivo del video es obligatorio'
      if (duracionS <= 0) return 'La duración del video debe ser mayor a 0 segundos'

      if (typeof rutaSrc === 'string') {
        if (rutaSrc.startsWith('http')) {
          try {
            // valida URL
            new URL(rutaSrc)
          } catch {
            return 'La URL del video no es válida'
          }
        } else if (
          !/\.(mp4|avi|mov|wmv|flv|webm|ogg|ogv|mkv|3gp|m4v|mpg|mpeg)$/i.test(rutaSrc)
        ) {
          return 'El archivo debe ser un video válido'
        }
      }
      break
    }

    case 'DOCUMENTO': {
      if (!rutaSrc) return 'La URL o archivo del documento es obligatorio'
      if (typeof rutaSrc === 'string') {
        if (
          !rutaSrc.startsWith('http') &&
          !/\.(pdf|doc|docx|txt|rtf|odt|ods|odp|xls|xlsx|ppt|pptx)$/i.test(rutaSrc)
        )
          return 'El archivo debe ser un documento válido'
      }
      break
    }

    case 'QUIZ': {
      if (!contenido) return 'El contenido del quiz es obligatorio'
      const quizUnknown = parseJsonSafe<unknown>(contenido)
      if (!quizUnknown || !isRecord(quizUnknown)) {
        return 'El contenido del quiz debe ser JSON válido'
      }

      const hasPreguntasArray = (x: unknown): x is { preguntas: unknown[] } =>
        isRecord(x) && Array.isArray((x as { preguntas?: unknown[] }).preguntas)

      const hasDataWithPreguntasArray = (
        x: unknown
      ): x is { data: { preguntas: unknown[] } } =>
        isRecord(x) &&
        isRecord((x as { data?: unknown }).data) &&
        Array.isArray(
          ((x as { data: { preguntas?: unknown[] } }).data).preguntas
        )

      let preguntas: QuizQuestion[] = []

      // data.preguntas (cuando viene con tipo QUIZ)
      if (
        (quizUnknown as Record<string, unknown>).tipo === 'QUIZ' &&
        hasDataWithPreguntasArray(quizUnknown)
      ) {
        preguntas = (quizUnknown as { data: { preguntas: unknown[] } }).data
          .preguntas as QuizQuestion[]
      }
      // preguntas[]
      else if (hasPreguntasArray(quizUnknown)) {
        preguntas = (quizUnknown as { preguntas: unknown[] })
          .preguntas as QuizQuestion[]
      }
      // quiz{} (una sola)
      else if (isRecord((quizUnknown as Record<string, unknown>).quiz)) {
        preguntas = [
          (quizUnknown as Record<string, unknown>).quiz as QuizQuestion,
        ]
      }
      // preguntas{} (una sola)
      else if (isRecord((quizUnknown as Record<string, unknown>).preguntas)) {
        preguntas = [
          (quizUnknown as Record<string, unknown>).preguntas as QuizQuestion,
        ]
      } else {
        return 'El quiz debe contener al menos una pregunta (formatos válidos en data.preguntas, preguntas[], quiz{}, etc.)'
      }

      if (preguntas.length === 0)
        return 'El quiz debe contener al menos una pregunta'

      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i]
        if (!isRecord(p) || !p?.pregunta || !Array.isArray(p?.opciones)) {
          return `La pregunta ${i + 1} debe tener "pregunta" y "opciones" (array)`
        }
        const rc =
          typeof p.respuesta === 'number' ? p.respuesta : p.respuestaCorrecta
        if (
          typeof rc !== 'number' ||
          rc < 0 ||
          rc >= ((p.opciones as unknown[])?.length ?? 0)
        ) {
          return `La pregunta ${i + 1} debe tener un índice de respuesta válido`
        }
      }

      if (duracionS <= 0)
        return 'El tiempo límite del quiz debe ser mayor a 0 segundos'
      break
    }

    case 'TEXTO': {
      if (!contenido) return 'El contenido de la lección de texto es obligatorio'
      const textData = parseJsonSafe<unknown>(contenido)
      if (!textData || !isRecord(textData)) {
        return 'El contenido de la lección debe ser JSON válido'
      }
      const ok =
        (Array.isArray(textData.bloques) && textData.bloques.length > 0) ||
        (typeof textData.contenido === 'string' &&
          textData.contenido.trim() !== '') ||
        (typeof textData.texto === 'string' && textData.texto.trim() !== '')
      if (!ok) {
        return 'La lección de texto debe contener contenido válido (bloques/contenido/texto)'
      }
      break
    }
  }

  return null
}

/* ───────────────────────────── Componente ───────────────────────────── */

export function Form({ initial, columns, fixedFk, onSubmit, resource }: FormP) {
  const [form, setForm] = React.useState<Record<string, unknown>>({ ...initial })
  const { error: showError } = useToast()

  const handle = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  // Normaliza el nombre de tabla para el endpoint de uploads (debe coincidir con keys de folderNames del back)
  const normalizeTableForUploads = (r?: string): string => {
    if (!r) return ''
    const keys = Object.keys(folderNames) // p.ej. ['Producto','ProductoImagen','Usuario',...]
    if (keys.includes(r)) return r
    const pascal = r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()
    if (keys.includes(pascal)) return pascal
    return r
  }

  // storedAs → URL thumb para previews
  const toThumbFromStoredAs = (storedAs: string) => {
    if (/^(\/|https?:\/\/)/.test(storedAs)) return storedAs
    const [folder, ...rest] = storedAs.split('/')
    return `/images/${folder}/thumbs/${rest.join('/')}`
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()

    if (resource === 'Leccion') {
      const validationError = validateLessonForm(form)
      if (validationError) {
        showError('Error de validación', validationError)
        return
      }
    }

    const processed: Record<string, unknown> = { ...form }
    const tableForUpload = normalizeTableForUploads(resource)
    const uploads: Promise<void>[] = []

    for (const field of Object.keys(form)) {
      const v = form[field]
      if (v instanceof File) {
        uploads.push(
          (async () => {
            const { uploadFile } = await import('@/lib/uploadFile')

            const candidateTitulo = form['titulo']
            const candidateNombre = form['nombre']
            const fallbackTitle = `${resource ?? 'Recurso'} - ${field}`

            const title =
              typeof candidateTitulo === 'string' && candidateTitulo.trim()
                ? candidateTitulo
                : typeof candidateNombre === 'string' && candidateNombre.trim()
                ? candidateNombre
                : fallbackTitle

            const recordId =
              typeof initial.id === 'string' && initial.id.trim()
                ? initial.id
                : undefined

            const res = await uploadFile(v, {
              table: tableForUpload,
              field, // campo requerido por el backend
              recordId,
              title,
              alt: title,
            })
            const storedAs =
              (isRecord(res) &&
                isRecord(res.data) &&
                typeof res.data.storedAs === 'string' &&
                res.data.storedAs) ||
              v.name
            processed[field] = storedAs
          })()
        )
      }
    }

    try {
      if (uploads.length) await Promise.all(uploads)
      onSubmit(processed as Record<string, Json>)
    } catch (err) {
      console.error('Error al subir archivos:', err)
      showError('Hubo un problema al subir los archivos')
    }
  }

  // Mostrar sólo campos relevantes para Lección
  const shouldShowField = (col: string): boolean => {
    if (resource !== 'Leccion') return true
    const tipo: TipoLeccion = (form.tipo as TipoLeccion) || 'TEXTO'
    const always = ['id', 'moduloId', 'titulo', 'orden', 'tipo', 'descripcion']
    if (always.includes(col)) return true
    switch (tipo) {
      case 'VIDEO':
        return ['duracionS', 'contenido'].includes(col)
      case 'DOCUMENTO':
        return ['contenido'].includes(col)
      case 'QUIZ':
        return ['contenido'].includes(col)
      case 'TEXTO':
        return ['contenido', 'duracionS'].includes(col)
      default:
        return !['rutaSrc', 'duracionS', 'contenido'].includes(col)
    }
  }

  const visibleColumns = columns.filter(shouldShowField)

  const renderField = (col: string, options?: { hideLabel?: boolean }) => {
    const { hideLabel = false } = options || {}

    /* FK */
    if (col in fkConfig) {
      const fixed = fixedFk === col
      return (
        <div key={col} className="flex flex-col space-y-2">
          {!hideLabel && (
            <label className="text-sm font-medium text-gray-900">
              {fkConfig[col as keyof typeof fkConfig].fieldLabel}
            </label>
          )}
          <FkSelect
            col={col}
            value={String(form[col] ?? '')}
            fixed={fixed}
            onChange={v => handle(col, v)}
          />
        </div>
      )
    }

    /* Tipo Lección */
    if (col === 'tipo' && resource === 'Leccion') {
      return (
        <div key={col} className="flex flex-col space-y-2">
          {!hideLabel && (
            <label className="text-sm font-medium text-gray-900">Tipo de Lección</label>
          )}
          <select
            value={String(form[col] ?? 'TEXTO')}
            onChange={e => handle(col, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="VIDEO">Video</option>
            <option value="DOCUMENTO">Documento</option>
            <option value="QUIZ">Quiz</option>
            <option value="TEXTO">Texto</option>
          </select>
        </div>
      )
    }

    /* FILE */
    if (isFileField(col)) {
      const raw = form[col]
      const dzValue =
        raw instanceof File ? raw : typeof raw === 'string' ? raw : null

      const allowedTypes: FileType[] =
        resource === 'Leccion' && form.tipo
          ? getAllowedFileTypesByLessonType(form.tipo as TipoLeccion, col)
          : getAllowedFileTypes(col)

      return (
        <div key={col} className="flex flex-col space-y-2">
          {!hideLabel && (
            <label className="text-sm font-medium text-gray-900">{col}</label>
          )}
          <MediaDropzone
            value={dzValue}
            onChange={(v) => handle(col, v)}
            allowedTypes={allowedTypes}
            resolvePreviewSrc={(storedAsOrUrl) => {
              if (/^(\/|https?:\/\/)/.test(storedAsOrUrl)) return storedAsOrUrl
              return toThumbFromStoredAs(storedAsOrUrl)
            }}
          />
        </div>
      )
    }

    /* contenido con editores */
    if (col === 'contenido' && resource === 'Leccion') {
      const tipo = (form.tipo as TipoLeccion) || 'TEXTO'
      const raw = form[col]
      let parsed: unknown = raw

      if (typeof raw === 'string' && raw.trim().startsWith('{')) {
        const p = parseJsonSafe<unknown>(raw)
        parsed = p ?? raw
      }

      // Eliminamos la card que engloba el editor
      return (
        <div key={col} className={hideLabel ? '' : 'flex flex-col space-y-2'}>
          {!hideLabel && (
            <label className="text-sm font-medium text-gray-900">
              {tipo === 'QUIZ'
                ? 'Preguntas y Respuestas'
                : tipo === 'VIDEO'
                ? 'Editor de Video'
                : tipo === 'DOCUMENTO'
                ? 'Editor de Documento'
                : 'Contenido'}
            </label>
          )}
          <div className="space-y-4">
            {tipo === 'QUIZ' ? (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <QuizContentEditor value={(parsed as unknown) ?? {}} onChange={(v) => handle(col, v)} />
              </div>
            ) : tipo === 'TEXTO' ? (
              <TextContentEditor
                value={normalizeTextEditorValue(parsed)}
                onChange={(v) => handle(col, v)}
              />
            ) : tipo === 'VIDEO' ? (
              <div className="p-4">
                <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
                  Contenido de Video
                </h2>
                <VideoContentEditor
                  value={typeof parsed === 'string' ? parsed : JSON.stringify(parsed ?? '')}
                  onChange={(v) => {
                    handle(col, v)
                  }}
                />
              </div>
            ) : tipo === 'DOCUMENTO' ? (
              <div className="p-4">
                <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
                  Contenido de Documento
                </h2>
                <DocContentEditor
                  value={typeof parsed === 'string' ? parsed : JSON.stringify(parsed ?? '')}
                  onChange={(v) => {
                    handle(col, v)
                  }}
                />
              </div>
            ) : (
              <textarea
                value={String(form[col] ?? '')}
                onChange={e => handle(col, e.target.value)}
                rows={6}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 resize-vertical"
              />
            )}
          </div>
        </div>
      )
    }

    /* otros campos */
    const isNumeric = col === 'duracionS' || col === 'orden'
    return (
      <div key={col} className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-900">{col}</label>
        <input
          type={isNumeric ? 'number' : 'text'}
          value={String(form[col] ?? '')}
          onChange={e =>
            handle(col, isNumeric ? Number(e.target.value || 0) : e.target.value)
          }
          min={isNumeric ? 0 : undefined}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
        />
      </div>
    )
  }

  const specialFields = ['contenido']
  const regularFields = visibleColumns.filter(c => !specialFields.includes(c))
  const contentField = visibleColumns.find(c => c === 'contenido')
  const hasDivision = !!contentField

  // Renderizar campos específicos según el tipo de lección
  const renderLeccionTypeSpecificFields = () => {
    if (resource !== 'Leccion') return null
    const tipo = (form.tipo as TipoLeccion) || 'TEXTO'

    switch (tipo) {
      case 'VIDEO':
        return (
          <>
            <div className="col-span-2">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-gray-900">URL del Video</label>
                <input
                  type="text"
                  value={String(form['rutaSrc'] ?? '')}
                  onChange={e => handle('rutaSrc', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="col-span-1">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-gray-900">Duración (segundos)</label>
                <input
                  type="number"
                  value={String(form['duracionS'] ?? '')}
                  onChange={e => handle('duracionS', Number(e.target.value || 0))}
                  min={0}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>
          </>
        )

      case 'DOCUMENTO':
        return (
          <>
            <div className="col-span-2">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-gray-900">URL del Documento</label>
                <input
                  type="text"
                  value={String(form['rutaSrc'] ?? '')}
                  onChange={e => handle('rutaSrc', e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>

            {form['rutaSrc'] && (
              <div className="col-span-2 mt-2">
                <div className="bg-gray-100 rounded-lg p-4 flex items-center">
                  <div className="bg-blue-100 p-3 rounded-full mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-gray-900 truncate">Documento adjunto</p>
                    <p className="text-xs text-gray-500 truncate">
                      {String(form['rutaSrc'])}
                    </p>
                  </div>
                  <a
                    href={String(form['rutaSrc'])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Ver
                  </a>
                </div>
              </div>
            )}
          </>
        )

      case 'TEXTO':
        return (
          <div className="col-span-1">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-900">Duración (segundos)</label>
              <input
                type="number"
                value={String(form['duracionS'] ?? '')}
                onChange={e => handle('duracionS', Number(e.target.value || 0))}
                min={0}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-white min-h-screen p-4">
      <form onSubmit={submit} className="max-w-6xl mx-auto space-y-6" autoComplete="off">
        {hasDivision ? (
          // Con división: Secciones separadas por hr sutil
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-5">
                Configuración
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {regularFields.map((field) => renderField(field))}
                {/* Campos específicos según el tipo de lección */}
                {renderLeccionTypeSpecificFields()}
              </div>
            </div>

            <hr className="border-t border-gray-200 my-6" />

            {contentField && (
              <div className="mb-6">
                {/* Eliminamos el título duplicado de "Contenido" */}
                <div className="w-full">
                  {renderField(contentField, { hideLabel: true })}
                </div>
              </div>
            )}
          </>
        ) : (
          // Sin división: Formulario en dos columnas
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {regularFields.map((field) => renderField(field))}
          </div>
        )}

        <div className="flex justify-center pt-6">
          <button
            type="submit"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}

/* ───────────────────────────── BulkForm (opcional) ───────────────────────────── */

type BulkValue = string | number | boolean
type BulkP = { 
  onSubmit: (field: string, value: BulkValue) => void,
  selectedItems?: Record<string, unknown>[] // Elementos seleccionados para edición múltiple
}

export const BulkForm = memo(function BulkForm({ onSubmit, selectedItems = [] }: BulkP) {
  const [field, setField] = React.useState<string>('')
  const [value, setValue] = React.useState<string>('')
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({})
  
  // Asegurarse de que selectedItems sea un array
  const items = selectedItems || []

  // Expandir/colapsar un elemento específico
  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const send = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(field, value as unknown as BulkValue)
  }

  // Si no hay elementos seleccionados, mostrar el formulario original
  if (!selectedItems || selectedItems.length === 0) {
    return (
      <form onSubmit={send} className="grid grid-cols-1 gap-6">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-gray-900">Campo</label>
          <input
            value={field}
            onChange={e => setField(e.target.value)}
            placeholder="nombreCampo"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-gray-900">Valor</label>
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
        </div>
        <div className="md:col-span-2 flex justify-end pt-4">
          <button
            type="submit"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow"
          >
            Aplicar
          </button>
        </div>
      </form>
    )
  }

  // Mostrar un formulario apilado para cada elemento seleccionado
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
        <p className="text-sm text-blue-700">
          Estás editando <strong>{selectedItems.length}</strong> elementos. Puedes expandir cada uno para ver sus detalles.
        </p>
      </div>

      {/* Formulario común para todos los elementos */}
      <form onSubmit={send} className="grid grid-cols-1 gap-6 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-md font-semibold text-gray-900">Aplicar a todos los elementos seleccionados</h3>
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-gray-900">Campo</label>
          <input
            value={field}
            onChange={e => setField(e.target.value)}
            placeholder="nombreCampo"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-gray-900">Valor</label>
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
        </div>
        <div className="md:col-span-2 flex justify-end pt-4">
          <button
            type="submit"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow"
          >
            Aplicar a todos
          </button>
        </div>
      </form>

      {/* Lista de elementos seleccionados */}
      <div className="space-y-4">
        <h3 className="text-md font-semibold text-gray-900">Elementos seleccionados</h3>
        
        {items.map((item, index) => {
          const itemId = String(item.id || `item-${index}`)
          const isExpanded = expandedItems[itemId] || false
          
          return (
            <div key={itemId} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Cabecera del elemento */}
              <div 
                className="flex justify-between items-center p-4 bg-white cursor-pointer hover:bg-gray-50"
                onClick={() => toggleItem(itemId)}
              >
                <div className="flex items-center space-x-2">
                  <span className="bg-gray-200 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900 truncate">
                    {String(
                      (item as Record<string, unknown>).nombre || 
                      (item as Record<string, unknown>).title || 
                      (item as Record<string, unknown>).name || 
                      `Elemento #${index + 1}`
                    )}
                  </span>
                </div>
                <svg 
                  className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {/* Contenido expandible */}
              {isExpanded && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(item).map(([key, val]) => {
                      if (key === 'id') return null
                      return (
                        <div key={key} className="flex flex-col">
                          <span className="text-xs font-medium text-gray-500">{key}</span>
                          <span className="text-sm text-gray-900 truncate">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})
