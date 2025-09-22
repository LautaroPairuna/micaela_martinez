'use client';

import { ThumbsUp, ThumbsDown, AlertCircle, RotateCcw } from 'lucide-react';
import { useReviewLikes } from '@/hooks/useReviewLikes';
import { useSession } from '@/hooks/useSession';
import { cn } from '@/lib/utils';

interface ReviewLikeButtonsProps {
  resenaId: string;
  className?: string;
}

export function ReviewLikeButtons({ resenaId, className }: ReviewLikeButtonsProps) {
  const { me: session } = useSession();
  const { likesData, isLoading, toggleLike, isSubmitting, error, refreshLikes } = useReviewLikes(resenaId);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="w-6 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="w-6 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const handleLike = () => {
    if (!session || isSubmitting) return;
    toggleLike('like');
  };

  const handleDislike = () => {
    if (!session || isSubmitting) return;
    toggleLike('dislike');
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Botón Like */}
      <button
        onClick={handleLike}
        disabled={isSubmitting}
        className={cn(
          'flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors',
          likesData.userLike === 'like'
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
          !session && 'cursor-not-allowed opacity-60'
        )}
        title={!session ? 'Inicia sesión para dar like' : 'Me gusta'}
      >
        <ThumbsUp className="w-4 h-4" />
        <span>{likesData.likes}</span>
      </button>

      {/* Botón Dislike */}
      <button
        onClick={handleDislike}
        disabled={isSubmitting}
        className={cn(
          'flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors',
          likesData.userLike === 'dislike'
            ? 'bg-red-100 text-red-700 border border-red-200'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
          !session && 'cursor-not-allowed opacity-60'
        )}
        title={!session ? 'Inicia sesión para dar dislike' : 'No me gusta'}
      >
        <ThumbsDown className="w-4 h-4" />
        <span>{likesData.dislikes}</span>
      </button>

      {/* Mensaje para usuarios no autenticados */}
      {!session && (
        <span className="text-xs text-gray-500">
          Inicia sesión para interactuar
        </span>
      )}
      
      {/* Indicador de error */}
      {error && (
        <div className="flex items-center gap-1 text-red-600 text-xs">
          <AlertCircle className="h-3 w-3" />
          <span>Error</span>
          <button 
            onClick={refreshLikes}
            className="ml-1 hover:bg-red-100 rounded px-1"
            title="Reintentar"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}