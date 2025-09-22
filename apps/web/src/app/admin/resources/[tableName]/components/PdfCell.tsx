'use client'
import React from 'react'
import Image from 'next/image'
import { FileText } from 'lucide-react'
import { folderNames } from '@/lib/adminConstants'

/** Placeholder inline para PDFs */
const PDF_PLACEHOLDER_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="100%" height="100%" fill="#f3f4f6"/>
  <g fill="#6b7280">
    <rect x="20" y="16" width="24" height="32" rx="2" fill="none" stroke="#6b7280" stroke-width="2"/>
    <path d="M24 24 L40 24 M24 28 L40 28 M24 32 L40 32 M24 36 L36 36" stroke="#6b7280" stroke-width="1"/>
  </g>
</svg>
`)

const PDF_PLACEHOLDER_URL = `data:image/svg+xml;utf8,${PDF_PLACEHOLDER_SVG}`

export function PdfCell({
  tableName,
  childRelation,
  fileName,
}: {
  tableName: string
  childRelation?: { childTable: string } | null
  fileName: string
}) {
  const key = (folderNames as Record<string, string>)[childRelation?.childTable ?? tableName]
  const pdfSrc = `/api/disk-images/${key}/${fileName}`
  
  const [src, setSrc] = React.useState<string>(pdfSrc)
  const [isPlaceholder, setIsPlaceholder] = React.useState(false)

  React.useEffect(() => {
    // Si cambia el fileName/tabla, reseteamos el estado
    setSrc(pdfSrc)
    setIsPlaceholder(false)
  }, [pdfSrc])

  const handleErr = React.useCallback(() => {
    // Si falla cargar el PDF desde disk-images, usamos placeholder
    setIsPlaceholder(true)
    setSrc(PDF_PLACEHOLDER_URL)
  }, [])

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <Image
          src={src}
          alt={isPlaceholder ? `Sin PDF (${fileName})` : fileName}
          width={64}
          height={64}
          className="object-cover rounded-lg shadow-sm border border-gray-200"
          onError={handleErr}
          unoptimized={src.startsWith('data:')}
        />

      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-gray-600 truncate font-medium" style={{ maxWidth: 100 }}>
          {fileName}
        </span>
        <span className="text-xs text-gray-400">
          pdf
        </span>
      </div>
    </div>
  )
}