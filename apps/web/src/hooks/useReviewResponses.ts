import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';

interface ReviewResponse {
  id: string;
  contenido: string;
  creadoEn: string;
  actualizadoEn: string;
  eliminado: boolean;
  editado: boolean;
  usuario: {
    id: string;
    nombre: string;
    email: string;
  };
  respuestaAPadre?: {
    id: string;
    contenido: string;
    usuario: {
      id: string;
      nombre: string;
    };
  };
  respuestasHijas: ReviewResponse[];
  _count: {
    respuestasHijas: number;
  };
}

interface UseReviewResponsesReturn {
  responses: ReviewResponse[];
  responsesCount: number;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  addResponse: (contenido: string, respuestaAPadreId?: string) => Promise<void>;
  updateResponse: (responseId: string, contenido: string) => Promise<void>;
  deleteResponse: (responseId: string) => Promise<void>;
  refreshResponses: () => Promise<void>;
}

export function useReviewResponses(resenaId: string): UseReviewResponsesReturn {
  const { me: session } = useSession();
  const [responses, setResponses] = useState<ReviewResponse[]>([]);
  const [responsesCount, setResponsesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResponses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [responsesRes, countRes] = await Promise.all([
        fetch(`/api/reviews/${resenaId}/responses`),
        fetch(`/api/reviews/${resenaId}/responses/count`)
      ]);

      // Manejar caso donde no hay respuestas (404) como válido
      if (responsesRes.status === 404 || countRes.status === 404) {
        setResponses([]);
        setResponsesCount(0);
        return;
      }

      if (!responsesRes.ok || !countRes.ok) {
        const errorStatus = !responsesRes.ok ? responsesRes.status : countRes.status;
        const errorText = !responsesRes.ok ? responsesRes.statusText : countRes.statusText;
        throw new Error(`Error al cargar respuestas: ${errorStatus} ${errorText}`);
      }

      const responsesData = await responsesRes.json();
      const countData = await countRes.json();

      setResponses(responsesData || []);
      setResponsesCount(countData?.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching responses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addResponse = async (contenido: string, respuestaAPadreId?: string) => {
    if (!session) {
      setError('Debes iniciar sesión para responder');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/reviews/${resenaId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contenido,
          parentId: respuestaAPadreId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear respuesta');
      }

      // Refrescar las respuestas después de agregar una nueva
      await fetchResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error adding response:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateResponse = async (responseId: string, contenido: string) => {
    if (!session) {
      setError('Debes iniciar sesión para editar');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/reviews/${resenaId}/responses/${responseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contenido }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar respuesta');
      }

      // Refrescar las respuestas después de actualizar
      await fetchResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error updating response:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteResponse = async (responseId: string) => {
    if (!session) {
      setError('Debes iniciar sesión para eliminar');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/reviews/${resenaId}/responses/${responseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar respuesta');
      }

      // Refrescar las respuestas después de eliminar
      await fetchResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error deleting response:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshResponses = async () => {
    await fetchResponses();
  };

  useEffect(() => {
    if (resenaId) {
      fetchResponses();
    }
  }, [resenaId]);

  return {
    responses,
    responsesCount,
    isLoading,
    isSubmitting,
    error,
    addResponse,
    updateResponse,
    deleteResponse,
    refreshResponses,
  };
}