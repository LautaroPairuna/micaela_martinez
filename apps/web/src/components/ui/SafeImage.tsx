// components/ui/SafeImage.tsx
'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

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
}: Props) {
  const [err, setErr] = useState(false);
  // ⬇️ clave: si no hay skeleton, no ocultes la imagen
  const [loaded, setLoaded] = useState(!skeleton);

  const finalSrc = useMemo(() => {
    const s = (src ?? '').trim();
    return !s || err ? PLACEHOLDER : s;
  }, [src, err]);

  const roundedCls =
    rounded === 'all' ? 'rounded-xl2' : rounded === 'top' ? 'rounded-t-xl2' : '';

  const fitCls = fit === 'contain' ? 'object-contain' : 'object-cover';

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
        onError={() => setErr(true)}
        onLoad={() => setLoaded(true)}
        draggable={false}
        className={[
          fitCls,
          'h-full w-full',
          skeleton ? (loaded ? 'opacity-100' : 'opacity-0') : 'opacity-100',
          'transition-opacity duration-200',
          imgClassName,
        ].join(' ')}
        style={objectPosition ? { objectPosition } : undefined}
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
