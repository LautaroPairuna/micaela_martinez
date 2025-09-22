'use client'

import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/Textarea'
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  ListOrdered, List, Eye, Edit3, Quote, Heading1, Heading2, Heading3
} from 'lucide-react'

interface TextFormat {
  negrita?: boolean
  cursiva?: boolean
  subrayado?: boolean
  alineacion?: 'left' | 'center' | 'right'
}

interface TextContent {
  contenido: string
  formato?: TextFormat
}

interface LegacyTextContent {
  texto: string
  formato?: TextFormat
}

type ValueInput = string | TextContent | LegacyTextContent | null | undefined

interface TextContentEditorProps {
  value: ValueInput
  onChange: (value: string) => void
}

// Type guards
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
function isTextContent(value: unknown): value is TextContent {
  return isRecord(value) && typeof value.contenido === 'string'
}
function isLegacyText(value: unknown): value is LegacyTextContent {
  return isRecord(value) && typeof value.texto === 'string'
}

export function TextContentEditor({ value, onChange }: TextContentEditorProps) {
  const [content, setContent] = useState<TextContent>({ contenido: '' })
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    try {
      if (!value) {
        setContent({ contenido: '' })
        return
      }

      // Si ya viene como objeto
      if (isRecord(value)) {
        if (isTextContent(value)) {
          setContent(value)
          return
        }
        if (isLegacyText(value)) {
          setContent({
            contenido: value.texto,
            formato: value.formato || {}
          })
          return
        }
        // Estructura no reconocida
        setContent({ contenido: '' })
        return
      }

      // Si viene como string
      if (typeof value === 'string' && value.trim()) {
        try {
          const parsed = JSON.parse(value) as unknown
          if (isTextContent(parsed)) {
            setContent(parsed)
          } else if (isLegacyText(parsed)) {
            setContent({ contenido: parsed.texto, formato: parsed.formato || {} })
          } else {
            // String pero no JSON válido para nuestra estructura → texto plano
            setContent({ contenido: value })
          }
        } catch {
          // No es JSON → texto plano
          setContent({ contenido: value })
        }
        return
      }

      // Valor inválido
      setContent({ contenido: '' })
    } catch {
      setContent({ contenido: typeof value === 'string' ? value : '' })
    }
  }, [value])

  const updateContent = (newContent: TextContent) => {
    setContent(newContent)

    // Emitimos el valor en el formato que el backend entiende:
    // - Si el valor original era "legacy" (tiene `texto`), devolvemos { texto, formato }
    // - Si no, devolvemos { contenido, formato }
    let outputContent: TextContent | LegacyTextContent = newContent

    if (isLegacyText(value) && !isTextContent(value)) {
      outputContent = {
        texto: newContent.contenido,
        formato: newContent.formato
      }
    }

    onChange(JSON.stringify(outputContent))
  }

  const toggleFormat = (formatType: keyof TextFormat) => {
    const newContent: TextContent = {
      ...content,
      formato: {
        ...content.formato,
        [formatType]: !content.formato?.[formatType]
      }
    }
    updateContent(newContent)
  }

  const setAlignment = (alignment: 'left' | 'center' | 'right') => {
    const newContent: TextContent = {
      ...content,
      formato: {
        ...content.formato,
        alineacion: alignment
      }
    }
    updateContent(newContent)
  }

  const insertText = (textToInsert: string) => {
    const newContent: TextContent = {
      ...content,
      contenido: content.contenido + textToInsert
    }
    updateContent(newContent)
  }

  const insertBoldText = () => {
    const selectedText = typeof window !== 'undefined' ? window.getSelection()?.toString() || 'texto en negrita' : 'texto en negrita'
    const boldText = `**${selectedText}**`
    insertText(boldText)
  }

  const insertItalicText = () => {
    const selectedText = typeof window !== 'undefined' ? window.getSelection()?.toString() || 'texto en cursiva' : 'texto en cursiva'
    const italicText = `*${selectedText}*`
    insertText(italicText)
  }

  const renderPreview = () => {
    if (!content.contenido) {
      return (
        <div className="text-gray-500 italic p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
          Vista previa aparecerá aquí cuando escribas contenido...
        </div>
      )
    }

    const formatStyle = {
      fontWeight: content.formato?.negrita ? 'bold' : 'normal',
      fontStyle: content.formato?.cursiva ? 'italic' : 'normal',
      textDecoration: content.formato?.subrayado ? 'underline' : 'none',
      textAlign: content.formato?.alineacion || 'left'
    } as React.CSSProperties

    return (
      <div 
        className="prose max-w-none p-4 border border-gray-300 rounded-lg bg-gray-50"
        style={formatStyle}
      >
        {content.contenido.split('\n').map((line, index) => {
          // Procesa negrita y cursiva de markdown inline
          const processInlineMarkdown = (text: string) => {
            let processed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            processed = processed.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
            return processed
          }

          if (line.startsWith('# ')) {
            const processedText = processInlineMarkdown(line.substring(2))
            return <h1 key={index} className="text-3xl font-bold mb-4" dangerouslySetInnerHTML={{ __html: processedText }} />
          } else if (line.startsWith('## ')) {
            const processedText = processInlineMarkdown(line.substring(3))
            return <h2 key={index} className="text-2xl font-bold mb-3" dangerouslySetInnerHTML={{ __html: processedText }} />
          } else if (line.startsWith('### ')) {
            const processedText = processInlineMarkdown(line.substring(4))
            return <h3 key={index} className="text-xl font-bold mb-2" dangerouslySetInnerHTML={{ __html: processedText }} />
          } else if (line.startsWith('- ')) {
            const processedText = processInlineMarkdown(line.substring(2))
            return <li key={index} className="ml-4" dangerouslySetInnerHTML={{ __html: processedText }} />
          } else if (line.startsWith('1. ')) {
            const processedText = processInlineMarkdown(line.substring(3))
            return <li key={index} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: processedText }} />
          } else if (line.startsWith('> ')) {
            const processedText = processInlineMarkdown(line.substring(2))
            return <blockquote key={index} className="border-l-4 border-gray-400 pl-4 italic text-gray-700" dangerouslySetInnerHTML={{ __html: processedText }} />
          } else if (line.trim() === '') {
            return <br key={index} />
          } else {
            const processedText = processInlineMarkdown(line)
            return <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: processedText }} />
          }
        })}
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-2xl border-2 border-gray-900 space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Editor de Contenido de Texto</h3>
            <p className="text-sm text-gray-500">Escribe tu contenido usando formato Markdown simple.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              showPreview 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            {showPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Editar' : 'Vista Previa'}
          </button>
        </div>
      </div>

      {/* Herramientas de formato */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">🎨 Herramientas de Formato</h4>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => toggleFormat('negrita')}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
              content.formato?.negrita 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Bold className="w-4 h-4" />
            Negrita
          </button>
          <button
            type="button"
            onClick={() => toggleFormat('cursiva')}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
              content.formato?.cursiva 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Italic className="w-4 h-4" />
            Cursiva
          </button>
          <button
            type="button"
            onClick={() => toggleFormat('subrayado')}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
              content.formato?.subrayado 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Underline className="w-4 h-4" />
            Subrayado
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Alineación:</span>
            <button
              type="button"
              onClick={() => setAlignment('left')}
              className={`p-2 rounded ${content.formato?.alineacion === 'left' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setAlignment('center')}
              className={`p-2 rounded ${content.formato?.alineacion === 'center' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setAlignment('right')}
              className={`p-2 rounded ${content.formato?.alineacion === 'right' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              <AlignRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Botones de inserción rápida */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-3">⚡ Inserción Rápida</h4>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={insertBoldText}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
          >
            <Bold className="w-4 h-4" />
            **Negrita**
          </button>
          <button
            type="button"
            onClick={insertItalicText}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
          >
            <Italic className="w-4 h-4" />
            *Cursiva*
          </button>
          <button
            type="button"
            onClick={() => insertText('\n# ')}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
          >
            <Heading1 className="w-4 h-4" />
            Título H1
          </button>
          <button
            type="button"
            onClick={() => insertText('\n## ')}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
          >
            <Heading2 className="w-4 h-4" />
            Título H2
          </button>
          <button
            type="button"
            onClick={() => insertText('\n### ')}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
          >
            <Heading3 className="w-4 h-4" />
            Título H3
          </button>
          <button
            type="button"
            onClick={() => insertText('\n- ')}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
          >
            <List className="w-4 h-4" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => insertText('\n1. ')}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
          >
            <ListOrdered className="w-4 h-4" />
            Lista Numerada
          </button>
          <button
            type="button"
            onClick={() => insertText('\n> ')}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
          >
            <Quote className="w-4 h-4" />
            Cita
          </button>
        </div>
      </div>

      {/* Editor o Vista Previa */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-900">
          Contenido
        </label>
        
        {!showPreview ? (
          <Textarea
            value={content.contenido}
            onChange={(e) => updateContent({ ...content, contenido: e.target.value })}
            placeholder={`Escribe tu contenido aquí. Puedes usar formato Markdown:\n\n# Título Principal\n## Subtítulo\n### Título Menor\n\nPárrafo normal con **texto en negrita** y *cursiva*.\n\n- Lista con viñetas\n- Otro elemento\n\n1. Lista numerada\n2. Segundo elemento\n\n> Cita o texto destacado`}
            rows={20}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-vertical text-gray-900"
            style={{
              fontWeight: content.formato?.negrita ? 'bold' : 'normal',
              fontStyle: content.formato?.cursiva ? 'italic' : 'normal',
              textDecoration: content.formato?.subrayado ? 'underline' : 'none',
              textAlign: content.formato?.alineacion || 'left'
            }}
          />
        ) : (
          <div className="min-h-[500px]">
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">📖 Vista Previa</h4>
              <p className="text-xs text-gray-600">Así se verá tu contenido para los estudiantes</p>
            </div>
            {renderPreview()}
          </div>
        )}
      </div>

      {/* Ayuda de formato */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-900 mb-2">💡 Guía de Formato Markdown</h4>
        <div className="text-xs text-yellow-800 space-y-1">
          <p><code>**texto**</code> → <strong>Texto en negrita</strong></p>
          <p><code>*texto*</code> → <em>Texto en cursiva</em></p>
          <p><code># Título</code> → Título principal (H1)</p>
          <p><code>## Subtítulo</code> → Subtítulo (H2)</p>
          <p><code>### Título menor</code> → Título menor (H3)</p>
          <p><code>- Elemento</code> → Lista con viñetas</p>
          <p><code>1. Elemento</code> → Lista numerada</p>
          <p><code>&gt; Texto</code> → Cita o texto destacado</p>
        </div>
      </div>
    </div>
   )
 }

export default TextContentEditor
