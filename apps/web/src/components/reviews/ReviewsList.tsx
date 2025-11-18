'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Star, 
  MoreVertical, 
  Edit3, 
  Trash2
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RatingStars } from '@/components/ui/RatingStars';
import { ReviewResponses } from './ReviewResponses';
import { ReviewLikeButtons } from './ReviewLikeButtons';
import { ResponsesButton } from './ResponsesButton';
import { useScrollToComment } from '@/hooks/useScrollToComment';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

/* ─────────────────────────────────────────
   Utils
─────────────────────────────────────────── */
function getInitials(nombre?: string | null, max = 2) {
  const safe = (nombre ?? '').trim();
  if (safe) {
    const words = safe.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, Math.min(2, max)).toUpperCase();
    if (words.length > max) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    return words.slice(0, max).map(w => w[0]).join('').toUpperCase();
  }
  return 'U';
}

interface Review {
  id: string;
  puntaje: number;
  comentario?: string | null;
  creadoEn: string;
  usuario: {
    id: string;
    nombre?: string | null;
  };
}

interface ReviewsListProps {
  reviews: Review[];
  currentUserId?: string;
  isLoading?: boolean;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  showActions?: boolean;
  emptyMessage?: string;
}

export function ReviewsList({
  reviews,
  currentUserId,
  isLoading = false,
  onEdit,
  onDelete,
  showActions = true,
  emptyMessage = "No hay reseñas aún",
}: ReviewsListProps) {
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set());
  const [showingActions, setShowingActions] = useState<string | null>(null);

  // Hook para manejar scroll a comentarios específicos
  useScrollToComment({
    onExpandReview: (reviewId: string) => {
      setExpandedReviews(prev => new Set([...prev, reviewId]));
    },
    onExpandResponses: (reviewId: string) => {
      setExpandedResponses(prev => new Set([...prev, reviewId]));
    }
  });

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showingActions && !target.closest('[data-dropdown-menu]') && !target.closest('[data-dropdown-trigger]')) {
        setShowingActions(null);
      }
    };

    if (showingActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showingActions]);

  const toggleExpanded = (reviewId: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const toggleResponses = (reviewId: string) => {
    const newExpanded = new Set(expandedResponses);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedResponses(newExpanded);
  };

  const toggleActions = (reviewId: string) => {
    setShowingActions(showingActions === reviewId ? null : reviewId);
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: es,
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-24 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--fg)] mb-2">
            {emptyMessage}
          </h3>
          <p className="text-[var(--muted)]">
            {emptyMessage === "No hay reseñas aún" 
              ? "Sé el primero en compartir tu experiencia"
              : "Otras personas aún no han compartido sus experiencias"
            }
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const isExpanded = expandedReviews.has(review.id);
        const isOwnReview = currentUserId === review.usuario.id;
        const shouldTruncate = review.comentario && review.comentario.length > 200;
        const displayText = isExpanded || !shouldTruncate 
          ? review.comentario 
          : truncateText(review.comentario || '', 200);

        return (
          <Card 
            key={review.id} 
            id={`resena-${review.id}`}
            data-review-id={review.id}
            className="scroll-mt-4"
          >
            <CardBody className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={[
                    'grid size-10 place-items-center rounded-full',
                    'bg-[radial-gradient(75%_120%_at_30%_20%,_rgba(255,255,255,.35),_transparent_60%)]',
                    'bg-[#f9f6ef] text-[#7a5c16] ring-1 ring-[#7a5c16]',
                    'shadow-[inset_0_1px_0_rgba(255,255,255,.2)] font-semibold text-[14px] tracking-wide',
                  ].join(' ')}
                    title={review.usuario.nombre || 'Usuario anónimo'}
                  >
                    {getInitials(review.usuario.nombre)}
                  </span>
                  <div>
                    <h4 className="font-medium text-[var(--fg)]">
                      {review.usuario.nombre || 'Usuario anónimo'}
                    </h4>
                    <p className="text-sm text-[var(--muted)]">
                      {formatDate(review.creadoEn)}
                    </p>
                  </div>
                </div>

                {/* Actions Menu */}
                {showActions && isOwnReview && (onEdit || onDelete) && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActions(review.id)}
                      className="p-2"
                      data-dropdown-trigger
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>

                    {showingActions === review.id && (
                      <div className="absolute right-0 top-full mt-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-lg py-1 z-10 min-w-[120px]" data-dropdown-menu>
                        {onEdit && (
                          <button
                            onClick={() => {
                              onEdit(review);
                              setShowingActions(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                          >
                            <Edit3 className="h-3 w-3" />
                            Editar
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => {
                              onDelete(review.id);
                              setShowingActions(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            <Trash2 className="h-3 w-3" />
                            Eliminar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <RatingStars value={review.puntaje} size="sm" showValue={false} />
                <span className="text-sm font-medium text-[var(--fg)]">
                  {review.puntaje}/5
                </span>
              </div>

              {/* Comment */}
              {review.comentario && (
                <div className="space-y-2">
                  <div className="text-[var(--fg)] leading-relaxed prose prose-sm max-w-none prose-headings:text-[var(--fg)] prose-p:text-[var(--fg)] prose-strong:text-[var(--fg)] prose-em:text-[var(--fg)] prose-code:text-[var(--fg)] prose-code:bg-[var(--bg-secondary)] prose-pre:bg-[var(--bg-secondary)] prose-blockquote:text-[var(--muted)] prose-blockquote:border-[var(--border)] prose-a:text-[var(--gold)] hover:prose-a:text-[var(--gold)]/80">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {displayText}
                    </ReactMarkdown>
                  </div>
                  
                  {shouldTruncate && (
                    <button
                      onClick={() => toggleExpanded(review.id)}
                      className="text-sm text-[var(--gold)] hover:underline font-medium"
                    >
                      {isExpanded ? 'Ver menos' : 'Ver más'}
                    </button>
                  )}
                </div>
              )}

              {/* Actions Bar: Like/Dislike + Responses */}
              <div className="pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <ReviewLikeButtons resenaId={review.id} />
                  
                  <ResponsesButton
                    resenaId={review.id}
                    isExpanded={expandedResponses.has(review.id)}
                    onClick={() => toggleResponses(review.id)}
                  />
                </div>
                
                {expandedResponses.has(review.id) && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <ReviewResponses resenaId={review.id} />
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}