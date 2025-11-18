'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseScrollToCommentOptions {
  onExpandReview?: (reviewId: string) => void;
  onExpandResponses?: (reviewId: string) => void;
}

export function useScrollToComment({
  onExpandReview,
  onExpandResponses
}: UseScrollToCommentOptions = {}) {
  const router = useRouter();
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToElement = useCallback((elementId: string, retries = 0) => {
    const element = document.getElementById(elementId);
    
    if (element) {
      // Scroll suave hacia el elemento
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      
      // Agregar efecto visual temporal
      element.classList.add('highlight-comment');
      setTimeout(() => {
        element.classList.remove('highlight-comment');
      }, 3000);
      
      return true;
    } else if (retries < 5) {
      // Reintentar después de un breve delay si el elemento no existe aún
      setTimeout(() => {
        scrollToElement(elementId, retries + 1);
      }, 200);
    }
    
    return false;
  }, []);

  const handleHashChange = useCallback(() => {
    const hash = window.location.hash.substring(1); // Remover el #
    
    if (!hash) return;

    // Limpiar timeout anterior si existe
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Determinar si es una reseña o una respuesta
    const isReview = hash.startsWith('resena-') || hash.match(/^[a-zA-Z0-9_-]+$/);
    const isResponse = hash.startsWith('respuesta-');

    if (isReview) {
      // Es una reseña - extraer el ID de la reseña
      const reviewId = hash.replace('resena-', '');
      
      // Expandir la reseña si es necesario
      if (onExpandReview) {
        onExpandReview(reviewId);
      }
      
      // Expandir las respuestas de la reseña
      if (onExpandResponses) {
        onExpandResponses(reviewId);
      }
      
      // Intentar hacer scroll al elemento
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToElement(hash);
      }, 300);
      
    } else if (isResponse) {
      // Es una respuesta - necesitamos encontrar la reseña padre
      const responseId = hash.replace('respuesta-', '');
      
      // Buscar el elemento de respuesta para encontrar la reseña padre
      const responseElement = document.querySelector(`[data-response-id="${responseId}"]`);
      if (responseElement) {
        const reviewCard = responseElement.closest('[data-review-id]');
        if (reviewCard) {
          const reviewId = reviewCard.getAttribute('data-review-id');
          if (reviewId) {
            // Expandir la reseña y sus respuestas
            if (onExpandReview) {
              onExpandReview(reviewId);
            }
            if (onExpandResponses) {
              onExpandResponses(reviewId);
            }
          }
        }
      }
      
      // Intentar hacer scroll al elemento de respuesta
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToElement(hash);
      }, 300);
    } else {
      // Hash genérico - intentar scroll directo
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToElement(hash);
      }, 100);
    }
  }, [onExpandReview, onExpandResponses, scrollToElement]);

  useEffect(() => {
    // Manejar el hash inicial al cargar la página
    if (window.location.hash) {
      // Delay para asegurar que los componentes estén montados
      setTimeout(handleHashChange, 500);
    }

    // Escuchar cambios en el hash
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleHashChange]);

  // Función para navegar a un comentario específico
  const navigateToComment = (commentId: string, type: 'review' | 'response' = 'review') => {
    const hash = type === 'review' ? commentId : `respuesta-${commentId}`;
    const currentPath = window.location.pathname;
    router.push(`${currentPath}#${hash}`);
  };

  return {
    navigateToComment,
    scrollToElement
  };
}