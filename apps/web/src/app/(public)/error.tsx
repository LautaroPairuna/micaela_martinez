// src/app/(public)/error.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, Clipboard, MessageCircle } from 'lucide-react';

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
          'rounded-3xl border border-default bg-[var(--bg)]/90 backdrop-blur p-7',
          'shadow-[0_8px_24px_rgba(0,0,0,0.25)]',
        ].join(' ')}
      >
        <header className="flex items-start gap-4">
          <div className="grid place-items-center size-10 rounded-xl bg-[var(--pink)]/15 text-[var(--pink)]">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl leading-tight">Ups, algo no salió como esperábamos</h2>
            <p className="mt-1 text-sm text-muted">{msg}</p>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl2 px-4 py-2 text-sm bg-[var(--pink)] text-black hover:bg-[var(--pink-strong)] focus:outline-none focus:ring-2"
            aria-label="Reintentar"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Reintentar
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl2 px-4 py-2 text-sm border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)]/10 focus:outline-none focus:ring-2"
            aria-label="Ir al inicio"
          >
            <Home className="h-4 w-4" aria-hidden />
            Ir al inicio
          </Link>

          <Link
            href="/contacto"
            className="inline-flex items-center gap-2 rounded-xl2 px-4 py-2 text-sm border border-[var(--pink)] text-[var(--pink)] hover:bg-[var(--pink)]/10 focus:outline-none focus:ring-2"
            aria-label="Contactar soporte"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Contactar soporte
          </Link>
        </div>

        {isDev && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-xl2 border border-default px-3 py-1.5 text-xs hover:bg-subtle focus:outline-none focus:ring-2"
                aria-label="Copiar detalles técnicos"
              >
                <Clipboard className="h-3.5 w-3.5" aria-hidden />
                {copied ? '¡Copiado!' : 'Copiar detalles técnicos'}
              </button>
              {error?.digest && (
                <span className="text-xs text-muted">
                  ID: <span className="font-mono">{error.digest}</span>
                </span>
              )}
            </div>
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted hover:underline">Detalles técnicos</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/40 p-3 text-xs leading-relaxed">{error?.stack ?? '(sin stack)'}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
