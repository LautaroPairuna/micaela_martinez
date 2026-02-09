'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type Lesson = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  rutaSrc?: string | null;
  duracion?: number | null;
  orden: number;
  tipo?: 'VIDEO' | 'TEXTO' | 'DOCUMENTO' | 'QUIZ';
};

type MiniPlayerProps = {
  videoUrl: string;
  lesson: Lesson;
  isVisible: boolean;
  onClose: () => void;
  onMaximize: () => void;
  currentTime?: number;
  duration?: number;
  onTimeUpdate?: (time: number) => void;
};

export function MiniPlayer({
  videoUrl,
  lesson,
  isVisible,
  onClose,
  onMaximize,
  currentTime = 0,
  duration = 0,
  onTimeUpdate
}: MiniPlayerProps) {
  void duration;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Sincronizar el tiempo del video principal
  useEffect(() => {
    if (videoRef.current && currentTime > 0) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Manejar reproducción/pausa
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Manejar mute/unmute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Manejar actualización de tiempo
  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  // Manejar arrastre
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed z-50 bg-black rounded-lg shadow-2xl border border-gray-700 overflow-hidden transition-all duration-200",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: '320px',
        height: '200px'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header con título y controles */}
      <div className="drag-handle absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent z-10 p-2 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-sm font-medium truncate">{lesson.titulo}</h3>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onMaximize();
            }}
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        muted={isMuted}
        playsInline
      />

      {/* Controles de reproducción */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            className="h-8 w-8 p-0 text-white hover:bg-white/20"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            className="h-8 w-8 p-0 text-white hover:bg-white/20"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}