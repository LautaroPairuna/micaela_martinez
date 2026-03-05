import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthView } from '@/components/auth/AuthView';
import { FadeIn } from '@/components/ui/Motion';

export const metadata: Metadata = {
  title: 'Acceso y Registro',
  description: 'Ingresá a tu cuenta para acceder a tus cursos, gestionar tus pedidos y disfrutar de beneficios exclusivos en Micaela Martinez.',
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
      <FadeIn>
        <h1 className="font-display text-2xl mb-4">Tu cuenta</h1>
        <Suspense fallback={<AuthFallback />}>
          <AuthView />
        </Suspense>
      </FadeIn>
    </section>
  );
}
