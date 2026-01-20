// src/hooks/useFavoriteData.ts
'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { listFavorites, addFavorite, removeFavorite } from '@/lib/sdk/userApi';
import { useToast } from '@/contexts/ToastContext';

type FavoriteListItem = { id: string | number };

const FAVORITES_KEY = ['favorites', 'me'] as const;

export function useFavoritesClient() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { error: toastError, success: toastSuccess } = useToast();

  // 1) Query principal: una sola fuente de verdad
  const favoritesQuery = useQuery<FavoriteListItem[]>({
    queryKey: FAVORITES_KEY,
    queryFn: async () => {
      try {
        const favs = await listFavorites({ cache: 'no-store' });
        return Array.isArray(favs) ? favs.map((f) => ({ id: f.id })) : [];
      } catch (e) {
        // si hay error (ej: 401), devolvemos array vacío
        return [];
      }
    },
    enabled: !!user?.id,        // solo si hay usuario logueado
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // 2) Set de IDs para lookup rápido
  const ids = useMemo(
    () => new Set((favoritesQuery.data ?? []).map((f) => String(f.id))),
    [favoritesQuery.data],
  );

  // 3) Mutación optimista
  const mutation = useMutation<
    void,
    unknown,
    { productId: string | number; title?: string; currentlyFav: boolean },
    { prev: FavoriteListItem[] }
  >({
    mutationFn: async ({ productId, currentlyFav }) => {
      if (currentlyFav) {
        await removeFavorite(productId);
      } else {
        await addFavorite(productId);
      }
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: FAVORITES_KEY });

      const prev = queryClient.getQueryData<FavoriteListItem[]>(FAVORITES_KEY) ?? [];
      const pid = String(vars.productId);

      const next = vars.currentlyFav
        ? prev.filter((f) => String(f.id) !== pid)
        : [...prev, { id: pid }];

      // ⚡ Optimismo: actualizamos cache inmediatamente
      queryClient.setQueryData(FAVORITES_KEY, next);

      return { prev };
    },
    onError: (error, vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(FAVORITES_KEY, ctx.prev);
      }

      const msg = error instanceof Error ? error.message : 'Error al actualizar favoritos';
      if (msg.includes('401')) {
        toastError('Necesitas iniciar sesión para usar favoritos');
      } else {
        toastError('Error al actualizar favoritos: ' + msg);
      }
    },
    onSuccess: (_data, vars) => {
      toastSuccess(
        vars.currentlyFav ? 'Eliminado de favoritos' : 'Agregado a favoritos',
      );
      // Si querés máxima coherencia con otras pantallas:
      // queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
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
