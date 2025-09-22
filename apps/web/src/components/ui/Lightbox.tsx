// src/components/ui/Lightbox.tsx
'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { SafeImage } from '@/components/ui/SafeImage';
import { X, ChevronLeft, ChevronRight, Download, RotateCw, Info, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export type LightboxImage = { url: string; alt?: string; width?: number; height?: number };

export type LightboxProps = {
  images: LightboxImage[];
  index: number;                                    // índice actual
  onChangeIndex: React.Dispatch<React.SetStateAction<number>>; // setter compatible con setState
  onClose: () => void;
  showThumbnails?: boolean;
  initialFit?: 'contain' | 'cover';
  heightOffsetPx?: number;                          // resta al alto de la ventana (default 88)
  adaptiveSize?: boolean;                           // adapta el tamaño del modal a la imagen
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
  adaptiveSize = true,
}: LightboxProps) {
  // ⚠️ NO retornamos aún; primero declaramos TODOS los hooks
  const [mounted, setMounted] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [fit, setFit] = React.useState<'contain' | 'cover'>(initialFit);

  // Zoom / Pan / Rotate
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [rotation, setRotation] = React.useState(0);
  const [showInfo, setShowInfo] = React.useState(false);
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
  }, [index]);

  function resetZoom() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  }

  function rotateImage(direction: 'cw' | 'ccw') {
    setRotation(prev => {
      const increment = direction === 'cw' ? 90 : -90;
      return (prev + increment) % 360;
    });
  }

  function downloadImage() {
    const link = document.createElement('a');
    link.href = current.url;
    link.download = current.alt || `imagen-${clampedIndex + 1}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Click simple → zoom direccional
  const onImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    kick();
    
    if (scale === 1) {
      // Zoom in hacia la posición del click
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      // Calcular offset para centrar el zoom en el punto clickeado
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const offsetX = (centerX - clickX) * 1.5; // Factor de zoom 2.5
      const offsetY = (centerY - clickY) * 1.5;
      
      setScale(2.5);
      setOffset({ x: offsetX, y: offsetY });
    } else {
      // Zoom out y reset
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  };

  // Doble click → zoom toggle (mantener compatibilidad)
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
  const onMouseMoveKick = React.useCallback(() => kick(), [kick]);
  const onPointerMoveKick = React.useCallback(() => kick(), [kick]);

  // Cálculos de render
  const hasImages = Array.isArray(images) && images.length > 0;
  const fitClass = fit === 'cover' ? 'object-cover' : 'object-contain';

  // 🔚 ahora sí, si no hay imágenes salimos (después de hooks → OK)
  if (!hasImages) return null;

  const clampedIndex = Math.min(Math.max(0, index), Math.max(0, images.length - 1));
  const current = images[clampedIndex];

  // Calcular tamaño adaptativo del modal
  const getAdaptiveSize = () => {
    if (!adaptiveSize || !current.width || !current.height) {
      return { width: '94vw', maxWidth: '6xl', aspectRatio: undefined };
    }

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight - heightOffsetPx : 800;
    const imageAspectRatio = current.width / current.height;
    
    // Calcular el tamaño óptimo manteniendo la proporción
    let modalWidth = Math.min(current.width, viewportWidth * 0.9);
    let modalHeight = modalWidth / imageAspectRatio;
    
    // Si la altura excede el viewport, ajustar por altura
    if (modalHeight > viewportHeight * 0.9) {
      modalHeight = viewportHeight * 0.9;
      modalWidth = modalHeight * imageAspectRatio;
    }
    
    // Asegurar un tamaño mínimo
    modalWidth = Math.max(modalWidth, 400);
    modalHeight = Math.max(modalHeight, 300);
    
    return {
      width: `${modalWidth}px`,
      maxWidth: 'none',
      aspectRatio: imageAspectRatio,
      height: `${modalHeight}px`
    };
  };

  const adaptiveStyles = getAdaptiveSize();

  // Clases y estilos
  const shell = [
    'fixed inset-0 z-[100] bg-black/90 flex items-center justify-center',
    'transition-all duration-150',
    mounted && !closing ? 'opacity-100' : 'opacity-0',
  ].join(' ');

  const panel = [
    'relative',
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
      {/* Toolbar superior - fuera del panel de imagen */}
      <div
        className={[
          'absolute inset-x-0 top-0 z-20 p-2 sm:p-4',
          'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
          'transition-opacity duration-150',
          controlsVisibility,
        ].join(' ')}
      >
        {/* Primera fila: Cerrar y contador en móvil, todo en desktop */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              ref={closeBtnRef}
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="rounded-xl border border-white/20 bg-black/40 backdrop-blur px-2 py-1.5 sm:px-3 sm:py-2 text-white/90 hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X className="size-4 sm:size-5" />
            </button>
            <span className="select-none text-xs sm:text-sm text-white/80 bg-black/40 backdrop-blur px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-white/20">
              {clampedIndex + 1} / {images.length}
            </span>
          </div>
          
          {/* Controles principales - ocultos en móvil, visibles en desktop */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur rounded-xl border border-white/20 p-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setScale((s) => Math.max(1, +(s - 0.25).toFixed(2)));
                }}
                className="rounded-lg p-2 text-white/90 hover:bg-white/10 transition-colors"
                aria-label="Alejar"
                title="Alejar"
              >
                <ZoomOut className="size-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setScale(1);
                }}
                className="rounded-lg px-3 py-2 text-white/90 hover:bg-white/10 text-xs transition-colors"
                aria-label="Tamaño real"
                title="Tamaño real"
              >
                1×
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setScale((s) => Math.min(4, +(s + 0.25).toFixed(2)));
                }}
                className="rounded-lg p-2 text-white/90 hover:bg-white/10 transition-colors"
                aria-label="Acercar"
                title="Acercar"
              >
                <ZoomIn className="size-4" />
              </button>
            </div>
            
            {/* Rotation controls */}
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur rounded-xl border border-white/20 p-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  rotateImage('ccw');
                }}
                className="rounded-lg p-2 text-white/90 hover:bg-white/10 transition-colors"
                aria-label="Rotar izquierda"
                title="Rotar izquierda"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                 rotateImage('cw');
               }}
               className="rounded-lg p-2 text-white/90 hover:bg-white/10 transition-colors"
               aria-label="Rotar derecha"
               title="Rotar derecha"
             >
               <RotateCw className="size-4" />
             </button>
           </div>
           
           {/* Fit toggle */}
           <button
             onClick={(e) => {
               e.stopPropagation();
               setFit((f) => (f === 'contain' ? 'cover' : 'contain'));
             }}
             className="rounded-xl border border-white/20 bg-black/40 backdrop-blur px-3 py-2 text-white/90 hover:bg-black/60 text-xs transition-colors"
             aria-label="Alternar ajuste"
             title={fit === 'contain' ? 'Llenar (cover)' : 'Contener (contain)'}
           >
             {fit === 'contain' ? 'Ajustar' : 'Llenar'}
           </button>
           
           {/* Download */}
           <button
             onClick={(e) => {
               e.stopPropagation();
               downloadImage();
             }}
             className="rounded-xl border border-white/20 bg-black/40 backdrop-blur p-2 text-white/90 hover:bg-black/60 transition-colors"
             aria-label="Descargar imagen"
             title="Descargar imagen"
           >
             <Download className="size-4" />
           </button>
           
           {/* Info toggle */}
           <button
             onClick={(e) => {
               e.stopPropagation();
               setShowInfo(!showInfo);
             }}
             className={`rounded-xl border border-white/20 backdrop-blur p-2 text-white/90 hover:bg-black/60 transition-colors ${
               showInfo ? 'bg-black/60' : 'bg-black/40'
             }`}
             aria-label="Información de imagen"
             title="Información de imagen"
           >
             <Info className="size-4" />
           </button>
         </div>
        </div>
        
        {/* Segunda fila: Controles compactos solo en móvil */}
        <div className="flex sm:hidden items-center justify-center gap-1">
          {/* Zoom controls compactos */}
          <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur rounded-lg border border-white/20 p-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScale((s) => Math.max(1, +(s - 0.25).toFixed(2)));
              }}
              className="rounded p-1.5 text-white/90 hover:bg-white/10 transition-colors"
              aria-label="Alejar"
              title="Alejar"
            >
              <ZoomOut className="size-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScale(1);
              }}
              className="rounded px-2 py-1.5 text-white/90 hover:bg-white/10 text-xs transition-colors"
              aria-label="Tamaño real"
              title="Tamaño real"
            >
              1×
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScale((s) => Math.min(4, +(s + 0.25).toFixed(2)));
              }}
              className="rounded p-1.5 text-white/90 hover:bg-white/10 transition-colors"
              aria-label="Acercar"
              title="Acercar"
            >
              <ZoomIn className="size-3" />
            </button>
          </div>
          
          {/* Rotation controls compactos */}
          <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur rounded-lg border border-white/20 p-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                rotateImage('ccw');
              }}
              className="rounded p-1.5 text-white/90 hover:bg-white/10 transition-colors"
              aria-label="Rotar izquierda"
              title="Rotar izquierda"
            >
              <RotateCcw className="size-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                rotateImage('cw');
              }}
              className="rounded p-1.5 text-white/90 hover:bg-white/10 transition-colors"
              aria-label="Rotar derecha"
              title="Rotar derecha"
            >
              <RotateCw className="size-3" />
            </button>
          </div>
          
          {/* Fit toggle compacto */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFit((f) => (f === 'contain' ? 'cover' : 'contain'));
            }}
            className="rounded-lg border border-white/20 bg-black/40 backdrop-blur px-2 py-1.5 text-white/90 hover:bg-black/60 text-xs transition-colors"
            aria-label="Alternar ajuste"
            title={fit === 'contain' ? 'Llenar (cover)' : 'Contener (contain)'}
          >
            {fit === 'contain' ? 'Aj' : 'Ll'}
          </button>
          
          {/* Download compacto */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              downloadImage();
            }}
            className="rounded-lg border border-white/20 bg-black/40 backdrop-blur p-1.5 text-white/90 hover:bg-black/60 transition-colors"
            aria-label="Descargar imagen"
            title="Descargar imagen"
          >
            <Download className="size-3" />
          </button>
          
          {/* Info toggle compacto */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(!showInfo);
            }}
            className={`rounded-lg border border-white/20 backdrop-blur p-1.5 text-white/90 hover:bg-black/60 transition-colors ${
              showInfo ? 'bg-black/60' : 'bg-black/40'
            }`}
            aria-label="Información de imagen"
            title="Información de imagen"
          >
            <Info className="size-3" />
          </button>
        </div>
      </div>

      {/* Flechas laterales - fuera del panel de imagen */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex((i) => (i - 1 + images.length) % images.length);
            }}
            className={[
              'absolute left-4 top-1/2 -translate-y-1/2 z-20',
              'rounded-xl border border-white/20 bg-black/40 backdrop-blur p-3 text-white/90 hover:bg-black/60',
              'transition-all duration-150',
              controlsVisibility,
            ].join(' ')}
            aria-label="Anterior"
            title="Imagen anterior"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex((i) => (i + 1) % images.length);
            }}
            className={[
              'absolute top-1/2 -translate-y-1/2 z-10 right-4',
              'rounded-xl border border-white/20 bg-black/40 backdrop-blur p-3 text-white/90 hover:bg-black/60',
              'transition-all duration-150',
              controlsVisibility,
            ].join(' ')}
            aria-label="Siguiente"
            title="Imagen siguiente"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      {/* Contenedor principal con imagen y miniaturas */}
      <div className="relative flex items-center gap-4">
        {/* Panel de imagen */}
        <div
          className={panel}
          style={{
            width: adaptiveStyles.width,
            maxWidth: adaptiveStyles.maxWidth,
            height: adaptiveStyles.height || `calc(100svh - ${heightOffsetPx + 80}px)`,
            aspectRatio: adaptiveStyles.aspectRatio
          }}
          onClick={onImageClick}
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

        {/* Canvas de imagen */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
              transition: dragRef.current ? 'none' : 'transform 140ms ease-out',
              cursor: scale > 1 ? 'grab' : 'zoom-in',
            }}
          >
            <SafeImage
              key={`lightbox-${clampedIndex}-${current.url}`}
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
        </div>

        {/* Miniaturas verticales al lado de la imagen */}
        {showThumbnails && images.length > 1 && (
          <div
            className={[
              'hidden lg:flex flex-col gap-2 h-full',
              'transition-opacity duration-150',
              controlsVisibility,
            ].join(' ')}
            style={{
              height: adaptiveStyles.height || `calc(100svh - ${heightOffsetPx + 80}px)`,
            }}
          >
            <div className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-3 h-full">
              <div className="flex flex-col gap-2 overflow-y-auto h-full">
                {images.map((im, i) => {
                  const selected = i === clampedIndex;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeIndex(i);
                      }}
                      className={[
                        'relative w-16 h-16 rounded-lg overflow-hidden border transition-all focus:outline-none focus:ring-2 focus:ring-white/50 flex-shrink-0',
                        selected
                          ? 'border-white ring-2 ring-white/50 scale-105'
                          : 'border-white/30 hover:border-white/60 hover:scale-105',
                      ].join(' ')}
                      aria-label={`Ir a imagen ${i + 1}`}
                    >
                      <SafeImage
                        src={im.url}
                        alt={im.alt || 'Miniatura'}
                        className="w-full h-full"
                        imgClassName="object-cover"
                        sizes="64px"
                        withBg={false}
                        rounded="none"
                        skeleton={false}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Panel de información - fuera del panel de imagen */}
      {showInfo && (
        <div
          className={[
            'absolute top-20 right-4 z-30 max-w-xs',
            'rounded-xl border border-white/20 bg-black/80 backdrop-blur p-4',
            'text-white/90 text-sm space-y-2',
            'transition-opacity duration-150',
            controlsVisibility,
          ].join(' ')}
        >
            <div className="font-medium text-white">Información de imagen</div>
            {current.alt && (
              <div>
                <span className="text-white/60">Descripción:</span>
                <div className="text-white/90">{current.alt}</div>
              </div>
            )}
            {current.width && current.height && (
              <div>
                <span className="text-white/60">Dimensiones:</span>
                <div className="text-white/90">{current.width} × {current.height} px</div>
              </div>
            )}
            <div>
              <span className="text-white/60">Zoom:</span>
              <div className="text-white/90">{Math.round(scale * 100)}%</div>
            </div>
            {rotation !== 0 && (
              <div>
                <span className="text-white/60">Rotación:</span>
                <div className="text-white/90">{rotation}°</div>
              </div>
            )}
            <div>
              <span className="text-white/60">Imagen:</span>
              <div className="text-white/90">{clampedIndex + 1} de {images.length}</div>
            </div>
          </div>
        )}


      {/* Miniaturas horizontales para pantallas pequeñas */}
      {showThumbnails && images.length > 1 && (
        <div
          className={[
            'lg:hidden absolute inset-x-0 bottom-4 z-20 px-4',
            'transition-opacity duration-150',
            controlsVisibility,
          ].join(' ')}
        >
          <div className="mx-auto max-w-4xl bg-black/40 backdrop-blur rounded-xl border border-white/20 p-3">
            <div className="grid grid-flow-col auto-cols-[64px] gap-2 overflow-x-auto">
              {images.map((im, i) => {
                const selected = i === clampedIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeIndex(i);
                    }}
                    className={[
                      'relative aspect-square rounded-lg overflow-hidden border transition-all focus:outline-none focus:ring-2 focus:ring-white/50',
                      selected
                        ? 'border-white ring-2 ring-white/50 scale-105'
                        : 'border-white/30 hover:border-white/60 hover:scale-105',
                    ].join(' ')}
                    aria-label={`Ir a imagen ${i + 1}`}
                  >
                    <SafeImage
                      src={im.url}
                      alt={im.alt || 'Miniatura'}
                      className="w-full h-full"
                      imgClassName="object-cover"
                      sizes="64px"
                      withBg={false}
                      rounded="none"
                      skeleton={false}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
