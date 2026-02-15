'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Settings, Save, RotateCcw, ArrowLeft, Shield, MessageSquare, Heart, Percent } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import useAuth from '@/hooks/useAuth';
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
    <div className="flex items-start gap-5 p-5 rounded-xl border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 transition-all duration-300 group">
      <div className="flex-shrink-0 p-3 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:border-[var(--gold)]/30 transition-colors">
        <Icon className="h-6 w-6 text-zinc-400 group-hover:text-[var(--gold)] transition-colors" />
      </div>
      <div className="flex-1 min-w-0 pt-1.5">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-base font-medium text-zinc-200 group-hover:text-white transition-colors">{label}</h4>
            <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              id={id}
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className={cn(
              "relative w-11 h-6 rounded-full peer transition-all duration-300 ease-in-out",
              "peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--gold)]/20",
              checked 
                ? "bg-[var(--gold)]" 
                : "bg-zinc-700 hover:bg-zinc-600",
              disabled && "opacity-50 cursor-not-allowed"
            )}>
              <div className={cn(
                "absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform duration-300 ease-out shadow-sm",
                checked ? "transform translate-x-5" : ""
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

  const { isAdmin, isStaff } = useAuth();
  const isModerator = isAdmin() || isStaff();

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
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="h-20 bg-zinc-900/50 rounded-2xl border border-zinc-800" />
        <div className="h-96 bg-zinc-900/50 rounded-2xl border border-zinc-800" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col gap-8">
        <Link 
          href="/mi-cuenta/notificaciones"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-[var(--gold)] transition-colors w-fit px-2 py-1 -ml-2 rounded-lg hover:bg-zinc-900/50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Volver a notificaciones</span>
        </Link>
        
        <div className="flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl shadow-black/20">
            <Settings className="h-10 w-10 text-[var(--gold)]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-serif text-white tracking-tight">Configuración</h1>
            <p className="text-lg text-zinc-400">Personaliza tu experiencia y alertas según tus preferencias</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-900/50 bg-red-900/10 text-red-400 flex items-center gap-3">
          <Shield className="h-5 w-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl border border-green-900/50 bg-green-900/10 text-green-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <Save className="h-5 w-5" />
          <p className="text-sm font-medium">Preferencias guardadas correctamente</p>
        </div>
      )}

      <div className="space-y-10">
        <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl p-8 md:p-10 space-y-8 shadow-sm">
          <div className="flex items-center gap-4 pb-6 border-b border-zinc-800/50">
            <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <MessageSquare className="h-6 w-6 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white">Reseñas y comentarios</h3>
              <p className="text-sm text-zinc-500 mt-1">Actividad sobre tus reseñas y respuestas</p>
            </div>
          </div>

          <div className="grid gap-6 lg:gap-8 md:grid-cols-2">
            <PreferenceToggle
              id="likesResena"
              label="Likes en tus reseñas"
              description="Avisos cuando alguien le da me gusta a tu reseña."
              icon={Heart}
              checked={preferences.likesResena || false}
              onChange={(checked) => updatePreference('likesResena', checked)}
            />

            <PreferenceToggle
              id="respuestaResena"
              label="Comentarios y respuestas"
              description="Cuando alguien comenta tu reseña o responde a tu comentario."
              icon={MessageSquare}
              checked={preferences.respuestaResena || false}
              onChange={(checked) => updatePreference('respuestaResena', checked)}
            />
          </div>
        </div>

        <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl p-8 md:p-10 space-y-8 shadow-sm">
          <div className="flex items-center gap-4 pb-6 border-b border-zinc-800/50">
            <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <Percent className="h-6 w-6 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white">Favoritos</h3>
              <p className="text-sm text-zinc-500 mt-1">Avisos cuando hay descuentos en tus favoritos</p>
            </div>
          </div>

          <div className="grid gap-6 lg:gap-8 md:grid-cols-2">
            <PreferenceToggle
              id="descuentosFavoritos"
              label="Descuentos en favoritos"
              description="Cuando un producto favorito baja de precio."
              icon={Percent}
              checked={preferences.descuentosFavoritos || false}
              onChange={(checked) => updatePreference('descuentosFavoritos', checked)}
            />
          </div>
        </div>

        {isModerator && (
           <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl p-8 md:p-10 space-y-8 border-l-4 border-l-red-500 shadow-sm">
            <div className="flex items-center gap-4 pb-6 border-b border-zinc-800/50">
              <div className="p-2 rounded-lg bg-red-900/10 border border-red-900/30">
                <Shield className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-medium text-white">Administración</h3>
                <p className="text-sm text-zinc-500 mt-1">Notificaciones del sistema de administración</p>
              </div>
            </div>
            
            <div className="grid gap-6 lg:gap-8 md:grid-cols-2">
              <PreferenceToggle
                id="actualizacionesSistema"
                label="Actualizaciones del sistema"
                description="Eventos y cambios registrados en el panel de administración."
                icon={Shield}
                checked={preferences.actualizacionesSistema || false}
                onChange={(checked) => updatePreference('actualizacionesSistema', checked)}
              />
            </div>
          </div>
        )}

      </div>

      <div className="bg-zinc-950/80 border border-zinc-800 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 sticky bottom-6 shadow-2xl backdrop-blur-xl">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900 w-full sm:w-auto"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar valores
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 font-medium px-8"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
    </div>
  );
}
