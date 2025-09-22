'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, MoveUp, MoveDown, CheckCircle, HelpCircle, CheckCircle2 } from 'lucide-react'

interface QuizOption {
  texto: string
}

interface QuizQuestion {
  id: string
  pregunta: string
  opciones: QuizOption[]
  respuesta: number
  explicacion?: string
}

interface QuizConfig {
  mostrarResultados: boolean
  permitirReintentos: boolean
  puntuacionMinima?: number
  tipoQuiz?: 'simple' | 'multiple'
}

interface QuizContent {
  preguntas: QuizQuestion[]
  configuracion?: QuizConfig
}

interface QuizContentEditorProps {
  value: string | object
  onChange: (value: string) => void
}

/* ───────────────────────────── Helpers de tipeo ───────────────────────────── */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

function toStringSafe(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function toNumberIndex(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

function toQuizOption(v: unknown): QuizOption {
  if (isRecord(v) && typeof v.texto === 'string') {
    return { texto: v.texto }
  }
  // Si vienen strings sueltos como opciones
  if (typeof v === 'string') return { texto: v }
  return { texto: '' }
}

function normalizeOpciones(v: unknown): QuizOption[] {
  if (isArray(v)) {
    return v.map(toQuizOption)
  }
  // Algunas estructuras legacy traían `opciones: string[]` o incluso undefined
  return []
}

function toQuizQuestion(v: unknown, index: number): QuizQuestion {
  if (!isRecord(v)) {
    return {
      id: `pregunta_${Date.now()}_${index}`,
      pregunta: '',
      opciones: [],
      respuesta: 0,
    }
  }

  const id =
    typeof v.id === 'string' && v.id.trim()
      ? v.id
      : `pregunta_${Date.now()}_${index}`

  const pregunta = toStringSafe(v.pregunta)
  const opciones = normalizeOpciones(v.opciones)

  // Soporta respuestaCorrecta (nuevo) y respuesta (legacy)
  const respuesta =
    v.respuestaCorrecta !== undefined
      ? toNumberIndex(v.respuestaCorrecta, 0)
      : toNumberIndex(v.respuesta, 0)

  const explicacion =
    typeof v.explicacion === 'string' ? v.explicacion : undefined

  // Clamp del índice de respuesta al rango de opciones
  const respuestaClamped =
    opciones.length > 0 ? Math.max(0, Math.min(respuesta, opciones.length - 1)) : 0

  return { id, pregunta, opciones, respuesta: respuestaClamped, explicacion }
}

function mergeConfig(base: QuizConfig, extra: unknown): QuizConfig {
  if (!isRecord(extra)) return base
  return {
    mostrarResultados:
      typeof extra.mostrarResultados === 'boolean'
        ? extra.mostrarResultados
        : base.mostrarResultados,
    permitirReintentos:
      typeof extra.permitirReintentos === 'boolean'
        ? extra.permitirReintentos
        : base.permitirReintentos,
    puntuacionMinima:
      typeof extra.puntuacionMinima === 'number'
        ? extra.puntuacionMinima
        : base.puntuacionMinima,
    tipoQuiz:
      extra.tipoQuiz === 'simple' || extra.tipoQuiz === 'multiple'
        ? extra.tipoQuiz
        : base.tipoQuiz,
  }
}

/* ───────────────────────────────── Component ──────────────────────────────── */

export function QuizContentEditor({ value, onChange }: QuizContentEditorProps) {
  const [content, setContent] = useState<QuizContent>({
    preguntas: [],
    configuracion: {
      mostrarResultados: true,
      permitirReintentos: false,
      puntuacionMinima: 70,
    },
  })

  useEffect(() => {
    const defaultContent: QuizContent = {
      preguntas: [],
      configuracion: {
        mostrarResultados: true,
        permitirReintentos: false,
        puntuacionMinima: 70,
        tipoQuiz: 'multiple',
      },
    }

    try {
      if (!value) {
        setContent(defaultContent)
        return
      }

      let parsed: unknown = value

      if (typeof value === 'string' && value.trim()) {
        try {
          parsed = JSON.parse(value) as unknown
        } catch {
          setContent(defaultContent)
          return
        }
      }

      if (!isRecord(parsed)) {
        setContent(defaultContent)
        return
      }

      // target containers
      let preguntas: QuizQuestion[] = []
      let configuracion: QuizConfig = { ...defaultContent.configuracion! }

      // Caso 1: Formato unificado { tipo: 'QUIZ', data: { preguntas, configuracion } }
      if (parsed.tipo === 'QUIZ' && isRecord(parsed.data)) {
        const data = parsed.data
        if (isArray(data.preguntas)) {
          preguntas = data.preguntas.map((q, i) => toQuizQuestion(q, i))
        }
        configuracion = mergeConfig(configuracion, data.configuracion)
      }
      // Caso 2: Legacy con clave 'quiz' (una pregunta simple)
      else if (isRecord(parsed.quiz)) {
        const quizData = parsed.quiz
        preguntas = [toQuizQuestion(quizData, 0)]
        configuracion = mergeConfig(configuracion, parsed.configuracion)
      }
      // Caso 3: Estructura con array de preguntas
      else if (isArray(parsed.preguntas)) {
        preguntas = parsed.preguntas.map((q, i) => toQuizQuestion(q, i))
        configuracion = mergeConfig(configuracion, parsed.configuracion)
      }
      // Caso 4: Estructura con preguntas = objeto único
      else if (isRecord(parsed.preguntas)) {
        preguntas = [toQuizQuestion(parsed.preguntas, 0)]
        configuracion = mergeConfig(configuracion, parsed.configuracion)
      } else {
        // Si no matchea ninguno, usar default
        preguntas = []
      }

      setContent({
        preguntas,
        configuracion: {
          ...configuracion,
          tipoQuiz: preguntas.length === 1 ? 'simple' : 'multiple',
        },
      })
    } catch {
      setContent({
        preguntas: [],
        configuracion: {
          mostrarResultados: true,
          permitirReintentos: false,
          puntuacionMinima: 70,
          tipoQuiz: 'multiple',
        },
      })
    }
  }, [value])

  const updateContent = (newContent: QuizContent) => {
    setContent(newContent)

    const outputContent = {
      tipo: 'QUIZ' as const,
      data: {
        configuracion: {
          mostrarResultados: newContent.configuracion?.mostrarResultados ?? true,
          permitirReintentos: newContent.configuracion?.permitirReintentos ?? false,
          puntajeMinimo: newContent.configuracion?.puntuacionMinima ?? 70,
        },
        preguntas: newContent.preguntas.map((pregunta) => ({
          pregunta: pregunta.pregunta,
          opciones: pregunta.opciones.map((o) => o.texto),
          respuestaCorrecta: pregunta.respuesta,
          explicacion: pregunta.explicacion ?? '',
        })),
      },
    }

    onChange(JSON.stringify(outputContent, null, 2))
  }

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      pregunta: '',
      opciones: [{ texto: '' }, { texto: '' }],
      respuesta: 0,
    }
    updateContent({
      ...content,
      preguntas: [...content.preguntas, newQuestion],
    })
  }

  const updateQuestion = <K extends keyof QuizQuestion>(
    id: string,
    field: K,
    value: QuizQuestion[K]
  ) => {
    const updatedPreguntas = content.preguntas.map((q) =>
      q.id === id ? { ...q, [field]: value } : q
    )
    updateContent({ ...content, preguntas: updatedPreguntas })
  }

  const deleteQuestion = (id: string) => {
    const updatedPreguntas = content.preguntas.filter((q) => q.id !== id)
    updateContent({ ...content, preguntas: updatedPreguntas })
  }

  const moveQuestion = (id: string, direction: 'up' | 'down') => {
    const currentIndex = content.preguntas.findIndex((q) => q.id === id)
    if (
      currentIndex < 0 ||
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === content.preguntas.length - 1)
    ) {
      return
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const updatedPreguntas = [...content.preguntas]
    const [movedQuestion] = updatedPreguntas.splice(currentIndex, 1)
    updatedPreguntas.splice(newIndex, 0, movedQuestion)
    updateContent({ ...content, preguntas: updatedPreguntas })
  }

  const addOption = (questionId: string) => {
    const question = content.preguntas.find((q) => q.id === questionId)
    if (question && question.opciones.length < 6) {
      const updatedOpciones = [...question.opciones, { texto: '' }]
      updateQuestion(questionId, 'opciones', updatedOpciones)
    }
  }

  const updateOption = (questionId: string, optionIndex: number, texto: string) => {
    const question = content.preguntas.find((q) => q.id === questionId)
    if (question) {
      const updatedOpciones = question.opciones.map((opt, idx) =>
        idx === optionIndex ? { texto } : opt
      )
      updateQuestion(questionId, 'opciones', updatedOpciones)
    }
  }

  const deleteOption = (questionId: string, optionIndex: number) => {
    const question = content.preguntas.find((q) => q.id === questionId)
    if (question && question.opciones.length > 2) {
      const updatedOpciones = question.opciones.filter((_, idx) => idx !== optionIndex)
      updateQuestion(questionId, 'opciones', updatedOpciones)

      // Ajustar respuesta correcta si es necesario
      let newRespuesta = question.respuesta
      if (question.respuesta === optionIndex) {
        newRespuesta = 0
      } else if (question.respuesta > optionIndex) {
        newRespuesta = question.respuesta - 1
      }
      newRespuesta = Math.max(0, Math.min(newRespuesta, updatedOpciones.length - 1))
      updateQuestion(questionId, 'respuesta', newRespuesta)
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl border-2 border-gray-900 space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Editor de Quiz</h3>
            <p className="text-sm text-gray-500">
              Crea preguntas de opción múltiple para evaluar el conocimiento.
            </p>
          </div>
          <button
            type="button"
            onClick={addQuestion}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar Pregunta
          </button>
        </div>
      </div>

      {/* Configuración del Quiz */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          Configuración del Quiz
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="mostrarResultados"
              checked={content.configuracion?.mostrarResultados || false}
              onChange={(e) =>
                updateContent({
                  ...content,
                  configuracion: {
                    ...content.configuracion!,
                    mostrarResultados: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="mostrarResultados" className="text-sm text-gray-700 font-medium">
              Mostrar resultados al finalizar
            </label>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="permitirReintentos"
              checked={content.configuracion?.permitirReintentos || false}
              onChange={(e) =>
                updateContent({
                  ...content,
                  configuracion: {
                    ...content.configuracion!,
                    permitirReintentos: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="permitirReintentos" className="text-sm text-gray-700 font-medium">
              Permitir reintentos
            </label>
          </div>
          <div className="flex items-center space-x-3">
            <label
              htmlFor="puntuacionMinima"
              className="text-sm text-gray-700 font-medium whitespace-nowrap"
            >
              Puntuación mínima (%):
            </label>
            <input
              id="puntuacionMinima"
              type="number"
              min={0}
              max={100}
              value={content.configuracion?.puntuacionMinima ?? 70}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10)
                updateContent({
                  ...content,
                  configuracion: {
                    ...content.configuracion!,
                    puntuacionMinima: Number.isFinite(n) ? n : 70,
                  },
                })
              }}
              className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Lista de preguntas */}
      <div className="space-y-4">
        {content.preguntas.map((question, questionIndex) => (
          <div key={question.id} className="group bg-white border border-gray-300 rounded-lg p-4">
            {/* Header de la pregunta */}
            <div className="pb-3 border-b border-gray-300 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded bg-gray-700 text-white">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-gray-900">Pregunta {questionIndex + 1}</h4>
                    <p className="text-xs text-gray-600">{question.opciones.length} opciones • 1 correcta</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => moveQuestion(question.id, 'up')}
                    disabled={questionIndex === 0}
                    className="h-8 w-8 p-0 bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    title="Mover arriba"
                  >
                    <MoveUp className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(question.id, 'down')}
                    disabled={questionIndex === content.preguntas.length - 1}
                    className="h-8 w-8 p-0 bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    title="Mover abajo"
                  >
                    <MoveDown className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteQuestion(question.id)}
                    className="h-8 w-8 p-0 bg-white border border-red-300 rounded hover:bg-red-50 hover:border-red-400 transition-colors text-red-600 hover:text-red-700 flex items-center justify-center"
                    title="Eliminar pregunta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Contenido de la pregunta */}
            <div className="space-y-4">
              {/* Texto de la pregunta */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Texto de la pregunta</label>
                <textarea
                  value={question.pregunta}
                  onChange={(e) => updateQuestion(question.id, 'pregunta', e.target.value)}
                  placeholder="Escribe aquí la pregunta que quieres hacer..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-vertical text-gray-900"
                />
              </div>

              {/* Opciones de respuesta */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-900">Opciones de respuesta</label>
                  <button
                    type="button"
                    onClick={() => addOption(question.id)}
                    disabled={question.opciones.length >= 6}
                    className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                    Agregar Opción
                  </button>
                </div>
                <div className="space-y-3">
                  {question.opciones.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`flex items-center gap-3 p-3 border rounded transition-colors ${
                        question.respuesta === optionIndex
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => updateQuestion(question.id, 'respuesta', optionIndex)}
                        className={`h-8 w-8 p-0 rounded border transition-colors flex items-center justify-center ${
                          question.respuesta === optionIndex
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                            : 'bg-white hover:bg-green-50 border-gray-300 hover:border-green-400 text-gray-700'
                        }`}
                        title={
                          question.respuesta === optionIndex
                            ? 'Respuesta correcta'
                            : 'Marcar como correcta'
                        }
                      >
                        {question.respuesta === optionIndex ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={option.texto}
                          onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                          placeholder={`Opción ${optionIndex + 1}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteOption(question.id, optionIndex)}
                        className="h-8 w-8 p-0 bg-white border border-red-300 rounded hover:bg-red-50 hover:border-red-400 transition-colors text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        disabled={question.opciones.length <= 2}
                        title="Eliminar opción"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explicación opcional */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Explicación (opcional):
                </label>
                <textarea
                  value={question.explicacion || ''}
                  onChange={(e) => updateQuestion(question.id, 'explicacion', e.target.value)}
                  placeholder="Explicación de la respuesta correcta..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-vertical text-gray-900"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estado vacío */}
      {content.preguntas.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <HelpCircle className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Sin preguntas</h4>
                <p className="text-sm text-gray-600 max-w-md">
                  Comienza creando preguntas para tu quiz. Cada pregunta puede tener múltiples
                  opciones y puedes marcar cuáles son las respuestas correctas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {content.preguntas.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-sm text-blue-900 font-medium">
            📊 Total de preguntas: {content.preguntas.length}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Asegúrate de que cada pregunta tenga al menos 2 opciones y una respuesta correcta
            seleccionada.
          </p>
        </div>
      )}
    </div>
  )
}
