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
};

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

  if (!loaded && skeleton) {
    return (
      <div 
        className={`relative overflow-hidden bg-gray-200 animate-pulse ${className}`} 
        style={{ aspectRatio: ratio === 'auto' ? undefined : ratio.replace('/', ' / ') }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <svg className="w-8 h-8 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
        </div>
      </div>
    );
  }

  const Tag = ratio === 'auto' ? 'div' : 'div'; // wrapper siempre div
  
  return (
    <Tag 
      className={`relative overflow-hidden ${withBg ? 'bg-gray-50' : ''} ${className} ${rounded === 'all' ? 'rounded-xl' : rounded === 'top' ? 'rounded-t-xl' : ''}`}
      style={{ aspectRatio: ratio === 'auto' ? undefined : ratio.replace('/', ' / ') }}
    >
      <Image
        src={finalSrc}
        alt={alt}
        fill={ratio !== 'auto'}
        width={ratio === 'auto' ? 800 : undefined}
        height={ratio === 'auto' ? 600 : undefined}
        className={`transition-all duration-700 ease-in-out ${
          loaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-lg'
        } ${hoverZoom ? 'group-hover:scale-105' : ''} ${imgClassName}`}
        style={{ objectFit: fit, objectPosition }}
        sizes={sizes}
        priority={priority}
        onError={() => setErr(true)}
        onLoad={() => setLoaded(true)}
        unoptimized={finalSrc.endsWith('.gif')} // GIFs animados no optimizar
      />
    </Tag>
  );
}
