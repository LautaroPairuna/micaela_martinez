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
};

const EnrollmentProgressContext = createContext<EnrollmentProgressContextType | null>(null);

function flattenEnrollmentProgress(enrollments: Array<{
  cursoId?: string | number;
  curso?: {
    id?: string | number;
    modulos?: Array<{
      id: string | number;
      lecciones?: Array<{ id: string | number }>;
    }>;
  };
  progreso?: unknown;
}>): { 
  lessonProgress: LessonProgressMap; 
  courseModules: Record<string, CourseModule[]> 
} {
  const lessonProgress: LessonProgressMap = {};
  const courseModules: Record<string, CourseModule[]> = {};

  enrollments.forEach((enrollment) => {
    const courseId = String(enrollment.cursoId || enrollment.curso?.id || '');
    if (!courseId) return;

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

  return { lessonProgress, courseModules };
}

export function EnrollmentProgressProvider({ children }: { children: React.ReactNode }) {
  const [lessonProgress, setLessonProgress] = useState<LessonProgressMap>({});
  const [courseModules, setCourseModules] = useState<Record<string, CourseModule[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Mantener referencias estables para evitar rerenders innecesarios
  const getLessonProgressKey = useCallback((moduleId: string, lessonId: string) => `${moduleId}-${lessonId}`, []);

  const refreshEnrollments = async () => {
    try {
      setIsLoading(true);
      const enrollments = await listEnrollments();
      const { lessonProgress: newProgress, courseModules: newModules } = flattenEnrollmentProgress(enrollments);
      setLessonProgress(newProgress);
      setCourseModules(newModules);
    } catch (error) {
      console.error('Error refreshing enrollments:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
  }, []);

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
  }), [lessonProgress, courseModules, getLessonProgressKey, updateProgress]);

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