// apps/web/src/app/(public)/layout.tsx   ← o el path que corresponda
'use client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import WhatsappLink from '@/components/ui/WhatsappLink';
import { usePathname } from 'next/navigation';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Detectar si estamos en una página de curso
  const isCoursePlayerPage = pathname?.includes('/cursos/') && pathname?.includes('/modulo') && pathname?.includes('/leccion');
  
  if (isCoursePlayerPage) {
    // Layout limpio para páginas de curso
    return (
      <div className="min-h-dvh">
        <main id="content" className="w-full">
          {children}
        </main>
      </div>
    );
  }
  
  // Layout normal para otras páginas
  return (
    // Usá el mismo sistema de tema (var(--bg)/--fg) o ninguna clase aquí si el root ya pinta el fondo
    <div className="grid min-h-dvh grid-rows-[auto_1fr_auto]">
      <div className="sticky top-0 z-50 surface-light text-[var(--fg)]">
        <Header />
      </div>

      <main id="content" className="mx-auto w-full">
        {children}
      </main>

      <Footer />
      <WhatsappLink />
    </div>
  );
}
