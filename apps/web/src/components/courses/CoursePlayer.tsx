'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CourseModuleSidebar } from './CourseModuleSidebar';
import { CourseVideoPlayer } from './CourseVideoPlayer';
import { MiniPlayer } from './MiniPlayer';
import { ContentPlayer } from './ContentPlayer';
import { CourseHeader } from './CourseHeader';
import { CourseProgress } from './CourseProgress';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useProgress } from '@/components/courses/ProgressContext';
import { getSecureVideoUrl } from '@/lib/media-utils';
import { Course, Module, Lesson, Enrollment } from '@/types/course';

// ---------- Error Boundary ----------
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
  fallback: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ContentPlayer Error:', error, errorInfo);
    this.props.onError?.(error);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ---------- Tipos auxiliares ----------
type CoursePlayerProps = {
  course: Course;
  enrollment: Enrollment;
  children?: React.ReactNode;
};

type EnrollmentProgress = Record<
  string, // moduleId
  Record<
    string, // lessonId
    { completed?: boolean } | null | undefined
  >
>;
const isEnrollmentProgress = (u: unknown): u is EnrollmentProgress => {
  if (typeof u !== 'object' || u === null) return false;
  for (const modKey of Object.keys(u as Record<string, unknown>)) {
    const mod = (u as Record<string, unknown>)[modKey];
    if (typeof mod !== 'object' || mod === null) continue;
    for (const lessonKey of Object.keys(mod as Record<string, unknown>)) {
      const l = (mod as Record<string, unknown>)[lessonKey];
      if (l !== null && l !== undefined && typeof l !== 'object') return false;
    }
  }
  return true;
};

export function CoursePlayer({
  course,
  enrollment,
  children,
}: CoursePlayerProps) {
  const router = useRouter();
  const params = useParams<{ modulo?: string; leccion?: string }>();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  // Progreso desde contexto (persistente entre navegación dentro del curso)
  const { lessonProgress, getLessonProgressKey, markLessonComplete: ctxMarkLessonComplete, toggleLessonComplete: ctxToggleLessonComplete } = useProgress();
  const [contentError, setContentError] = useState<string | null>(null);
  const [actualVideoDuration, setActualVideoDuration] = useState<number | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const [videoDurationsCache, setVideoDurationsCache] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`course-durations-${course.id}`);
        return cached ? JSON.parse(cached) : {};
      } catch {
        return {};
      }
    }
    return {};
  });
  const [isDurationsLoaded, setIsDurationsLoaded] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [miniPlayerCurrentTime, setMiniPlayerCurrentTime] = useState(0);
  const [miniPlayerVideoUrl, setMiniPlayerVideoUrl] = useState<string>('');
  const [miniPlayerLesson, setMiniPlayerLesson] = useState<Lesson | null>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');
  const [preloadedContent, setPreloadedContent] = useState<Record<string, boolean>>({});
  // Control de cache local opcional (producción puede desactivarlo):
  // Habilitado por defecto. Para desactivar explícitamente: NEXT_PUBLIC_PROGRESS_CACHE=0
  const ENABLE_LOCAL_PROGRESS_CACHE = (process.env.NEXT_PUBLIC_PROGRESS_CACHE === '0') ? false : true;

  // Persistencia local (opcional) para suavizar remounts durante la navegación
  // El progreso se maneja en el contexto; no dependemos de localStorage en producción
  const PROGRESS_STORAGE_KEY = `course-progress-${course.id}-${enrollment.id}`;
  const loadProgressFromStorage = useCallback((): Record<string, boolean> => ({}), [PROGRESS_STORAGE_KEY]);
  const saveProgressToStorage = useCallback((_progress: Record<string, boolean>) => {}, [PROGRESS_STORAGE_KEY]);

  // Helpers slug
  const getLessonSlug = useCallback((lesson: Lesson) => `leccion-${lesson.orden}`, []);
  const getModuleSlug = useCallback((module: Module) => `modulo-${module.orden}`, []);

  // URL segura de video
  const getVideoUrl = useCallback(async (rutaSrc: string | null | undefined): Promise<string> => {
    if (!rutaSrc) return '';
    return getSecureVideoUrl(rutaSrc);
  }, []);

  // Extraer source de video desde la lección (rutaSrc o contenido.videoFile/videoUrl)
  const getRawVideoSrc = useCallback((lesson?: Lesson | null): string | null => {
    if (!lesson) return null;
    if (lesson.rutaSrc) return lesson.rutaSrc;
    const c = (lesson as Lesson & { contenido?: unknown }).contenido;
    if (!c) return null;
    try {
      if (typeof c === 'string') {
        const raw = c.trim();
        if (raw.startsWith('{') || raw.startsWith('[')) {
          const parsed = JSON.parse(raw) as {
            videoFile?: string;
            videoUrl?: string;
            data?: { videoFile?: string; videoUrl?: string };
          };
          // Preferimos filename (videoFile); compatibilidad con videoUrl legacy
          if (typeof parsed?.videoFile === 'string') return parsed.videoFile;
          if (typeof parsed?.videoUrl === 'string') return parsed.videoUrl;
        }
      } else if (typeof c === 'object' && c !== null) {
        const contentObj = c as {
          videoFile?: string;
          videoUrl?: string;
          data?: { videoFile?: string; videoUrl?: string };
        };
        if (typeof contentObj?.videoFile === 'string') return contentObj.videoFile;
        if (typeof contentObj?.data?.videoFile === 'string') return contentObj.data.videoFile;
        if (typeof contentObj?.videoUrl === 'string') return contentObj.videoUrl;
        if (typeof contentObj?.data?.videoUrl === 'string') return contentObj.data.videoUrl;
      }
    } catch {}
    return null;
  }, []);

  // Resolver URL de video cuando cambia la lección
  useEffect(() => {
    let isCancelled = false;
    const resolveVideoUrl = async () => {
      const rawSrc = currentLesson?.tipo === 'VIDEO' ? getRawVideoSrc(currentLesson) : null;
      if (currentLesson?.tipo === 'VIDEO' && rawSrc) {
        try {
          const url = await getVideoUrl(rawSrc);
          if (!isCancelled) setResolvedVideoUrl(url);
        } catch (err) {
          console.error('Error resolving video URL:', err);
          if (!isCancelled) setResolvedVideoUrl('');
        }
      } else if (!isCancelled) {
        setResolvedVideoUrl('');
      }
    };
    resolveVideoUrl();
    return () => {
      isCancelled = true;
    };
  }, [currentLesson, currentLesson?.tipo, getVideoUrl, getRawVideoSrc]);

  // Duración real de video (cache)
  const handleVideoDurationUpdate = useCallback(
    (duration: number) => {
      if (!currentLesson?.id) return;
      setActualVideoDuration(duration);
      const newCache = { ...videoDurationsCache, [currentLesson.id]: duration };
      setVideoDurationsCache(newCache);
      try {
        localStorage.setItem(`course-durations-${course.id}`, JSON.stringify(newCache));
      } catch (e) {
        console.warn('No se pudo guardar duración en localStorage:', e);
      }
    },
    [currentLesson?.id, videoDurationsCache, course.id]
  );

  // Precarga de duraciones
  const preloadVideoDurations = useCallback(async () => {
    if (isDurationsLoaded || !course.modulos) return;

    try {
      const durationsToLoad: Record<string, number> = {};
      const videoLessons: Lesson[] = [];
      const videosWithoutSrc: Lesson[] = [];

      course.modulos.forEach((m) => {
        m.lecciones?.forEach((l) => {
          if (l.tipo === 'VIDEO' && !videoDurationsCache[l.id]) {
            const rawSrc = getRawVideoSrc(l);
            if (rawSrc) videoLessons.push(l);
            else videosWithoutSrc.push(l);
          }
        });
      });

      if (videosWithoutSrc.length) {
        const newCache = { ...videoDurationsCache };
        videosWithoutSrc.forEach((l) => (newCache[l.id] = 0));
        setVideoDurationsCache(newCache);
        try {
          localStorage.setItem(`course-durations-${course.id}`, JSON.stringify(newCache));
        } catch (e) {
          console.warn('No se pudo guardar cache en localStorage:', e);
        }
      }

      if (!videoLessons.length) {
        setIsDurationsLoaded(true);
        return;
      }

      const batchSize = 2;
      for (let i = 0; i < videoLessons.length; i += batchSize) {
        const batch = videoLessons.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(
            (lesson) =>
              new Promise<void>((resolve) => {
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.muted = true;
                video.style.display = 'none';
                const cleanup = () => {
                  try {
                    if (video.parentNode) video.parentNode.removeChild(video);
                  } catch {}
                  resolve();
                };
                const timeoutId = setTimeout(cleanup, 3000);
                video.onloadedmetadata = () => {
                  clearTimeout(timeoutId);
                  if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
                    durationsToLoad[lesson.id] = Math.floor(video.duration);
                  }
                  cleanup();
                };
                video.onerror = cleanup;
                video.onabort = cleanup;
                document.body.appendChild(video);
                const rawSrc = getRawVideoSrc(lesson);
                getVideoUrl(rawSrc).then((url) => (video.src = url)).catch(cleanup);
              })
          )
        );

        if (Object.keys(durationsToLoad).length) {
          const newCache = { ...videoDurationsCache, ...durationsToLoad };
          setVideoDurationsCache(newCache);
          try {
            localStorage.setItem(`course-durations-${course.id}`, JSON.stringify(newCache));
          } catch (e) {
            console.warn('No se pudo guardar cache en localStorage:', e);
          }
        }

        if (i + batchSize < videoLessons.length) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    } catch (err) {
      console.error('Error preloading video durations:', err);
    } finally {
      setIsDurationsLoaded(true);
    }
  }, [course.modulos, course.id, videoDurationsCache, isDurationsLoaded, getVideoUrl, getRawVideoSrc]);

  // Duración visible de una lección
  const getLessonDuration = useCallback(
    (lesson: Lesson): number | null => {
      if (lesson.tipo === 'VIDEO') {
        if (videoDurationsCache[lesson.id]) return videoDurationsCache[lesson.id];
        if (!lesson.rutaSrc) return null;
        return lesson.duracionS ?? null;
      }
      return lesson.duracionS ?? null;
    },
    [videoDurationsCache]
  );

  // Precargar duraciones en montaje
  useEffect(() => {
    if (course.modulos?.length && !isDurationsLoaded) {
      preloadVideoDurations();
    }
  }, [course.modulos, isDurationsLoaded, preloadVideoDurations]);

  // Actualizar duración visible al cambiar de lección
  useEffect(() => {
    if (currentLesson?.id && videoDurationsCache[currentLesson.id]) {
      setActualVideoDuration(videoDurationsCache[currentLesson.id]);
    } else {
      setActualVideoDuration(null);
    }
  }, [currentLesson?.id, videoDurationsCache]);

  // El progreso inicial se maneja en ProgressProvider (layout). No hacemos merge aquí.
  useEffect(() => {
    // noop
  }, [enrollment?.id, enrollment?.progreso]);

  // Adyacentes: memoizar para deps estables
  const getAdjacentLesson = useCallback(
    (direction: 'prev' | 'next') => {
      if (!course.modulos || !currentLesson || !currentModule) return null;

      const currentModuleIndex = course.modulos.findIndex((m) => m.id === currentModule.id);
      const currentLessonIndex =
        currentModule.lecciones?.findIndex((l) => l.id === currentLesson.id) ?? -1;

      if (direction === 'next') {
        if (currentModule.lecciones && currentLessonIndex < currentModule.lecciones.length - 1) {
          return {
            lesson: currentModule.lecciones[currentLessonIndex + 1],
            module: currentModule,
          };
        }
        if (currentModuleIndex < course.modulos.length - 1) {
          const nextMod = course.modulos[currentModuleIndex + 1];
          if (nextMod.lecciones?.length) {
            return { lesson: nextMod.lecciones[0], module: nextMod };
          }
        }
      } else {
        if (currentLessonIndex > 0 && currentModule.lecciones) {
          return {
            lesson: currentModule.lecciones[currentLessonIndex - 1],
            module: currentModule,
          };
        }
        if (currentModuleIndex > 0) {
          const prevMod = course.modulos[currentModuleIndex - 1];
          if (prevMod.lecciones?.length) {
            return {
              lesson: prevMod.lecciones[prevMod.lecciones.length - 1],
              module: prevMod,
            };
          }
        }
      }
      return null;
    },
    [course.modulos, currentLesson, currentModule]
  );

  // Precargar lecciones adyacentes (sin param sin uso)
  const preloadAdjacentLessons = useCallback(() => {
    if (!course.modulos) return;
    const nextData = getAdjacentLesson('next');
    const prevData = getAdjacentLesson('prev');

    if (nextData?.lesson && !preloadedContent[nextData.lesson.id]) {
      preloadLessonContent(nextData.lesson).catch((err) =>
        console.warn('Failed to preload next lesson:', (err as Error).message)
      );
    }
    if (prevData?.lesson && !preloadedContent[prevData.lesson.id]) {
      setTimeout(() => {
        preloadLessonContent(prevData.lesson).catch((err) =>
          console.warn('Failed to preload previous lesson:', (err as Error).message)
        );
      }, 200);
    }
  }, [course.modulos, preloadedContent, getAdjacentLesson]);

  // Precargar contenido específico por lección
  const preloadLessonContent = useCallback(
    async (lesson: Lesson): Promise<void> => {
      if (!lesson) return;
      if (preloadedContent[lesson.id]) return;

      try {
        setPreloadedContent((prev) => ({ ...prev, [lesson.id]: true }));

        if (lesson.tipo === 'VIDEO' && lesson.rutaSrc) {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.crossOrigin = 'anonymous';

          const videoUrl = await getVideoUrl(lesson.rutaSrc);
          video.src = videoUrl;

          await Promise.race<void>([
            new Promise((resolve, reject) => {
              video.onloadedmetadata = () => resolve();
              video.onerror = () => reject(new Error('Video metadata error'));
            }),
            new Promise((resolve) => setTimeout(resolve, 500)),
          ]);
        }
      } catch (err) {
        console.warn(
          'Preload warning for lesson:',
          lesson.id,
          err instanceof Error ? err.message : String(err)
        );
      }
    },
    [preloadedContent, getVideoUrl]
  );

  // Navegación por URL
  useEffect(() => {
    if (!course.modulos) return;

    const moduleParam = params.modulo as string | undefined;
    const lessonParam = params.leccion as string | undefined;

    if (moduleParam && lessonParam) {
      let targetModule =
        course.modulos.find((m) => getModuleSlug(m) === moduleParam || m.id === moduleParam) ??
        null;

      if (!targetModule && moduleParam.startsWith('modulo-')) {
        const idx = parseInt(moduleParam.replace('modulo-', '')) - 1;
        targetModule = course.modulos[idx] ?? null;
      }

      if (targetModule) {
        let targetLesson =
          targetModule.lecciones?.find(
            (l) => getLessonSlug(l) === lessonParam || l.id === lessonParam
          ) ?? null;

        if (!targetLesson && lessonParam.startsWith('leccion-')) {
          const idx = parseInt(lessonParam.replace('leccion-', '')) - 1;
          targetLesson = targetModule.lecciones?.[idx] ?? null;
        }

        if (targetLesson) {
          setCurrentModule(targetModule);
          setCurrentLesson(targetLesson);
          setContentError(null);
          preloadLessonContent(targetLesson);
          preloadAdjacentLessons();
          return;
        }
      }
    }

    if (currentLesson?.id && currentModule?.id) {
      const targetModule = course.modulos.find((m) => m.id === currentModule.id) ?? null;
      const targetLesson = targetModule?.lecciones?.find((l) => l.id === currentLesson.id) ?? null;

      if (targetLesson && targetModule) {
        setCurrentModule(targetModule);
        setCurrentLesson(targetLesson);
        setContentError(null);
        preloadLessonContent(targetLesson);
        preloadAdjacentLessons();
        return;
      }
    }

    if (!currentLesson && !moduleParam && !lessonParam) {
      const firstModule = course.modulos[0];
      const firstLesson = firstModule?.lecciones?.[0];
      if (firstLesson && firstModule) {
        router.push(`/cursos/${course.slug}/modulo-1/leccion-1`);
      }
    }
  }, [
    course.modulos,
    params.modulo,
    params.leccion,
    currentLesson?.id,
    currentModule?.id,
    preloadLessonContent,
    preloadAdjacentLessons,
    currentLesson,
    getModuleSlug,
    getLessonSlug,
    course.slug,
    router,
  ]);

  // Navegar a una lección específica
  const navigateToLesson = useCallback(
    (lessonId: string, moduleId: string) => {
      if (currentLesson?.id === lessonId && currentModule?.id === moduleId) return;

      const targetModule = course.modulos?.find((m) => m.id === moduleId) ?? null;
      const targetLesson = targetModule?.lecciones?.find((l) => l.id === lessonId) ?? null;

      if (targetLesson && targetModule) {
        const moduleIndex = targetModule.orden;
        const lessonIndex = targetLesson.orden;
        router.push(`/cursos/${course.slug}/modulo-${moduleIndex}/leccion-${lessonIndex}`);
      }
    },
    [course.modulos, course.slug, currentLesson?.id, currentModule?.id, router]
  );

  // Progreso: completar
  const markLessonComplete = async (lessonId: string) => {
    if (!currentModule) return;
    await ctxMarkLessonComplete(currentModule.id, lessonId, {
      completedAt: new Date().toISOString(),
      lessonTitle: currentLesson?.titulo,
      moduleTitle: currentModule.titulo,
    });
  };

  // Progreso: toggle
  const toggleLessonComplete = async (lessonId: string) => {
    const lessonModule = course.modulos?.find((m) => m.lecciones?.some((l) => l.id === lessonId)) ?? null;
    const lesson = lessonModule?.lecciones?.find((l) => l.id === lessonId) ?? null;
    if (!lessonModule) return;
    await ctxToggleLessonComplete(lessonModule.id, lessonId, {
      lessonTitle: lesson?.titulo,
      moduleTitle: lessonModule.titulo,
    });
  };

  // Theater mode
  const handleTheaterModeChange = useCallback((theater: boolean) => {
    setIsTheaterMode(theater);
  }, []);
  const handleMiniPlayerTimeUpdate = useCallback((time: number) => {
    setMiniPlayerCurrentTime(time);
  }, []);
  const handleCloseMiniPlayer = useCallback(() => {
    setShowMiniPlayer(false);
    setMiniPlayerVideoUrl('');
    setMiniPlayerLesson(null);
    setMiniPlayerCurrentTime(0);
  }, []);
  const handleMaximizeMiniPlayer = useCallback(() => {
    setShowMiniPlayer(false);
  }, []);

  // Mini-player: navegación
  useEffect(() => {
    const handleBeforeUnload = () => {
      const rawSrc = getRawVideoSrc(currentLesson);
      if (currentLesson?.tipo === 'VIDEO' && rawSrc && miniPlayerCurrentTime > 0) {
        setShowMiniPlayer(true);
        getVideoUrl(rawSrc).then((url) => setMiniPlayerVideoUrl(url));
        setMiniPlayerLesson(currentLesson);
      }
    };
    const handleVisibilityChange = () => {
      const rawSrc = getRawVideoSrc(currentLesson);
      if (document.hidden && currentLesson?.tipo === 'VIDEO' && rawSrc) {
        setShowMiniPlayer(true);
        getVideoUrl(rawSrc).then((url) => setMiniPlayerVideoUrl(url));
        setMiniPlayerLesson(currentLesson);
      } else if (!document.hidden) {
        setShowMiniPlayer(false);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentLesson, miniPlayerCurrentTime, getVideoUrl, getRawVideoSrc]);

  if (!currentLesson || !currentModule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--fg)] mb-2">Cargando curso...</h2>
          <p className="text-[var(--muted)]">Preparando el contenido para ti</p>
        </div>
      </div>
    );
  }

  const prevLesson = getAdjacentLesson('prev');
  const nextLesson = getAdjacentLesson('next');

  return (
    <div className="h-screen bg-[var(--bg)] flex flex-col overflow-hidden">
      {!isTheaterMode && (
        <CourseHeader
          course={course}
          currentLesson={currentLesson}
          currentModule={currentModule}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          actualVideoDuration={actualVideoDuration}
          getLessonDuration={getLessonDuration}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {!isTheaterMode && (
          <CourseModuleSidebar
            course={course}
            currentLesson={currentLesson}
            currentModule={currentModule}
            lessonProgress={lessonProgress}
            onLessonSelect={navigateToLesson}
            onToggleLessonComplete={toggleLessonComplete}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            getLessonProgressKey={getLessonProgressKey}
            actualVideoDuration={actualVideoDuration}
            getLessonDuration={getLessonDuration}
          />
        )}

        <div className="flex-1 flex flex-col bg-black">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 bg-black overflow-hidden">
              <div className="relative w-full h-full flex flex-col">
                {currentLesson.tipo === 'VIDEO' && getRawVideoSrc(currentLesson) ? (
                  <CourseVideoPlayer
                    videoUrl={resolvedVideoUrl}
                    lesson={currentLesson}
                    onComplete={() => markLessonComplete(currentLesson.id)}
                    onDurationUpdate={handleVideoDurationUpdate}
                    onTheaterModeChange={handleTheaterModeChange}
                    onTimeUpdate={handleMiniPlayerTimeUpdate}
                  />
                ) : (
                  <div className="relative flex-1 flex flex-col min-h-0">
                    <div className="animate-in fade-in-0 duration-300 flex-1 flex flex-col min-h-0">
                      {contentError ? (
                        <div className="flex-1 flex items-center justify-center p-6">
                          <div className="max-w-md text-center">
                            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              Contenido no disponible
                            </h3>
                            <p className="text-gray-600 mb-4">{contentError}</p>
                            <div className="space-y-2">
                              <Button
                                onClick={() => {
                                  setContentError(null);
                                  window.location.reload();
                                }}
                                className="w-full"
                              >
                                Reintentar
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => router.push(`/cursos/${course.slug}`)}
                                className="w-full"
                              >
                                Volver al curso
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <ErrorBoundary onError={(err) => setContentError(err.message)} fallback={null}>
                          <ContentPlayer
                            lesson={currentLesson}
                            onComplete={() => markLessonComplete(currentLesson.id)}
                            onProgress={(_progress) => {
                              // Hook para tracking si lo necesitás
                            }}
                          />
                        </ErrorBoundary>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isTheaterMode && (
            <div className="bg-gradient-to-r from-[var(--bg)] to-[var(--bg-subtle)] border-t border-[var(--border)] p-1 md:p-2 shadow-lg flex-shrink-0">
              <div className="block lg:hidden space-y-2">
                <div className="flex justify-center">
                  <CourseProgress
                    enrollment={enrollment}
                    course={course}
                    lessonProgress={lessonProgress}
                    getLessonProgressKey={getLessonProgressKey}
                  />
                </div>
                <div className="flex gap-2">
                  {prevLesson ? (
                    <Button
                      size="lg"
                      onClick={() => navigateToLesson(prevLesson.lesson.id, prevLesson.module.id)}
                      className="flex-1 flex items-center justify-center gap-2 h-12 min-h-[48px] text-sm font-medium border border-[#af966d] hover:border-[#9a8560] transition-all duration-200 bg-transparent"
                    >
                      <ChevronLeft className="h-5 w-5 text-[#af966d]" />
                      <span className="text-[#af966d]">Anterior</span>
                    </Button>
                  ) : (
                    <div className="flex-1 h-12 flex items-center justify-center text-center text-[var(--muted)] text-sm">
                      Primera lección
                    </div>
                  )}

                  {nextLesson ? (
                    <Button
                      size="lg"
                      onClick={() => navigateToLesson(nextLesson.lesson.id, nextLesson.module.id)}
                      className="flex-1 flex items-center justify-center gap-2 h-12 min-h-[48px] text-sm font-medium border border-[#af966d] hover:border-[#9a8560] transition-all duration-200 shadow-md"
                    >
                      <span className="text-[#af966d]">Siguiente</span>
                      <ChevronRight className="h-5 w-5 text-[#af966d]" />
                    </Button>
                  ) : (
                    <div className="flex-1 h-12 flex items-center justify-center text-center">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        ¡Completado!
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden lg:flex items-center justify-between max-w-6xl mx-auto gap-6">
                <div className="flex-1 max-w-xs">
                  {prevLesson ? (
                    <Button
                      onClick={() => navigateToLesson(prevLesson.lesson.id, prevLesson.module.id)}
                      className="w-full flex items-center gap-3 p-4 h-auto border border-[#af966d] hover:border-[#9a8560] transition-all duration-200 group bg-transparent"
                    >
                      <ChevronLeft className="h-5 w-5 text-[#af966d] group-hover:text-[#9a8560] transition-colors" />
                      <div className="text-left flex-1 min-w-0">
                        <div className="text-xs text-[#af966d] font-medium mb-1">Anterior</div>
                        <div className="text-sm font-medium truncate">{prevLesson.lesson.titulo}</div>
                      </div>
                    </Button>
                  ) : (
                    <div className="w-full p-4 text-center text-[var(--muted)] text-sm">
                      Primera lección
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <CourseProgress
                    enrollment={enrollment}
                    course={course}
                    lessonProgress={lessonProgress}
                    getLessonProgressKey={getLessonProgressKey}
                  />
                </div>

                <div className="flex-1 max-w-xs">
                  {nextLesson ? (
                    <Button
                      onClick={() => navigateToLesson(nextLesson.lesson.id, nextLesson.module.id)}
                      className="w-full flex items-center gap-3 p-4 h-auto border border-[#af966d] hover:border-[#9a8560] transition-all duration-200 group shadow-md hover:shadow-lg"
                    >
                      <div className="text-left flex-1 min-w-0">
                        <div className="text-xs text-[#af966d] font-medium mb-1">Siguiente</div>
                        <div className="text-sm font-medium truncate">{nextLesson.lesson.titulo}</div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[#af966d] group-hover:text-[#9a8560] transition-colors" />
                    </Button>
                  ) : (
                    <div className="w-full p-4 text-center">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        ¡Curso completado!
                      </div>
                      <div className="text-xs text-[var(--muted)] mt-1">
                        Has terminado todas las lecciones
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Renderizar children (páginas de lecciones) */}
      {children}

      {miniPlayerLesson && (
        <MiniPlayer
          videoUrl={miniPlayerVideoUrl}
          lesson={miniPlayerLesson}
          isVisible={showMiniPlayer}
          onClose={handleCloseMiniPlayer}
          onMaximize={handleMaximizeMiniPlayer}
          currentTime={miniPlayerCurrentTime}
          duration={actualVideoDuration || 0}
          onTimeUpdate={handleMiniPlayerTimeUpdate}
        />
      )}
    </div>
  );
}
