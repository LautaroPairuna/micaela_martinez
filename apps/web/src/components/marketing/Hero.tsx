'use client';

import * as React from 'react';
import Link from 'next/link';

type Props = {
  eyebrow?: string;
  title?: string;
  highlight?: string;
  subtitle?: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
  bgImage?: { src?: string | null; alt?: string };
  maxHeightPx?: number;
  focalX?: number; // 0..100 – punto focal horizontal (85 = derecha)
};

export function Hero({
  eyebrow = 'ACADEMIA & TIENDA',
  title = 'Micaela',
  highlight = 'Pestañas',
  subtitle = 'Aprendé técnicas profesionales y encontrá productos curados. Minimalismo, elegancia y resultados.',
  primary = { href: '/cursos', label: 'Ver cursos' },
  secondary = { href: '/tienda', label: 'Vertienda' },
  bgImage = { src: '/images/hero-bg.jpg', alt: 'Fondo hero' },
  maxHeightPx = 620,
  focalX = 85,
}: Props) {
  const src = (bgImage?.src ?? '').trim() || '/images/placeholder.jpg';

  // Parallax muy sutil en el degradado (sin librerías)
  const shellRef = React.useRef<HTMLDivElement | null>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = shellRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width - 0.5;
    const my = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--px', `${mx * 6}px`);
    el.style.setProperty('--py', `${my * 6}px`);
  };
  const onLeave = () => {
    const el = shellRef.current;
    if (!el) return;
    el.style.setProperty('--px', '0px');
    el.style.setProperty('--py', '0px');
  };

  return (
    <section
      ref={shellRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative overflow-hidden border-b border-default"
      style={{ minHeight: '56svh' }}
    >
      {/* Fondo (native <img> para evitar problemas del wrapper) */}
      <div className="absolute inset-0 -z-10" aria-hidden>
        <img
          src={src}
          alt={bgImage?.alt || ''}
          className="absolute inset-0 h-full w-full object-cover animate-hero-fade"
          style={{ objectPosition: `${Math.min(100, Math.max(0, focalX))}% 50%` }}
          loading="eager"
          draggable={false}
        />
        {/* Degradado: nace a la izquierda y se difumina; se mueve levemente (parallax) */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: 'translate3d(var(--px,0), var(--py,0), 0)',
            background:
              'linear-gradient(90deg, var(--bg) 0%, rgba(0,0,0,0.55) 26%, rgba(0,0,0,0.32) 48%, rgba(0,0,0,0.16) 64%, transparent 80%)',
          }}
        />
        {/* Textura suave */}
        <div className="absolute inset-0 mix-blend-soft-light opacity-10 bg-[radial-gradient(22rem_22rem_at_18%_30%,#ffd70033_0%,transparent_60%)]" />
      </div>

      {/* Contenido */}
      <div
        className="relative mx-auto max-w-6xl px-4"
        style={{ paddingTop: 'clamp(3rem, 8vh, 4.5rem)', paddingBottom: 'clamp(3rem, 8vh, 4.5rem)' }}
      >
        <div className="grid items-center gap-8 lg:grid-cols-12" style={{ maxHeight: `min(72svh, ${maxHeightPx}px)` }}>
          {/* Texto (izquierda) */}
          <div className="lg:col-span-7">
            {eyebrow && (
              <p className="text-[11px] tracking-[.16em] uppercase text-white/70">{eyebrow}</p>
            )}

            <h1 className="mt-2 font-display uppercase tracking-[.04em] leading-[0.95] text-4xl sm:text-6xl">
              {title}{' '}
              <span className="relative text-gold">
                {highlight}
                <span
                  aria-hidden
                  className="absolute left-0 -bottom-2 block h-[2px] w-full rounded-full
                             bg-[linear-gradient(90deg,rgba(255,215,0,.95),rgba(255,105,180,.9),rgba(255,215,0,.95))]
                             bg-[length:200%_100%] animate-shine"
                />
              </span>
            </h1>

            <p className="mt-5 text-base text-white/85 max-w-prose">{subtitle}</p>

            {/* CTAs con vida */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={primary.href}
                className="group/cta-primary relative inline-flex items-center justify-center rounded-xl2 px-6 py-2.5
                           text-black shadow-[0_8px_24px_rgba(255,195,80,.22)]
                           transition-[transform,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                style={{
                  background:
                    'linear-gradient(90deg, var(--gold,#F5C451) 0%, #FFC27A 50%, var(--gold,#F5C451) 100%)',
                  backgroundSize: '200% 100%',
                }}
                onMouseEnter={(e) => ((e.currentTarget.style.backgroundPosition = '100% 50%'), undefined)}
                onMouseLeave={(e) => ((e.currentTarget.style.backgroundPosition = '0% 50%'), undefined)}
              >
                <span className="transition-transform group-hover/cta-primary:-translate-y-0.5"> {primary.label} </span>
              </Link>

              <Link
                href={secondary.href}
                className="group/cta-sec relative inline-flex items-center justify-center rounded-xl2 px-6 py-2.5
                           border border-white/15 text-white/95 backdrop-blur
                           transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <span className="transition-transform group-hover/cta-sec:-translate-y-0.5">{secondary.label}</span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl2 opacity-0 transition-opacity group-hover/cta-sec:opacity-100"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'gradient-x 1.8s linear infinite',
                  }}
                />
              </Link>
            </div>

            {/* Badges con borde degradado y “shine” */}
            <ul className="mt-6 flex flex-wrap gap-2 text-xs text-white/90">
              {['Cursos profesionales', 'Productos curados', 'Atención cercana'].map((t, i) => (
                <li
                  key={t}
                  className="rounded-xl2 px-3 py-1.5 backdrop-blur-[2px] animate-float"
                  style={{
                    border: '1px solid transparent',
                    background:
                      'linear-gradient(var(--bg), var(--bg)) padding-box, linear-gradient(90deg, rgba(255,215,0,.6), rgba(255,105,180,.6), rgba(255,215,0,.6)) border-box',
                    backgroundSize: '200% 100%',
                    animationDelay: `${i * 120}ms`,
                  }}
                >
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: 'linear-gradient(90deg, #FFD700, #FF69B4)',
                    }}
                  >
                    {t}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna vacía para respiración */}
          <div className="lg:col-span-5" aria-hidden />
        </div>
      </div>
    </section>
  );
}
