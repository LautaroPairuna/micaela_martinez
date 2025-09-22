// src/components/admin/hooks/useFileUpload.ts
'use client'
import { useState, useCallback } from 'react'
import type { FileType } from '../utils/fileFieldDetection'

/* ──────────────────────────────────────────────────────────────
   HOOK PARA MANEJO DE ARCHIVOS (alineado a /admin/uploads)
   – Guarda File|string en el estado
   – Sube con lib/uploadFile (cookies via fetch credentials)
   – Persiste solo el basename en el form
   – Elimina por ID (si la lib lo retorna)
   – Props listas para MediaDropzone
   ────────────────────────────────────────────────────────────── */

export interface UseFileUploadOptions {
  tableName: string
  fieldName: string
  titleHint?: string
  recordId?: string | number
  allowedTypes?: FileType[]
  maxSize?: number
  onSuccess?: (result: UploadResult) => void
  onError?: (error: string) => void
}

export interface UploadResult {
  success: boolean
  file: {
    id?: string
    filename: string        // basename normalizado
    originalName: string
    size: number
    mimeType: string
    fileType: 'image' | 'video' | 'document' | 'other'
    publicUrl?: string
    thumbnailUrl?: string
  }
}

export interface FileUploadState {
  value: File | string | null   // ⬅ compat con MediaDropzone
  uploading: boolean
  error: string | null
  progress: string | null
  lastUploadId: string | null   // para delete por id
  lastPublicUrl?: string | null
  lastThumbUrl?: string | null
}

function basename(p: string) {
  const i = p.lastIndexOf('/')
  return i >= 0 ? p.slice(i + 1) : p
}

function toErrorMessage(e: unknown, fallback = 'Error al subir archivo'): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return fallback
}

/** Tipado defensivo del helper del backend (permite ambas variantes que he visto). */
type UploadLibResponse = {
  ok: boolean
  message?: string
  data?: {
    storedAs: string
    type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'OTHER' | 'imagen' | 'video' | 'documento' | 'doc' | 'otro'
    id?: string
  }
  urls?: {
    original?: string
    thumb?: string
  }
}

export function useFileUpload(options: UseFileUploadOptions) {
  const [state, setState] = useState<FileUploadState>({
    value: null,
    uploading: false,
    error: null,
    progress: null,
    lastUploadId: null,
    lastPublicUrl: null,
    lastThumbUrl: null,
  })

  // desestructuramos para dependencias estables en useCallback
  const {
    tableName,
    fieldName,
    recordId,
    titleHint,
    onSuccess,
    onError,
    allowedTypes,
    maxSize,
  } = options

  const setValue = useCallback((newValue: File | string | null) => {
    setState(prev => ({ ...prev, value: newValue, error: null }))
  }, [])

  const uploadFile = useCallback(async (file: File): Promise<UploadResult | null> => {
    setState(prev => ({ ...prev, uploading: true, error: null, progress: 'Subiendo archivo…' }))
    try {
      // Import lazy para evitar SSR issues
      const mod = await import('@/lib/uploadFile')
      const uploadToServer: (f: File, p: {
        table: string
        field: string
        recordId?: string
        title?: string
        alt?: string
        intent?: 'attach' | 'replace'
      }) => Promise<UploadLibResponse> = mod.uploadFile

      // ⬅️ ahora pasamos `field` (era el error 2345)
      const res = await uploadToServer(file, {
        table: tableName,
        field: fieldName,
        recordId: recordId ? String(recordId) : undefined,
        title: titleHint,
        alt: titleHint,
      })

      if (!res?.ok || !res.data) {
        throw new Error(res?.message || 'Error al subir archivo')
      }

      // backend: { ok, data:{ storedAs, type, id? }, urls:{ original?, thumb? } }
      const storedAs: string = res.data.storedAs
      const id: string | undefined = res.data.id
      const kindRaw = String(res.data.type || '').toLowerCase()

      const kind: UploadResult['file']['fileType'] =
        kindRaw.includes('image') || kindRaw.includes('imagen')
          ? 'image'
          : kindRaw.includes('video')
          ? 'video'
          : kindRaw.includes('doc')
          ? 'document'
          : 'other'

      const name = basename(storedAs)

      const result: UploadResult = {
        success: true,
        file: {
          id,
          filename: name,
          originalName: file.name,
          size: file.size,
          mimeType: file.type,
          fileType: kind,
          publicUrl: res.urls?.original,
          thumbnailUrl: res.urls?.thumb,
        },
      }

      // Guardar solo basename en el form
      setState(prev => ({
        ...prev,
        value: name,
        progress: '¡Completado!',
        lastUploadId: id ?? null,
        lastPublicUrl: result.file.publicUrl || null,
        lastThumbUrl: result.file.thumbnailUrl || null,
      }))

      onSuccess?.(result)

      // limpiar el mensaje de progreso luego de un rato
      setTimeout(() => setState(prev => ({ ...prev, progress: null })), 1500)

      return result
    } catch (e: unknown) {
      const msg = toErrorMessage(e)
      setState(prev => ({ ...prev, error: msg, progress: null }))
      onError?.(msg)
      console.error('[useFileUpload] upload error:', e)
      return null
    } finally {
      setState(prev => ({ ...prev, uploading: false }))
    }
  }, [tableName, fieldName, recordId, titleHint, onSuccess, onError])

  const deleteFile = useCallback(async (id?: string): Promise<boolean> => {
    const targetId = id || state.lastUploadId
    if (!targetId) return false

    try {
      const mod = await import('@/lib/uploadFile')

      type DeleteFn = (uploadId: string) => Promise<{ ok: boolean; message?: string }>

      // Acceso seguro a propiedades dinámicas
      const dict = mod as unknown as Record<string, unknown>
      const maybeDeleteUpload = dict['deleteUpload']
      const maybeDeleteFile = dict['deleteFile']

      let del: DeleteFn | null = null
      if (typeof maybeDeleteUpload === 'function') {
        del = maybeDeleteUpload as DeleteFn
      } else if (typeof maybeDeleteFile === 'function') {
        del = maybeDeleteFile as DeleteFn
      }

      // Si la lib no expone un delete, hacemos “soft clear” local y devolvemos true
      if (!del) {
        setState(prev => ({
          ...prev,
          value: null,
          lastUploadId: null,
          lastPublicUrl: null,
          lastThumbUrl: null,
        }))
        return true
      }

      const res = await del(targetId)
      if (!res?.ok) throw new Error(res?.message || 'Error al eliminar')

      // limpiar estado local
      setState(prev => ({
        ...prev,
        value: null,
        lastUploadId: null,
        lastPublicUrl: null,
        lastThumbUrl: null,
      }))
      return true
    } catch (e) {
      console.error('[useFileUpload] delete error:', e)
      return false
    }
  }, [state.lastUploadId])

  const clearFile = useCallback(() => {
    setState(prev => ({ ...prev, value: null, error: null, progress: null }))
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // estado
    ...state,

    // acciones
    setValue,        // (File|string|null) ← compatible con MediaDropzone
    uploadFile,      // (file: File) => UploadResult|null
    deleteFile,      // (id?: string) => boolean
    clearFile,
    clearError,

    // atajos para pasar directo a <MediaDropzone />
    getDropzoneProps: () => ({
      value: state.value,
      onChange: setValue,
      tableName,
      fieldName,
      titleHint,
      allowedTypes,
      maxSize,
      onUploadComplete: onSuccess,
      onUploadError: onError,
    }),
  }
}

/* ──────────────────────────────────────────────────────────────
   HOOKS ESPECÍFICOS
   ────────────────────────────────────────────────────────────── */
export function useImageUpload(tableName: string, fieldName: string, titleHint?: string) {
  return useFileUpload({
    tableName,
    fieldName,
    titleHint,
    allowedTypes: ['image'],
    maxSize: 50 * 1024 * 1024, // 50MB
  })
}
export function useVideoUpload(tableName: string, fieldName: string, titleHint?: string) {
  return useFileUpload({
    tableName,
    fieldName,
    titleHint,
    allowedTypes: ['video'],
    maxSize: 300 * 1024 * 1024, // 300MB
  })
}
export function useDocumentUpload(tableName: string, fieldName: string, titleHint?: string) {
  return useFileUpload({
    tableName,
    fieldName,
    titleHint,
    allowedTypes: ['document'],
    maxSize: 100 * 1024 * 1024, // 100MB
  })
}
export function useMediaUpload(tableName: string, fieldName: string, titleHint?: string) {
  return useFileUpload({
    tableName,
    fieldName,
    titleHint,
    allowedTypes: ['image', 'video', 'audio'],
    maxSize: 300 * 1024 * 1024,
  })
}
