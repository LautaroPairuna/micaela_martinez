'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

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

interface CreateReviewData {
  puntaje: number;
  comentario?: string;
  cursoId?: string;
  productoId?: string;
}

interface UpdateReviewData {
  puntaje?: number;
  comentario?: string;
}

interface UseReviewsOptions {
  cursoId?: string;
  productoId?: string;
  userId?: string;
  autoFetch?: boolean;
  sessionLoading?: boolean;
}

interface UseReviewsReturn {
  reviews: Review[];
  userReview: Review | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  averageRating: number;
  totalReviews: number;
  fetchReviews: () => Promise<void>;
  createReview: (data: CreateReviewData) => Promise<boolean>;
  updateReview: (reviewId: string, data: UpdateReviewData) => Promise<boolean>;
  deleteReview: (reviewId: string) => Promise<boolean>;
  canUserReview: boolean;
}

export function useReviews({
  cursoId,
  productoId,
  userId,
  autoFetch = true,
  sessionLoading = false,
}: UseReviewsOptions = {}): UseReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcular métricas derivadas
  const userReview = userId
    ? reviews.find((review) => review.usuario.id === userId) || null
    : null;

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.puntaje, 0) / reviews.length
      : 0;

  const totalReviews = reviews.length;
  const canUserReview = !!(userId && !userReview);

  // Fetch autenticado (cookies httpOnly incluidas)
  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    },
    []
  );

  // Obtener reseñas
  const fetchReviews = useCallback(async () => {
    if (!cursoId && !productoId) return;

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = cursoId
        ? `/api/reviews/course/${cursoId}`
        : `/api/reviews/product/${productoId}`;

      const response = await authenticatedFetch(endpoint);
      const data = await response.json();

      // Backend devuelve { reviews: [], pagination: {} } o arreglo directo
      const reviewsArray = data.reviews || data;
      setReviews(Array.isArray(reviewsArray) ? reviewsArray : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar las reseñas';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [cursoId, productoId, authenticatedFetch]);

  // Crear reseña
  const createReview = useCallback(
    async (data: CreateReviewData): Promise<boolean> => {
      if (!userId) {
        toast.error('Debes iniciar sesión para escribir una reseña');
        return false;
      }

      if (userReview) {
        toast.error('Ya has escrito una reseña para este elemento');
        return false;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const response = await authenticatedFetch(`/api/reviews`, {
          method: 'POST',
          body: JSON.stringify({
            ...data,
            cursoId: cursoId || data.cursoId,
            productoId: productoId || data.productoId,
          }),
        });

        const newReview = await response.json();
        setReviews((prev) => [newReview, ...prev]);

        // Revalidar cache de productos (rating en cards)
        try {
          await fetch('/api/revalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paths: ['/tienda', `/tienda/producto/${productoId}`],
            }),
          });
        } catch (revalidateError) {
          console.warn('Error revalidating cache:', revalidateError);
        }

        toast.success('Reseña publicada exitosamente');
        return true;
      } catch (err) {
        let errorMessage = 'Error al crear la reseña';

        if (err instanceof Error) {
          if (err.message.includes('403') || err.message.includes('permisos')) {
            errorMessage =
              'No tienes permisos para reseñar este contenido. Debes haberlo comprado o estar inscrito.';
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);
        toast.error(errorMessage);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, userReview, cursoId, productoId, authenticatedFetch]
  );

  // Actualizar reseña
  const updateReview = useCallback(
    async (reviewId: string, data: UpdateReviewData): Promise<boolean> => {
      if (!userId) {
        toast.error('Debes iniciar sesión para editar una reseña');
        return false;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const response = await authenticatedFetch(`/api/reviews/${reviewId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });

        const updatedReview = await response.json();

        setReviews((prev) => prev.map((review) => (review.id === reviewId ? updatedReview : review)));

        // Revalidar cache de productos (rating en cards)
        try {
          await fetch('/api/revalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paths: ['/tienda', `/tienda/producto/${productoId}`],
            }),
          });
        } catch (revalidateError) {
          console.warn('Error revalidating cache:', revalidateError);
        }

        toast.success('Reseña actualizada exitosamente');
        return true;
      } catch (err) {
        let errorMessage = 'Error al actualizar la reseña';

        if (err instanceof Error) {
          if (err.message.includes('403') || err.message.includes('permisos')) {
            errorMessage = 'No tienes permisos para editar esta reseña.';
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);
        toast.error(errorMessage);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, productoId, authenticatedFetch]
  );

  // Eliminar reseña
  const deleteReview = useCallback(
    async (reviewId: string): Promise<boolean> => {
      if (!userId) {
        toast.error('Debes iniciar sesión para eliminar una reseña');
        return false;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await authenticatedFetch(`/api/reviews/${reviewId}`, {
          method: 'DELETE',
        });

        setReviews((prev) => prev.filter((review) => review.id !== reviewId));

        // Revalidar cache de productos (rating en cards)
        try {
          await fetch('/api/revalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paths: ['/tienda', `/tienda/producto/${productoId}`],
            }),
          });
        } catch (revalidateError) {
          console.warn('Error revalidating cache:', revalidateError);
        }

        toast.success('Reseña eliminada exitosamente');
        return true;
      } catch (err) {
        let errorMessage = 'Error al eliminar la reseña';

        if (err instanceof Error) {
          if (err.message.includes('403') || err.message.includes('permisos')) {
            errorMessage = 'No tienes permisos para eliminar esta reseña.';
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);
        toast.error(errorMessage);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, productoId, authenticatedFetch]
  );

  // Auto-fetch en mount si está habilitado y la sesión ya se validó
  useEffect(() => {
    if (autoFetch && (cursoId || productoId) && !sessionLoading) {
      fetchReviews();
    }
  }, [autoFetch, fetchReviews, sessionLoading, cursoId, productoId]);

  return {
    reviews,
    userReview,
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
  };
}
