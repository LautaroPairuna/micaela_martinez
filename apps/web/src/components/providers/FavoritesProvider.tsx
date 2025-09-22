'use client';

import { useEffect } from 'react';
import { useFavorites } from '@/store/favorites';
import { useSession } from '@/hooks/useSession';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { me, loading } = useSession();
  const { loadFavorites, reset } = useFavorites();

  // Efecto principal para manejar autenticación/logout
  useEffect(() => {
    if (loading) return;

    if (me) {
      // Usuario autenticado: cargar favoritos
      // Pequeño delay para asegurar que el estado esté completamente actualizado
      const timeoutId = setTimeout(() => {
        loadFavorites(true);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else {
      // Usuario no autenticado: resetear favoritos
      reset();
    }
  }, [me, loading, loadFavorites, reset]);

  // Efecto adicional para detectar cambios de usuario (login de usuario diferente)
  useEffect(() => {
    if (loading || !me?.id) return;
    
    // Cuando cambia el ID del usuario, forzar recarga completa
    // Esto maneja el caso de login con usuario diferente
    const timeoutId = setTimeout(() => {
      loadFavorites(true);
    }, 150); // Delay ligeramente mayor para evitar duplicados
    
    return () => clearTimeout(timeoutId);
  }, [me?.id, loading, loadFavorites]);

  return <>{children}</>;
}