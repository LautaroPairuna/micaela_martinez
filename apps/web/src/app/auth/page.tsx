import type { Metadata } from 'next';
import { AuthView } from '@/components/auth/AuthView';

export const metadata: Metadata = {
  title: 'Acceso',
  description: 'Ingresá o creá tu cuenta para comprar cursos y productos.',
  alternates: { canonical: '/auth' },
};

export default function AuthPage() {
  return (
    <section className="max-w-md mx-auto py-8">
      <h1 className="font-display text-2xl mb-4">Tu cuenta</h1>
      <AuthView />
    </section>
  );
}
