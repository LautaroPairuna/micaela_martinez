'use client';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export function ClientToastContainer() {
  return (
    <>
      <style jsx global>{`
        /* Posicionamiento más abajo del header */
        .Toastify__toast-container--top-right {
          top: 120px !important;
        }
        
        /* Corrección de estilos para evitar expansión */
        .Toastify__toast {
          border-radius: 8px !important;
          margin-bottom: 1rem !important;
          min-height: 64px !important;
          height: auto !important; /* Importante para evitar full-screen */
          max-height: 300px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Ajustes visuales del contenido */
        .Toastify__toast-body {
          font-family: var(--font-montserrat), system-ui, sans-serif;
          font-size: 0.9rem;
          padding: 0 0.5rem;
          margin: auto 0;
        }

        /* Colores específicos para dark theme unificado */
        .Toastify__toast-theme--dark.Toastify__toast--success {
          background: #0f172a !important; /* Slate 900 */
          border-left: 4px solid #22c55e !important;
        }
        .Toastify__toast-theme--dark.Toastify__toast--info {
          background: #0f172a !important;
          border-left: 4px solid #3b82f6 !important;
        }
        .Toastify__toast-theme--dark.Toastify__toast--error {
          background: #0f172a !important;
          border-left: 4px solid #ef4444 !important;
        }
      `}</style>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </>
  );
}
