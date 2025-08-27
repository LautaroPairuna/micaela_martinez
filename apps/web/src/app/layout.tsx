// apps/web/src/app/layout.tsx
import './styles/globals.css';
import './styles/theme.css';
import type { Metadata, Viewport } from 'next';
import { montserrat, tanAegean } from './fonts';

export const metadata: Metadata = {
  title: { default: 'Micaela Pestañas', template: '%s | Micaela Pestañas' },
  description: 'Cursos y tienda de cosmética minimalista y elegante.',
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#0b0b0c' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${montserrat.variable} ${tanAegean.variable}`}>
      <body className="min-h-dvh antialiased bg-[var(--bg)] text-[var(--fg)]">
        {children}
      </body>
    </html>
  );
}
