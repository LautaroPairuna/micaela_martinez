'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiProxy<NotificationPreferences>('/notifications/preferences');
      setPreferences(response);
    } catch (err) {
      console.error('Error loading notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar las preferencias');
      // Mantener valores por defecto en caso de error
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updatePreference = useCallback((key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setError(null);
  }, []);

  const savePreferences = useCallback(async () => {
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const response = await apiProxy<NotificationPreferences>('/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      // Actualizar con la respuesta del servidor
      setPreferences(response);
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar las preferencias');
      throw err; // Re-throw para que el componente pueda manejarlo
    } finally {
      setSaving(false);
    }
  }, [user, preferences]);

  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    setError(null);
  }, []);

  const refreshPreferences = useCallback(async () => {
    await fetchPreferences();
  }, [fetchPreferences]);

  // Cargar preferencias al montar el componente
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

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