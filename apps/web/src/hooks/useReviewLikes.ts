'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [likesData, setLikesData] = useState<LikesData>({
    likes: 0,
    dislikes: 0,
    userLike: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar datos de likes
  const fetchLikesData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Obtener contadores de likes
      const likesResponse = await fetch(`/api/reviews/${resenaId}/likes`);
      
      if (!likesResponse.ok) {
        throw new Error(`Error ${likesResponse.status}: ${likesResponse.statusText}`);
      }
      
      const likesCount = await likesResponse.json();
      
      let userLike = null;
      
      // Si el usuario está autenticado, obtener su like
      if (session) {
        try {
          const userLikeResponse = await fetch(`/api/reviews/${resenaId}/user-like`, {
            credentials: 'include' // Enviar cookies para autenticación
          });
          
          if (userLikeResponse.ok) {
            const userData = await userLikeResponse.json();
            userLike = userData.userLike;
          }
        } catch (userLikeError) {
          // Error al obtener like del usuario no es crítico
          console.warn('Error fetching user like:', userLikeError);
        }
      }
      
      setLikesData({
        likes: likesCount.likes || 0,
        dislikes: likesCount.dislikes || 0,
        userLike,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar likes';
      setError(errorMessage);
      console.error('Error fetching likes data:', error);
      toast.error('Error al cargar los likes');
    } finally {
      setIsLoading(false);
    }
  }, [resenaId, session]);

  // Cargar datos iniciales
  useEffect(() => {
    if (resenaId) {
      fetchLikesData();
    }
  }, [resenaId, fetchLikesData]);

  const toggleLike = async (tipo: TipoLike) => {
    if (!session || isSubmitting) return;

    // Guardar estado anterior para rollback
    const previousState = { ...likesData };
    
    // Actualización optimista
    setLikesData(prev => {
      const newData = { ...prev };
      
      // Si ya tiene el mismo tipo de like, lo removemos
      if (prev.userLike === tipo) {
        if (tipo === 'like') {
          newData.likes = Math.max(0, newData.likes - 1);
        } else {
          newData.dislikes = Math.max(0, newData.dislikes - 1);
        }
        newData.userLike = null;
      }
      // Si tiene un like diferente, lo cambiamos
      else if (prev.userLike && prev.userLike !== tipo) {
        if (prev.userLike === 'like') {
          newData.likes = Math.max(0, newData.likes - 1);
          newData.dislikes += 1;
        } else {
          newData.dislikes = Math.max(0, newData.dislikes - 1);
          newData.likes += 1;
        }
        newData.userLike = tipo;
      }
      // Si no tiene like, agregamos uno nuevo
      else {
        if (tipo === 'like') {
          newData.likes += 1;
        } else {
          newData.dislikes += 1;
        }
        newData.userLike = tipo;
      }
      
      return newData;
    });

    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await fetch(`/api/reviews/${resenaId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tipo }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
      }

      const result = await response.json();
      
      // Mostrar feedback positivo
      if (result.action === 'created') {
        toast.success(tipo === 'like' ? '👍 ¡Te gusta esta reseña!' : '👎 Marcaste que no te gusta');
      } else if (result.action === 'updated') {
        toast.success(tipo === 'like' ? '👍 Cambiaste a me gusta' : '👎 Cambiaste a no me gusta');
      } else if (result.action === 'removed') {
        toast.success('✨ Reacción eliminada');
      }
      
      // Verificar que el estado local coincida con el servidor
      // (opcional: podrías hacer una verificación adicional aquí)
      
    } catch (error) {
      // Rollback en caso de error
      setLikesData(previousState);
      
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar like';
      setError(errorMessage);
      console.error('Error toggling like:', error);
      
      // Mostrar error específico al usuario
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        toast.error('🔒 Necesitas iniciar sesión para dar like');
      } else if (errorMessage.includes('404')) {
        toast.error('❌ Reseña no encontrada');
      } else if (errorMessage.includes('429')) {
        toast.error('⏳ Demasiadas solicitudes, intenta más tarde');
      } else {
        toast.error('❌ Error al procesar tu reacción');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    likesData,
    isLoading,
    toggleLike,
    isSubmitting,
    error,
    refreshLikes: fetchLikesData,
  };
}