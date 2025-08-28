import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthView } from '@/components/auth/AuthView';

export const metadata: Metadata = {
  title: 'Acceso',
  description: 'Ingresá o creá tu cuenta para comprar cursos y productos.',
  alternates: { canonical: '/auth' },
};

// Evita el error de prerender cuando hay hooks de router/search params
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function AuthFallback() {
  return (
    <div className="rounded-xl2 border border-default p-4 bg-[var(--bg)] text-sm text-muted">
      Cargando autenticación…
    </div>
  );
}

export default function AuthPage() {
  return (
    <section className="max-w-md mx-auto py-8">
      <h1 className="font-display text-2xl mb-4">Tu cuenta</h1>
      <Suspense fallback={<AuthFallback />}>
        <AuthView />
      </Suspense>
    </section>
  );
}
