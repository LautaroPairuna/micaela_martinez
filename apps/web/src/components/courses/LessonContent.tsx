'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  FileText, 
  HelpCircle, 
  Clock, 
  ArrowRight, 
  RotateCcw, 
  FileIcon, 
  Download, 
  ExternalLink, 
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Lock,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn, formatDuration } from '@/lib/utils';
import { Lesson, QuizQuestion } from '@/types/course';
import { toast } from 'react-toastify';

type LessonContentProps = {
  lesson: Lesson;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
  onComplete?: () => void;
  onNext?: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────

// Helper robusto para extraer contenido de texto de estructuras variadas
const extractTextContent = (data: any): string | null => {
  if (!data) return null;
  
  // Caso 1: String directo
  if (typeof data === 'string') {
    // Intentar parsear si parece JSON
    if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(data);
        return extractTextContent(parsed);
      } catch {
        // Si falla el parseo, devolver el string tal cual (asumimos texto plano/html)
        return data;
      }
    }
    return data;
  }

  // Caso 2: Objeto
  if (typeof data === 'object') {
    // Lista de propiedades comunes donde suele venir el contenido
    const potentialKeys = ['markdown', 'content', 'body', 'html', 'text', 'descripcion', 'value', 'contenido'];
    
    for (const key of potentialKeys) {
      if (key in data && data[key] && typeof data[key] === 'string') {
        return data[key];
      }
    }

    // Búsqueda en propiedad 'data' anidada (común en CMS)
    if (data.data) {
      return extractTextContent(data.data);
    }
    
    // Si es un array de bloques (ej: Editor.js o similar), intentar unir texto
    if (Array.isArray(data.blocks)) {
      return data.blocks.map((b: any) => b.text || '').join('\n\n');
    }
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: DOCUMENTO
// ─────────────────────────────────────────────────────────────────────────────
function DocumentContent({ lesson, isCompleted = false, onToggleComplete, onComplete, onNext }: LessonContentProps) {
  const docInfo = useMemo(() => {
    const content = lesson.contenido as any;
    if (!content) return null;
    
    // Normalización de estructuras de datos (legacy vs new)
    if (content.url) return { url: content.url, nombre: content.nombre || lesson.titulo, tipo: content.tipo || 'PDF' };
    if (content.documento) return { url: content.documento.url, nombre: content.documento.nombre || lesson.titulo, tipo: content.documento.tipo || 'PDF' };
    if (content.data) return { url: content.data.url, nombre: content.data.nombre || lesson.titulo, tipo: content.data.tipoArchivo || 'PDF' };
    
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (parsed.url) return { url: parsed.url, nombre: parsed.nombre || lesson.titulo, tipo: parsed.tipo || 'PDF' };
      } catch {}
    }
    return null;
  }, [lesson.contenido, lesson.titulo]);

  return (
    <div className="flex h-full flex-col bg-[#F8F9FA]">
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-3xl space-y-8">
          
          {/* Header Card */}
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-900/5 md:p-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
              <FileIcon className="h-10 w-10 text-slate-400" />
            </div>
            
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900">
              {docInfo?.nombre || lesson.titulo}
            </h1>
            
            <div className="mx-auto mb-8 flex max-w-md items-center justify-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {lesson.duracion ? formatDuration(Math.round(lesson.duracion * 60)) : 'Lectura'}
              </span>
              <span>•</span>
              <span className="uppercase">{docInfo?.tipo || 'Documento'}</span>
            </div>

            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-slate-600">
              {lesson.descripcion || "Descarga este recurso para complementar tu aprendizaje. Puedes consultarlo en cualquier momento."}
            </p>

            {docInfo ? (
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a 
                  href={docInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full min-w-[200px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 font-semibold text-white transition-transform active:scale-95 hover:bg-slate-800 sm:w-auto"
                >
                  <Download className="h-5 w-5" />
                  Descargar
                </a>
                <a 
                  href={docInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full min-w-[200px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
                >
                  <ExternalLink className="h-5 w-5" />
                  Vista Previa
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                El archivo no está disponible en este momento.
              </div>
            )}
          </div>

          {/* Tips Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900">
              Sugerencias de estudio
            </h3>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>Guarda este documento en una carpeta dedicada a este curso para fácil acceso.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>Toma notas de los puntos clave mientras lees.</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            onClick={onToggleComplete}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors",
              isCompleted ? "bg-green-50 text-green-700" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
            {isCompleted ? "Completado" : "Marcar como leído"}
          </button>
          
          {(!isCompleted || onNext) && (
            <Button onClick={() => onNext?.() || onComplete?.()} className="bg-slate-900 text-white hover:bg-slate-800">
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: TEXTO
// ─────────────────────────────────────────────────────────────────────────────
function TextContent({ lesson, isCompleted = false, onToggleComplete, onComplete, onNext }: LessonContentProps) {
  const content = useMemo(() => {
    // Usar el helper robusto
    const extracted = extractTextContent(lesson.contenido);
    return extracted || lesson.descripcion || null;
  }, [lesson.contenido, lesson.descripcion]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-12 md:py-16">
          
          {/* Header Minimalista */}
          <div className="mb-10 border-b border-slate-100 pb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <FileText className="h-4 w-4" />
              <span>Lección de Texto</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
              {lesson.titulo}
            </h1>
            {lesson.duracion && (
              <p className="mt-4 text-slate-500 font-medium">
                Lectura estimada: {formatDuration(Math.round(lesson.duracion * 60))}
              </p>
            )}
          </div>

          {/* Article Body */}
          <article className="prose prose-slate prose-lg max-w-none">
            <div className="whitespace-pre-wrap text-xl leading-8 text-slate-800 antialiased">
              {content ? (
                // Si el contenido parece HTML (empieza con <), usar dangerouslySetInnerHTML con precaución
                // O renderizar como texto plano. Asumimos texto plano/markdown por seguridad por ahora, 
                // a menos que el usuario indique HTML explícito.
                // Si el usuario necesita HTML, deberíamos sanitizar.
                String(content)
              ) : (
                <p className="italic text-slate-400">Contenido no disponible.</p>
              )}
            </div>
          </article>

        </div>
      </div>

      {/* Footer Fijo */}
      <div className="border-t border-slate-100 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button
            onClick={onToggleComplete}
            className={cn(
              "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
              isCompleted 
                ? "bg-green-100 text-green-800 ring-1 ring-green-200" 
                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200"
            )}
          >
            {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            {isCompleted ? "Leída" : "Marcar como leída"}
          </button>
          
          {(!isCompleted || onNext) && (
            <Button 
              onClick={() => {
                if (!isCompleted) onComplete?.();
                onNext?.();
              }} 
              className="rounded-full bg-slate-900 px-8 text-white hover:bg-slate-800"
            >
              Siguiente Lección
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: QUIZ
// ─────────────────────────────────────────────────────────────────────────────
function QuizContent({ lesson, isCompleted = false, onToggleComplete, onComplete, onNext }: LessonContentProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  // Cooldown
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Cargar estado inicial y cooldown
  useEffect(() => {
    setHasStarted(false);
    setIsSubmitted(false);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);

    // Chequear cooldown en localStorage
    const savedCooldown = localStorage.getItem(`quiz-cooldown-${lesson.id}`);
    if (savedCooldown) {
      const date = new Date(savedCooldown);
      if (date > new Date()) {
        setCooldownUntil(date);
      } else {
        localStorage.removeItem(`quiz-cooldown-${lesson.id}`);
      }
    }
  }, [lesson.id]);

  // Timer para el cooldown
  useEffect(() => {
    if (!cooldownUntil) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = cooldownUntil.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCooldownUntil(null);
        localStorage.removeItem(`quiz-cooldown-${lesson.id}`);
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownUntil, lesson.id]);

  const { questions, intro } = useMemo(() => {
    let content = lesson.contenido as any;
    if (typeof content === 'string') {
      try { content = JSON.parse(content); } catch {}
    }
    
    let qs: QuizQuestion[] = [];
    let introText: string | null = null;

    if (content) {
      if (Array.isArray(content.preguntas)) { qs = content.preguntas; introText = content.intro || null; }
      else if (content.data && Array.isArray(content.data.preguntas)) { qs = content.data.preguntas; introText = content.data.intro || null; }
      else if (content.quiz) { qs = [content.quiz]; }
    }
    return { questions: qs, intro: introText };
  }, [lesson.contenido]);

  const currentQuestion = questions[currentQuestionIndex];
  const hasQuestions = questions.length > 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const allAnswered = questions.every((_, idx) => selectedAnswers[idx] !== undefined);

  // Auto-start si no hay intro
  useEffect(() => {
    if (!intro && hasQuestions && !hasStarted) setHasStarted(true);
  }, [intro, hasQuestions, hasStarted]);

  const score = useMemo(() => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.respuestaCorrecta) correct++;
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100)
    };
  }, [questions, selectedAnswers]);

  const handleOptionSelect = (optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIndex }));
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    // REGLA: 100% para aprobar
    if (score.percentage === 100) {
      toast.success('¡Felicitaciones! Has aprobado el examen.');
      onComplete?.();
    } else {
      // Activar cooldown de 2 minutos
      const now = new Date();
      const cooldownTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutos
      setCooldownUntil(cooldownTime);
      localStorage.setItem(`quiz-cooldown-${lesson.id}`, cooldownTime.toISOString());
      toast.error('No has alcanzado el 100%. Debes esperar para reintentar.');
    }
  };

  const handleRetry = () => {
    if (cooldownUntil) return;
    setSelectedAnswers({});
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);
  };

  if (!hasQuestions) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
        <HelpCircle className="mb-4 h-16 w-16 opacity-20" />
        <p>Este quiz no tiene preguntas configuradas.</p>
      </div>
    );
  }

  // PANTALLA: INTRO (o BLOQUEO COOLDOWN)
  if ((intro && !hasStarted && !isSubmitted) || (cooldownUntil && !isSubmitted)) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-6 md:p-12">
        <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-900/5 md:p-12 text-center">
          
          {cooldownUntil ? (
             // MODO COOLDOWN
            <>
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                <Clock className="h-10 w-10 animate-pulse" />
              </div>
              <h2 className="mb-4 text-3xl font-bold text-slate-900">Tiempo de espera</h2>
              <p className="mb-8 text-lg text-slate-600">
                Debes esperar unos minutos antes de volver a intentar el examen para repasar los conceptos.
              </p>
              <div className="mb-8 text-4xl font-mono font-bold text-orange-600">
                {timeLeft || 'Calculando...'}
              </div>
              <Button disabled className="w-full rounded-xl bg-slate-200 text-slate-400">
                Espera para reintentar
              </Button>
            </>
          ) : (
            // MODO INTRO
            <>
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <HelpCircle className="h-10 w-10" />
              </div>
              
              <h2 className="mb-4 text-3xl font-bold text-slate-900">Evaluación de Conocimientos</h2>
              <div className="mb-8 text-lg text-slate-600 whitespace-pre-wrap leading-relaxed">
                {intro}
              </div>

              <div className="mb-10 flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  <HelpCircle className="h-4 w-4" />
                  {questions.length} preguntas
                </div>
                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  <CheckCircle className="h-4 w-4" />
                  Se requiere 100%
                </div>
              </div>

              <Button onClick={() => setHasStarted(true)} size="lg" className="w-full rounded-xl bg-indigo-600 text-lg hover:bg-indigo-700 md:w-auto md:px-12">
                Comenzar Quiz
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#F8FAFC]">
      {/* Header / Progress */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900">{lesson.titulo}</h1>
            <div className="text-sm font-medium text-slate-500">
              {isSubmitted ? 'Resultados' : `Pregunta ${currentQuestionIndex + 1} de ${questions.length}`}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto flex h-full max-w-3xl flex-col">
          
          {!isSubmitted ? (
            /* MODO: PREGUNTAS */
            <div className="animate-in slide-in-from-right-8 fade-in duration-300">
              <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 md:p-10">
                <h2 className="text-xl font-medium leading-relaxed text-slate-900 md:text-2xl">
                  {currentQuestion.pregunta}
                </h2>
              </div>

              <div className="space-y-3">
                {currentQuestion.opciones.map((option, index) => {
                  const isSelected = selectedAnswers[currentQuestionIndex] === index;
                  return (
                    <button
                      key={index}
                      onClick={() => handleOptionSelect(index)}
                      className={cn(
                        "group relative flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200",
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 shadow-md"
                          : "border-transparent bg-white shadow-sm ring-1 ring-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                        isSelected
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-300 text-slate-400 group-hover:border-indigo-300 group-hover:text-indigo-500"
                      )}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className={cn(
                        "text-lg",
                        isSelected ? "font-medium text-indigo-900" : "text-slate-700"
                      )}>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* MODO: RESULTADOS */
            <div className="animate-in zoom-in-95 fade-in duration-300 space-y-6">
              <div className={cn(
                "rounded-3xl p-8 text-center text-white shadow-xl",
                score.percentage === 100 ? "bg-emerald-600" : "bg-rose-600"
              )}>
                <div className="mb-4 flex justify-center">
                  {score.percentage === 100 ? (
                    <div className="rounded-full bg-white/20 p-4"><CheckCircle className="h-12 w-12" /></div>
                  ) : (
                    <div className="rounded-full bg-white/20 p-4"><XCircle className="h-12 w-12" /></div>
                  )}
                </div>
                <div className="mb-2 text-5xl font-bold">{score.percentage}%</div>
                <h2 className="text-2xl font-bold">
                  {score.percentage === 100 ? "¡Excelente trabajo!" : "Necesitas repasar"}
                </h2>
                <p className="mt-2 text-white/90">
                  {score.percentage === 100 
                    ? "Has respondido todas las preguntas correctamente." 
                    : `Has acertado ${score.correct} de ${score.total}. Se requiere 100% para aprobar.`}
                </p>
                {score.percentage < 100 && (
                  <div className="mt-4 inline-block rounded-lg bg-black/20 px-4 py-2 text-sm font-medium text-white/90">
                     Cooldown de 2 minutos activado
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="px-2 text-sm font-bold uppercase tracking-wider text-slate-500">Revisión detallada</h3>
                {questions.map((q, idx) => {
                  const userAnswer = selectedAnswers[idx];
                  const isCorrect = userAnswer === q.respuestaCorrecta;
                  
                  return (
                    <div key={idx} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                      <div className={cn(
                        "border-l-4 p-5",
                        isCorrect ? "border-emerald-500" : "border-rose-500"
                      )}>
                        <p className="mb-3 font-medium text-slate-900">{q.pregunta}</p>
                        
                        <div className="space-y-3 text-sm">
                          {/* Respuesta del usuario */}
                          <div className="flex items-start gap-2">
                             <div className="mt-0.5">
                               {isCorrect ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}
                             </div>
                             <div>
                               <span className={cn("block font-bold mb-1", isCorrect ? "text-emerald-700" : "text-rose-700")}>
                                 Tu respuesta:
                               </span>
                               <span className="text-slate-700 block">
                                 {q.opciones[userAnswer] || "Sin responder"}
                               </span>
                             </div>
                          </div>
                          
                          {/* Corrección si falló */}
                          {!isCorrect && (
                            <div className="mt-3 rounded-lg bg-emerald-50 p-3 border border-emerald-100">
                              <div className="flex items-start gap-2">
                                <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
                                <div>
                                  <span className="block font-bold text-emerald-800 mb-1">Respuesta correcta:</span>
                                  <span className="text-emerald-900 font-medium">{q.opciones[q.respuestaCorrecta]}</span>
                                  {/* Aquí iría la explicación si existiera en el modelo de datos */}
                                  <p className="mt-2 text-xs text-emerald-700">
                                    Esta es la opción correcta porque corresponde a los conceptos vistos en la lección.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          {!isSubmitted ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="text-slate-500"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>

              {isLastQuestion ? (
                <Button 
                  onClick={handleSubmit} 
                  disabled={!allAnswered}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
                >
                  Finalizar
                  <CheckCircle className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  disabled={selectedAnswers[currentQuestionIndex] === undefined}
                  className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px]"
                >
                  Siguiente
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </>
          ) : (
            <div className="flex w-full items-center justify-between gap-4">
              {score.percentage < 100 ? (
                <div className="flex-1 text-center text-sm font-medium text-orange-600">
                  Espera el tiempo de cooldown para reintentar
                </div>
              ) : (
                <Button onClick={handleRetry} variant="outline" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Repasar
                </Button>
              )}
              
              {score.percentage === 100 && (
                <Button onClick={() => onNext?.() || onComplete?.()} className="bg-slate-900 text-white hover:bg-slate-800">
                  Continuar Curso
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function LessonContent({ lesson, isCompleted, onToggleComplete, onComplete, onNext }: LessonContentProps) {
  switch (lesson.tipo) {
    case 'TEXTO':
      return <TextContent lesson={lesson} isCompleted={isCompleted} onToggleComplete={onToggleComplete} onComplete={onComplete} onNext={onNext} />;
    case 'DOCUMENTO':
      return <DocumentContent lesson={lesson} isCompleted={isCompleted} onToggleComplete={onToggleComplete} onComplete={onComplete} onNext={onNext} />;
    case 'QUIZ':
      return <QuizContent lesson={lesson} isCompleted={isCompleted} onToggleComplete={onToggleComplete} onComplete={onComplete} onNext={onNext} />;
    default:
      return (
        <div className="flex h-full items-center justify-center bg-slate-50 p-8 text-center">
          <div>
            <h2 className="mb-2 text-xl font-bold text-slate-900">Tipo de contenido no soportado</h2>
            <p className="text-slate-500">La lección de tipo "{lesson.tipo}" no tiene una vista implementada.</p>
          </div>
        </div>
      );
  }
}
