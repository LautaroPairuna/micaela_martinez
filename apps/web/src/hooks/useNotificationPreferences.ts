'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import { apiProxy } from '@/lib/api-proxy';

export interface NotificationPreferences {
  nuevaResena?: boolean;
  respuestaResena?: boolean;
  actualizacionesSistema?: boolean;
}

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences;
  loading: boolean;
  saving: boolean;
  error: string | null;
  updatePreference: (key: keyof NotificationPreferences, value: boolean) => void;
  savePreferences: () => Promise<void>;
  resetToDefaults: () => void;
  refreshPreferences: () => Promise<void>;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  nuevaResena: true,
  respuestaResena: true,
  actualizacionesSistema: true,
};

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { me: user } = useSession();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: queryError, refetch } = useQuery<NotificationPreferences>({
    queryKey: ['notificationPreferences', user?.id],
    queryFn: async () => apiProxy<NotificationPreferences>('/notifications/preferences'),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) {
      setPreferences(data);
    }
    if (queryError) {
      const msg = queryError instanceof Error ? queryError.message : 'Error al cargar las preferencias';
      setError(msg);
    }
  }, [data, queryError]);

  const updatePreference = useCallback((key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setError(null);
  }, []);

  const mutation = useMutation<NotificationPreferences, unknown, NotificationPreferences>({
    mutationFn: async (next) =>
      apiProxy<NotificationPreferences>('/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }),
    onSuccess: (updated) => {
      setPreferences(updated);
      queryClient.setQueryData(['notificationPreferences', user?.id], updated);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al guardar las preferencias';
      setError(msg);
    },
  });

  const savePreferences = useCallback(async () => {
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }
    setError(null);
    try {
      await mutation.mutateAsync(preferences);
    } catch (err) {
      throw err as unknown as Error;
    }
  }, [user, preferences, mutation]);

  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    setError(null);
  }, []);

  const refreshPreferences = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const saving = mutation.isPending;
  const loading = isLoading;

  return {
    preferences,
    loading,
    saving,
    error,
    updatePreference,
    savePreferences,
    resetToDefaults,
    refreshPreferences,
  };
}