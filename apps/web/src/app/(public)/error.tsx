// src/app/(public)/error.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
// Si ya usas lucide-react en el proyecto, descomenta:
// import { AlertTriangle, RefreshCw, Home, Clipboard } from 'lucide-react';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorProps) {
  const [copied, setCopied] = React.useState(false);

  const isDev =
    process.env.NODE_ENV !== 'production' ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost');

  // Log para devs y ejemplo de telemetría
  React.useEffect(() => {
    // Log local
    console.error('[App ErrorBoundary]', { message: error?.message, digest: error?.digest, stack: error?.stack });

    // Ejemplo de envío a backend/monitoring (Sentry/OTEL/etc.)
    // void fetch('/api/log-client-error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     message: error?.message,
    //     digest: error?.digest,
    //     stack: error?.stack,
    //     url: typeof window !== 'undefined' ? window.location.href : '',
    //     ts: new Date().toISOString(),
    //   }),
    // });
  }, [error]);

  const handleCopy = async () => {
    const payload = {
      message: error?.message ?? 'Unknown error',
      digest: error?.digest ?? null,
      stack: error?.stack ?? null,
      url: typeof window !== 'undefined' ? window.location.href : '',
      ts: new Date().toISOString(),
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  const msg = error?.message?.trim() || 'Ocurrió un error inesperado.';

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div
        role="alert"
        aria-live="polite"
        className={[
          'w-full max-w-xl',
          'rounded-xl2 border border-default bg-[var(--bg)]/95 backdrop-blur p-6',
          'shadow-[0_8px_24px_rgba(0,0,0,0.25)]',
        ].join(' ')}
      >
        <header className="flex items-start gap-3">
          {/* <AlertTriangle className="mt-0.5 h-6 w-6 opacity-80" aria-hidden /> */}
          <div className="flex-1">
            <h2 className="font-display text-xl leading-tight">Ups, algo salió mal</h2>
            <p className="mt-1 text-sm text-muted">{msg}</p>
            {error?.digest && (
              <p className="mt-1 text-xs text-muted/80">
                ID del error: <span className="font-mono">{error.digest}</span>
              </p>
            )}
          </div>
        </header>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl2 border border-default px-3 py-1.5 text-sm hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-offset-0"
            aria-label="Reintentar"
          >
            {/* <RefreshCw className="mr-1 inline-block h-4 w-4" aria-hidden /> */}
            Reintentar
          </button>

          <Link
            href="/"
            className="rounded-xl2 border border-default px-3 py-1.5 text-sm hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-offset-0"
            aria-label="Ir al inicio"
          >
            {/* <Home className="mr-1 inline-block h-4 w-4" aria-hidden /> */}
            Ir al inicio
          </Link>

          <button
            type="button"
            onClick={handleCopy}
            className="rounded-xl2 border border-default px-3 py-1.5 text-sm hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-offset-0"
            aria-label="Copiar detalles técnicos"
          >
            {/* <Clipboard className="mr-1 inline-block h-4 w-4" aria-hidden /> */}
            {copied ? '¡Copiado!' : 'Copiar detalles'}
          </button>
        </div>

        {/* Panel de detalles técnicos: visible en dev */}
        {isDev && (
          <details className="mt-5 group">
            <summary className="cursor-pointer text-sm text-muted hover:underline">
              Detalles técnicos (solo dev)
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/40 p-3 text-xs leading-relaxed">
{error?.stack ?? '(sin stack)'}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
