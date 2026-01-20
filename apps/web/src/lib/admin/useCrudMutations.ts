'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export function useCrudMutations(resourceName: string) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const listKey = ['admin', 'resource', resourceName, 'list'];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_BASE}/admin/resources/${resourceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || `Error creando ${resourceName}`);
      }

      return res.json();
    },
    onSuccess: () => {
      success('Creado correctamente');
      queryClient.invalidateQueries({ queryKey: listKey });
    },
    onError: (e: any) => {
      error(e?.message ?? 'Error al crear');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (args: { id: string | number; data: any }) => {
      const res = await fetch(
        `${API_BASE}/admin/resources/${resourceName}/${args.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args.data),
        },
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || `Error actualizando ${resourceName}`);
      }

      return res.json();
    },
    onSuccess: (_data, vars) => {
      success('Actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'resource', resourceName, 'detail', vars.id],
      });
    },
    onError: (e: any) => {
      error(e?.message ?? 'Error al actualizar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const res = await fetch(
        `${API_BASE}/admin/resources/${resourceName}/${id}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || `Error eliminando ${resourceName}`);
      }

      return true;
    },
    onSuccess: () => {
      success('Eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: listKey });
    },
    onError: (e: any) => {
      error(e?.message ?? 'Error al eliminar');
    },
  });

  return { createMutation, updateMutation, deleteMutation };
}
