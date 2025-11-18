'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import { toast } from 'sonner';

type TipoLike = 'like' | 'dislike';

interface LikesData {
  likes: number;
  dislikes: number;
  userLike: TipoLike | null;
}

interface UseReviewLikesReturn {
  likesData: LikesData;
  isLoading: boolean;
  toggleLike: (tipo: TipoLike) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  refreshLikes: () => Promise<void>;
}

export function useReviewLikes(resenaId: string): UseReviewLikesReturn {
  const { me: session } = useSession();
  const queryClient = useQueryClient();

  const likesQuery = useQuery<LikesData>({
    queryKey: ['reviewLikes', resenaId, session?.id ?? 'anon'],
    queryFn: async () => {
      const likesResponse = await fetch(`/api/reviews/${resenaId}/likes`);
      if (!likesResponse.ok) {
        return { likes: 0, dislikes: 0, userLike: null };
      }
      const likesCount = (await likesResponse.json()) as { likes?: number; dislikes?: number };

      let userLike: TipoLike | null = null;
      if (session) {
        try {
          const userLikeResponse = await fetch(`/api/reviews/${resenaId}/user-like`, { credentials: 'include' });
          if (userLikeResponse.ok) {
            const userData = (await userLikeResponse.json()) as { userLike?: TipoLike | null };
            userLike = userData.userLike ?? null;
          }
        } catch (e) {
          console.warn('Error fetching user like:', e);
        }
      }
      return {
        likes: Number(likesCount.likes ?? 0),
        dislikes: Number(likesCount.dislikes ?? 0),
        userLike,
      };
    },
    enabled: !!resenaId,
    staleTime: 30_000,
  });

  const mutation = useMutation<{ action: string }, unknown, TipoLike>({
    mutationFn: async (tipo) => {
      const response = await fetch(`/api/reviews/${resenaId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tipo }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
      }
      return response.json() as Promise<{ action: string }>;
    },
    onMutate: async (tipo) => {
      if (!session) return;
      const key = ['reviewLikes', resenaId, session.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<LikesData>(key);
      if (previous) {
        const next: LikesData = { ...previous };
        if (previous.userLike === tipo) {
          // remove
          next.userLike = null;
          if (tipo === 'like') next.likes = Math.max(0, next.likes - 1);
          else next.dislikes = Math.max(0, next.dislikes - 1);
        } else if (previous.userLike && previous.userLike !== tipo) {
          // switch
          if (previous.userLike === 'like') {
            next.likes = Math.max(0, next.likes - 1);
            next.dislikes += 1;
          } else {
            next.dislikes = Math.max(0, next.dislikes - 1);
            next.likes += 1;
          }
          next.userLike = tipo;
        } else {
          // add
          if (tipo === 'like') next.likes += 1; else next.dislikes += 1;
          next.userLike = tipo;
        }
        queryClient.setQueryData(key, next);
      }
      return { previousKey: key, previousData: previous } as unknown as void;
    },
    onSuccess: (result, tipo) => {
      if (result.action === 'created') {
        toast.success(tipo === 'like' ? '👍 ¡Te gusta esta reseña!' : '👎 Marcaste que no te gusta');
      } else if (result.action === 'updated') {
        toast.success(tipo === 'like' ? '👍 Cambiaste a me gusta' : '👎 Cambiaste a no me gusta');
      } else if (result.action === 'removed') {
        toast.success('✨ Reacción eliminada');
      }
      queryClient.invalidateQueries({ queryKey: ['reviewLikes', resenaId] });
    },
    onError: (error, _tipo, _context) => {
      const msg = error instanceof Error ? error.message : 'Error al procesar like';
      console.error('Error toggling like:', error);
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        toast.error('🔒 Necesitas iniciar sesión para dar like');
      } else if (msg.includes('404')) {
        toast.error('❌ Reseña no encontrada');
      } else if (msg.includes('429')) {
        toast.error('⏳ Demasiadas solicitudes, intenta más tarde');
      } else {
        toast.error('❌ Error al procesar tu reacción');
      }
      queryClient.invalidateQueries({ queryKey: ['reviewLikes', resenaId] });
    },
  });

  const toggleLike = useCallback(async (tipo: TipoLike) => {
    if (!session || mutation.isPending) return;
    await mutation.mutateAsync(tipo);
  }, [session, mutation]);

  return {
    likesData: likesQuery.data ?? { likes: 0, dislikes: 0, userLike: null },
    isLoading: likesQuery.isLoading,
    toggleLike,
    isSubmitting: mutation.isPending,
    error: likesQuery.error ? (likesQuery.error instanceof Error ? likesQuery.error.message : 'Error') : null,
    refreshLikes: async () => { await likesQuery.refetch(); },
  };
}