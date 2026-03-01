// apps/web/src/app/layout.tsx
import './styles/globals.css';
import './styles/theme.css';
import type { Metadata, Viewport } from 'next';
import { montserrat, tanAegean } from './fonts';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { FavoritesProvider } from '@/components/providers/FavoritesProvider';
import { AddressProvider } from '@/components/providers/AddressProvider';
import { auth } from '@/lib/server-auth';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ClientToastContainer } from '@/components/providers/ClientToastContainer';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://micapestanas.com';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: 'Micaela Pestañas', template: '%s | Micaela Pestañas' },
  description: 'Cursos y tienda de cosmética minimalista y elegante.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: baseUrl,
    siteName: 'Micaela Pestañas',
    title: 'Micaela Pestañas',
    description: 'Cursos y tienda de cosmética minimalista y elegante.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
        <QueryProvider>
          <ToastProvider>
            <AuthProvider initialUser={initialUser}>
              <NotificationsProvider>
                <FavoritesProvider>
                  <AddressProvider>
                    {children}
                    <ClientToastContainer />
                  </AddressProvider>
                </FavoritesProvider>
              </NotificationsProvider>
            </AuthProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
