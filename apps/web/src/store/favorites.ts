'use client';

import { create } from 'zustand';
import { addFavorite, removeFavorite, listFavorites } from '@/lib/sdk/userApi';

type FavoritesState = {
  favorites: Set<string>;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Acciones
  setFavorites: (productIds: Array<string | number>) => void;
  loadFavorites: (forceReload?: boolean) => Promise<void>;
  addToFavorites: (productId: string | number, productTitle: string) => Promise<void>;
  removeFromFavorites: (productId: string | number, productTitle: string) => Promise<void>;
  toggleFavorite: (productId: string | number, productTitle: string) => Promise<void>;
  isFavorite: (productId: string | number) => boolean;
  reset: () => void;
};

export const useFavorites = create<FavoritesState>()((set, get) => ({
  favorites: new Set(),
  isLoading: false,
  isInitialized: false,

  setFavorites: (productIds: Array<string | number>) => {
    const ids = productIds.map(id => String(id));
    set({ favorites: new Set(ids), isInitialized: true });
  },

  loadFavorites: async (forceReload = false) => {
    const { isInitialized } = get();
    if (isInitialized && !forceReload) return;

    console.log('[FAVORITES STORE] Iniciando carga de favoritos:', { forceReload, isInitialized });

    set({ isLoading: true });
    try {
      // Forzamos no-cache para obtener datos actualizados
      const favoriteProducts = await listFavorites({ cache: 'no-store' });
      
      console.log('[FAVORITES STORE] Productos favoritos obtenidos:', {
        favoriteProducts,
        count: favoriteProducts?.length || 0,
        type: typeof favoriteProducts,
        isArray: Array.isArray(favoriteProducts)
      });
      
      const productIds = favoriteProducts.map(f => String(f.id));
      
      console.log('[FAVORITES STORE] IDs extraídos:', {
        productIds,
        count: productIds.length
      });
      
      set({ favorites: new Set(productIds), isInitialized: true });
      console.log('✅ Favoritos cargados en store:', productIds.length);
    } catch (error) {
      // Si hay error (ej: usuario no autenticado), simplemente no cargamos favoritos
      console.error('❌ Error al cargar favoritos en store:', error);
      set({ isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  addToFavorites: async (productId: string | number, productTitle: string) => {
    const { favorites } = get();
    const pid = String(productId);
    if (favorites.has(pid)) {
      return;
    }

    set({ isLoading: true });
    try {
      await addFavorite(productId);
      const newFavorites = new Set(favorites);
      newFavorites.add(pid);
      set({ favorites: newFavorites });
      
      // Importar dinámicamente react-toastify para evitar problemas de SSR
      const { toast } = await import('react-toastify');
      toast.success(`${productTitle} agregado a favoritos`, {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error al agregar a favoritos:', error);
      const { toast } = await import('react-toastify');
      toast.error('Error al agregar a favoritos', {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  removeFromFavorites: async (productId: string | number, productTitle: string) => {
    const { favorites } = get();
    const pid = String(productId);
    if (!favorites.has(pid)) return;

    set({ isLoading: true });
    try {
      await removeFavorite(productId);
      const newFavorites = new Set(favorites);
      newFavorites.delete(pid);
      set({ favorites: newFavorites });
      
      const { toast } = await import('react-toastify');
      toast.info(`${productTitle} eliminado de favoritos`, {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error al eliminar de favoritos:', error);
      const { toast } = await import('react-toastify');
      toast.error('Error al eliminar de favoritos', {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  toggleFavorite: async (productId: string | number, productTitle: string) => {
    const { favorites, addToFavorites, removeFromFavorites } = get();
    const pid = String(productId);
    if (favorites.has(pid)) {
      await removeFromFavorites(pid, productTitle);
    } else {
      await addToFavorites(pid, productTitle);
    }
  },

  isFavorite: (productId: string | number) => {
    return get().favorites.has(String(productId));
  },

  reset: () => {
    set({ favorites: new Set(), isInitialized: false, isLoading: false });
  },
}));