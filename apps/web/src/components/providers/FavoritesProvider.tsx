'use client';

import { useEffect, useRef } from 'react';
import { useFavorites } from '@/store/favorites';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import { listFavorites } from '@/lib/sdk/userApi';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { me, loading } = useSession();
  const { loadFavorites, reset, setFavorites, setFavoritesSilent } = useFavorites();
  const queryClient = useQueryClient();
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Efecto principal para manejar autenticación/logout
  useEffect(() => {
    if (loading) return;
    if (!me) {
      // Usuario no autenticado: resetear favoritos y cache de favoritos
      reset();
      queryClient.setQueryData(['favorites', 'me'], []);
    }
  }, [me, loading, loadFavorites, reset, setFavoritesSilent, queryClient]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('BroadcastChannel' in window)) return;
    channelRef.current = new BroadcastChannel('favorites');
    const ch = channelRef.current;
    const handler = (ev: MessageEvent) => {
      const msg = ev.data as { type?: string; next?: Array<{ id: string | number }> };
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'set') {
        const next = Array.isArray(msg.next) ? msg.next : [];
        queryClient.setQueryData(['favorites', 'me'], next);
        const productIds = next.map((f) => f.id);
        setFavoritesSilent(productIds);
      } else if (msg.type === 'invalidate') {
        queryClient.invalidateQueries({ queryKey: ['favorites', 'me'] });
      }
    };
    ch.addEventListener('message', handler as unknown as EventListener);
    return () => {
      try {
        ch.removeEventListener('message', handler as unknown as EventListener);
        ch.close();
      } catch {}
      channelRef.current = null;
    };
  }, [queryClient, setFavoritesSilent]);

  // Eliminado: no recargar automáticamente al cambiar me.id para evitar llamadas tempranas

  return <>{children}</>;
}