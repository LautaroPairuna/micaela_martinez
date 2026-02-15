'use client';

import { toast as reactToastify } from 'react-toastify';

export interface ToastOptions {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  autoClose?: number | false;
  hideProgressBar?: boolean;
  closeOnClick?: boolean;
  pauseOnHover?: boolean;
  draggable?: boolean;
}

export interface Toast {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
}

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export function useToast(): { toast: Toast } {
  const toast: Toast = {
    success: (message: string, options?: ToastOptions) => {
      reactToastify.success(message, { ...defaultOptions, ...options });
    },
    error: (message: string, options?: ToastOptions) => {
      reactToastify.error(message, { ...defaultOptions, ...options });
    },
    info: (message: string, options?: ToastOptions) => {
      reactToastify.info(message, { ...defaultOptions, ...options });
    },
    warning: (message: string, options?: ToastOptions) => {
      reactToastify.warn(message, { ...defaultOptions, ...options });
    },
  };

  return { toast };
}

// Export directo para uso sin hook
export const toast: Toast = {
  success: (message: string, options?: ToastOptions) => {
    reactToastify.success(message, { ...defaultOptions, ...options });
  },
  error: (message: string, options?: ToastOptions) => {
    reactToastify.error(message, { ...defaultOptions, ...options });
  },
  info: (message: string, options?: ToastOptions) => {
    reactToastify.info(message, { ...defaultOptions, ...options });
  },
  warning: (message: string, options?: ToastOptions) => {
    reactToastify.warn(message, { ...defaultOptions, ...options });
  },
};