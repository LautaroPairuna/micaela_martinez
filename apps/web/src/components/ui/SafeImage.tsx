// components/ui/SafeImage.tsx
'use client';

import Image from 'next/image';
import { useMemo, useState, useEffect } from 'react';
import { getPublicImageUrl } from '@/lib/media-utils';
import { PLACEHOLDER_IMAGE } from '@/lib/image-utils';

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
  onLoad?: () => void;
  onError?: () => void;
};

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
  onLoad,
  onError,
}: Props) {
  const [err, setErr] = useState(false);
  // ⬇️ Inicializar siempre como false para evitar hidratación
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null | undefined>(src);

  // Reset de estados cuando cambia la src (Sincronización Global)
  useEffect(() => {
    setErr(false);
    setCurrentSrc(src);
    // Si no hay skeleton, marcamos como loaded inmediatamente (pero dejamos un tick para evitar flash)
    if (!skeleton) {
        setLoaded(true);
    } else {
        setLoaded(false);
    }
  }, [src, skeleton]);

  const finalSrc = useMemo(() => {
    const s = (currentSrc ?? '').trim();
    if (!s || err) return PLACEHOLDER_IMAGE;
    
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
    if (useBackendProxy && !processedSrc.startsWith('data:')) {
      return getPublicImageUrl(processedSrc);
    }
    
    return processedSrc;
  }, [src, err, useBackendProxy]);

  const Tag = ratio === 'auto' ? 'div' : 'div'; // wrapper siempre div
  
  return (
    <Tag 
      className={`relative overflow-hidden ${withBg ? 'bg-white' : ''} ${className} ${rounded === 'all' ? 'rounded-xl' : rounded === 'top' ? 'rounded-t-xl' : ''}`}
      style={{ aspectRatio: ratio === 'auto' ? undefined : ratio.replace('/', ' / ') }}
    >
      {/* Skeleton / Loading State */}
      {!loaded && skeleton && (
        <div 
          className="absolute inset-0 z-10 bg-gray-100 animate-pulse flex items-center justify-center"
        >
           <svg className="w-8 h-8 text-gray-300 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
        </div>
      )}

      <Image
        src={finalSrc}
        alt={alt}
        fill={ratio !== 'auto'}
        width={ratio === 'auto' ? 800 : undefined}
        height={ratio === 'auto' ? 600 : undefined}
        className={`transition-all duration-700 ease-in-out ${
          loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-lg'
        } ${hoverZoom ? 'group-hover:scale-105' : ''} ${imgClassName}`}
        style={{ objectFit: fit, objectPosition }}
        sizes={sizes}
        priority={priority}
        onError={() => {
          setErr(true);
          onError?.();
        }}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        unoptimized={finalSrc.endsWith('.gif')} // GIFs animados no optimizar
      />
    </Tag>
  );
}
