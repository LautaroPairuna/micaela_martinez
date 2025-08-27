// apps/web/src/app/(public)/layout.tsx   ← o el path que corresponda
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import WhatsappLink from '@/components/ui/WhatsappLink';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    // Usá el mismo sistema de tema (var(--bg)/--fg) o ninguna clase aquí si el root ya pinta el fondo
    <div className="grid min-h-dvh grid-rows-[auto_1fr_auto]">
      <div className="surface-light text-[var(--fg)]">
        <Header />
      </div>

      <main id="content" className="container mx-auto w-full px-4 py-8 lg:py-10">
        {children}
      </main>

      <Footer />
      <WhatsappLink />
    </div>
  );
}
