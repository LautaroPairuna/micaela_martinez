'use client'
import React from 'react'
import Image from 'next/image'
import { Play, FileText, Volume2 } from 'lucide-react'
import { getFileType, type FileType } from '../utils/fileFieldDetection'

/** Placeholder inline para imágenes */
const IMAGE_PLACEHOLDER_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="100%" height="100%" fill="#e5e7eb"/>
  <g fill="#9ca3af">
    <rect x="10" y="42" width="44" height="12" rx="2"/>
    <circle cx="20" cy="22" r="10"/>
    <path d="M10 44 L26 28 L36 36 L54 18 L54 44 Z" fill="#d1d5db"/>
  </g>
</svg>
`)

/** Placeholder inline para videos */
const VIDEO_PLACEHOLDER_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="100%" height="100%" fill="#1f2937"/>
  <circle cx="32" cy="32" r="16" fill="#374151"/>
  <polygon points="26,22 26,42 42,32" fill="#9ca3af"/>
</svg>
`)

/** Placeholder inline para audio */
const AUDIO_PLACEHOLDER_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="100%" height="100%" fill="#065f46"/>
  <g fill="#10b981">
    <rect x="20" y="30" width="4" height="20" rx="2"/>
    <rect x="28" y="25" width="4" height="30" rx="2"/>
    <rect x="36" y="20" width="4" height="40" rx="2"/>
    <rect x="44" y="28" width="4" height="24" rx="2"/>
  </g>
</svg>
`)

const IMAGE_PLACEHOLDER_URL = `data:image/svg+xml;utf8,${IMAGE_PLACEHOLDER_SVG}`
const VIDEO_PLACEHOLDER_URL = `data:image/svg+xml;utf8,${VIDEO_PLACEHOLDER_SVG}`
const AUDIO_PLACEHOLDER_URL = `data:image/svg+xml;utf8,${AUDIO_PLACEHOLDER_SVG}`

export function MediaCell({
  tableName,
  childRelation,
  fileName,
}: {
  tableName: string
  childRelation?: { childTable: string } | null
  fileName: string
}) {
  const fileType = getFileType(fileName)
  
  // Construir URLs usando el nuevo sistema de tableName routes
  const tableToUse = childRelation?.childTable ?? tableName
  
  // URL para thumbnail usando query parameters
  const thumbSrc = `/api/admin/resources/${tableToUse}?file=${encodeURIComponent(fileName)}&thumb=true`
  
  // URL para archivo original usando query parameters
  const fullSrc = `/api/admin/resources/${tableToUse}?file=${encodeURIComponent(fileName)}`
  
  const [src, setSrc] = React.useState<string>(thumbSrc)
  const [isPlaceholder, setIsPlaceholder] = React.useState(false)
  const [currentFileType, setCurrentFileType] = React.useState<FileType>(fileType)

  React.useEffect(() => {
    // Si cambia el fileName/tabla, reseteamos el ciclo
    const newFileType = getFileType(fileName)
    setCurrentFileType(newFileType)
    setSrc(thumbSrc)
    setIsPlaceholder(false)
  }, [thumbSrc, fileName, tableName, childRelation])

  const handleErr = React.useCallback(() => {
    setSrc(prev => {
      if (prev === thumbSrc) {
        // 1) Si falla el thumb, probamos el archivo original
        return fullSrc
      }
      if (prev === fullSrc) {
        // 2) Si también falla el original, usamos placeholder apropiado
        setIsPlaceholder(true)
        switch (currentFileType) {
          case 'video': return VIDEO_PLACEHOLDER_URL
          case 'audio': return AUDIO_PLACEHOLDER_URL
          default: return IMAGE_PLACEHOLDER_URL
        }
      }
      // 3) Si falla el placeholder, mantenemos último valor
      return prev
    })
  }, [thumbSrc, fullSrc, currentFileType])

  const getIcon = () => {
    if (isPlaceholder) {
      switch (currentFileType) {
        case 'video': return <Play className="w-4 h-4 text-gray-500" />
        case 'audio': return <Volume2 className="w-4 h-4 text-gray-500" />
        default: return null
      }
    }
    return null
  }

  const getAltText = () => {
    if (isPlaceholder) {
      switch (currentFileType) {
        case 'video': return `Sin video (${fileName})`
        case 'audio': return `Sin audio (${fileName})`
        default: return `Sin imagen (${fileName})`
      }
    }
    return fileName
  }

  const getTypeIndicator = () => {
    if (!isPlaceholder && currentFileType !== 'image') {
      switch (currentFileType) {
        case 'video':
          return (
            <div className="absolute top-1 right-1 bg-black/70 rounded px-1.5 py-0.5">
              <Play className="w-3 h-3 text-white" />
            </div>
          )
        case 'audio':
          return (
            <div className="absolute top-1 right-1 bg-green-600/70 rounded px-1.5 py-0.5">
              <Volume2 className="w-3 h-3 text-white" />
            </div>
          )
        default:
          return (
            <div className="absolute top-1 right-1 bg-gray-600/70 rounded px-1.5 py-0.5">
              <FileText className="w-3 h-3 text-white" />
            </div>
          )
      }
    }
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        {currentFileType === 'video' && !isPlaceholder ? (
          <video
            src={src}
            width={64}
            height={64}
            className="object-cover rounded-lg shadow-sm border border-gray-200"
            onError={handleErr}
            muted
            preload="metadata"
          />
        ) : (
          <Image
            src={src}
            alt={getAltText()}
            width={64}
            height={64}
            className="object-cover rounded-lg shadow-sm border border-gray-200"
            onError={handleErr}
            unoptimized={src.startsWith('data:')}
          />
        )}
        {getTypeIndicator()}
        {isPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center">
            {getIcon()}
          </div>
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-gray-600 truncate font-medium" style={{ maxWidth: 100 }}>
          {fileName}
        </span>
        {currentFileType !== 'image' && (
          <span className="text-xs text-gray-400 capitalize">
            {currentFileType}
          </span>
        )}
      </div>
    </div>
  )
}

// Mantener compatibilidad con el nombre anterior
export { MediaCell as FotoCell }