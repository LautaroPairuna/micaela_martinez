'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Toast, ToastType } from '@/components/ui/Toast'

interface ToastData {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: ToastData[]
  addToast: (toast: Omit<ToastData, 'id'>) => string
  removeToast: (id: string) => void
  success: (title: string, message?: string, duration?: number) => string
  error: (title: string, message?: string, duration?: number) => string
  warning: (title: string, message?: string, duration?: number) => string
  info: (title: string, message?: string, duration?: number) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const newToast: ToastData = {
      ...toast,
      id
    }
    setToasts(prev => [...prev, newToast])
    return id
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const success = (title: string, message?: string, duration = 5000) => {
    return addToast({ type: 'success', title, message, duration })
  }

  const error = (title: string, message?: string, duration = 7000) => {
    return addToast({ type: 'error', title, message, duration })
  }

  const warning = (title: string, message?: string, duration = 6000) => {
    return addToast({ type: 'warning', title, message, duration })
  }

  const info = (title: string, message?: string, duration = 5000) => {
    return addToast({ type: 'info', title, message, duration })
  }

  return (
    <ToastContext.Provider value={{
      toasts,
      addToast,
      removeToast,
      success,
      error,
      warning,
      info
    }}>
      {children}
      
      {/* Renderizar toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              {...toast}
              onClose={removeToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast debe ser usado dentro de un ToastProvider')
  }
  return context
}