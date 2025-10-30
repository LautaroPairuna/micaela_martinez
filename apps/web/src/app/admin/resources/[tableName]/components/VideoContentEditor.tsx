'use client'

import React, { useEffect, useMemo, useState } from 'react'
import MediaDropzone from './MediaDropzone'
import { uploadFile } from '@/lib/uploadFile'
import { useToast } from '@/contexts/ToastContext'
import { getSecureVideoUrl } from '@/lib/media-utils'

type VideoContentEditorProps = {
  /** Puede venir string (JSON stringificado) o el propio string con URL interna */
  value: string
  onChange: (value: string) => void

  /** Dónde se guarda en tu API (para el nombre y carpeta) */
  tableName: string            // p.ej. 'Leccion'
  fieldName: string            // p.ej. 'videoSrc'
  recordId?: string            // id del registro (para slug server-side)

  /** Para nombrar el archivo si el slug del registro aún no existe */
  titleHint?: string           // p.ej. el título de la lección
}

type ParsedValue = { videoUrl?: string; videoFile?: string }

function parseValueSafe(raw: string): ParsedValue {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      ('videoUrl' in (parsed as Record<string, unknown>) || 'videoFile' in (parsed as Record<string, unknown>))
    ) {
      const v = (parsed as Record<string, unknown>).videoUrl
      const f = (parsed as Record<string, unknown>).videoFile
      return { videoUrl: typeof v === 'string' ? v : '', videoFile: typeof f === 'string' ? f : '' }
    }
    return { videoUrl: '', videoFile: '' }
  } catch {
    return { videoUrl: '', videoFile: '' }
  }
}

export const VideoContentEditor: React.FC<VideoContentEditorProps> = ({
  value,
  onChange,
  tableName,
  fieldName,
  recordId,
  titleHint,
}) => {
  const { error: toastError, success: toastSuccess } = useToast()
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  // Limpiar blob URL al desmontar
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  // Parse inicial del valor (JSON con {videoFile} preferido, o {videoUrl} legacy) y normalizar a URL segura
  useEffect(() => {
    const parsed = parseValueSafe(value)
    const base = (parsed.videoFile || parsed.videoUrl || '').trim()
    if (!base) {
      setVideoUrl('')
      return
    }
    // Si la URL no es interna segura, la normalizamos
    if (!base.startsWith('/api/media/videos/')) {
      // Soportar rutas antiguas tipo /uploads/media/<file>
      getSecureVideoUrl(base)
        .then((secure) => setVideoUrl(secure || base))
        .catch(() => setVideoUrl(base))
    } else {
      setVideoUrl(base)
    }
  }, [value])

  // Persistimos SOLO el nombre del archivo
  const persistFile = (fileName: string) => {
    onChange(JSON.stringify({ videoFile: fileName }))
  }

  const handleVideoUpload = async (fileOrString: File | string | null) => {
    setUploadError(null)

    // Política: NO se aceptan URLs externas. Sólo archivo subido.
    if (!fileOrString) {
      setVideoUrl('')
      persistFile('')
      return
    }

    if (typeof fileOrString === 'string') {
      setUploadError('Solo se aceptan archivos de video subidos desde tu equipo.')
      toastError?.('Carga de video', 'Solo se aceptan archivos locales, no URLs externas.')
      return
    }

    const file = fileOrString

    // Preview temporal local mientras sube
    const tmp = URL.createObjectURL(file)
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    setObjectUrl(tmp)
    setVideoUrl(tmp)

    try {
      setIsUploading(true)

      // Subir ya mismo al backend
      const res = await uploadFile(file, {
        table: tableName,
        field: fieldName,
        recordId,
        title: titleHint || tableName,
        alt: titleHint || tableName,
        intent: 'replace', // ← clave: queremos reemplazo determinístico
      })

      if (!res?.ok || !res?.data?.storedAs) {
        throw new Error(res?.error || 'Respuesta inválida del servidor')
      }

      // Construimos URL segura hacia tu proxy Next => Nest
      const storedAs = res.data.storedAs // ej: "mi-leccion.mp4"
      const secureUrl = `/api/media/videos/${encodeURIComponent(storedAs)}`

      setVideoUrl(secureUrl)
      persistFile(storedAs)
      toastSuccess?.('Video cargado', 'El video se subió correctamente.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo subir el video'
      // revertimos preview
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setObjectUrl(null)
      setVideoUrl('')
      persistFile('')
      setUploadError(msg)
      toastError?.('Error al subir', msg)
    } finally {
      setIsUploading(false)
    }
  }

  const hasValidInternalUrl = useMemo(() => {
    if (!videoUrl) return false
    // Permitimos SOLO rutas internas proxied por Next (no http/https externos)
    return videoUrl.startsWith('/api/media/videos/') || videoUrl.startsWith('blob:')
  }, [videoUrl])

  return (
    <div className="space-y-4">
      {/* Dropzone estrictamente para videos */}
      <div className="flex flex-col space-y-2">
        <MediaDropzone
          value={null} // siempre forzamos a subir; no mostramos valor previo como File/string aquí
          onChange={handleVideoUpload}
          allowedTypes={['video']}
          accept="video/*"
          dropText={isUploading ? 'Subiendo video...' : 'Arrastrá un video aquí o hacé clic para seleccionar'}
          onError={(msg) => setUploadError(msg)}
        />
        {uploadError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {uploadError}
          </div>
        )}
      </div>

      {/* Estado / alerta */}
      {isUploading && (
        <div className="bg-blue-50 text-blue-700 rounded-md px-3 py-2 text-sm border border-blue-200">
          Subiendo video, por favor esperá...
        </div>
      )}

      {/* Vista previa (solo si la URL final es interna segura o si hay blob temporal durante la subida) */}
      {videoUrl && (
        <div className="mt-2">
          {hasValidInternalUrl ? (
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="w-full max-w-2xl mx-auto">
                <div className="relative pb-[56.25%] h-0">
                  <video
                    src={videoUrl}
                    controls
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                    preload="metadata"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 text-yellow-800 rounded-md px-3 py-2 text-sm border border-yellow-200">
              La URL no es válida o no es interna. Vuelve a subir el archivo.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
