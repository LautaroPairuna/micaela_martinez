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
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
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
    const { title, description, message, variant } = toastInput;

    const content = (
      <div className="flex flex-col">
        <p className="text-sm font-semibold text-white">{title}</p>
        {(description || message) && (
          <p className="mt-1 text-xs text-slate-100/80">
            {description ?? message}
          </p>
        )}
      </div>
    );

    const options: ToastOptions = {
      type: mapVariantToType(variant),
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    };

    toast(content, options);
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
