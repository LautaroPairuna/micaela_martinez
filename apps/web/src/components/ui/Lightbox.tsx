// src/components/ui/Lightbox.tsx
'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { SafeImage } from '@/components/ui/SafeImage';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export type LightboxImage = { url: string; alt?: string };

export type LightboxProps = {
  images: LightboxImage[];
  index: number;                                    // índice actual
  onChangeIndex: React.Dispatch<React.SetStateAction<number>>; // setter compatible con setState
  onClose: () => void;
  showThumbnails?: boolean;
  initialFit?: 'contain' | 'cover';
  heightOffsetPx?: number;                          // resta al alto de la ventana (default 88)
};

/** Auto-oculta la UI si no hay interacción por un tiempo */
function useAutoHideUI(active: boolean, delay = 2500) {
  const [visible, setVisible] = React.useState(true);
  const timerRef = React.useRef<number | null>(null);

  const kick = React.useCallback(() => {
    if (!active) return;
    setVisible(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisible(false), delay);
  }, [active, delay]);

  React.useEffect(() => {
    if (!active) return;
    kick();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [active, kick]);

  return { visible, kick };
}

export default function Lightbox({
  images,
  index,
  onChangeIndex,
  onClose,
  showThumbnails = true,
  initialFit = 'contain',
  heightOffsetPx = 88,
}: LightboxProps) {
  // ⚠️ NO retornamos aún; primero declaramos TODOS los hooks
  const [mounted, setMounted] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [fit, setFit] = React.useState<'contain' | 'cover'>(initialFit);

  // Zoom / Pan
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const dragRef = React.useRef<{ x: number; y: number } | null>(null);

  // Auto-hide UI
  const { visible, kick } = useAutoHideUI(true, 2500);

  // Lock scroll + focus al abrir
  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);
  React.useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    setMounted(true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, []);

  // Cierre animado
  const handleClose = React.useCallback(() => {
    setClosing(true);
    window.setTimeout(() => onClose(), 160);
  }, [onClose]);

  // Teclado
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      kick();
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight' && images.length > 1) onChangeIndex((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft' && images.length > 1) onChangeIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key.toLowerCase() === '0') resetZoom();
      if ((e.key === '+' || e.key === '=') && scale < 4)
        setScale((s) => Math.min(4, +(s + 0.25).toFixed(2)));
      if ((e.key === '-' || e.key === '_') && scale > 1)
        setScale((s) => Math.max(1, +(s - 0.25).toFixed(2)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kick, images.length, onChangeIndex, scale, handleClose]);

  // Reset de zoom al cambiar imagen
  React.useEffect(() => {
    resetZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function resetZoom() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  // Doble click → zoom toggle
  const onDblClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    kick();
    setScale((s) => (s > 1 ? 1 : 2.5));
    setOffset({ x: 0, y: 0 });
  };

  // Pan
  const onPointerDown = (e: React.PointerEvent) => {
    if (scale === 1) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    kick();
    if (!dragRef.current || scale === 1) return;
    setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  // Swipe izquierda/derecha
  const startX = React.useRef<number | null>(null);
  const onSwipeStart = (e: React.PointerEvent) => (startX.current = e.clientX);
  const onSwipeEnd = (e: React.PointerEvent) => {
    if (startX.current == null || images.length <= 1) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    const TH = 32;
    if (dx > TH) onChangeIndex((i) => (i - 1 + images.length) % images.length);
    else if (dx < -TH) onChangeIndex((i) => (i + 1) % images.length);
  };

  // Handlers para kick tipados (evita `as any`)
  const onMouseMoveKick = React.useCallback((_: React.MouseEvent) => kick(), [kick]);
  const onPointerMoveKick = React.useCallback((_: React.PointerEvent) => kick(), [kick]);

  // Cálculos de render
  const hasImages = Array.isArray(images) && images.length > 0;
  const fitClass = fit === 'cover' ? 'object-cover' : 'object-contain';

  // 🔚 ahora sí, si no hay imágenes salimos (después de hooks → OK)
  if (!hasImages) return null;

  const clampedIndex = Math.min(Math.max(0, index), Math.max(0, images.length - 1));
  const current = images[clampedIndex];

  // Clases y estilos
  const shell = [
    'fixed inset-0 z-[100] bg-black/90 flex items-center justify-center',
    'transition-all duration-150',
    mounted && !closing ? 'opacity-100' : 'opacity-0',
  ].join(' ');

  const panel = [
    'relative w-[94vw] max-w-6xl',          // ancho
    'h-[calc(100svh-88px)]',                // fallback para Tailwind JIT
    'rounded-2xl border border-white/10 bg-black/30 backdrop-blur',
    'shadow-[0_20px_80px_rgba(0,0,0,0.5)] overflow-hidden',
    'transition-transform duration-150',
    mounted && !closing ? 'scale-100' : 'scale-95',
  ].join(' ');

  const controlsVisibility = visible ? 'opacity-100' : 'opacity-0 pointer-events-none';

  // Portal
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Imagen ampliada"
      className={shell}
      onClick={handleClose}
      onMouseMove={onMouseMoveKick}
      onPointerMove={onPointerMoveKick}
    >
      <div
        className={panel}
        style={{ height: `calc(100svh - ${heightOffsetPx}px)` }} // altura real controlada
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={onDblClick}
        onPointerDown={(e) => {
          onPointerDown(e);
          onSwipeStart(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => {
          onPointerUp();
          onSwipeEnd(e);
        }}
        onPointerCancel={onPointerUp}
      >
        {/* Toolbar superior */}
        <div
          className={[
            'absolute inset-x-0 top-0 z-10 p-3',
            'bg-gradient-to-b from-black/60 to-transparent',
            'flex items-center justify-between gap-2',
            'transition-opacity duration-150',
            controlsVisibility,
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            <button
              ref={closeBtnRef}
              onClick={handleClose}
              className="rounded-xl2 border border-white/15 bg-white/5 px-2 py-1 text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X className="size-5" />
            </button>
            <span className="select-none text-sm text-white/80">
              {clampedIndex + 1} / {images.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale((s) => Math.max(1, +(s - 0.25).toFixed(2)))}
              className="rounded-xl2 border border-white/15 bg-white/5 px-2 py-1 text-white/90 hover:bg-white/10"
              aria-label="Alejar"
              title="Alejar"
            >
              −
            </button>
            <button
              onClick={() => setScale(1)}
              className="rounded-xl2 border border-white/15 bg-white/5 px-2 py-1 text-white/90 hover:bg-white/10"
              aria-label="Tamaño real"
              title="Tamaño real"
            >
              1×
            </button>
            <button
              onClick={() => setScale((s) => Math.min(4, +(s + 0.25).toFixed(2)))}
              className="rounded-xl2 border border-white/15 bg-white/5 px-2 py-1 text-white/90 hover:bg-white/10"
              aria-label="Acercar"
              title="Acercar"
            >
              +
            </button>
            <button
              onClick={() => setFit((f) => (f === 'contain' ? 'cover' : 'contain'))}
              className="rounded-xl2 border border-white/15 bg-white/5 px-2 py-1 text-white/90 hover:bg-white/10"
              aria-label="Alternar ajuste"
              title={fit === 'contain' ? 'Llenar (cover)' : 'Contener (contain)'}
            >
              {fit === 'contain' ? 'Ajuste: Contener' : 'Ajuste: Llenar'}
            </button>
          </div>
        </div>

        {/* Flechas laterales */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => onChangeIndex((i) => (i - 1 + images.length) % images.length)}
              className={[
                'absolute left-3 top-1/2 -translate-y-1/2 z-10',
                'rounded-xl2 border border-white/15 bg-white/5 p-2 text-white/90 hover:bg-white/10',
                'transition-opacity duration-150',
                controlsVisibility,
              ].join(' ')}
              aria-label="Anterior"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={() => onChangeIndex((i) => (i + 1) % images.length)}
              className={[
                'absolute right-3 top-1/2 -translate-y-1/2 z-10',
                'rounded-xl2 border border-white/15 bg-white/5 p-2 text-white/90 hover:bg-white/10',
                'transition-opacity duration-150',
                controlsVisibility,
              ].join(' ')}
              aria-label="Siguiente"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {/* Canvas de imagen */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
              transition: dragRef.current ? 'none' : 'transform 140ms ease-out',
              cursor: scale > 1 ? 'grab' : 'zoom-in',
            }}
          >
            <SafeImage
              src={current.url}
              alt={current.alt || 'Producto ampliado'}
              className="w-full h-full select-none"
              imgClassName={fitClass} // ✅ object-fit en la imagen, no en el wrapper
              sizes="(min-width: 1024px) 60vw, 100vw"
              withBg={false}
              rounded="none"
              skeleton={false}
            />
          </div>
        </div>

        {/* Tira de miniaturas inferior */}
        {showThumbnails && images.length > 1 && (
          <div
            className={[
              'absolute inset-x-0 bottom-0 z-10 p-3',
              'bg-gradient-to-t from-black/60 to-transparent',
              'transition-opacity duration-150',
              controlsVisibility,
            ].join(' ')}
          >
            <div className="mx-auto max-w-3xl grid grid-flow-col auto-cols-[64px] gap-2 overflow-x-auto">
              {images.map((im, i) => {
                const selected = i === clampedIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onChangeIndex(i)}
                    className={[
                      'relative aspect-square rounded-lg overflow-hidden border transition focus:outline-none focus:ring-2',
                      selected
                        ? 'border-[var(--pink)] ring-1 ring-[var(--pink)]'
                        : 'border-white/20 hover:border-[var(--pink)]/60',
                    ].join(' ')}
                    aria-label={`Ir a imagen ${i + 1}`}
                  >
                    <SafeImage
                      src={im.url}
                      alt={im.alt || 'Miniatura'}
                      className="w-full h-full"
                      imgClassName="object-cover"
                      sizes="80px"
                      withBg={false}
                      rounded="none"
                      skeleton={false}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
