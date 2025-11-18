'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { listFavorites, addFavorite, removeFavorite } from '@/lib/sdk/userApi';
import { useToast } from '@/contexts/ToastContext';

type FavoriteListItem = { id: string | number };

export function useFavoritesClient() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { error: toastError, success: toastSuccess } = useToast();

  const favoritesQuery = useQuery<FavoriteListItem[]>({
    queryKey: ['favorites', user?.id ?? 'anon'],
    queryFn: async () => {
      try {
        const favs = await listFavorites({ cache: 'no-store' });
        return Array.isArray(favs) ? favs.map((f) => ({ id: f.id })) : [];
      } catch (e) {
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const ids = useMemo(() => new Set((favoritesQuery.data ?? []).map((f) => String(f.id))), [favoritesQuery.data]);

  const mutation = useMutation<void, unknown, { productId: string | number; title?: string; currentlyFav: boolean }, { prev: FavoriteListItem[] }>({
    mutationFn: async ({ productId, currentlyFav }) => {
      if (currentlyFav) {
        await removeFavorite(productId);
      } else {
        await addFavorite(productId);
      }
    },
    onMutate: async (vars) => {
      const key = ['favorites', user?.id ?? 'anon'];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<FavoriteListItem[]>(key) ?? [];
      const pid = String(vars.productId);
      const next = vars.currentlyFav ? prev.filter((f) => String(f.id) !== pid) : [...prev, { id: pid }];
      queryClient.setQueryData(key, next);
      return { prev } as const;
    },
    onError: (error, vars, ctx) => {
      const key = ['favorites', user?.id ?? 'anon'];
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
      const msg = error instanceof Error ? error.message : 'Error al actualizar favoritos';
      if (msg.includes('401')) {
        toastError('Necesitas iniciar sesión para usar favoritos');
      } else {
        toastError('Error al actualizar favoritos: ' + msg);
      }
    },
    onSuccess: (_data, vars) => {
      toastSuccess(vars.currentlyFav ? 'Eliminado de favoritos' : 'Agregado a favoritos');
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id ?? 'anon'] });
    },
  });

  return {
    isLoading: favoritesQuery.isLoading || mutation.isPending,
    isFavorite: (productId: string | number) => ids.has(String(productId)),
    toggleFavorite: async (productId: string | number, productTitle?: string) => {
      const currentlyFav = ids.has(String(productId));
      await mutation.mutateAsync({ productId, title: productTitle, currentlyFav });
    },
  };
}