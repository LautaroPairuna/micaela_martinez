// src/components/checkout/AddressForm.tsx
'use client';

import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { addAddress, type Direccion, type DireccionInput } from '@/lib/sdk/userApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MapPin, Save, X } from 'lucide-react';

const schema = z.object({
  nombre: z.string().min(2, 'Ingresá el nombre del destinatario'),
  telefono: z.string().optional(),
  etiqueta: z.string().optional(),
  calle: z.string().min(2, 'Calle requerida'),
  numero: z.string().optional(),
  pisoDepto: z.string().optional(),
  ciudad: z.string().min(2, 'Ciudad requerida'),
  provincia: z.string().min(2, 'Provincia requerida'),
  cp: z.string().min(3, 'CP requerido'),
  pais: z.string().optional(),
  predeterminada: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface AddressFormProps {
  onSave: (address: Direccion) => void;
  onCancel: () => void;
}

export function AddressForm({ onSave, onCancel }: AddressFormProps) {
  const [saving, setSaving] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      pais: 'AR',
      predeterminada: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    
    try {
      const input: DireccionInput = {
        nombre: data.nombre,
        telefono: data.telefono || undefined,
        etiqueta: data.etiqueta || undefined,
        calle: data.calle,
        numero: data.numero || undefined,
        pisoDepto: data.pisoDepto || undefined,
        ciudad: data.ciudad,
        provincia: data.provincia,
        cp: data.cp,
        pais: data.pais || 'AR',
        predeterminada: data.predeterminada || false,
      };
      
      const newAddress = await addAddress(input);
      onSave(newAddress);
    } catch (error: unknown) {
      console.error('Error saving address:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar la dirección';
      setError('root', {
        message: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-[var(--pink)]" />
            </div>
            <div>
              <h3 className="font-medium text-white">
                Nueva dirección
              </h3>
              <p className="text-sm text-zinc-400">
                Agregá una nueva dirección de facturación
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Información del destinatario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Nombre completo *
              </label>
              <Input
                {...register('nombre')}
                placeholder="Ej: Juan Pérez"
                error={errors.nombre?.message}
                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[var(--pink)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Teléfono
              </label>
              <Input
                {...register('telefono')}
                placeholder="Ej: +54 11 1234-5678"
                error={errors.telefono?.message}
                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[var(--pink)]"
              />
            </div>
          </div>

          {/* Etiqueta */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Etiqueta (opcional)
            </label>
            <Input
              {...register('etiqueta')}
              placeholder="Ej: Casa, Trabajo, etc."
              error={errors.etiqueta?.message}
              className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[var(--pink)]"
            />
          </div>

          {/* Dirección */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Calle *
              </label>
              <Input
                {...register('calle')}
                placeholder="Ej: Av. Corrientes"
                error={errors.calle?.message}
                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[var(--pink)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Número
              </label>
              <Input
                {...register('numero')}
                placeholder="Ej: 1234"
                error={errors.numero?.message}
                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[var(--pink)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Piso/Depto (opcional)
            </label>
            <Input
              {...register('pisoDepto')}
              placeholder="Ej: 5° A"
              error={errors.pisoDepto?.message}
              className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[var(--pink)]"
            />
          </div>

          {/* Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Ciudad *
              </label>
              <Input
                {...register('ciudad')}
                placeholder="Ej: Buenos Aires"
                error={errors.ciudad?.message}
                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[var(--pink)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Provincia *
              </label>
              <Input
                {...register('provincia')}
                placeholder="Ej: CABA"
                error={errors.provincia?.message}
                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[var(--pink)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Código Postal *
              </label>
              <Input
                {...register('cp')}
                placeholder="Ej: 1001"
                error={errors.cp?.message}
                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[var(--pink)]"
              />
            </div>
          </div>

          {/* País */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              País
            </label>
            <select
              {...register('pais')}
              className="w-full px-3 py-2 border border-zinc-800 rounded-lg bg-zinc-950 text-white focus:ring-2 focus:ring-[var(--pink)]/20 focus:border-[var(--pink)]"
            >
              <option value="AR">Argentina</option>
            </select>
          </div>

          {/* Predeterminada */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('predeterminada')}
                className="w-4 h-4 text-[var(--pink)] border-zinc-700 rounded focus:ring-[var(--pink)] focus:ring-2 bg-zinc-950"
              />
              <span className="text-white">
                Establecer como dirección predeterminada
              </span>
            </label>
          </div>

          {/* Error general */}
          {errors.root && (
            <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg">
              <p className="text-sm text-red-400">
                {errors.root.message}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
              className="text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-black font-semibold px-6 py-2 hover:shadow-lg transition-all duration-200"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar dirección
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
