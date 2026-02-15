'use client';

import { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RatingStars } from '@/components/ui/RatingStars';
import { ReviewForm } from './ReviewForm';
import { ReviewsList } from './ReviewsList';
import { ReviewPermissionGuard } from './ReviewPermissionGuard';
import { useReviews } from '@/hooks/useReviews';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/contexts/ToastContext';

interface ReviewsSectionProps {
  cursoId?: string;
  productoId?: string;
  title?: string;
  className?: string;
}

type ReviewItem = {
  id: string;
  puntaje: number;
  comentario?: string | null;
  usuario?: { id?: string; nombre?: string | null } | null;
  creadoEn: string;
  editado?: boolean;
};

export function ReviewsSection({
  cursoId,
  productoId,
  title,
  className = '',
}: ReviewsSectionProps) {
  const { me, loading: sessionLoading } = useSession();
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const { warning: showWarning, success: showSuccess, error: showError } = useToast();

  const {
    reviews,
    // userReview, // no se usa
    isLoading,
    isSubmitting,
    error,
    averageRating,
    totalReviews,
    fetchReviews,
    createReview,
    updateReview,
    deleteReview,
    canUserReview,
  } = useReviews({
    cursoId,
    productoId,
    userId: me?.id,
    autoFetch: true,
    sessionLoading,
  });

  const handleSubmitReview = async (data: {
    puntaje: number;
    comentario?: string;
  }) => {
    let success = false;

    if (editingReview) {
      // Actualizar reseña existente
      success = await updateReview(editingReview.id, data);
    } else {
      // Crear nueva reseña
      success = await createReview({
        ...data,
        cursoId,
        productoId,
      });
    }

    if (success) {
      setShowForm(false);
      setEditingReview(null);
      await fetchReviews(); // Refrescar la lista
    }
  };

  const handleEditReview = (review: ReviewItem) => {
    setEditingReview(review);
    setShowForm(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta reseña? Esta acción no se puede deshacer.')) {
      try {
        const success = await deleteReview(reviewId);
        if (success) {
          await fetchReviews(); // Refrescar la lista
          showSuccess('Reseña eliminada', 'La reseña se ha eliminado correctamente');
        } else {
          showError('Error', 'No se pudo eliminar la reseña');
        }
      } catch (err) {
        console.error('Error deleting review:', err);
        showError('Error', 'Ocurrió un error al eliminar la reseña');
      }
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingReview(null);
  };

  const getRatingDistribution = () => {
    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
    reviews.forEach((review: { puntaje: number }) => {
      const key = Math.min(5, Math.max(1, Math.round(review.puntaje))) as 1 | 2 | 3 | 4 | 5;
      distribution[key]++;
    });
    return distribution;
  };

  const ratingDistribution = getRatingDistribution();

  return (
    <section className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
        <h2 className="text-3xl font-serif text-white flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-pink-500" />
          {title || 'Reseñas y valoraciones'}
        </h2>

        {me && canUserReview && !showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-white"
          >
            Escribir reseña
          </Button>
        )}
      </div>

      {/* Rating Summary */}
      {totalReviews > 0 && (
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall Rating */}
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <span className="text-4xl font-bold text-[var(--fg)]">
                    {averageRating.toFixed(1)}
                  </span>
                  <div>
                    <RatingStars value={averageRating} size="lg" showValue={false} />
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {totalReviews} {totalReviews === 1 ? 'reseña' : 'reseñas'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = ratingDistribution[rating as 1 | 2 | 3 | 4 | 5];
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                  return (
                    <div key={rating} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-[var(--muted)]">{rating}</span>
                      <Star className="h-3 w-3 text-[var(--gold)] fill-current" />
                      <div className="flex-1 bg-[var(--bg-secondary)] rounded-full h-2">
                        <div
                          className="bg-[var(--gold)] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-[var(--muted)] text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Review Form with Permission Guard */}
      <ReviewPermissionGuard
        type={cursoId ? 'curso' : 'producto'}
        itemId={cursoId || productoId || ''}
        itemTitle={title}
        hasPermission={me ? undefined : false}
        isLoading={isLoading}
        sessionLoading={sessionLoading}
      >
        {showForm && me && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
              {editingReview ? 'Editar reseña' : 'Escribir reseña'}
            </h3>
            <ReviewForm
              cursoId={cursoId}
              productoId={productoId}
              existingReview={editingReview || undefined}
              onSubmit={handleSubmitReview}
              onCancel={handleCancelForm}
              isLoading={isSubmitting}
            />
          </div>
        )}
      </ReviewPermissionGuard>

      {/* Error State */}
      {error && (
        <Card className="border-red-200">
          <CardBody className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchReviews} disabled={isLoading}>
              Intentar de nuevo
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Reviews List */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
          {totalReviews > 0 ? `Todas las reseñas (${totalReviews})` : 'Reseñas'}
        </h3>

        <ReviewsList
          reviews={reviews}
          currentUserId={me?.id}
          isAdmin={me?.rol === 'ADMIN'}
          isLoading={isLoading}
          onEdit={handleEditReview}
          onDelete={handleDeleteReview}
          showActions={true}
          emptyMessage="No hay reseñas aún"
        />
      </div>
    </section>
  );
}
