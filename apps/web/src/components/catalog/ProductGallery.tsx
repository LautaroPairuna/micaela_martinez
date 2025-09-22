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
        width: 800, // Dimensiones por defecto para productos
        height: 800,
      }))
      .filter((im): im is LightboxImage => !!im.url);
    return list.length ? list : [{ url: '/images/placeholder.jpg', alt: 'Imagen no disponible', width: 800, height: 800 }];
  }, [images]);

  // Determinar si el lightbox debe estar habilitado (solo si hay más de una imagen)
  const lightboxEnabled = imgs.length > 1;

  const [idx, setIdx] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  // Asegurar que el índice esté dentro del rango válido cuando cambien las imágenes
  React.useEffect(() => {
    if (idx >= imgs.length) {
      setIdx(0);
    }
  }, [imgs.length, idx]);

  // Pre-carga adyacentes
  React.useEffect(() => {
    if (imgs.length <= 1) return;
    const next = new Image();
    next.src = imgs[(idx + 1) % imgs.length].url;
    const prev = new Image();
    prev.src = imgs[(idx - 1 + imgs.length) % imgs.length].url;
  }, [idx, imgs]);

  // Handler para cambio de índice que asegura la sincronización
  const handleIndexChange = React.useCallback((newIndex: number | ((prevIndex: number) => number)) => {
    if (typeof newIndex === 'function') {
      setIdx(prevIdx => {
        const nextIdx = newIndex(prevIdx);
        return Math.max(0, Math.min(nextIdx, imgs.length - 1));
      });
    } else {
      setIdx(Math.max(0, Math.min(newIndex, imgs.length - 1)));
    }
  }, [imgs.length]);

  const objectClass = fit === 'cover' ? 'object-cover' : 'object-contain';
  const current = imgs[idx];

  return (
    <div className="w-full" aria-label="Galería de producto" aria-roledescription="carousel">
      {/* Imagen principal */}
      <div className="relative aspect-square sm:aspect-[1/1] rounded-xl2 overflow-hidden border border-default bg-neutral-900/40 select-none">
        <button
          type="button"
          onClick={() => lightboxEnabled && setOpen(true)}
          className={[
            'absolute inset-0 w-full h-full',
            lightboxEnabled ? 'cursor-pointer' : 'cursor-default',
          ].join(' ')}
          disabled={!lightboxEnabled}
          aria-label={lightboxEnabled ? "Ampliar imagen" : "Imagen"}
          title={lightboxEnabled ? "Clic para ampliar" : undefined}
        >
          <SafeImage
            src={current.url}
            alt={current.alt || 'Imagen del producto'}
            className={`w-full h-full ${objectClass}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </button>

        {/* Navegación entre imágenes */}
        {imgs.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => handleIndexChange((idx - 1 + imgs.length) % imgs.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl2 border border-default bg-[var(--bg)]/80 backdrop-blur p-2 hover:bg-[var(--bg)]"
              aria-label="Imagen anterior"
              title="Anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => handleIndexChange((idx + 1) % imgs.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl2 border border-default bg-[var(--bg)]/80 backdrop-blur p-2 hover:bg-[var(--bg)]"
              aria-label="Imagen siguiente"
              title="Siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}

        {/* Botón de ampliar - solo visible si lightbox está habilitado */}
        {lightboxEnabled && (
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
        )}
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
                onClick={() => handleIndexChange(i)}
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

      {/* Lightbox externo - solo se renderiza si está habilitado */}
      {lightboxEnabled && open && (
        <Lightbox
          images={imgs}
          index={idx}
          onChangeIndex={handleIndexChange}
          onClose={() => setOpen(false)}
          showThumbnails
          initialFit="contain"
          heightOffsetPx={88}
          adaptiveSize
        />
      )}
    </div>
  );
}
