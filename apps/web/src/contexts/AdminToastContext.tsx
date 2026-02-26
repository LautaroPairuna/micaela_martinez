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
      <div className="flex w-full items-start gap-3 overflow-hidden">
        {typeof progress === 'number' ? (
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <svg
              className="h-full w-full -rotate-90 transform text-slate-700"
              viewBox="0 0 36 36"
            >
              {/* Background Circle */}
              <path
                className="text-slate-700"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              {/* Progress Circle */}
              <path
                className="text-emerald-400 transition-all duration-300 ease-out"
                strokeDasharray={`${progress}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-white">
              {Math.round(progress)}%
            </span>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-0.5">
          <p className="truncate text-sm font-bold text-white leading-tight" title={title}>
            {title}
          </p>
          {description && (
            <p className="truncate text-xs text-slate-300 font-medium leading-tight" title={description}>
              {description}
            </p>
          )}
          {message && (
            <p className="truncate text-[10px] text-slate-400 tabular-nums leading-tight" title={message}>
              {message}
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
