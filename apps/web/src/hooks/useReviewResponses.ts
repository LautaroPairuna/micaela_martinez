import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const query = useQuery<{ responses: ReviewResponse[]; count: number }>({
    queryKey: ['reviewResponses', resenaId],
    queryFn: async () => {
      const [responsesRes, countRes] = await Promise.all([
        fetch(`/api/reviews/${resenaId}/responses`),
        fetch(`/api/reviews/${resenaId}/responses/count`),
      ]);
      if (responsesRes.status === 404 || countRes.status === 404) {
        return { responses: [], count: 0 };
      }
      if (!responsesRes.ok || !countRes.ok) {
        const errorStatus = !responsesRes.ok ? responsesRes.status : countRes.status;
        const errorText = !responsesRes.ok ? responsesRes.statusText : countRes.statusText;
        throw new Error(`Error al cargar respuestas: ${errorStatus} ${errorText}`);
      }
      const responsesData = (await responsesRes.json()) as ReviewResponse[];
      const countData = (await countRes.json()) as { count?: number };
      return { responses: responsesData || [], count: Number(countData?.count ?? 0) };
    },
    enabled: !!resenaId,
    staleTime: 30_000,
  });

  const addMutation = useMutation<Response, unknown, { contenido: string; parentId?: string }>({
    mutationFn: async (payload) => {
      const response = await fetch(`/api/reviews/${resenaId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as any).message ||
          (errorData as any).error ||
          `Error ${response.status}: No se pudo crear la respuesta`;
        throw new Error(errorMessage);
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewResponses', resenaId] });
    },
  });

  const updateMutation = useMutation<Response, unknown, { responseId: string; contenido: string }>({
    mutationFn: async ({ responseId, contenido }) => {
      const response = await fetch(`/api/reviews/${resenaId}/responses/${responseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as any).message ||
          (errorData as any).error ||
          `Error ${response.status}: No se pudo actualizar la respuesta`;
        throw new Error(errorMessage);
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewResponses', resenaId] });
    },
  });

  const deleteMutation = useMutation<Response, unknown, { responseId: string }>({
    mutationFn: async ({ responseId }) => {
      const response = await fetch(`/api/reviews/${resenaId}/responses/${responseId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as any).message ||
          (errorData as any).error ||
          `Error ${response.status}: No se pudo eliminar la respuesta`;
        throw new Error(errorMessage);
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewResponses', resenaId] });
    },
  });

  const addResponse = async (contenido: string, respuestaAPadreId?: string) => {
    if (!session) throw new Error('Debes iniciar sesión para responder');
    await addMutation.mutateAsync({ contenido, parentId: respuestaAPadreId });
  };

  const updateResponse = async (responseId: string, contenido: string) => {
    if (!session) throw new Error('Debes iniciar sesión para editar');
    await updateMutation.mutateAsync({ responseId, contenido });
  };

  const deleteResponse = async (responseId: string) => {
    if (!session) throw new Error('Debes iniciar sesión para eliminar');
    await deleteMutation.mutateAsync({ responseId });
  };

  const refreshResponses = async () => {
    await query.refetch();
  };

  return {
    responses: query.data?.responses ?? [],
    responsesCount: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isSubmitting: addMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : 'Error desconocido') : null,
    addResponse,
    updateResponse,
    deleteResponse,
    refreshResponses,
  };
}