'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'
import { updateLessonProgress } from '@/lib/sdk/userApi'

type LessonProgressMap = Record<string, boolean>

type ProgressContextType = {
  lessonProgress: LessonProgressMap
  getLessonProgressKey: (moduleId: string, lessonId: string) => string
  isLessonCompleted: (moduleId: string, lessonId: string) => boolean
  markLessonComplete: (
    moduleId: string,
    lessonId: string,
    meta?: { completedAt?: string | null; lessonTitle?: string; moduleTitle?: string }
  ) => Promise<void>
  toggleLessonComplete: (
    moduleId: string,
    lessonId: string,
    meta?: { completedAt?: string | null; lessonTitle?: string; moduleTitle?: string }
  ) => Promise<void>
}

const ProgressContext = createContext<ProgressContextType | null>(null)

function flattenServerProgress(input: unknown): LessonProgressMap {
  const out: LessonProgressMap = {}
  if (!input || typeof input !== 'object') return out
  try {
    const prog = input as Record<string, Record<string, unknown>>
    for (const modKey of Object.keys(prog)) {
      const mod = prog[modKey]
      if (!mod || typeof mod !== 'object') continue
      for (const lessonKey of Object.keys(mod)) {
        const lessonData = mod[lessonKey]
        const completed = !!(lessonData && typeof lessonData === 'object' && 'completed' in lessonData && (lessonData as { completed: boolean }).completed)
        out[`${modKey}-${lessonKey}`] = completed
      }
    }
  } catch {}
  return out
}

export function ProgressProvider({
  enrollmentId,
  initialProgress,
  children,
}: {
  enrollmentId: string | number
  initialProgress?: unknown
  children: React.ReactNode
}) {
  const [lessonProgress, setLessonProgress] = useState<LessonProgressMap>(() =>
    flattenServerProgress(initialProgress)
  )

  const getLessonProgressKey = React.useCallback((moduleId: string, lessonId: string) => `${moduleId}-${lessonId}`, [])
  const isLessonCompleted = React.useCallback((moduleId: string, lessonId: string) => {
    return !!lessonProgress[getLessonProgressKey(moduleId, lessonId)]
  }, [lessonProgress, getLessonProgressKey])

  const markLessonComplete = React.useCallback(async (
    moduleId: string,
    lessonId: string,
    meta?: { completedAt?: string | null; lessonTitle?: string; moduleTitle?: string }
  ) => {
    const key = getLessonProgressKey(moduleId, lessonId)
    setLessonProgress(prev => ({ ...prev, [key]: true }))
    
    // Emitir evento para sincronización con mi-aprendizaje
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lesson-progress-updated', {
        detail: {
          courseId: enrollmentId, // Usar enrollmentId como courseId por ahora
          moduleId,
          lessonId,
          completed: true
        }
      }));
    }
    
    // Debug en tiempo real
    console.log('📡 markLessonComplete → intentando persistir', {
      enrollmentId,
      moduleId,
      lessonId,
      meta,
    })

    try {
      if (enrollmentId && String(enrollmentId) !== 'temp') {
        await updateLessonProgress(enrollmentId, moduleId, lessonId, {
          completedAt: meta?.completedAt ?? new Date().toISOString(),
          lessonTitle: meta?.lessonTitle,
          moduleTitle: meta?.moduleTitle,
        })
        console.log('✅ markLessonComplete → progreso guardado en servidor')
      }
    } catch (err) {
      console.error('❌ Error updating lesson progress:', err)
      // revertir en caso de error
      setLessonProgress(prev => ({ ...prev, [key]: false }))
      
      // Emitir evento de reversión
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lesson-progress-updated', {
          detail: {
            courseId: enrollmentId,
            moduleId,
            lessonId,
            completed: false
          }
        }));
      }
    }
  }, [enrollmentId, getLessonProgressKey])

  const toggleLessonComplete = React.useCallback(async (
    moduleId: string,
    lessonId: string,
    meta?: { completedAt?: string | null; lessonTitle?: string; moduleTitle?: string }
  ) => {
    const key = getLessonProgressKey(moduleId, lessonId)
    const newState = !lessonProgress[key]
    setLessonProgress(prev => ({ ...prev, [key]: newState }))
    
    // Emitir evento para sincronización con mi-aprendizaje
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lesson-progress-updated', {
        detail: {
          courseId: enrollmentId,
          moduleId,
          lessonId,
          completed: newState
        }
      }));
    }
    
    // Debug en tiempo real
    console.log('📡 toggleLessonComplete → intentando persistir', {
      enrollmentId,
      moduleId,
      lessonId,
      newState,
      meta,
    })

    try {
      if (enrollmentId && String(enrollmentId) !== 'temp') {
        await updateLessonProgress(enrollmentId, moduleId, lessonId, {
          completedAt: newState ? (meta?.completedAt ?? new Date().toISOString()) : null,
          lessonTitle: meta?.lessonTitle,
          moduleTitle: meta?.moduleTitle,
        })
        console.log('✅ toggleLessonComplete → progreso guardado en servidor')
      }
    } catch (err) {
      console.error('❌ Error toggling lesson progress:', err)
      // revertir
      setLessonProgress(prev => ({ ...prev, [key]: !newState }))
      
      // Emitir evento de reversión
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lesson-progress-updated', {
          detail: {
            courseId: enrollmentId,
            moduleId,
            lessonId,
            completed: !newState
          }
        }));
      }
    }
  }, [enrollmentId, getLessonProgressKey, lessonProgress])

  const value = useMemo<ProgressContextType>(() => ({
    lessonProgress,
    getLessonProgressKey,
    isLessonCompleted,
    markLessonComplete,
    toggleLessonComplete,
  }), [lessonProgress, getLessonProgressKey, isLessonCompleted, markLessonComplete, toggleLessonComplete])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextType {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}