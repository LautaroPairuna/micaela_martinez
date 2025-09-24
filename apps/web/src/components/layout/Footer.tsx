// components/layout/Footer.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Facebook, LogIn } from 'lucide-react';
import { useSession } from '@/hooks/useSession';

const YEAR = new Date().getFullYear();

export function Footer() {
  const { me, loading } = useSession();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const ig = 'https://instagram.com/micaela.pestanas'
  const fb = 'https://facebook.com/micaela.pestanas'
  const tiktok = 'https://tiktok.com/@micaela.pestanas'

  // JSON-LD Organization (sólo Instagram en sameAs)
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Micaela Pestañas',
    url: siteUrl,
    sameAs: [ig, fb, tiktok],
  };

  // Componente para enlaces que requieren autenticación
  const AuthLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => {
    if (loading) {
      return (
        <span className={`${className} opacity-50 cursor-not-allowed`}>
          {children}
        </span>
      );
    }

    if (!me) {
      return (
        <Link 
          href="/auth" 
          className={`${className} group relative inline-flex items-center gap-2`}
          title="Inicia sesión para acceder"
        >
          <LogIn className="h-3 w-3 opacity-60" />
          {children}
          <span className="text-xs opacity-60 ml-1">(Requiere login)</span>
        </Link>
      );
    }

    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  };

  return (
    <footer className="mt-16 w-full border-t border-default surface-light bg-[var(--bg)] text-[var(--fg)]">
      <div className="w-full px-6 sm:px-8 lg:px-12 py-16">
        <div className="max-w-7xl mx-auto grid gap-12 md:grid-cols-3">
          {/* Columna 1: Descripción */}
          <div className="space-y-6">
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
            <p className="text-sm text-muted leading-relaxed">
              Cursos profesionales y tienda de cosmética curada. Minimalismo, técnica y resultados.
            </p>
            <p className="text-xs text-muted">
              Transformamos tu pasión por la belleza en expertise profesional.
            </p>
          </div>

          {/* Columna 2: Enlaces del sitio */}
          <nav aria-label="Navegación de pie de página" className="space-y-6">
            <h3 className="text-sm font-semibold text-[var(--fg)]">Explorar</h3>
            <div className="grid grid-cols-1 gap-4">
              <ul className="space-y-3 text-sm">
                <li>
                  <Link 
                    href="/cursos" 
                    className="group relative inline-flex items-center text-muted hover:text-[var(--gold-dark)] transition-all duration-200 hover:bg-gradient-to-r hover:from-[var(--gold)]/10 hover:to-transparent px-2 py-1 rounded-lg"
                  >
                    Cursos
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/tienda" 
                    className="group relative inline-flex items-center text-muted hover:text-[var(--gold-dark)] transition-all duration-200 hover:bg-gradient-to-r hover:from-[var(--gold)]/10 hover:to-transparent px-2 py-1 rounded-lg"
                  >
                    Tienda
                  </Link>
                </li>
                <li>
                  <AuthLink 
                    href="/mi-cuenta" 
                    className="group relative inline-flex items-center text-muted hover:text-[var(--gold-dark)] transition-all duration-200 hover:bg-gradient-to-r hover:from-[var(--gold)]/10 hover:to-transparent px-2 py-1 rounded-lg"
                  >
                    Mi Cuenta
                  </AuthLink>
                </li>
              </ul>
            </div>
          </nav>

          {/* Columna 3: Redes Sociales */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-[var(--fg)]">Síguenos</h3>
            <div className="space-y-4">
              <p className="text-xs text-muted">
                Mantente al día con nuestras últimas técnicas y productos.
              </p>
              <div className="flex items-center gap-4">
                <a
                  aria-label="Instagram"
                  href={ig}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-2 rounded-lg text-muted hover:text-[var(--gold-dark)] transition-all duration-200 hover:bg-[var(--gold)]/10 hover:scale-105"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  aria-label="Facebook"
                  href={fb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-2 rounded-lg text-muted hover:text-[var(--gold-dark)] transition-all duration-200 hover:bg-[var(--gold)]/10 hover:scale-105"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  aria-label="TikTok"
                  href={tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-2 rounded-lg text-muted hover:text-[var(--gold-dark)] transition-all duration-200 hover:bg-[var(--gold)]/10 hover:scale-105"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted">
                  ¿Tienes preguntas? <Link href="/ayuda" className="text-[var(--gold-dark)] hover:text-[var(--gold)] hover:underline transition-colors">Contáctanos</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-default">
        <div className="w-full px-6 sm:px-8 lg:px-12 py-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <span className="text-xs text-muted">© {YEAR} Micaela Pestañas. Todos los derechos reservados.</span>
            <span className="text-xs text-muted">
              Diseñado con atención al detalle.
            </span>
          </div>
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
