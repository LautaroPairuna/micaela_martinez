'use client';

import { useState, useMemo, useEffect } from 'react';
import { CheckCircle, Circle, FileText, HelpCircle, Clock, ArrowRight, RotateCcw, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn, formatDuration } from '@/lib/utils';
import { Lesson, QuizQuestion } from '@/types/course';

type LessonContentProps = {
  lesson: Lesson;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
  onComplete?: () => void;
};



// Componente para contenido de texto
function TextContent({ lesson, isCompleted = false, onToggleComplete, onComplete }: LessonContentProps) {
  // Extraer contenido real (prioridad: contenido > descripcion)
  const content = useMemo(() => {
    if (!lesson.contenido) return lesson.descripcion;
    
    // Si es string, asumimos que es Markdown directo
    if (typeof lesson.contenido === 'string') {
      // Intentar parsear por si es un JSON stringificado accidentalmente
      try {
        const parsed = JSON.parse(lesson.contenido);
        // Si es un objeto con propiedad markdown/content
        if (parsed && typeof parsed === 'object') {
          return parsed.markdown || parsed.content || parsed.body || lesson.contenido;
        }
        return lesson.contenido;
      } catch {
        return lesson.contenido;
      }
    }
    
    // Si es objeto
    const obj = lesson.contenido as any;
    return obj.markdown || obj.content || obj.body || lesson.descripcion;
  }, [lesson.contenido, lesson.descripcion]);

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
            {lesson.duracion && (
              <>
                <span>•</span>
                <span>{formatDuration(Math.round(lesson.duracion * 60))}</span>
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
            {content ? (
              <div className="prose prose-lg prose-gray max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-base md:text-lg">
                  {/* Si el contenido es markdown, aquí deberíamos usar un parser de Markdown real (ej. react-markdown).
                      Por ahora mantenemos el comportamiento de mostrarlo como texto formateado, pero mostrando el contenido real. */}
                  {String(content)}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-6 opacity-50" />
                <p className="text-lg">El contenido de texto para esta lección aún no está disponible.</p>
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Resetear estado al cambiar de lección
  useEffect(() => {
    setHasStarted(false);
    setIsSubmitted(false);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
  }, [lesson.id]);

  // Obtener preguntas e intro de forma robusta
  const { questions, intro } = useMemo(() => {
    let content = lesson.contenido as any;

    // Intentar parsear si es string
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch (e) {
        console.warn('Error parsing quiz content:', e);
        return { questions: [], intro: null };
      }
    }

    let qs: QuizQuestion[] = [];
    let introText: string | null = null;

    if (!content) return { questions: [], intro: null };
    
    // 1. Estructura plana (actual)
    if (Array.isArray(content.preguntas)) {
      qs = content.preguntas;
      introText = content.intro || null;
    }
    // 2. Estructura anidada (legacy unificada)
    else if (content.data && Array.isArray(content.data.preguntas)) {
      qs = content.data.preguntas;
      introText = content.data.intro || null;
    }
    // 3. Fallback quiz simple
    else if (content.quiz) {
      qs = [content.quiz];
    }

    return { questions: qs, intro: introText };
  }, [lesson.contenido]);

  const currentQuestion = questions[currentQuestionIndex];
  const hasQuestions = questions.length > 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const allAnswered = questions.every((_, idx) => selectedAnswers[idx] !== undefined);

  // Auto-iniciar si no hay intro
  useEffect(() => {
    if (!intro && hasQuestions && !hasStarted) {
      setHasStarted(true);
    }
  }, [intro, hasQuestions, hasStarted]);

  // Calcular resultado
  const score = useMemo(() => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.respuestaCorrecta) {
        correct++;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100)
    };
  }, [questions, selectedAnswers]);

  const handleOptionSelect = (optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: optionIndex
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    // Si aprueba con más del 70% (ajustable), marcar como completado
    if (score.percentage >= 70) {
      onComplete?.();
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);
    // No reseteamos hasStarted para que no vuelva a mostrar la intro al reintentar
  };

  if (!hasQuestions) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <HelpCircle className="w-16 h-16 mb-4 opacity-30" />
        <h3 className="text-xl font-semibold mb-2">No hay preguntas disponibles</h3>
        <p>Este quiz aún no tiene contenido configurado.</p>
      </div>
    );
  }

  // Pantalla de Introducción
  if (intro && !hasStarted && !isSubmitted) {
    return (
      <div className="h-full w-full bg-white text-gray-900 overflow-auto flex flex-col items-center justify-center p-6 md:p-12">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="w-10 h-10 text-purple-600" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">Antes de comenzar</h2>
            <div className="prose prose-lg prose-gray mx-auto text-gray-600">
               <p className="whitespace-pre-wrap">{intro}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-6 text-gray-500 text-sm">
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
              <HelpCircle className="w-4 h-4" />
              <span>{questions.length} preguntas</span>
            </div>
            {lesson.duracion && (
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                <Clock className="w-4 h-4" />
                <span>Tiempo estimado: {formatDuration(Math.round(lesson.duracion * 60))}</span>
              </div>
            )}
          </div>

          <Button 
            onClick={() => setHasStarted(true)}
            size="lg"
            className="w-full sm:w-auto min-w-[200px] text-lg h-12"
          >
            <Play className="w-5 h-5 mr-2" fill="currentColor" />
            Comenzar Quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white text-gray-900 overflow-auto">
      <div className="h-full w-full p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{lesson.titulo}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <HelpCircle className="h-4 w-4" />
                  Quiz: {currentQuestionIndex + 1} de {questions.length}
                </span>
                {lesson.duracion && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(Math.round(lesson.duracion * 60))}
                  </span>
                )}
              </div>
            </div>
            {isSubmitted && (
              <div className={cn(
                "px-4 py-2 rounded-lg font-bold text-lg",
                score.percentage >= 70 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {score.percentage}%
              </div>
            )}
          </div>

          {/* Contenido principal */}
          <div className="flex-1 flex flex-col mb-4">
            {!isSubmitted ? (
              // Modo Preguntas
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Pregunta {currentQuestionIndex + 1}
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6 leading-relaxed">
                  {currentQuestion.pregunta}
                </h2>

                <div className="space-y-3">
                  {currentQuestion.opciones.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleOptionSelect(index)}
                      className={cn(
                        "w-full p-4 md:p-5 text-left rounded-xl border-2 transition-all duration-200 group relative overflow-hidden",
                        selectedAnswers[currentQuestionIndex] === index
                          ? "border-blue-500 bg-blue-50/50 shadow-sm"
                          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors",
                          selectedAnswers[currentQuestionIndex] === index
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-gray-300 text-gray-500 group-hover:border-blue-400 group-hover:text-blue-500"
                        )}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="text-gray-800 text-lg">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Modo Resultados (Resumen)
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className={cn(
                    "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 text-3xl",
                    score.percentage >= 70 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    {score.percentage >= 70 ? "🎉" : "💪"}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {score.percentage >= 70 ? "¡Felicitaciones!" : "Sigue practicando"}
                  </h2>
                  <p className="text-gray-600">
                    Has acertado {score.correct} de {score.total} preguntas
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Revisión de respuestas</h3>
                  {questions.map((q, idx) => {
                    const isCorrect = selectedAnswers[idx] === q.respuestaCorrecta;
                    return (
                      <div key={idx} className={cn(
                        "p-4 rounded-lg border flex items-start gap-3",
                        isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      )}>
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 mb-1">{q.pregunta}</p>
                          <p className="text-sm text-gray-600">
                            Tu respuesta: <span className="font-medium">{q.opciones[selectedAnswers[idx]]}</span>
                          </p>
                          {!isCorrect && (
                            <p className="text-sm text-green-700 mt-1 font-medium">
                              Correcta: {q.opciones[q.respuestaCorrecta]}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer de navegación */}
          <div className="flex justify-between items-center py-6 border-t border-gray-100 mt-auto">
            {!isSubmitted ? (
              <>
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="text-gray-500 hover:text-gray-900"
                >
                  Anterior
                </Button>

                <div className="flex gap-2">
                  {questions.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        idx === currentQuestionIndex ? "bg-blue-600 w-4" :
                        selectedAnswers[idx] !== undefined ? "bg-blue-200" : "bg-gray-200"
                      )}
                    />
                  ))}
                </div>

                {isLastQuestion ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!allAnswered}
                    className={cn(
                      "bg-blue-600 hover:bg-blue-700 text-white px-6",
                      !allAnswered && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    Finalizar Quiz
                    <CheckCircle className="ml-2 w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={selectedAnswers[currentQuestionIndex] === undefined}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Siguiente
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </>
            ) : (
              <div className="flex w-full justify-between gap-4">
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reintentar
                </Button>
                
                <div className="flex gap-3">
                  <Button
                     onClick={onToggleComplete}
                     variant="ghost"
                     className={cn(isCompleted && "text-green-600 bg-green-50")}
                  >
                    {isCompleted ? "Completada" : "Marcar completada"}
                  </Button>
                  
                  <Button
                    onClick={onComplete}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Continuar curso
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
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