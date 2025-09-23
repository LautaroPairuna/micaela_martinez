'use client';

import { useEffect } from 'react';
import { useFavorites } from '@/store/favorites';
import { useSession } from '@/hooks/useSession';
import { listFavorites } from '@/lib/sdk/userApi';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { me, loading } = useSession();
  const { loadFavorites, reset, setFavorites } = useFavorites();

  // Efecto principal para manejar autenticación/logout
  useEffect(() => {
    if (loading) return;

    if (me) {
      // Usuario autenticado: cargar favoritos directamente desde la API
      const loadFavoritesFromAPI = async () => {
        try {
          console.log('[FAVORITES PROVIDER] Cargando favoritos para usuario:', me?.id);
          
          // Obtener favoritos directamente de la API
          const favorites = await listFavorites({ cache: 'no-store' });
          
          console.log('[FAVORITES PROVIDER] Favoritos obtenidos de la API:', {
            favorites,
            count: favorites?.length || 0,
            type: typeof favorites,
            isArray: Array.isArray(favorites)
          });
          
          // Actualizar el estado con los IDs de los productos favoritos
          const productIds = favorites.map(f => f.id);
          
          console.log('[FAVORITES PROVIDER] IDs de productos extraídos:', {
            productIds,
            count: productIds.length
          });
          
          setFavorites(productIds);
          console.log('✅ Favoritos cargados correctamente:', productIds.length);
        } catch (error) {
          console.error('❌ Error al cargar favoritos:', error);
          // Intentar cargar favoritos con el método estándar como fallback
          loadFavorites(true);
        }
      };
      
      // Ejecutar inmediatamente sin delay
      loadFavoritesFromAPI();
    } else {
      // Usuario no autenticado: resetear favoritos
      reset();
    }
  }, [me, loading, loadFavorites, reset, setFavorites]);

  // Efecto adicional para detectar cambios de usuario (login de usuario diferente)
  useEffect(() => {
    if (loading || !me?.id) return;
    
    // Cuando cambia el ID del usuario, forzar recarga completa
    // Esto maneja el caso de login con usuario diferente
    const loadFavoritesFromAPI = async () => {
      try {
        const favorites = await listFavorites({ cache: 'no-store' });
        const productIds = favorites.map(f => f.id);
        setFavorites(productIds);
      } catch (error) {
        console.error('❌ Error al recargar favoritos (cambio de usuario):', error);
      }
    };
    
    loadFavoritesFromAPI();
  }, [me?.id, loading, setFavorites]);

  return <>{children}</>;
}