'use client';

import React, { useMemo, useState } from 'react';
import { FileText, BookOpen, HelpCircle, Download, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getSecureDocumentUrl } from '@/lib/media-utils';


// Tipos locales mínimos para evitar choques con otros "Lesson"
type QuizQuestion = {
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion?: string;
  retroalimentacion?: string; // alias opcional
};

type ContentObj =
  | string
  | {
      contenido?: string;
      markdown?: string;
      content?: string;
      body?: string;
      texto?: string;
      url?: string;
      nombre?: string;
      tituloDoc?: string;
      tipoArchivo?: string;
      documento?: { url: string; nombre?: string; tipo?: string };
      quiz?: QuizQuestion;
      preguntas?: QuizQuestion[];
      intro?: string;
      modo?: string;
      tipo?: 'QUIZ' | 'TEXTO' | 'DOCUMENTO';
      data?: {
        preguntas?: QuizQuestion[];
        configuracion?: {
          mostrarResultados?: boolean;
          permitirReintentos?: boolean;
          puntuacionMinima?: number;
        };
        contenido?: string; // TEXTO unificado
        markdown?: string;
        content?: string;
        body?: string;
        url?: string; // DOCUMENTO unificado
        nombre?: string;
        tipoArchivo?: string;
        intro?: string;
        modo?: string;
      };
    }
  | null;

type ContentPlayerLesson = {
  id: string;
  titulo: string;
  tipo?: string;
  duracion?: number | null;
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

  // ---- Normalización TEXTO ----
  const textContent = useMemo<string | null>(() => {
    const c = lesson.contenido;
    if (!c) return null;
    const extractFromObject = (obj: Record<string, unknown>): string | null => {
      const direct = obj.contenido ?? obj.texto ?? obj.markdown ?? obj.content ?? obj.body;
      if (typeof direct === 'string' && direct.trim() !== '') return direct;
      const data = obj.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const dataObj = data as Record<string, unknown>;
        const dataDirect =
          dataObj.contenido ?? dataObj.texto ?? dataObj.markdown ?? dataObj.content ?? dataObj.body;
        if (typeof dataDirect === 'string' && dataDirect.trim() !== '') return dataDirect;
      }
      return null;
    };
    // Si viene como string, intentamos parsear JSON para extraer "contenido"/"texto"
    if (typeof c === 'string') {
      const raw = c.trim();
      if (raw.startsWith('{') || raw.startsWith('[')) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const extracted = extractFromObject(parsed as Record<string, unknown>);
            if (extracted) return extracted;
          }
        } catch {}
      }
      return c; // texto plano
    }
    if (typeof c === 'object') {
      return extractFromObject(c as Record<string, unknown>);
    }
    return null;
  }, [lesson.contenido]);

  // ---- Normalización DOCUMENTO ----
  const documentInfo = useMemo<null | { url: string; nombre?: string; tipo?: string }>(() => {
    const c = lesson.contenido;
    if (!c) return null;

    const fromObject = (obj: Record<string, unknown>) => {
      const data = obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)
        ? (obj.data as Record<string, unknown>)
        : null;
      const documento = obj.documento && typeof obj.documento === 'object' && !Array.isArray(obj.documento)
        ? (obj.documento as Record<string, unknown>)
        : null;

      const urlCandidate =
        (typeof obj.url === 'string' ? obj.url : null) ||
        (data && typeof data.url === 'string' ? (data.url as string) : null) ||
        (documento && typeof documento.url === 'string' ? (documento.url as string) : null);

      if (!urlCandidate || urlCandidate.trim() === '') return null;

      const nameCandidate =
        (typeof obj.nombre === 'string' ? obj.nombre : null) ||
        (typeof obj.tituloDoc === 'string' ? obj.tituloDoc : null) ||
        (data && typeof data.nombre === 'string' ? (data.nombre as string) : null) ||
        (documento && typeof documento.nombre === 'string' ? (documento.nombre as string) : null) ||
        lesson.titulo ||
        'Documento';

      const typeCandidate =
        (data && typeof data.tipoArchivo === 'string' ? (data.tipoArchivo as string) : null) ||
        (typeof obj.tipoArchivo === 'string' ? obj.tipoArchivo : null) ||
        (documento && typeof documento.tipo === 'string' ? (documento.tipo as string) : null) ||
        'PDF';

      return {
        url: urlCandidate,
        nombre: nameCandidate,
        tipo: typeCandidate.toUpperCase(),
      };
    };

    if (typeof c === 'string') {
      const raw = c.trim();
      if (!raw) return null;
      if (raw.startsWith('{') || raw.startsWith('[')) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return fromObject(parsed as Record<string, unknown>);
          }
        } catch {}
      }
      return null;
    }

    if (typeof c === 'object') {
      return fromObject(c as Record<string, unknown>);
    }

    return null;
  }, [lesson.contenido, lesson.titulo]);

  // ---- Normalización QUIZ ----
  const quizQuestions = useMemo<QuizQuestion[]>(() => {
    const c = lesson.contenido;
    if (!c) return [];

    const fromObject = (obj: Record<string, unknown>): QuizQuestion[] => {
      const data = obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)
        ? (obj.data as Record<string, unknown>)
        : null;
      const dataQuestions = data?.preguntas;
      if (Array.isArray(dataQuestions)) return dataQuestions as QuizQuestion[];
      if (Array.isArray(obj.preguntas)) return obj.preguntas as QuizQuestion[];
      if (obj.quiz && typeof obj.quiz === 'object') return [obj.quiz as QuizQuestion];
      return [];
    };

    // Si viene como string, intentamos parsear JSON
    if (typeof c === 'string') {
      const raw = c.trim();
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return fromObject(parsed as Record<string, unknown>);
        }
      } catch {}
      return [];
    }

    if (typeof c === 'object') {
      return fromObject(c as Record<string, unknown>);
    }

    return [];
  }, [lesson.contenido]);

  const contentType: 'TEXTO' | 'DOCUMENTO' | 'QUIZ' = useMemo(() => {
    const lessonType = String(lesson.tipo ?? '').toUpperCase();
    if (lessonType === 'QUIZ') return 'QUIZ';
    if (lessonType === 'DOCUMENTO') return 'DOCUMENTO';
    if (lessonType === 'TEXTO') return 'TEXTO';
    if (quizQuestions.length > 0) return 'QUIZ';
    if (documentInfo) return 'DOCUMENTO';
    return 'TEXTO';
  }, [quizQuestions.length, documentInfo, lesson.tipo]);

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
    // Reportar progreso aproximado si hay varias preguntas
    if (totalQuestions > 1) {
      const answeredCount = Object.keys({ ...answeredMap, [currentQuestionIndex]: answerIndex }).length;
      const progressPct = Math.round((answeredCount / totalQuestions) * 100);
      onProgress?.(progressPct);
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
            {typeof lesson.duracion === 'number' && lesson.duracion > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span>⏱️</span>
                  {lesson.duracion} min
                </span>
              </>
            )}
            {extra}
          </div>
        </div>
      </div>
    </div>
  );

  const renderText = () => {
    return (
      <div className="flex-1 overflow-auto bg-gray-50/50">
        <Header label="Lección de texto" icon={<FileText className="w-5 h-5 text-rose-500" />} />
        <div className="px-4 py-8 md:px-8 md:py-12">
          <div className="max-w-3xl mx-auto">
            <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12 transition-all text-gray-900">
              <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-rose-600 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-img:rounded-xl">
                {textContent ? (
                  <div dangerouslySetInnerHTML={{ __html: textContent }} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                      <FileText className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500">El contenido de texto para esta lección aún no está disponible.</p>
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>
      </div>
    );
  };

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
    const rawExplanation = (currentQuestion?.explicacion ?? currentQuestion?.retroalimentacion ?? '');
    const explanation = typeof rawExplanation === 'string' ? rawExplanation.trim() : '';

    const answeredCount = Object.keys(answeredMap).length;
    const progressPct = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;

    return (
      <div className="flex-1 overflow-auto bg-white">
        <Header
          label="Evaluación"
          icon={<HelpCircle className="w-5 h-5 text-purple-600" />}
          extra={
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">❓ {totalQuestions} {totalQuestions === 1 ? 'pregunta' : 'preguntas'}</span>
              {totalQuestions > 0 && (
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-2 bg-purple-500" style={{ width: `${progressPct}%` }} />
                </div>
              )}
            </div>
          }
        />
        <div className="px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 shadow-sm">
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
                      onClick={() => handleAnswer(idx)}
                      className={cn(
                        'w-full text-left p-5 rounded-xl border transition-all flex items-center gap-4',
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
                      <span className={cn('inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
                        isAnswered ? (selected ? (isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white') : 'bg-gray-200 text-gray-700') : (selected ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'))}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-gray-900 text-base leading-relaxed font-medium">{op}</span>
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <div className={cn('p-6 rounded-xl border', isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className={cn('h-6 w-6', isCorrect ? 'text-green-600' : 'text-red-600')} />
                    <span className={cn('font-bold text-xl', isCorrect ? 'text-green-800' : 'text-red-800')}>
                      {isCorrect ? '🎉 ¡Correcto!' : '❌ Incorrecto'}
                    </span>
                  </div>
                  {(!isCorrect || explanation.length > 0) && (
                    <div className="bg-white/60 p-4 rounded-xl">
                      {explanation.length > 0 ? (
                        <p className="text-gray-700 leading-relaxed">
                          <strong>Explicación:</strong>{' '}
                          {explanation}
                        </p>
                      ) : (
                        !isCorrect && (
                          <p className="text-gray-700 leading-relaxed">
                            <strong>Respuesta correcta:</strong>{' '}
                            {typeof currentQuestion?.respuestaCorrecta === 'number' &&
                              currentQuestion?.opciones?.[currentQuestion.respuestaCorrecta]}
                          </p>
                        )
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mt-6 justify-between">
                    <div className="flex gap-3">
                      {totalQuestions > 1 && (
                        <Button variant="outline" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}>
                          Anterior
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAnsweredMap((prev) => {
                            const next = { ...prev };
                            delete next[currentQuestionIndex];
                            return next;
                          });
                          setResultMap((prev) => {
                            const next = { ...prev };
                            delete next[currentQuestionIndex];
                            return next;
                          });
                          
                        }}
                      >
                        Reintentar
                      </Button>
                    </div>
                    {totalQuestions > 1 && (
                      <Button disabled={currentQuestionIndex === totalQuestions - 1} onClick={() => setCurrentQuestionIndex((i) => Math.min(totalQuestions - 1, i + 1))}>
                        Siguiente
                      </Button>
                    )}
                  </div>

                  {totalQuestions === 1 && (
                    <div className="flex justify-center mt-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAnsweredMap({});
                          setResultMap({});
                          
                        }}
                      >
                        Reintentar
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {answeredCount === totalQuestions && totalQuestions > 1 && (
                <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 text-center">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Resumen del Quiz</h4>
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-3xl font-bold text-purple-600">
                      {Object.values(resultMap).filter(Boolean).length} / {totalQuestions}
                    </div>
                    <div className="w-64 h-2 bg-purple-200 rounded-full overflow-hidden">
                      <div className="h-2 bg-purple-600" style={{ width: `${Math.round((Object.values(resultMap).filter(Boolean).length / totalQuestions) * 100)}%` }} />
                    </div>
                    <p className="text-gray-600 mt-1">Puntuación</p>
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
                    <Button className="px-6 bg-green-600 hover:bg-green-700 text-white" onClick={() => onComplete?.()}>
                      Finalizar
                    </Button>
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
