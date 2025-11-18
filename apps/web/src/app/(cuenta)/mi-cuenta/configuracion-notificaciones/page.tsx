'use client';

import React, { useState } from 'react';
import { Settings, Bell, Mail, Save, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { cn } from '@/lib/utils';

interface PreferenceToggleProps {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function PreferenceToggle({ id, label, description, icon: Icon, checked, onChange, disabled }: PreferenceToggleProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-[var(--border)] hover:bg-[var(--subtle)] transition-colors">
      <div className="flex-shrink-0 p-2 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/20">
        <Icon className="h-5 w-5 text-[var(--gold)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-[var(--fg)]">{label}</h4>
            <p className="text-sm text-[var(--muted)] mt-1">{description}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id={id}
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className={cn(
              "relative w-11 h-6 rounded-full peer transition-colors duration-200 ease-in-out",
              "peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--pink)]/20",
              checked 
                ? "bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)]" 
                : "bg-[var(--border)]",
              disabled && "opacity-50 cursor-not-allowed"
            )}>
              <div className={cn(
                "absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform duration-200 ease-in-out",
                checked ? "transform translate-x-5" : "",
                "shadow-sm"
              )} />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

export default function NotificationSettingsPage() {
  const {
    preferences,
    loading,
    saving,
    error,
    updatePreference,
    savePreferences,
    resetToDefaults,
  } = useNotificationPreferences();
  
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    try {
      await savePreferences();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // Error ya manejado por el hook
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setSuccess(false);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          icon={Settings}
          iconBg="bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)]"
          iconColor="text-black"
          title="Configuración de Notificaciones"
          description="Personaliza qué notificaciones quieres recibir y cómo"
        />
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--gold)]" />
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Settings}
        iconBg="bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)]"
        iconColor="text-black"
        title="Configuración de Notificaciones"
        description="Personaliza qué notificaciones quieres recibir y cómo"
      />

      {error && (
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 rounded-full bg-red-100">
                <Bell className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium">{error}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {success && (
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3 text-green-600">
              <div className="p-2 rounded-full bg-green-100">
                <Save className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium">Preferencias guardadas correctamente</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Notificaciones Esenciales */}
      <Card>
        <CardBody>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--fg)]">Notificaciones Esenciales</h3>
                <p className="text-sm text-[var(--muted)]">Configuraciones básicas de notificaciones</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <PreferenceToggle
                id="nuevaResena"
                label="Nuevas reseñas"
                description="Recibir notificaciones cuando alguien deje una nueva reseña"
                icon={Bell}
                checked={preferences.nuevaResena || false}
                onChange={(checked) => updatePreference('nuevaResena', checked)}
              />
              
              <PreferenceToggle
                id="respuestaResena"
                label="Respuestas a reseñas"
                description="Recibir notificaciones cuando alguien responda a tus reseñas"
                icon={Mail}
                checked={preferences.respuestaResena || false}
                onChange={(checked) => updatePreference('respuestaResena', checked)}
              />
              
              <PreferenceToggle
                id="actualizacionesSistema"
                label="Actualizaciones del sistema"
                description="Recibir avisos sobre nuevos módulos y contenido actualizado"
                icon={Settings}
                checked={preferences.actualizacionesSistema || false}
                onChange={(checked) => updatePreference('actualizacionesSistema', checked)}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Botones de acción */}
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar valores por defecto
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] hover:from-[var(--gold-dark)] hover:to-[var(--gold)] text-black font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar preferencias
                </>
              )}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}