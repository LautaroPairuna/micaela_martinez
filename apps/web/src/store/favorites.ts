'use client';

import { create } from 'zustand';
import { addFavorite, removeFavorite, listFavorites } from '@/lib/sdk/userApi';

type FavoritesState = {
  favorites: Set<string>; // IDs de productos favoritos
  isLoading: boolean;
  isInitialized: boolean;
  
  // Acciones
  setFavorites: (productIds: string[]) => void;
  loadFavorites: (forceReload?: boolean) => Promise<void>;
  addToFavorites: (productId: string, productTitle: string) => Promise<void>;
  removeFromFavorites: (productId: string, productTitle: string) => Promise<void>;
  toggleFavorite: (productId: string, productTitle: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  reset: () => void;
};

export const useFavorites = create<FavoritesState>()((set, get) => ({
  favorites: new Set(),
  isLoading: false,
  isInitialized: false,

  setFavorites: (productIds: string[]) => {
    set({ favorites: new Set(productIds), isInitialized: true });
  },

  loadFavorites: async (forceReload = false) => {
    const { isInitialized } = get();
    if (isInitialized && !forceReload) return;

    set({ isLoading: true });
    try {
      const favoriteProducts = await listFavorites();
      const productIds = favoriteProducts.map(f => f.id);
      set({ favorites: new Set(productIds), isInitialized: true });
    } catch (error) {
      // Si hay error (ej: usuario no autenticado), simplemente no cargamos favoritos
      console.debug('No se pudieron cargar favoritos:', error);
      set({ isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  addToFavorites: async (productId: string, productTitle: string) => {
    const { favorites } = get();
    if (favorites.has(productId)) {
      return;
    }

    set({ isLoading: true });
    try {
      await addFavorite(productId);
      const newFavorites = new Set(favorites);
      newFavorites.add(productId);
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

  removeFromFavorites: async (productId: string, productTitle: string) => {
    const { favorites } = get();
    if (!favorites.has(productId)) return;

    set({ isLoading: true });
    try {
      await removeFavorite(productId);
      const newFavorites = new Set(favorites);
      newFavorites.delete(productId);
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

  toggleFavorite: async (productId: string, productTitle: string) => {
    const { favorites, addToFavorites, removeFromFavorites } = get();
    if (favorites.has(productId)) {
      await removeFromFavorites(productId, productTitle);
    } else {
      await addToFavorites(productId, productTitle);
    }
  },

  isFavorite: (productId: string) => {
    return get().favorites.has(productId);
  },

  reset: () => {
    set({ favorites: new Set(), isInitialized: false, isLoading: false });
  },
}));