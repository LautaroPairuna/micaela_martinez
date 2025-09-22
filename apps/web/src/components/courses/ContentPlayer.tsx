'use client';

import React, { useMemo, useState } from 'react';
import { FileText, BookOpen, HelpCircle, Download, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getSecureDocumentUrl } from '@/lib/media-utils';
import { useSession } from '@/hooks/useSession';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Tipos locales mínimos para evitar choques con otros "Lesson"
type QuizQuestion = {
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion?: string;
};

type ContentObj =
  | string
  | {
      texto?: string;
      documento?: { url: string; nombre?: string; tipo?: string };
      quiz?: QuizQuestion;
      preguntas?: QuizQuestion[];
      tipo?: 'QUIZ' | 'TEXTO' | 'DOCUMENTO';
      data?: {
        preguntas?: QuizQuestion[];
        configuracion?: {
          mostrarResultados?: boolean;
          permitirReintentos?: boolean;
          puntuacionMinima?: number;
        };
        contenido?: string; // TEXTO unificado
        url?: string; // DOCUMENTO unificado
        nombre?: string;
        tipoArchivo?: string;
      };
    }
  | null;

type ContentPlayerLesson = {
  id: string;
  titulo: string;
  tipo?: string;
  duracionS?: number | null;
  contenido?: ContentObj;
};

type ContentPlayerProps = {
  lesson: ContentPlayerLesson;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  className?: string;
};

const minutesFromSeconds = (s?: number | null) =>
  typeof s === 'number' && s > 0 ? Math.ceil(s / 60) : null;

export function ContentPlayer({ lesson, onComplete, onProgress, className }: ContentPlayerProps) {
  const { me } = useSession();

  // ---- Normalización TEXTO ----
  const textContent = useMemo<string | null>(() => {
    const c = lesson.contenido;
    if (!c) return null;
    if (typeof c === 'string') return c;
    if (c.tipo === 'TEXTO' && c.data?.contenido) return c.data.contenido;
    if (c.texto) return c.texto;
    return null;
  }, [lesson.contenido]);

  // ---- Normalización DOCUMENTO ----
  const documentInfo = useMemo<null | { url: string; nombre?: string; tipo?: string }>(() => {
    const c = lesson.contenido;
    if (!c || typeof c === 'string') return null;

    if (c.tipo === 'DOCUMENTO' && c.data?.url) {
      return {
        url: c.data.url,
        nombre: c.data.nombre || lesson.titulo || 'Documento',
        tipo: (c.data.tipoArchivo || 'PDF').toUpperCase(),
      };
    }
    if (c.documento?.url) {
      return {
        url: c.documento.url,
        nombre: c.documento.nombre || lesson.titulo || 'Documento',
        tipo: (c.documento.tipo || 'PDF').toUpperCase(),
      };
    }
    return null;
  }, [lesson.contenido, lesson.titulo]);

  // ---- Normalización QUIZ ----
  const quizQuestions = useMemo<QuizQuestion[]>(() => {
    const c = lesson.contenido;
    if (!c || typeof c === 'string') return [];
    if (c.tipo === 'QUIZ' && Array.isArray(c.data?.preguntas)) return c.data.preguntas!;
    if (Array.isArray(c.preguntas)) return c.preguntas;
    if (c.quiz) return [c.quiz];
    return [];
  }, [lesson.contenido]);

  const contentType: 'TEXTO' | 'DOCUMENTO' | 'QUIZ' = useMemo(() => {
    if (quizQuestions.length > 0) return 'QUIZ';
    if (documentInfo) return 'DOCUMENTO';
    return 'TEXTO';
  }, [quizQuestions.length, documentInfo]);

  // ---- Estado QUIZ ----
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredMap, setAnsweredMap] = useState<Record<number, number | null>>({});
  const [resultMap, setResultMap] = useState<Record<number, boolean>>({});

  const totalQuestions = quizQuestions.length;
  const currentQuestion = totalQuestions ? quizQuestions[currentQuestionIndex] : null;

  const handleAnswer = (answerIndex: number) => {
    if (!currentQuestion) return;

    setAnsweredMap((prev) => ({ ...prev, [currentQuestionIndex]: answerIndex }));
    const isCorrect = answerIndex === currentQuestion.respuestaCorrecta;
    setResultMap((prev) => ({ ...prev, [currentQuestionIndex]: isCorrect }));

    const allAnswered = Object.keys({ ...answeredMap, [currentQuestionIndex]: answerIndex }).length === totalQuestions;
    const allCorrect = allAnswered && Object.values({ ...resultMap, [currentQuestionIndex]: isCorrect }).every(Boolean);

    if (allCorrect) {
      onProgress?.(100);
      onComplete?.();
    }
  };

  // ---- UI helpers ----
  const Header = ({
    label,
    icon,
    extra,
  }: {
    label: string;
    icon: React.ReactNode;
    extra?: React.ReactNode;
  }) => (
    <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="px-3 py-1 bg-gray-50 text-gray-700 rounded-full font-medium">{label}</span>
            {typeof lesson.duracionS === 'number' && lesson.duracionS > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span>⏱️</span>
                  {minutesFromSeconds(lesson.duracionS)} min
                </span>
              </>
            )}
            {extra}
          </div>
        </div>
      </div>
    </div>
  );

  const renderText = () => (
    <div className="flex-1 overflow-auto bg-white">
      <Header label="Lección de texto" icon={<FileText className="w-5 h-5 text-blue-600" />} />
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <article className="prose prose-lg max-w-none">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 md:p-12">
              <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed">
                {textContent ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {textContent}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-600">El contenido de texto para esta lección aún no está disponible.</p>
                )}
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );

  const renderDocument = () => (
    <div className="flex-1 overflow-auto bg-white">
      <Header label="Material de estudio" icon={<BookOpen className="w-5 h-5 text-green-600" />} />
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {documentInfo ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 md:p-12 text-center">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{documentInfo.nombre}</h3>
                <p className="text-lg text-gray-600">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                    📄 {(documentInfo.tipo || 'PDF').toUpperCase()}
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <Button
                  onClick={async () => {
                    try {
                      const url = await getSecureDocumentUrl(documentInfo.url);
                      // 2do parámetro de window.open es string | undefined (ok)
                      window.open(url, '_blank');
                    } catch (e) {
                      console.error('Error abriendo documento seguro:', e);
                    }
                  }}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg"
                  size="lg"
                >
                  <ExternalLink className="h-5 w-5" />
                  Ver documento
                </Button>

                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const url = await getSecureDocumentUrl(documentInfo.url);
                      const link = document.createElement('a');
                      link.href = url;                         // string ✅
                      link.download = documentInfo.nombre || 'documento'; // fuerza descarga
                      link.rel = 'noopener';
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    } catch (e) {
                      console.error('Error descargando documento seguro:', e);
                    }
                  }}
                  className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50 px-6 py-3 text-lg"
                  size="lg"
                >
                  <Download className="h-5 w-5" />
                  Descargar
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 md:p-12 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Documento no disponible</h3>
              <p className="text-lg text-gray-600">El material de estudio para esta lección aún no está disponible.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderQuiz = () => {
    if (!totalQuestions) {
      return (
        <div className="flex-1 overflow-auto bg-white">
          <Header label="Evaluación" icon={<HelpCircle className="w-5 h-5 text-purple-600" />} />
          <div className="px-6 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl border border-gray-100 p-8 md:p-12 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Quiz no disponible</h3>
                <p className="text-lg text-gray-600">La evaluación para esta lección aún no está disponible.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const answered = answeredMap[currentQuestionIndex] ?? null;
    const isAnswered = answered !== null && answered !== undefined;
    const isCorrect = resultMap[currentQuestionIndex] ?? false;

    return (
      <div className="flex-1 overflow-auto bg-white">
        <Header
          label="Evaluación"
          icon={<HelpCircle className="w-5 h-5 text-purple-600" />}
          extra={<span className="flex items-center gap-1">❓ {totalQuestions} {totalQuestions === 1 ? 'pregunta' : 'preguntas'}</span>}
        />
        <div className="px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{currentQuestion?.pregunta}</h3>
                {totalQuestions > 1 && (
                  <div className="text-sm text-gray-500">Pregunta {currentQuestionIndex + 1} de {totalQuestions}</div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                {currentQuestion?.opciones.map((op, idx) => {
                  const selected = answered === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => !isAnswered && handleAnswer(idx)}
                      className={cn(
                        'w-full text-left p-5 rounded-xl border-2 transition-all',
                        isAnswered
                          ? selected
                            ? isCorrect
                              ? 'border-green-500 bg-green-50'
                              : 'border-red-500 bg-red-50'
                            : 'border-gray-200 bg-white opacity-80'
                          : selected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-300 bg-white hover:border-purple-300'
                      )}
                    >
                      <span className="text-gray-900 text-base leading-relaxed font-medium">{op}</span>
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <div className={cn('p-6 rounded-xl border-2', isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className={cn('h-6 w-6', isCorrect ? 'text-green-600' : 'text-red-600')} />
                    <span className={cn('font-bold text-xl', isCorrect ? 'text-green-800' : 'text-red-800')}>
                      {isCorrect ? '🎉 ¡Correcto!' : '❌ Incorrecto'}
                    </span>
                  </div>
                  {currentQuestion?.explicacion && (
                    <div className="bg-white/60 p-4 rounded-xl">
                      <p className="text-gray-700 leading-relaxed">
                        <strong>Explicación:</strong> {currentQuestion.explicacion}
                      </p>
                    </div>
                  )}

                  {totalQuestions > 1 && (
                    <div className="flex justify-between mt-6">
                      <Button variant="outline" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}>
                        Anterior
                      </Button>
                      <Button disabled={currentQuestionIndex === totalQuestions - 1} onClick={() => setCurrentQuestionIndex((i) => Math.min(totalQuestions - 1, i + 1))}>
                        Siguiente
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {Object.keys(answeredMap).length === totalQuestions && totalQuestions > 1 && (
                <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 text-center">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Resumen del Quiz</h4>
                  <div className="text-3xl font-bold text-purple-600">
                    {Object.values(resultMap).filter(Boolean).length} / {totalQuestions}
                  </div>
                  <p className="text-gray-600 mt-1">Respuestas correctas</p>

                  <div className="flex justify-center gap-4 mt-4">
                    <Button
                      onClick={() => {
                        setAnsweredMap({});
                        setResultMap({});
                        setCurrentQuestionIndex(0);
                      }}
                      className="px-6"
                    >
                      Reiniciar
                    </Button>
                    {Object.values(resultMap).every(Boolean) && (
                      <Button className="px-6 bg-green-600 hover:bg-green-700 text-white" onClick={() => onComplete?.()}>
                        Continuar
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('h-full flex flex-col bg-white', className)}>
      {contentType === 'DOCUMENTO' ? renderDocument() : contentType === 'QUIZ' ? renderQuiz() : renderText()}
    </div>
  );
}
