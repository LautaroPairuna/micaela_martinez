'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { toast, ToastOptions } from 'react-toastify'
import { ToastType } from '@/components/ui/Toast'

// Mantenemos las interfaces para compatibilidad, aunque simplificadas internamente
interface ToastData {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: ToastData[] // Deprecado, siempre vacío
  addToast: (toast: Omit<ToastData, 'id'>) => string
  removeToast: (id: string) => void
  success: (title: string, message?: string, duration?: number) => string
  error: (title: string, message?: string, duration?: number) => string
  warning: (title: string, message?: string, duration?: number) => string
  info: (title: string, message?: string, duration?: number) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  // Ya no manejamos estado local, delegamos todo a react-toastify
  // Mantenemos la firma de la función para no romper contratos existentes
  
  const formatMessage = (title: string, message?: string) => {
    if (!message) return title;
    return (
      <div className="flex flex-col gap-1">
        <span className="font-semibold">{title}</span>
        <span className="text-sm opacity-90">{message}</span>
      </div>
    );
  };

  const addToast = (data: Omit<ToastData, 'id'>) => {
    const content = formatMessage(data.title, data.message);
    const options: ToastOptions = {
      autoClose: data.duration || 3000
    };

    let id: string | number;
    switch (data.type) {
      case 'success':
        id = toast.success(content, options);
        break;
      case 'error':
        id = toast.error(content, options);
        break;
      case 'warning':
        id = toast.warn(content, options);
        break;
      case 'info':
      default:
        id = toast.info(content, options);
        break;
    }
    return String(id);
  }

  const removeToast = (id: string) => {
    toast.dismiss(id);
  }

  const success = (title: string, message?: string, duration = 3000) => {
    return addToast({ type: 'success', title, message, duration })
  }

  const error = (title: string, message?: string, duration = 5000) => {
    return addToast({ type: 'error', title, message, duration })
  }

  const warning = (title: string, message?: string, duration = 4000) => {
    return addToast({ type: 'warning', title, message, duration })
  }

  const info = (title: string, message?: string, duration = 3000) => {
    return addToast({ type: 'info', title, message, duration })
  }

  return (
    <ToastContext.Provider value={{
      toasts: [], // Array vacío para compatibilidad
      addToast,
      removeToast,
      success,
      error,
      warning,
      info
    }}>
      {children}
      {/* Ya no renderizamos componentes propios, ClientToastContainer en layout maneja el renderizado */}
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
