// apps/web/src/contexts/AdminToastContext.tsx
'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  PropsWithChildren,
} from 'react';
import {
  ToastContainer,
  toast,
  type ToastOptions,
  type TypeOptions,
} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

type ToastInput = {
  title: string;
  description?: string;
  message?: string;
  variant?: ToastVariant;
  id?: string;
  autoClose?: number | false;
  progress?: number;
  onClick?: () => void;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => string;
};

const AdminToastContext = createContext<ToastContextValue | null>(null);

export function useAdminToast() {
  const ctx = useContext(AdminToastContext);
  if (!ctx) throw new Error('useAdminToast must be used within AdminToastProvider');
  return ctx;
}

function mapVariantToType(variant?: ToastVariant): TypeOptions {
  switch (variant) {
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
}

export function AdminToastProvider({ children }: PropsWithChildren) {
  const showToast = useCallback((toastInput: ToastInput) => {
    const { title, description, message, variant, id, autoClose, progress, onClick } = toastInput;
    const progressValue =
      typeof progress === 'number'
        ? Math.max(0, Math.min(100, Math.round(progress)))
        : null;
    const radius = 12;
    const circumference = 2 * Math.PI * radius;
    const dashOffset =
      progressValue === null
        ? circumference
        : circumference * (1 - progressValue / 100);

    const content = (
      <div className="flex items-center gap-3">
        {progressValue !== null ? (
          <div className="relative flex h-9 w-9 items-center justify-center">
            <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-slate-600/70"
              />
              <circle
                cx="16"
                cy="16"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="text-emerald-400 transition-all duration-300 ease-out"
              />
            </svg>
            <span className="absolute text-[10px] font-semibold text-slate-100">
              {progressValue}%
            </span>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {(description || message) && (
            <p className="text-xs text-slate-100/80">
              {description ?? message}
            </p>
          )}
        </div>
      </div>
    );

    const resolvedAutoClose =
      autoClose ?? (typeof progress === 'number' ? false : 4000);
    const options: ToastOptions = {
      type: mapVariantToType(variant),
      autoClose: resolvedAutoClose,
      hideProgressBar: typeof progress === 'number',
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      toastId: id,
      onClick,
      className: onClick ? 'cursor-pointer' : undefined,
    };

    if (id && toast.isActive(id)) {
      toast.update(id, { render: content, ...options });
      return id;
    }

    return String(toast(content, options));
  }, []);

  return (
    <AdminToastContext.Provider value={{ showToast }}>
      {children}

      {/* Contenedor global de react-toastify */}
      <ToastContainer
        position="top-right"
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        pauseOnHover
        draggable
        theme="dark"
      />
    </AdminToastContext.Provider>
  );
}
