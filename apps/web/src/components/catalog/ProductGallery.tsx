// src/components/catalog/ProductGallery.tsx
'use client';

import * as React from 'react';
import { SafeImage } from '@/components/ui/SafeImage';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import Lightbox, { type LightboxImage } from '@/components/ui/Lightbox';

type Fit = 'contain' | 'cover';

export function ProductGallery({
  images,
  fit = 'contain',
}: {
  images?: { url?: string | null; alt?: string }[];
  fit?: Fit;
}) {
  const imgs: LightboxImage[] = React.useMemo(() => {
    const list = (images ?? [])
      .map((im): LightboxImage => ({
        url: im?.url && String(im.url).trim() ? String(im.url) : '/images/placeholder.jpg',
        alt: im?.alt,
      }))
      .filter((im): im is LightboxImage => !!im.url);
    return list.length ? list : [{ url: '/images/placeholder.jpg', alt: 'Imagen no disponible' }];
  }, [images]);

  const [idx, setIdx] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  // Pre-carga adyacentes
  React.useEffect(() => {
    if (imgs.length <= 1) return;
    const next = new Image();
    next.src = imgs[(idx + 1) % imgs.length].url;
    const prev = new Image();
    prev.src = imgs[(idx - 1 + imgs.length) % imgs.length].url;
  }, [idx, imgs]);

  const objectClass = fit === 'cover' ? 'object-cover' : 'object-contain';
  const current = imgs[idx];

  return (
    <div className="w-full" aria-label="Galería de producto" aria-roledescription="carousel">
      {/* Imagen principal */}
      <div className="relative aspect-square sm:aspect-[1/1] rounded-xl2 overflow-hidden border border-default bg-neutral-900/40 select-none">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute inset-0"
          aria-label="Abrir imagen en modo ampliado"
        >
          <SafeImage
            src={current.url}
            alt={current.alt || 'Producto'}
            sizes="(min-width:1024px) 720px, 100vw"
            className={[objectClass, 'w-full h-full'].join(' ')}
            priority
          />
        </button>

        {imgs.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => setIdx((i) => (i - 1 + imgs.length) % imgs.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl2 border border-default bg-[var(--bg)]/80 backdrop-blur px-2 py-1 hover:bg-[var(--bg)]"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={() => setIdx((i) => (i + 1) % imgs.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl2 border border-default bg-[var(--bg)]/80 backdrop-blur px-2 py-1 hover:bg-[var(--bg)]"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute bottom-3 right-3 rounded-xl2 border border-default bg-[var(--bg)]/80 backdrop-blur px-2 py-1 text-xs hover:bg-[var(--bg)]"
          aria-label="Ampliar imagen"
          title="Ampliar"
        >
          <span className="inline-flex items-center gap-1">
            <Maximize2 className="size-3" /> Ampliar
          </span>
        </button>
      </div>

      {/* Thumbnails */}
      {imgs.length > 0 && (
        <div className="mt-3 grid grid-flow-col auto-cols-[64px] md:auto-cols-[80px] gap-2 overflow-x-auto md:grid-cols-7 md:overflow-visible" role="listbox" aria-label="Miniaturas">
          {imgs.map((im, i) => {
            const selected = i === idx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                role="option"
                aria-selected={selected}
                aria-label={`Imagen ${i + 1}`}
                title={im.alt || `Imagen ${i + 1}`}
                className={[
                  'relative aspect-square rounded-lg overflow-hidden border transition focus:outline-none focus:ring-2',
                  selected ? 'border-[var(--pink)] ring-1 ring-[var(--pink)]' : 'border-default hover:border-[var(--pink)]/60',
                ].join(' ')}
              >
                <SafeImage src={im.url} alt={im.alt || 'Miniatura'} className="object-cover w-full h-full" sizes="100px" />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox externo */}
      {open && (
        <Lightbox
          images={imgs}
          index={idx}
          onChangeIndex={setIdx}
          onClose={() => setOpen(false)}
          showThumbnails
          initialFit="contain"
          heightOffsetPx={88}
        />
      )}
    </div>
  );
}
