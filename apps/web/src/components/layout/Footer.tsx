// components/layout/Footer.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Instagram } from 'lucide-react';

const YEAR = new Date().getFullYear();

export function Footer() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const ig = process.env.NEXT_PUBLIC_INSTAGRAM_URL || '#';

  // JSON-LD Organization (sólo Instagram en sameAs)
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Micaela Pestañas',
    url: siteUrl,
    sameAs: ig !== '#' ? [ig] : [],
  };

  return (
    <footer className="mt-16 border-t border-default surface-light bg-[var(--bg)] text-[var(--fg)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid gap-10 md:grid-cols-3">
        {/* Marca + descripción + Instagram */}
        <div className="space-y-3">
          <Link href="/" className="flex items-center" aria-label="Inicio">
            <Image
              src="/images/mica_pestanas_logo.svg"
              alt="Micaela Pestañas"
              width={220}
              height={40}
              className="h-16 w-auto"
              priority
            />
          </Link>
          <p className="text-sm text-muted">
            Cursos profesionales y tienda de cosmética curada. Minimalismo, técnica y resultados.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <a
              aria-label="Instagram"
              href={ig}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl2 border border-default p-2 hover:text-[var(--pink)] hover:border-[var(--pink)]"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Navegación */}
        <nav aria-label="Navegación de pie de página" className="space-y-3">
          <h3 className="text-sm font-medium">Explorar</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/cursos" className="hover:text-[var(--pink)]">Cursos</Link></li>
            <li><Link href="/tienda" className="hover:text-[var(--pink)]">Tienda</Link></li>
            <li><Link href="/kits" className="hover:text-[var(--pink)]">Kits</Link></li>
            <li><Link href="/ayuda" className="hover:text-[var(--pink)]">Ayuda</Link></li>
          </ul>
        </nav>

        {/* Legal */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/terminos" className="hover:text-[var(--pink)]">Términos</Link></li>
            <li><Link href="/privacidad" className="hover:text-[var(--pink)]">Privacidad</Link></li>
            <li><Link href="/envios-y-devoluciones" className="hover:text-[var(--pink)]">Envíos y devoluciones</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-default">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 text-xs flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
          <span>© {YEAR} Micaela Pestañas. Todos los derechos reservados.</span>
          <span className="text-muted">
            Hecho con toques <span className="text-[var(--pink)]">rosa</span> y <span className="text-gold">dorado</span>.
          </span>
        </div>
      </div>

      {/* JSON-LD Organization */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
    </footer>
  );
}
