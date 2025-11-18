'use client'
import React from 'react'
import Image from 'next/image'
import { Upload, X, Play, Volume2, FileText } from 'lucide-react'
import {
  getFileType,
  getFileTypeFromMime,
  validateFileType,
  type FileType,
} from '../utils/fileFieldDetection'

type Props = {
  /** Puede venir un File nuevo o un string (storedAs o URL previa) */
  value?: File | string | null
  onChange: (v: File | string | null) => void

  /** Tipos permitidos: 'image' | 'video' | 'audio' | 'document' */
  allowedTypes?: FileType[]
  /** Accept HTML personalizado (por defecto se arma desde allowedTypes) */
  accept?: string
  /** Texto en el área de drop */
  dropText?: string
  /** Máximo tamaño en bytes (default dinámico) */
  maxSize?: number
  /** Resolver preview cuando value es string (storedAs → URL) */
  resolvePreviewSrc?: (storedAsOrUrl: string) => string
  /** Callback de error de validación */
  onError?: (msg: string) => void
}

function defaultMaxSize(types: FileType[]) {
  return types.includes('video') ? 300 * 1024 * 1024 : 50 * 1024 * 1024
}

export default function MediaDropzone({
  value,
  onChange,
  allowedTypes = ['image'],
  accept,
  dropText,
  maxSize = defaultMaxSize(allowedTypes),
  resolvePreviewSrc,
  onError,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Mantener/limpiar blob URL
  React.useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value)
      setBlobUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setBlobUrl(null)
  }, [value])

  const acceptString = React.useMemo(() => {
    if (accept) return accept
    const parts: string[] = []
    if (allowedTypes.includes('image')) parts.push('image/*')
    if (allowedTypes.includes('video')) parts.push('video/*')
    if (allowedTypes.includes('audio')) parts.push('audio/*')
    if (allowedTypes.includes('document')) parts.push('.pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.ppt,.pptx')
    return parts.join(',')
  }, [accept, allowedTypes])

  const validate = (file: File): string | null => {
    if (file.size > maxSize) {
      const mb = Math.round(maxSize / (1024 * 1024))
      return `El archivo es demasiado grande. Máximo ${mb}MB`
    }
    if (!validateFileType(file, allowedTypes)) {
      return `Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}`
    }
    return null
  }

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0]
    setError(null)
    if (!f) return

    const v = validate(f)
    if (v) {
      setError(v)
      onError?.(v)
      return
    }
    onChange(f) // ← solo guardamos el File, NO subimos acá
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const previewSrc: string | null = React.useMemo(() => {
    if (value instanceof File) return blobUrl
    if (typeof value === 'string' && value) {
      // Si es URL absoluta o relativa, respetar
      if (/^(\/|https?:\/\/|data:|blob:)/.test(value)) return value
      // Si es storedAs (p.ej. 'leccion/archivo.webp'), usar la ruta relativa
      // que será manejada por el proxy de Next.js
      return resolvePreviewSrc ? resolvePreviewSrc(value) : `/api/images/${value}`
    }
    return null
  }, [value, blobUrl, resolvePreviewSrc])

  const fileType: FileType = React.useMemo(() => {
    if (value instanceof File) return getFileTypeFromMime(value.type)
    if (typeof value === 'string') return getFileType(value)
    return 'unknown'
  }, [value])

  const getDropText = () => {
    if (dropText) return dropText
    const t = allowedTypes.join(' o ')
    return `Arrastrá ${allowedTypes.length > 1 ? 'un archivo' : `una ${t}`} aquí`
  }

  const renderPreview = () => {
    if (!previewSrc) return null
    switch (fileType) {
      case 'video':
        return (
          <div className="relative">
            <video
              src={previewSrc}
              width={160}
              height={160}
              className="rounded-lg border border-gray-200 object-cover shadow-sm"
              muted
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
              <Play className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
          </div>
        )
      case 'audio':
        return (
          <div className="w-40 h-40 bg-emerald-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center shadow-sm">
            <Volume2 className="w-12 h-12 text-emerald-600 mb-2" />
            <span className="text-xs text-emerald-700 font-medium text-center px-2 truncate">
              {value instanceof File ? value.name : (value || '').toString().split('/').pop()}
            </span>
          </div>
        )
      case 'image':
        return (
          <Image
            src={previewSrc}
            alt="Preview"
            width={160}
            height={160}
            className="rounded-lg border border-gray-200 object-cover shadow-sm"
            unoptimized={/^(blob:|data:)/.test(previewSrc)}
          />
        )
      default:
        return (
          <div className="w-40 h-40 bg-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center shadow-sm">
            <FileText className="w-12 h-12 text-gray-600 mb-2" />
            <span className="text-xs text-gray-700 font-medium text-center px-2 truncate">
              {value instanceof File ? value.name : (value || '').toString().split('/').pop()}
            </span>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          'media-dropzone w-full border-2 border-dashed rounded-xl px-6 py-8 text-center transition-all duration-200',
          dragOver ? 'border-blue-400 bg-blue-50 shadow-md cursor-pointer'
                   : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400 cursor-pointer'
        ].join(' ')}
        aria-label={`Zona para arrastrar y soltar ${allowedTypes.join(' o ')}`}
      >
        {previewSrc ? (
          <div className="flex items-center justify-center">{renderPreview()}</div>
        ) : (
          <div className="text-gray-600">
            <div className="flex justify-center mb-3">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <div className="font-medium text-gray-700">{getDropText()}</div>
            <div className="text-sm text-gray-500 mt-1">o hacé clic para seleccionar</div>
            {maxSize && (
              <div className="text-xs text-gray-400 mt-2">
                Tamaño máximo: {Math.round(maxSize / (1024 * 1024))}MB
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Seleccionar archivo
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => { setError(null); onChange(null) }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors text-gray-600 shadow-sm flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Quitar
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptString}
        onChange={e => handleFiles(e.currentTarget.files)}
        className="hidden"
      />
    </div>
  )
}
