'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const endpoint = useMemo(() => {
    if (cursoId) return `/api/reviews/course/${cursoId}`;
    if (productoId) return `/api/reviews/product/${productoId}`;
    return null;
  }, [cursoId, productoId]);

  const query = useQuery<Review[]>({
    queryKey: ['reviews', cursoId ? { cursoId } : { productoId }],
    queryFn: async () => {
      const res = await fetch(String(endpoint), { credentials: 'include' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).message || `HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const reviewsArray = data.reviews || data;
      return Array.isArray(reviewsArray) ? (reviewsArray as Review[]) : [];
    },
    enabled: !!endpoint && (autoFetch ? !sessionLoading : false),
    staleTime: 30_000,
  });

  const createMutation = useMutation<Review, unknown, CreateReviewData>({
    mutationFn: async (data) => {
      if (!userId) throw new Error('Debes iniciar sesión para escribir una reseña');
      const res = await fetch('/api/reviews', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          cursoId: cursoId || data.cursoId,
          productoId: productoId || data.productoId,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).message || 'Error al crear la reseña');
      }
      const newReview = (await res.json()) as Review;
      return newReview;
    },
    onSuccess: async (newReview) => {
      queryClient.setQueryData<Review[]>(['reviews', cursoId ? { cursoId } : { productoId }], (prev) => [newReview, ...(prev ?? [])]);
      try {
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: ['/tienda', `/tienda/producto/${productoId}`] }),
        });
      } catch (e) {
        console.warn('Error revalidating cache:', e);
      }
      toast.success('Reseña publicada exitosamente');
    },
    onError: (err: unknown) => {
      let errorMessage = 'Error al crear la reseña';
      if (err instanceof Error) {
        if (err.message.includes('403') || err.message.includes('permisos')) {
          errorMessage = 'No tienes permisos para reseñar este contenido. Debes haberlo comprado o estar inscrito.';
        } else {
          errorMessage = err.message;
        }
      }
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation<Review, unknown, { reviewId: string; data: UpdateReviewData }>({
    mutationFn: async ({ reviewId, data }) => {
      if (!userId) throw new Error('Debes iniciar sesión para editar una reseña');
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).message || 'Error al actualizar la reseña');
      }
      return (await res.json()) as Review;
    },
    onSuccess: async (updatedReview) => {
      queryClient.setQueryData<Review[]>(['reviews', cursoId ? { cursoId } : { productoId }], (prev) =>
        (prev ?? []).map((r) => (r.id === updatedReview.id ? updatedReview : r))
      );
      try {
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: ['/tienda', `/tienda/producto/${productoId}`] }),
        });
      } catch (e) {
        console.warn('Error revalidating cache:', e);
      }
      toast.success('Reseña actualizada exitosamente');
    },
    onError: (err: unknown) => {
      let errorMessage = 'Error al actualizar la reseña';
      if (err instanceof Error) {
        if (err.message.includes('403') || err.message.includes('permisos')) {
          errorMessage = 'No tienes permisos para editar esta reseña.';
        } else {
          errorMessage = err.message;
        }
      }
      toast.error(errorMessage);
    },
  });

  const deleteMutation = useMutation<void, unknown, { reviewId: string }>({
    mutationFn: async ({ reviewId }) => {
      if (!userId) throw new Error('Debes iniciar sesión para eliminar una reseña');
      const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).message || 'Error al eliminar la reseña');
      }
    },
    onSuccess: async (_data, { reviewId }) => {
      queryClient.setQueryData<Review[]>(['reviews', cursoId ? { cursoId } : { productoId }], (prev) =>
        (prev ?? []).filter((r) => r.id !== reviewId)
      );
      try {
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: ['/tienda', `/tienda/producto/${productoId}`] }),
        });
      } catch (e) {
        console.warn('Error revalidating cache:', e);
      }
      toast.success('Reseña eliminada exitosamente');
    },
    onError: (err: unknown) => {
      let errorMessage = 'Error al eliminar la reseña';
      if (err instanceof Error) {
        if (err.message.includes('403') || err.message.includes('permisos')) {
          errorMessage = 'No tienes permisos para eliminar esta reseña.';
        } else {
          errorMessage = err.message;
        }
      }
      toast.error(errorMessage);
    },
  });

  const userReview = useMemo(() => {
    const data = query.data ?? [];
    return userId ? data.find((review) => review.usuario.id === userId) || null : null;
  }, [query.data, userId]);

  const averageRating = useMemo(() => {
    const data = query.data ?? [];
    return data.length > 0 ? data.reduce((sum, review) => sum + review.puntaje, 0) / data.length : 0;
  }, [query.data]);

  const totalReviews = (query.data ?? []).length;
  const canUserReview = !!(userId && !userReview);

  const fetchReviews = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const createReview = useCallback(async (data: CreateReviewData) => {
    await createMutation.mutateAsync(data);
    return true;
  }, [createMutation]);

  const updateReview = useCallback(async (reviewId: string, data: UpdateReviewData) => {
    await updateMutation.mutateAsync({ reviewId, data });
    return true;
  }, [updateMutation]);

  const deleteReview = useCallback(async (reviewId: string) => {
    await deleteMutation.mutateAsync({ reviewId });
    return true;
  }, [deleteMutation]);

  return {
    reviews: query.data ?? [],
    userReview,
    isLoading: query.isLoading,
    isSubmitting: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : 'Error') : null,
    averageRating,
    totalReviews,
    fetchReviews,
    createReview,
    updateReview,
    deleteReview,
    canUserReview,
  };
}
