// apps/web/src/app/admin/resources/[tableName]/components/VideoContentEditor.tsx
'use client'
import React, { useState, useEffect } from 'react'
import MediaDropzone from './MediaDropzone'

interface VideoContentEditorProps {
  value: string
  onChange: (value: string) => void
}

export const VideoContentEditor: React.FC<VideoContentEditorProps> = ({ value, onChange }) => {
  const [videoUrl, setVideoUrl] = useState('')
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
      setVideoUrl(parsed.videoUrl || '')
    } catch (e) {
      // Si no es JSON válido, intentar usar como URL directa
      if (typeof value === 'string' && value.trim()) {
        setVideoUrl(value.trim())
      }
    }
  }, [value])

  const updateContent = (newVideoUrl: string) => {
    // Simplificado: solo guardamos la URL del video
    onChange(JSON.stringify({ videoUrl: newVideoUrl }))
  }

  const handleVideoUpload = (file: File | string | null) => {
    if (file instanceof File) {
      try {
        // Limpiar URL anterior si existe
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        
        // Crear nueva URL para el archivo
        const newVideoUrl = URL.createObjectURL(file)
        setObjectUrl(newVideoUrl) // Guardar para limpieza posterior
        setVideoUrl(newVideoUrl)
        updateContent(newVideoUrl)
      } catch (error) {
        console.error("Error al procesar el archivo de video:", error);
      }
    } else if (typeof file === 'string') {
      setVideoUrl(file)
      updateContent(file)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <MediaDropzone 
          onChange={handleVideoUpload}
          allowedTypes={['video']}
          accept="video/*"
        />
      </div>
      
      {videoUrl && (
        <div className="mt-4">
          <div className="mb-2 p-2 bg-blue-50 text-blue-700 rounded-md">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Video cargado correctamente</span>
            </div>
          </div>
          
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="w-full max-w-2xl mx-auto">
              <div className="relative pb-[56.25%] h-0">
                {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                  <iframe 
                    src={videoUrl.replace('watch?v=', 'embed/')} 
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <video 
                    src={videoUrl} 
                    controls 
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}