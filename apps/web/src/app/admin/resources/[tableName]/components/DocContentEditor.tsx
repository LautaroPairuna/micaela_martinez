// apps/web/src/app/admin/resources/[tableName]/components/DocContentEditor.tsx
'use client'
import React, { useState, useEffect } from 'react'
import MediaDropzone from './MediaDropzone'

interface DocContentEditorProps {
  value: string
  onChange: (value: string) => void
}

export const DocContentEditor: React.FC<DocContentEditorProps> = ({ value, onChange }) => {
  const [docUrl, setDocUrl] = useState('')
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  // Limpiar las URLs de objetos al desmontar el componente
  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  useEffect(() => {
    // Inicializar desde el valor existente
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value
      setDocUrl(parsed.docUrl || '')
    } catch (e) {
      // Si no es JSON válido, intentar usar como URL directa
      if (typeof value === 'string' && value.trim()) {
        setDocUrl(value.trim())
      }
    }
  }, [value])

  const updateContent = (newDocUrl: string) => {
    // Simplificado: solo guardamos la URL del documento
    onChange(JSON.stringify({ docUrl: newDocUrl }))
  }

  const handleDocUpload = (file: File | string | null) => {
    if (file instanceof File) {
      try {
        // Limpiar URL anterior si existe
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        
        // Crear nueva URL para el archivo
        const newDocUrl = URL.createObjectURL(file)
        setObjectUrl(newDocUrl) // Guardar para limpieza posterior
        setDocUrl(newDocUrl)
        updateContent(newDocUrl)
      } catch (error) {
        console.error("Error al procesar el archivo de documento:", error);
      }
    } else if (typeof file === 'string') {
      setDocUrl(file)
      updateContent(file)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">Subir Documento</h3>
        <MediaDropzone 
          onChange={handleDocUpload}
          allowedTypes={['document']}
          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
        />
      </div>
      
      {docUrl && (
        <div className="mt-4 bg-gray-100 rounded-lg p-4 flex items-center">
          <div className="bg-blue-100 p-3 rounded-full mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium text-gray-900 truncate">Documento adjunto</p>
            <p className="text-xs text-gray-500 truncate">{docUrl}</p>
          </div>
          <a 
            href={docUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Ver
          </a>
        </div>
      )}
    </div>
  )
}