// apps/web/src/components/home/HeroCarousel.tsx

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Autoplay from 'embla-carousel-autoplay';

import type { SliderItem } from '@/lib/hero-types';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselDots,
} from '@/components/ui/Carousel';

export type HeroCarouselProps = {
  autoPlay?: boolean;
  autoPlayInterval?: number; // ms
  className?: string;

  /** Alto total del carrusel (wrapper) */
  heightClassName?: string;

  /** Aspect de la imagen del slide (acepta responsive classes) */
  imageAspectClassName?: string;

  /** Limita el ancho del contenedor de la imagen (wrapper) */
  imageMaxWidthClassName?: string;

  /** ✅ Limita el ancho TOTAL del contenido del hero (texto+imagen) */
  contentMaxWidthClassName?: string; // default: max-w-[1600px]

  /** Si el fondo/glow lo maneja un padre (HeroSection), ponelo en false */
  withBackground?: boolean;

  /** Logo arriba */
  logoMode?: 'none' | 'per-slide';
  logoSrc?: string; // svg/png

  /** ✅ Logo como slot (para Next/Image u otro) */
  logoSlot?: React.ReactNode;
};

type SlideVM = SliderItem & {
  src: string;
  badgeText: string;

  titleBase: string;
  titleHighlight: string;

  overlayTitle: string;
  overlaySubtitle: string;

  floatingTop: string;
  floatingBottom: string;

  primaryBtn: { label: string; href: string } | null;
  secondaryBtn: { label: string; href: string } | null;
};

function buildHeroSrc(archivo: string) {
  const safe = (archivo || '').replace(/^\/+/, '');
  return `/api/hero/image/${safe}`;
}

function cn(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(' ');
}

function GradientText({ children }: { children: string }) {
  return (
    <span className="inline bg-[linear-gradient(90deg,rgba(255,80,170,1)_0%,rgba(255,210,120,1)_100%)] bg-clip-text text-transparent">
      {children}
    </span>
  );
}

function CTAButton({
  href,
  variant = 'primary',
  children,
}: {
  href: string;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold transition shadow-lg';
  const cls =
    variant === 'primary'
      ? `${base} bg-[#ff4fb2] text-white hover:opacity-95`
      : `${base} bg-transparent border border-white/20 text-white hover:bg-white/10`;
  return (
    <a href={href} className={cls}>
      {children}
    </a>
  );
}

function splitTitle(title?: string | null, highlightOverride?: string | null) {
  const t = (title ?? '').trim();
  const h = (highlightOverride ?? '').trim();
  if (t && h) return { base: t, highlight: h };

  if (!t) return { base: '', highlight: '' };
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { base: '', highlight: t };

  const highlight = parts[parts.length - 1];
  const base = parts.slice(0, -1).join(' ') + ' ';
  return { base, highlight };
}

function safeHref(href?: string | null) {
  const v = (href ?? '').trim();
  return v.length ? v : null;
}
function safeText(text?: string | null) {
  const v = (text ?? '').trim();
  return v.length ? v : null;
}

export function HeroCarousel({
  autoPlay = true,
  autoPlayInterval = 5000,
  className,
  heightClassName,
  imageAspectClassName,
  imageMaxWidthClassName,
  contentMaxWidthClassName,
  withBackground = true,
  logoMode = 'none',
  logoSrc = '/images/mica_pestanas_logo_blanco.svg',
  logoSlot,
}: HeroCarouselProps) {
  const autoplay = useRef(
    Autoplay({
      delay: Math.max(1500, autoPlayInterval),
      stopOnInteraction: false,
      stopOnMouseEnter: false,
    }),
  );

  const [items, setItems] = useState<SliderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/hero/images', { cache: 'no-store' });
        const data = (await res.json()) as SliderItem[];

        if (!ok) return;

        const list = Array.isArray(data) ? data : [];
        const sorted = list
          .filter((x) => x && (x.activa ?? true))
          .sort((a, b) => (a?.orden ?? 0) - (b?.orden ?? 0));

        setItems(sorted);
      } catch {
        if (!ok) return;
        setItems([]);
      } finally {
        if (!ok) return;
        setLoading(false);
      }
    })();

    return () => {
      ok = false;
    };
  }, []);

  const slides: SlideVM[] = useMemo(() => {
    return items.map((it) => {
      const badgeText = safeText(it.etiqueta) || safeText(it.subtitulo) || 'NOVEDADES';
      const { base: titleBase, highlight: titleHighlight } = splitTitle(it.titulo, it.subtitulo);

      const overlayTitle = safeText(it.titulo) || 'MICAELA PESTAÑAS';
      const overlaySubtitle = safeText(it.descripcion) || safeText(it.subtitulo) || 'BELLEZA Y FORMACIÓN';

      const floatingTop = safeText(it.etiqueta) || '+500 ALUMNAS';
      const floatingBottom = safeText(it.ctaPrimarioTexto) || 'PREMIUM';

      const pHref = safeHref(it.ctaPrimarioHref);
      const sHref = safeHref(it.ctaSecundarioHref);

      const primaryBtn =
        pHref && safeText(it.ctaPrimarioTexto)
          ? { label: it.ctaPrimarioTexto!.trim(), href: pHref }
          : null;

      const secondaryBtn =
        sHref && safeText(it.ctaSecundarioTexto)
          ? { label: it.ctaSecundarioTexto!.trim(), href: sHref }
          : null;

      return {
        ...it,
        src: buildHeroSrc(it.archivo),
        badgeText,
        titleBase,
        titleHighlight,
        overlayTitle,
        overlaySubtitle,
        floatingTop,
        floatingBottom,
        primaryBtn,
        secondaryBtn,
      };
    });
  }, [items]);

  const heroPad = 'clamp(16px,4vw,72px)';
  const contentMax = contentMaxWidthClassName ?? 'max-w-[1600px]';

  return (
    <section
      className={cn(
        'relative w-full max-w-[100vw]',
        'overflow-x-hidden overflow-y-visible',
        withBackground ? 'bg-[#111]' : 'bg-transparent',
        className,
      )}
      style={{ ['--hero-pad' as any]: heroPad }}
    >
      {withBackground && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-1/4 h-[520px] w-[520px] rounded-full bg-[#ff4fb2]/14 blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 h-[420px] w-[420px] rounded-full bg-[#ffd278]/10 blur-[150px]" />
        </div>
      )}

      <div className={cn('relative w-full', heightClassName ?? 'min-h-[360px] md:min-h-[440px] lg:min-h-[480px]')}>
        <Carousel
          opts={{
            loop: true,
            // Habilitar drag en desktop y mobile
            dragFree: false,
            dragThreshold: 10,
          }}
          plugins={autoPlay ? [autoplay.current] : []}
          className="relative w-full"
        >
          <CarouselContent className="gap-0">
            {(loading ? [0, 1, 2] : slides).map((s, i) => {
              const isSkeleton = loading;

              const badgeText = isSkeleton ? 'SOPORTE INCLUIDO' : (s as SlideVM).badgeText.toUpperCase();
              const titleBase = isSkeleton ? 'INSTRUCTORES EXPERTOS ' : (s as SlideVM).titleBase.toUpperCase() + ' ';
              const titleHighlight = isSkeleton ? 'APRENDÉ DE VERDAD' : (s as SlideVM).titleHighlight.toUpperCase();

              const description = isSkeleton
                ? 'CARGANDO…'
                : (safeText((s as SlideVM).descripcion) ||
                    'PROFESIONALES CON EXPERIENCIA REAL, GUÍAS PASO A PASO Y FEEDBACK.'
                  ).toUpperCase();

              const src = isSkeleton ? '' : (s as SlideVM).src;
              const alt = isSkeleton ? 'Hero' : (s as SlideVM).alt || (s as SlideVM).overlayTitle;

              const overlayTitle = isSkeleton ? 'INSTRUCTORES EXPERTOS' : (s as SlideVM).overlayTitle.toUpperCase();
              const overlaySubtitle = isSkeleton ? 'PASO A PASO' : (s as SlideVM).overlaySubtitle.toUpperCase();

              const floatingTop = isSkeleton ? 'SOPORTE INCLUIDO' : (s as SlideVM).floatingTop.toUpperCase();
              const floatingBottom = isSkeleton ? 'PREMIUM' : (s as SlideVM).floatingBottom.toUpperCase();

              const primaryBtn = isSkeleton ? null : (s as SlideVM).primaryBtn;
              const secondaryBtn = isSkeleton ? null : (s as SlideVM).secondaryBtn;

              return (
                <CarouselItem key={isSkeleton ? `sk-${i}` : (s as SlideVM).id} className="pb-20">
                  {/* ✅ contenido centrado a 1600px */}
                  <div className={cn('relative mx-auto w-full', contentMax, 'px-[var(--hero-pad)]')}>
                    {logoMode === 'per-slide' && (
                      <div className="flex justify-center">
                        {logoSlot ? (
                          <div className="scale-[1.08] md:scale-[0.8] mb-5">{logoSlot}</div>
                        ) : (
                          <img
                            src={logoSrc}
                            alt="Micaela Martinez"
                            className="h-20 md:h-24 w-auto opacity-95"
                            draggable={false}
                          />
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12 min-w-0">
                      {/* TEXTO */}
                      <div className="lg:col-span-6 xl:col-span-5 text-center lg:text-left min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                          <span className="text-[#ff4fb2]">✦</span>
                          <span className="text-sm text-white/80 uppercase tracking-wide">{badgeText}</span>
                        </div>

                        <h1
                          className="
                            mt-6 font-serif font-bold text-white uppercase
                            leading-[1.40] tracking-[0.02em]
                            text-2xl sm:text-3xl md:text-4xl xl:text-5xl
                          "
                        >
                          {titleBase}
                          <GradientText>{titleHighlight}</GradientText>
                        </h1>

                        <p className="mt-5 max-w-xl 2xl:max-w-2xl text-base text-white/70 sm:text-lg md:text-xl lg:mx-0 mx-auto uppercase">
                          {description}
                        </p>

                        {(primaryBtn || secondaryBtn) && (
                          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                            {primaryBtn && (
                              <CTAButton href={primaryBtn.href} variant="primary">
                                {primaryBtn.label}
                                <span className="ml-2">→</span>
                              </CTAButton>
                            )}
                            {secondaryBtn && (
                              <CTAButton href={secondaryBtn.href} variant="secondary">
                                {secondaryBtn.label}
                              </CTAButton>
                            )}
                          </div>
                        )}
                      </div>

                      {/* IMAGEN */}
                      <div className="lg:col-span-6 xl:col-span-7 min-w-0">
                        <div
                          className={cn(
                            'relative mx-auto w-full min-w-0 overflow-visible',
                            '',
                            imageMaxWidthClassName ??
                              'max-w-[min(760px,100%)] lg:max-w-[min(900px,100%)] 2xl:max-w-[min(980px,100%)]',
                          )}
                        >
                          <div className="absolute inset-6 rounded-3xl bg-[linear-gradient(135deg,rgba(255,80,170,0.14)_0%,rgba(255,210,120,0.12)_100%)] blur-xl" />

                          <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
                            {isSkeleton ? (
                              <div
                                className={cn(
                                  imageAspectClassName ?? 'aspect-[4/5] sm:aspect-[16/9]',
                                  'w-full animate-pulse bg-white/5',
                                )}
                              />
                            ) : (
                              <img
                                src={src}
                                alt={alt}
                                className={cn(
                                  imageAspectClassName ?? 'aspect-[4/5] sm:aspect-[16/9]',
                                  'w-full object-contain',
                                  'bg-[#0b0b0b]',
                                )}
                                loading={i === 0 ? 'eager' : 'lazy'}
                              />
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 sm:from-black/60 via-transparent to-transparent" />

                            <div className="absolute bottom-6 left-6 right-6">
                              <p className="text-xl font-semibold text-white uppercase">{overlayTitle}</p>
                              <p className="text-sm text-white/70 uppercase">{overlaySubtitle}</p>
                            </div>
                          </div>

                          <div className="pointer-events-none absolute -top-7 -right-4 xl:-top-6 xl:-right-6 rounded-2xl bg-[#ff4fb2] px-5 py-3 text-white shadow-lg">
                            <p className="text-sm font-bold uppercase">{floatingTop}</p>
                          </div>

                          <div className="pointer-events-none absolute -bottom-7 -left-4 xl:-bottom-7 xl:-left-7 rounded-2xl bg-[#c9aa6a] px-5 py-3 text-black shadow-lg">
                            <p className="text-sm font-bold uppercase">{floatingBottom}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>

          {/* Navegación por flechas removida: se navega arrastrando + autoplay */}

          {/* Dots */}
          <div className="pointer-events-none absolute lg:bottom-3 bottom-5 left-0 right-0 z-40 flex justify-center px-4">
            <div className="pointer-events-auto rounded-full border border-white/10 bg-black/25 px-4 py-2 backdrop-blur">
              <CarouselDots />
            </div>
          </div>
        </Carousel>
      </div>
    </section>
  );
}

export default HeroCarousel;
