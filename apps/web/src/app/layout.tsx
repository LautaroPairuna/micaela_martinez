// apps/web/src/app/layout.tsx
import './styles/globals.css';
import './styles/theme.css';
import type { Metadata, Viewport } from 'next';
import { montserrat, tanAegean } from './fonts';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { FavoritesProvider } from '@/components/providers/FavoritesProvider';
import { AddressProvider } from '@/components/providers/AddressProvider';
import { auth } from '@/lib/server-auth';

export const metadata: Metadata = {
  title: { default: 'Micaela Pestañas', template: '%s | Micaela Pestañas' },
  description: 'Cursos y tienda de cosmética minimalista y elegante.',
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#0b0b0c' }],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Solo obtener datos del usuario si no estamos en rutas estáticas
  let initialUser = null;
  
  // Detectar si estamos en una ruta que necesita autenticación
  const needsAuth = false; // Por defecto, no necesita auth para rutas estáticas
  
  if (needsAuth) {
    try {
      const session = await auth();
      initialUser = session?.user || null;
    } catch (error) {
      // Si falla la autenticación, continuar sin usuario
      console.warn('Auth failed in layout, continuing without user:', error);
      initialUser = null;
    }
  }

  return (
    <html lang="es" className={`${montserrat.variable} ${tanAegean.variable}`}>
      <body className="min-h-dvh antialiased bg-[var(--bg)] text-[var(--fg)]">
        <ToastProvider>
          <AuthProvider initialUser={initialUser}>
            <FavoritesProvider>
              <AddressProvider>
                {children}
              </AddressProvider>
            </FavoritesProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
