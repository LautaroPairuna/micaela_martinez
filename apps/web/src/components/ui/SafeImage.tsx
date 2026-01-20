// components/ui/SafeImage.tsx
'use client';

import Image from 'next/image';
import { useMemo, useState, useEffect } from 'react';
import { getPublicImageUrl } from '@/lib/media-utils';

type Ratio = '4/3' | '1/1' | '16/9' | `${number}/${number}` | 'auto';

type Props = {
  src?: string | null;
  alt: string;
  className?: string;          // wrapper
  imgClassName?: string;       // <img/>
  ratio?: Ratio;               // 'auto' = sin aspect-ratio
  fit?: 'cover' | 'contain';
  rounded?: 'top' | 'all' | 'none';
  sizes?: string;
  priority?: boolean;
  hoverZoom?: boolean;
  objectPosition?: string;     // ej. '85% 50%'
  withBg?: boolean;            // bg neutro del wrapper
  skeleton?: boolean;          // shimmer de carga
  useBackendProxy?: boolean;   // usar proxy de backend para imágenes
};

const PLACEHOLDER = '/images/placeholder.jpg';
const PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

export function SafeImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  ratio = '4/3',
  fit = 'cover',
  rounded = 'top',
  sizes = '(min-width:1024px) 25vw, 100vw',
  priority,
  hoverZoom = true,
  objectPosition,
  withBg = true,
  skeleton = true,
  useBackendProxy = true,
}: Props) {
  const [err, setErr] = useState(false);
  // ⬇️ Inicializar siempre como false para evitar hidratación
  const [loaded, setLoaded] = useState(false);

  // Reset de estados cuando cambia la src
  useEffect(() => {
    setErr(false);
    setLoaded(!skeleton);
  }, [src, skeleton]);

  // Establecer el estado inicial después de la hidratación
  useEffect(() => {
    if (!skeleton) {
      setLoaded(true);
    }
  }, [skeleton]);

  const finalSrc = useMemo(() => {
    const s = (src ?? '').trim();
    if (!s || err) return PLACEHOLDER;
    
    // Si es una URL relativa sin '/' inicial, agregarla
    let processedSrc = s;
    if (s && !s.startsWith('/') && !s.startsWith('http') && !s.startsWith('data:')) {
      processedSrc = `/${s}`;
    }
    
    // Manejo especial para SVG - asegurarnos de que se procesen correctamente
    if (processedSrc.toLowerCase().endsWith('.svg')) {
      // Para SVGs locales, usarlos directamente
      if (processedSrc.startsWith('/')) {
        return processedSrc;
      }
      // Para SVGs remotos, usar el proxy si está habilitado
      if (useBackendProxy && !processedSrc.startsWith('data:')) {
        return getPublicImageUrl(processedSrc);
      }
    }
    
    // Manejo directo de imágenes para evitar problemas con Next.js Image
    if (processedSrc.includes('/api/media/public/')) {
      // Convertimos directamente /api/media/public/ a /api/media/images/
      return processedSrc.replace('/api/media/public/', '/api/media/images/');
    }
    
    // Si la ruta contiene /images/ o es una ruta local, la usamos directamente
    if (
      (processedSrc.includes('/images/') && !processedSrc.startsWith('http')) || 
      (processedSrc.startsWith('/') && !processedSrc.startsWith('/api/'))
    ) {
      return processedSrc;
    }
    
    // Para otras rutas, usamos el proxy si está habilitado
    if (useBackendProxy && !s.startsWith('data:') && !s.startsWith('/api/media/')) {
      return getPublicImageUrl(processedSrc);
    }
    
    return processedSrc;
  }, [src, err, useBackendProxy]);

  const roundedCls =
    rounded === 'all' ? 'rounded-xl2' : rounded === 'top' ? 'rounded-t-xl2' : '';

  const fitCls = fit === 'contain' ? 'object-contain' : 'object-cover';

  // Determinar si es un SVG para usar el componente adecuado
  const isSvg = finalSrc.toLowerCase().endsWith('.svg');

  return (
    <div
      className={[
        'relative w-full overflow-hidden',
        withBg ? 'bg-neutral-100' : '',
        roundedCls,
        hoverZoom ? 'group-hover/card:scale-[1.02] will-change-transform' : '',
        className,
      ].join(' ')}
      style={ratio === 'auto' ? undefined : { aspectRatio: ratio.replace('/', ' / ') }}
    >
      {skeleton && (
        <div
          aria-hidden
          suppressHydrationWarning
          className={[
            'absolute inset-0',
            'bg-[linear-gradient(90deg,rgba(0,0,0,0)_0%,rgba(0,0,0,.04)_50%,rgba(0,0,0,0)_100%)]',
            'animate-[shimmer_1.4s_infinite]',
            loaded ? 'opacity-0' : 'opacity-100',
            'transition-opacity duration-200',
          ].join(' ')}
          style={{ backgroundSize: '200% 100%' }}
        />
      )}

      <Image
        src={finalSrc || PIXEL}
        alt={alt || 'imagen'}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => {
          setErr(true);
          setLoaded(true); // Aseguramos que se muestre el placeholder si falla
        }}
        onLoad={() => setLoaded(true)}
        draggable={false}
        suppressHydrationWarning
        className={[
          fitCls,
          'h-full w-full',
          skeleton ? (loaded ? 'opacity-100' : 'opacity-0') : 'opacity-100',
          'transition-opacity duration-200',
          imgClassName,
        ].join(' ')}
        style={objectPosition ? { objectPosition } : undefined}
        unoptimized={isSvg}
      />

      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
