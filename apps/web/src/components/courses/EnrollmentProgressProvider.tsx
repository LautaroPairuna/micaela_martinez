'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { listEnrollments } from '@/lib/sdk/userApi';

type LessonProgressMap = Record<string, boolean>;

type CourseModule = {
  id: string;
  lecciones?: Array<{ id: string }>;
};

type EnrollmentProgressContextType = {
  lessonProgress: LessonProgressMap;
  courseModules: Record<string, CourseModule[]>; // courseId -> modules
  getLessonProgressKey: (moduleId: string, lessonId: string) => string;
  updateProgress: (courseId: string, moduleId: string, lessonId: string, completed: boolean) => void;
  refreshEnrollments: () => Promise<void>;
  getCourseProgress: (courseId: string) => number;
  getCourseProgressBySlug: (slug: string) => number;
};

const EnrollmentProgressContext = createContext<EnrollmentProgressContextType | null>(null);

function flattenEnrollmentProgress(enrollments: Array<{
  cursoId?: string | number;
  curso?: {
    id?: string | number;
    slug?: string | null;
    modulos?: Array<{
      id: string | number;
      lecciones?: Array<{ id: string | number }>;
    }>;
  };
  progreso?: unknown;
}>): { 
  lessonProgress: LessonProgressMap; 
  courseModules: Record<string, CourseModule[]>; 
  courseSlugToId: Record<string, string> 
} {
  const lessonProgress: LessonProgressMap = {};
  const courseModules: Record<string, CourseModule[]> = {};
  const courseSlugToId: Record<string, string> = {};

  enrollments.forEach((enrollment) => {
    const courseId = String(enrollment.cursoId || enrollment.curso?.id || '');
    if (!courseId) return;
    const slugVal = enrollment.curso?.slug ? String(enrollment.curso.slug) : undefined;
    if (slugVal) courseSlugToId[slugVal] = courseId;

    // Extraer módulos del curso si están disponibles
    if (enrollment.curso?.modulos) {
      courseModules[courseId] = enrollment.curso.modulos.map((mod) => ({
        id: String(mod.id),
        lecciones: mod.lecciones?.map((lesson) => ({ id: String(lesson.id) })) || []
      }));
    }

    // Extraer progreso de lecciones si está disponible
    if (enrollment.progreso && typeof enrollment.progreso === 'object') {
      const progreso = enrollment.progreso;
      
      // Si el progreso tiene estructura anidada (módulo -> lección)
      if (typeof progreso === 'object' && !Array.isArray(progreso)) {
        Object.keys(progreso).forEach((key) => {
          if (key === 'porcentaje' || key === 'subscription') return;
          
          const moduleData = (progreso as Record<string, unknown>)[key];
          if (moduleData && typeof moduleData === 'object') {
            Object.keys(moduleData as Record<string, unknown>).forEach((lessonKey) => {
              const lessonData = (moduleData as Record<string, unknown>)[lessonKey];
              if (lessonData && typeof lessonData === 'object' && 'completed' in lessonData && (lessonData as { completed: boolean }).completed) {
                lessonProgress[`${key}-${lessonKey}`] = true;
              }
            });
          }
        });
      }
    }
  });

  return { lessonProgress, courseModules, courseSlugToId };
}

export function EnrollmentProgressProvider({ children }: { children: React.ReactNode }) {
  const [lessonProgress, setLessonProgress] = useState<LessonProgressMap>({});
  const [courseModules, setCourseModules] = useState<Record<string, CourseModule[]>>({});
  const [courseSlugToId, setCourseSlugToId] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Mantener referencias estables para evitar rerenders innecesarios
  const getLessonProgressKey = useCallback((moduleId: string, lessonId: string) => `${moduleId}-${lessonId}`, []);

  const refreshEnrollments = useCallback(async () => {
    try {
      setIsLoading(true);
      const enrollments = await listEnrollments();
      const { lessonProgress: newProgress, courseModules: newModules, courseSlugToId: slugMap } = flattenEnrollmentProgress(enrollments);
      setLessonProgress(newProgress);
      setCourseModules(newModules);
      setCourseSlugToId(slugMap);
    } catch (error) {
      console.error('Error refreshing enrollments:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProgress = useCallback((courseId: string, moduleId: string, lessonId: string, completed: boolean) => {
    const key = getLessonProgressKey(moduleId, lessonId);
    setLessonProgress(prev => ({
      ...prev,
      [key]: completed
    }));
  }, [getLessonProgressKey]);

  // Cargar datos iniciales una sola vez al montar
  useEffect(() => {
    void refreshEnrollments();
  }, [refreshEnrollments]);

  // Escuchar cambios de progreso desde otros componentes
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      const { courseId, moduleId, lessonId, completed } = event.detail;
      updateProgress(courseId, moduleId, lessonId, completed);
    };

    window.addEventListener('lesson-progress-updated', handleProgressUpdate as EventListener);
    
    return () => {
      window.removeEventListener('lesson-progress-updated', handleProgressUpdate as EventListener);
    };
  }, [updateProgress]);

  const value = useMemo<EnrollmentProgressContextType>(() => ({
    lessonProgress,
    courseModules,
    getLessonProgressKey,
    updateProgress,
    refreshEnrollments,
    getCourseProgress: (courseId: string) => {
      const mods = courseModules[courseId] || [];
      let total = 0;
      let done = 0;
      for (const m of mods) {
        const lessons = m.lecciones || [];
        total += lessons.length;
        for (const l of lessons) {
          const key = getLessonProgressKey(m.id, l.id);
          if (lessonProgress[key]) done += 1;
        }
      }
      if (total <= 0) return 0;
      return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
    },
    getCourseProgressBySlug: (slug: string) => {
      const id = courseSlugToId[slug];
      if (!id) return 0;
      const mods = courseModules[id] || [];
      let total = 0;
      let done = 0;
      for (const m of mods) {
        const lessons = m.lecciones || [];
        total += lessons.length;
        for (const l of lessons) {
          const key = getLessonProgressKey(m.id, l.id);
          if (lessonProgress[key]) done += 1;
        }
      }
      if (total <= 0) return 0;
      return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
    },
  }), [
    lessonProgress,
    courseModules,
    getLessonProgressKey,
    updateProgress,
    refreshEnrollments,
    courseSlugToId,
  ]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Cargando progreso...</div>;
  }

  return (
    <EnrollmentProgressContext.Provider value={value}>
      {children}
    </EnrollmentProgressContext.Provider>
  );
}

export function useEnrollmentProgress(): EnrollmentProgressContextType {
  const ctx = useContext(EnrollmentProgressContext);
  if (!ctx) {
    throw new Error('useEnrollmentProgress must be used within EnrollmentProgressProvider');
  }
  return ctx;
}

export function useEnrollmentProgressSafe(): EnrollmentProgressContextType | null {
  return useContext(EnrollmentProgressContext);
}
