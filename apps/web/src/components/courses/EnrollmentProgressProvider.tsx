'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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

function flattenEnrollmentProgress(enrollments: any[]): { 
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
      courseModules[courseId] = enrollment.curso.modulos.map((mod: any) => ({
        id: String(mod.id),
        lecciones: mod.lecciones?.map((lesson: any) => ({ id: String(lesson.id) })) || []
      }));
    }

    // Extraer progreso de lecciones si está disponible
    if (enrollment.progreso && typeof enrollment.progreso === 'object') {
      const progreso = enrollment.progreso;
      
      // Si el progreso tiene estructura anidada (módulo -> lección)
      if (typeof progreso === 'object' && !Array.isArray(progreso)) {
        Object.keys(progreso).forEach((key) => {
          if (key === 'porcentaje' || key === 'subscription') return;
          
          const moduleData = progreso[key];
          if (moduleData && typeof moduleData === 'object') {
            Object.keys(moduleData).forEach((lessonKey) => {
              const lessonData = moduleData[lessonKey];
              if (lessonData && typeof lessonData === 'object' && lessonData.completed) {
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

  const getLessonProgressKey = (moduleId: string, lessonId: string) => `${moduleId}-${lessonId}`;

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

  const updateProgress = (courseId: string, moduleId: string, lessonId: string, completed: boolean) => {
    const key = getLessonProgressKey(moduleId, lessonId);
    setLessonProgress(prev => ({
      ...prev,
      [key]: completed
    }));
  };

  // Cargar datos iniciales
  useEffect(() => {
    refreshEnrollments();
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
  }, []);

  const value = useMemo<EnrollmentProgressContextType>(() => ({
    lessonProgress,
    courseModules,
    getLessonProgressKey,
    updateProgress,
    refreshEnrollments,
  }), [lessonProgress, courseModules]);

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