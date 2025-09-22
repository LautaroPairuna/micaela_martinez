'use client';

import { useState } from 'react';
import { CheckCircle, Circle, FileText, HelpCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn, formatDuration } from '@/lib/utils';

type Lesson = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  duracionS?: number | null;
  rutaSrc?: string | null;
  tipo?: 'VIDEO' | 'TEXTO' | 'QUIZ';
};

type LessonContentProps = {
  lesson: Lesson;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
  onComplete?: () => void;
};



// Componente para contenido de texto
function TextContent({ lesson, isCompleted = false, onToggleComplete, onComplete }: LessonContentProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header de la lección */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Lección de texto</span>
            {lesson.duracionS && (
              <>
                <span>•</span>
                <span>{formatDuration(lesson.duracionS)}</span>
              </>
            )}
          </div>
        </div>
        
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{lesson.titulo}</h1>
      </div>

      {/* Contenido de la lección - Ocupa todo el espacio disponible */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="h-full p-4 md:p-6 lg:p-8 pb-20">
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 lg:p-8 h-full min-h-full">
            {lesson.descripcion ? (
              <div className="prose prose-lg prose-gray max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-base md:text-lg">
                  {lesson.descripcion}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-6 opacity-50" />
                <p className="text-lg">No hay contenido disponible para esta lección.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acciones de completado - Fijo en la parte inferior */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onToggleComplete}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                  isCompleted
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {isCompleted ? (
                   <CheckCircle className="w-5 h-5" />
                 ) : (
                   <Circle className="w-5 h-5" />
                 )}
                {isCompleted ? "Completada" : "Marcar como completada"}
              </button>
            </div>
            
            {!isCompleted && (
              <button
                onClick={onComplete}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Continuar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para quiz
function QuizContent({ lesson, isCompleted = false, onToggleComplete, onComplete }: LessonContentProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Quiz de ejemplo - en una implementación real esto vendría de la API
  const quizData = {
    question: "¿Cuál es el concepto principal de esta lección?",
    options: [
      "Opción A: Concepto básico",
      "Opción B: Concepto intermedio",
      "Opción C: Concepto avanzado",
      "Opción D: Todos los anteriores"
    ],
    correctAnswer: 3
  };

  const handleSubmit = () => {
    setShowResult(true);
    if (selectedAnswer === quizData.correctAnswer) {
      onComplete?.();
    }
  };

  const handleRetry = () => {
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleToggleComplete = () => {
    onToggleComplete?.();
  };

  return (
    <div className="h-full w-full bg-white text-gray-900 overflow-auto">
      <div className="h-full w-full p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto h-full flex flex-col">
          {/* Header minimalista */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{lesson.titulo}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <HelpCircle className="h-4 w-4" />
                  Quiz interactivo
                </span>
                {lesson.duracionS && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(lesson.duracionS)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contenido principal del quiz */}
          <div className="flex-1 flex flex-col mb-4">
            {/* Pregunta */}
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6">
                {quizData.question}
              </h2>

              {/* Opciones */}
              <div className="space-y-4">
                {quizData.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => !showResult && setSelectedAnswer(index)}
                    disabled={showResult}
                    className={cn(
                      "w-full p-4 md:p-6 text-left rounded-lg border-2 transition-all text-base md:text-lg",
                      selectedAnswer === index
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-blue-400 bg-gray-50",
                      showResult && index === quizData.correctAnswer
                        ? "border-green-500 bg-green-50"
                        : showResult && selectedAnswer === index && index !== quizData.correctAnswer
                        ? "border-red-500 bg-red-50"
                        : "",
                      showResult && "cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold",
                        selectedAnswer === index
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-gray-400 text-gray-600"
                      )}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-gray-900">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resultado */}
            {showResult && (
              <div className={cn(
                "p-6 rounded-lg mb-6",
                selectedAnswer === quizData.correctAnswer
                  ? "bg-green-50 border border-green-300"
                  : "bg-red-50 border border-red-300"
              )}>
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className={cn(
                    "h-6 w-6",
                    selectedAnswer === quizData.correctAnswer ? "text-green-600" : "text-red-600"
                  )} />
                  <span className={cn(
                    "font-semibold text-lg",
                    selectedAnswer === quizData.correctAnswer ? "text-green-700" : "text-red-700"
                  )}>
                    {selectedAnswer === quizData.correctAnswer ? "¡Correcto!" : "Incorrecto"}
                  </span>
                </div>
                <p className={cn(
                  "text-base",
                  selectedAnswer === quizData.correctAnswer ? "text-green-700" : "text-red-700"
                )}>
                  {selectedAnswer === quizData.correctAnswer
                    ? "Has respondido correctamente. ¡Excelente trabajo!"
                    : `La respuesta correcta es: ${quizData.options[quizData.correctAnswer]}`
                  }
                </p>
              </div>
            )}
          </div>

          {/* Botones optimizados */}
          <div className="flex justify-center gap-4 py-4">
            {!showResult ? (
              <Button
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 text-base transition-all duration-200",
                  selectedAnswer !== null
                    ? "bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                )}
              >
                <CheckCircle className="h-5 w-5" />
                Enviar respuesta
              </Button>
            ) : (
              <div className="flex gap-4">
                {selectedAnswer !== quizData.correctAnswer && (
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    className="flex items-center gap-2 px-6 py-3 text-base border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Intentar de nuevo
                  </Button>
                )}
                
                <Button
                  onClick={handleToggleComplete}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-base transition-all duration-200",
                    isCompleted
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                  )}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Completado - Click para desmarcar
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Marcar como completado
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LessonContent({ lesson, isCompleted, onToggleComplete, onComplete }: LessonContentProps) {
  switch (lesson.tipo) {
    case 'TEXTO':
      return <TextContent lesson={lesson} isCompleted={isCompleted} onToggleComplete={onToggleComplete} onComplete={onComplete} />;
    case 'QUIZ':
      return <QuizContent lesson={lesson} isCompleted={isCompleted} onToggleComplete={onToggleComplete} onComplete={onComplete} />;
    default:
      return (
        <div className="h-full flex items-center justify-center bg-[var(--bg)]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[var(--fg)] mb-2">
              Tipo de contenido no soportado
            </h2>
            <p className="text-[var(--muted)]">
              Este tipo de lección ({lesson.tipo}) no está implementado aún.
            </p>
          </div>
        </div>
      );
  }
}