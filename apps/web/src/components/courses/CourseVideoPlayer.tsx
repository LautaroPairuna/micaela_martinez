// src/components/courses/CourseVideoPlayer.tsx
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw, Settings, RectangleHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getSecureVideoUrl, getSecureVideoThumbnailUrl } from '@/lib/media-utils';
import { useSession } from '@/hooks/useSession';
// Quita estas importaciones si no usas watermarks/protección
import {
  generateVideoDataAttributes,
  generateVisibleWatermarkCSS,
  generateVideoProtectionScript,
  type WatermarkConfig
} from '@/lib/watermark-utils';

type LessonLike = {
  id: string;
  titulo: string;
  descripcion?: string | null;
};

type CourseVideoPlayerProps = {
  videoUrl: string;
  lesson: LessonLike;
  onComplete?: () => void;
  onDurationUpdate?: (duration: number) => void;
  onTheaterModeChange?: (isTheater: boolean) => void;
  onTimeUpdate?: (time: number) => void;
  hideTitle?: boolean;
  autoHideControls?: boolean;
  previewUrl?: string; // URL del archivo .vtt para thumbnails
};

interface VttCue {
  start: number;
  end: number;
  imgUrl: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function parseVttTime(timeStr: string): number {
  const parts = timeStr.split(':');
  let seconds = 0;
  if (parts.length === 3) {
    seconds += parseInt(parts[0]) * 3600;
    seconds += parseInt(parts[1]) * 60;
    seconds += parseFloat(parts[2]);
  } else if (parts.length === 2) {
    seconds += parseInt(parts[0]) * 60;
    seconds += parseFloat(parts[1]);
  }
  return seconds;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, isNaN(seconds) ? 0 : seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = Math.floor(s % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`
    : `${m}:${r.toString().padStart(2, '0')}`;
}

export function CourseVideoPlayer({
  videoUrl,
  lesson,
  onComplete,
  onDurationUpdate,
  onTheaterModeChange,
  onTimeUpdate, // <- prop (se mantiene)
  hideTitle: hideTitleProp = false,
  autoHideControls: autoHideControlsProp = true,
  previewUrl
}: CourseVideoPlayerProps) {
  const { me } = useSession();

  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [mouseActivity, setMouseActivity] = useState(true);
  const [isTheater, setIsTheater] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // Hover preview logic
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [vttCues, setVttCues] = useState<VttCue[]>([]);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Cargar y parsear VTT si existe
  useEffect(() => {
    if (!previewUrl) {
      setVttCues([]);
      return;
    }

    fetch(previewUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`VTT ${res.status}`);
        }
        return res.text();
      })
      .then((text) => {
        const lines = text.split(/\r?\n/);
        const cues: VttCue[] = [];
        let currentStart = 0;
        let currentEnd = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          if (line.includes('-->')) {
            const [startStr, endStr] = line.split('-->').map((s) => s.trim());
            currentStart = parseVttTime(startStr);
            currentEnd = parseVttTime(endStr);
          } else if (line.includes('#xywh=')) {
            const [urlPart, hash] = line.split('#xywh=');
            const [x, y, w, h] = hash.split(',').map(Number);
            
            // Resolver URL absoluta si es relativa
            let finalImgUrl = urlPart;
            if (urlPart && !urlPart.startsWith('http') && !urlPart.startsWith('/')) {
              // Asumir relativa a previewUrl
              const lastSlash = previewUrl.lastIndexOf('/');
              if (lastSlash !== -1) {
                const base = previewUrl.substring(0, lastSlash + 1);
                finalImgUrl = base + urlPart;
              }
            }

            cues.push({
              start: currentStart,
              end: currentEnd,
              imgUrl: finalImgUrl, 
              x, y, w, h
            });
          }
        }
        setVttCues(cues);
      })
      .catch(() => {
        setVttCues([]);
      });
  }, [previewUrl]);

  const currentThumbnail = useMemo(() => {
    if (hoverTime === null || vttCues.length === 0) return null;
    return vttCues.find((c) => hoverTime >= c.start && hoverTime < c.end);
  }, [hoverTime, vttCues]);

  // Auto-hide controles logic (moved up to avoid "used before defined" error)
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetControlsTimeout = useCallback(() => {
    if (!autoHideControlsProp) {
      setControlsVisible(true);
      setMouseActivity(true);
      return;
    }
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    setControlsVisible(true);
    setMouseActivity(true);
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
        setMouseActivity(false);
      }, 3000);
    }
  }, [isPlaying, autoHideControlsProp]);

  // Manejo de Drag & Drop en la barra de progreso
  const handleSeekStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Evitar que el click pause/play el video
    setIsDragging(true);
    updateSeek(e);
  };

  const updateSeek = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!progressBarRef.current || !videoRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    
    // Calcular porcentaje exacto (clamped 0-1)
    const rawX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, rawX / rect.width));
    const newTime = percentage * duration;
    
    // Actualizar visualmente inmediato
    setCurrentTime(newTime);
    videoRef.current.currentTime = newTime;
    
    // Actualizar hover también si estamos arrastrando
    setHoverPosition(Math.max(0, Math.min(rect.width, rawX)));
    setHoverTime(newTime);
  }, [duration]);

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (isDragging) {
        e.preventDefault(); // Evitar scroll en móvil
        updateSeek(e);
      }
    };
    const handleGlobalUp = () => {
      if (isDragging) {
        setIsDragging(false);
        resetControlsTimeout();
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMove);
      document.addEventListener('touchmove', handleGlobalMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalUp);
      document.addEventListener('touchend', handleGlobalUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalUp);
      document.removeEventListener('touchend', handleGlobalUp);
    };
  }, [isDragging, duration, resetControlsTimeout, updateSeek]);

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return; // Si arrastra, el efecto global se encarga
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * duration;
    
    setHoverPosition(x);
    setHoverTime(time);
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
  };

  // Resolver URL segura
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setVideoError(null);
        setRetryCount(0);

        const finalUrl = await getSecureVideoUrl(videoUrl, lesson?.id, false, me?.id);
        if (!cancelled) setResolvedVideoUrl(finalUrl);
      } catch {
        if (!cancelled) {
          setResolvedVideoUrl('');
          setVideoError('No se pudo generar la URL segura del video');
          setIsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [videoUrl, lesson?.id, me?.id]);

  // Thumbnail/Poster
  const thumbnailUrl = useMemo(() => {
    if (!videoUrl || !me?.id) return '';
    return getSecureVideoThumbnailUrl(videoUrl, me.id, lesson?.id);
  }, [videoUrl, me?.id, lesson?.id]);

  // Watermark (opcional)
  const watermarkConfig = useMemo((): WatermarkConfig | null => {
    if (!me?.id || !lesson?.id) return null;
    return {
      userId: me.id,
      userName: me.nombre || me.email || 'Usuario',
      userEmail: me.email || '',
      timestamp: new Date().toISOString(),
      videoId: lesson.id,
    };
  }, [me?.id, me?.nombre, me?.email, lesson?.id]);

  useEffect(() => {
    if (!watermarkConfig) return;
    const style = document.createElement('style');
    style.textContent = generateVisibleWatermarkCSS(watermarkConfig);
    document.head.appendChild(style);

    const script = document.createElement('script');
    script.textContent = generateVideoProtectionScript(watermarkConfig);
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(style);
      document.body.removeChild(script);
    };
  }, [watermarkConfig]);

  // Auto-hide controles
  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    };
  }, [isPlaying, resetControlsTimeout]);

  const handleMouseMove = useCallback(() => resetControlsTimeout(), [resetControlsTimeout]);
  const handleMouseLeave = useCallback(() => {
    if (autoHideControlsProp && isPlaying) {
      setControlsVisible(false);
      setMouseActivity(false);
    }
  }, [autoHideControlsProp, isPlaying]);

  // ---- Handlers del <video> ----
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const d = videoRef.current.duration;
    setDuration(d);
    onDurationUpdate?.(d);
    setIsLoading(false);
    setVideoError(null);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    setVideoError(null);
    setRetryCount(0);
  };

  // 🔧 Renombrado para no chocar con la prop onTimeUpdate
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = Math.max(0, isNaN(videoRef.current.currentTime) ? 0 : videoRef.current.currentTime);
    setCurrentTime(t);
    onTimeUpdate?.(t);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onComplete?.();
  };

  const handleError = async () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(r => r + 1);
      setIsLoading(true);
      setVideoError(`Error de carga (intento ${retryCount + 1}/${MAX_RETRIES})`);
      try {
        const fresh = await getSecureVideoUrl(videoUrl, lesson?.id, true, me?.id);
        setResolvedVideoUrl(fresh);
      } catch {
        setIsLoading(false);
        setVideoError('Error al regenerar URL segura');
      }
    } else {
      setIsLoading(false);
      setVideoError('No se pudo cargar el video.');
    }
  };

  // Atajos
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(t.tagName) || t.isContentEditable) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isPlaying) videoRef.current.pause();
          else videoRef.current.play();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
          break;
        case 'KeyM':
          e.preventDefault();
          if (isMuted) {
            videoRef.current.volume = volume;
            setIsMuted(false);
          } else {
            videoRef.current.volume = 0;
            setIsMuted(true);
          }
          break;
        case 'KeyT':
          e.preventDefault();
          setIsTheater(v => {
            const nv = !v;
            onTheaterModeChange?.(nv);
            return nv;
          });
          break;
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isPlaying, isMuted, volume, duration, onTheaterModeChange]);

  // Controles UI
  const togglePlay = async () => {
    if (!videoRef.current || videoError) return;
    try {
      if (isPlaying) videoRef.current.pause();
      else await videoRef.current.play();
    } catch {
      setVideoError('No se pudo reproducir el video');
    }
  };

  const skip = (sec: number) => {
    if (!videoRef.current) return;
    const nt = Math.max(0, Math.min(duration, currentTime + sec));
    videoRef.current.currentTime = nt;
    setCurrentTime(nt);
  };

  const changePlaybackRate = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const t = parseFloat(e.target.value);
    const nt = Math.max(0, Math.min(duration, t));
    videoRef.current.currentTime = nt;
    setCurrentTime(nt);
    resetControlsTimeout();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const v = parseFloat(e.target.value);
    setVolume(v);
    videoRef.current.volume = v;
    setIsMuted(v === 0);
  };

  // Cleanup al cambiar URL
  useEffect(() => {
    const v = videoRef.current;
    return () => {
      if (v) {
        try {
          v.pause();
          v.removeAttribute('src');
          v.load();
        } catch {}
      }
      setIsLoading(false);
      setVideoError(null);
      setRetryCount(0);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    };
  }, [resolvedVideoUrl]);

  const validUrl =
    !!resolvedVideoUrl &&
    (resolvedVideoUrl.startsWith('/api/') || resolvedVideoUrl.startsWith('http'));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group cursor-pointer"
      onClick={togglePlay}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="application"
      aria-label="Reproductor de video"
    >
      {/* Video */}
      {validUrl && (
        <video
          ref={videoRef}
          src={resolvedVideoUrl}
          poster={thumbnailUrl}
          className={cn(
            'w-full h-full object-contain transition-opacity duration-300',
            isLoading || videoError ? 'opacity-0' : 'opacity-100'
          )}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleVideoTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onCanPlayThrough={() => setIsLoading(false)}
          onError={handleError}
          onLoadStart={() => setIsLoading(true)}
          onEnded={handleEnded}
          preload="auto"
          crossOrigin="anonymous"
          controlsList="nodownload"
          disablePictureInPicture
          playsInline
          {...(watermarkConfig ? generateVideoDataAttributes(watermarkConfig) : {})}
        >
          {/* Fuente alternativa para mayor compatibilidad */}
          <source src={resolvedVideoUrl} type="video/mp4" />
          <p className="text-white text-center p-4">
            Tu navegador no soporta la reproducción de videos HTML5.
          </p>
        </video>
      )}

      {/* Cargando */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            <div className="text-white text-lg">Cargando video...</div>
          </div>
        </div>
      )}

      {/* Error */}
      {videoError && validUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center p-6 bg-red-900/80 rounded-lg backdrop-blur-sm border border-red-500/50">
            <div className="text-red-300 text-lg font-semibold mb-2">Error de Video</div>
            <div className="text-red-200 text-sm mb-4">{videoError}</div>
            <Button
              onClick={async (e) => {
                e.stopPropagation();
                setVideoError(null);
                setIsLoading(true);
                try {
                  const fresh = await getSecureVideoUrl(videoUrl, lesson?.id, true, me?.id);
                  setResolvedVideoUrl(fresh);
                } catch {
                  setVideoError('No se pudo regenerar la URL segura');
                  setIsLoading(false);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reintentar
            </Button>
          </div>
        </div>
      )}

      {/* Overlay de controles */}
      {!isLoading && !videoError && validUrl && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 transition-all duration-500 ease-in-out',
            (controlsVisible && mouseActivity) || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          {/* Play central */}
          {!isPlaying && duration > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                size="lg"
                className="w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/50"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
              >
                <Play className="h-8 w-8 text-white ml-1" />
              </Button>
            </div>
          )}

          {/* Controles inferiores */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* Progreso */}
              <div 
                ref={progressBarRef}
                className="w-full relative group/progress py-3 cursor-pointer touch-none select-none flex items-center"
                onMouseMove={handleProgressMouseMove}
                onMouseLeave={handleProgressMouseLeave}
                onMouseDown={handleSeekStart}
                onTouchStart={handleSeekStart}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Tooltip Preview */}
                {hoverTime !== null && validUrl && !isDragging && (
                  <div 
                    className="absolute bottom-full mb-4 flex flex-col items-center bg-black/90 rounded-lg overflow-hidden border border-white/20 shadow-xl pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150"
                    style={{ 
                      left: hoverPosition,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="w-40 aspect-video bg-black relative overflow-hidden">
                      {currentThumbnail ? (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundImage: `url(${currentThumbnail.imgUrl})`,
                            backgroundPosition: `-${currentThumbnail.x}px -${currentThumbnail.y}px`,
                            backgroundRepeat: 'no-repeat',
                          }}
                        />
                      ) : thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt="Vista previa"
                          className="w-full h-full object-cover opacity-95"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-white/70">
                          Sin vista previa
                        </div>
                      )}
                    </div>
                    <div className="w-full bg-neutral-900/90 py-1 text-center border-t border-white/10">
                      <span className="text-xs font-mono font-medium text-white">
                        {formatTime(hoverTime)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Track Fondo */}
                <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden group-hover/progress:h-1.5 transition-all duration-200">
                  {/* Progreso jugado */}
                  <div 
                    className="h-full bg-[var(--gold)]"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  />
                </div>
                
                {/* Indicador de Hover */}
                {hoverTime !== null && !isDragging && (
                   <div 
                     className="absolute top-0 bottom-0 w-[1px] bg-white/60 pointer-events-none h-full"
                     style={{ left: hoverPosition }}
                   />
                )}

                {/* Thumb / Bolita (siempre visible o solo hover) */}
                <div 
                  className={cn(
                    "absolute w-3 h-3 bg-white rounded-full shadow-md transform -translate-x-1/2 transition-transform duration-200",
                    (isDragging || hoverTime !== null) ? "scale-100" : "scale-0 group-hover/progress:scale-100"
                  )}
                  style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                />
              </div>

            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    skip(-10);
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    skip(10);
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>

                {/* Volumen */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!videoRef.current) return;
                      if (isMuted) {
                        videoRef.current.volume = volume;
                        setIsMuted(false);
                      } else {
                        videoRef.current.volume = 0;
                        setIsMuted(true);
                      }
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: `linear-gradient(to right, #af966d 0%, #af966d ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) 100%)`,
                    }}
                  />
                </div>

                <span className="text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Velocidad */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettings(!showSettings);
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>

                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-2 min-w-[120px]">
                      <div className="text-xs text-white/70 mb-2">Velocidad</div>
                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={(e) => {
                            e.stopPropagation();
                            changePlaybackRate(rate);
                          }}
                          className={cn(
                            'block w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 transition-colors',
                            playbackRate === rate ? 'text-[var(--gold)]' : 'text-white'
                          )}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Teatro */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTheater((v) => {
                      const nv = !v;
                      onTheaterModeChange?.(nv);
                      return nv;
                    });
                  }}
                  className={cn('text-white hover:bg-white/20', isTheater && 'text-[var(--gold)]')}
                  title="Modo teatro (T)"
                >
                  <RectangleHorizontal className="h-4 w-4" />
                </Button>

                {/* Fullscreen */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!document.fullscreenElement && containerRef.current) {
                      containerRef.current.requestFullscreen().catch(() => {});
                    } else {
                      document.exitFullscreen().catch(() => {});
                    }
                  }}
                  className="text-white hover:bg-white/20"
                  title="Pantalla completa"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Título */}
          {!hideTitleProp && (
            <div
              className={cn(
                'absolute top-2 left-2 right-2 transition-all duration-500 ease-in-out pointer-events-none',
                (controlsVisible && mouseActivity) || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
              )}
            >
              <div className="bg-gradient-to-r from-black/70 to-transparent backdrop-blur-sm rounded p-2 max-w-md">
                <h3 className="text-white font-medium text-sm mb-0.5 line-clamp-1">{lesson.titulo}</h3>
                {lesson.descripcion && (
                  <p className="text-white/70 text-xs line-clamp-2">{lesson.descripcion}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
