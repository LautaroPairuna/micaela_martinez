'use client';

import { useEffect, useState } from 'react';
import {
  listAddresses,
  addAddress,
  upsertAddress,          // 👈 para predeterminar (upsert con id)
  removeAddress,
  type Direccion,
  type DireccionInput,
} from '@/lib/sdk/userApi';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { MapPin, Plus, Star, Trash2, Home, Building, Phone } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

const schema = z.object({
  nombre: z.string().min(2, 'Ingresá el nombre del destinatario'),
  telefono: z.string().optional(),
  etiqueta: z.string().optional().nullable(),
  calle: z.string().min(2, 'Calle requerida'),
  numero: z.string().optional().nullable(),
  pisoDepto: z.string().optional().nullable(),
  ciudad: z.string().min(2, 'Ciudad requerida'),
  provincia: z.string().min(2, 'Provincia requerida'),
  cp: z.string().min(3, 'CP requerido'),
  pais: z.string().optional(),
  predeterminada: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function DireccionesPage() {
  const [items, setItems] = useState<Direccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '',
      telefono: '',
      etiqueta: '',
      calle: '',
      numero: '',
      pisoDepto: '',
      ciudad: '',
      provincia: '',
      cp: '',
      pais: 'AR',
      predeterminada: false,
    }
  });

  const refresh = async () => {
    const rows = await listAddresses();
    setItems(rows);
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const onCreate = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const payload: DireccionInput = {
        ...values,
        etiqueta: values.etiqueta ?? null,
        numero: values.numero ?? null,
        pisoDepto: values.pisoDepto ?? null,
        pais: values.pais || 'AR',
        predeterminada: !!values.predeterminada,
      };
      await addAddress(payload);
      reset();
      await refresh();
    } finally {
      setSaving(false);
    }
  });

  const onPredeterminar = async (d: Direccion) => {
    // upsert con id + predeterminada true; el backend desmarca las otras
    await upsertAddress({ ...d, id: d.id, predeterminada: true });
    await refresh();
  };

  const onDelete = async (id: string) => {
    try {
      await removeAddress(id);
      await refresh();
    } catch (error) {
      console.error('Error al eliminar dirección:', error);
      // Aún así refrescar para verificar si se eliminó
      await refresh();
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mis Direcciones"
        description="Administrá tus direcciones de facturación para facilitar tus compras"
        icon={MapPin}
        stats={[
          {
            label: "Total de direcciones",
            value: items.length.toString(),
            icon: MapPin,
            color: 'text-[var(--gold)]',
            bgColor: 'bg-[var(--gold)]/10',
            borderColor: 'border-[var(--gold)]/30'
          },
          {
            label: "Dirección predeterminada",
            value: items.filter(d => d.predeterminada).length > 0 ? "Configurada" : "Sin configurar",
            icon: Star,
            color: 'text-[var(--muted)]',
            bgColor: 'bg-[var(--subtle)]',
            borderColor: 'border-[var(--border)]'
          }
        ]}
      />

      {loading ? (
        <Card>
          <CardBody className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-[var(--muted)]">Cargando direcciones...</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Lista de direcciones */}
          {items.length === 0 ? (
            <Card>
              <CardBody className="text-center py-16">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/10 flex items-center justify-center shadow-lg">
                    <MapPin className="h-10 w-10 text-[var(--gold)]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-[var(--fg)]">
                      No tenés direcciones guardadas
                    </h3>
                    <p className="text-[var(--muted)]">
                      Agregá una dirección para facilitar tus compras futuras.
                    </p>
                  </div>
                  <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-black font-bold rounded-xl hover:shadow-lg transition-all duration-200">
                    <Plus className="h-4 w-4" />
                    Agregar primera dirección
                  </button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {items.map(d => (
                <Card key={d.id} className="group hover:shadow-lg hover:border-[var(--gold)]/30 transition-all duration-200">
                  <CardBody className="space-y-4">
                    {/* Header de la dirección */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/10 flex items-center justify-center group-hover:from-[var(--gold)]/30 group-hover:to-[var(--gold)]/20 transition-colors">
                          {d.etiqueta?.toLowerCase().includes('casa') || d.etiqueta?.toLowerCase().includes('hogar') ? (
                            <Home className="h-6 w-6 text-[var(--gold)]" />
                          ) : (
                            <Building className="h-6 w-6 text-[var(--gold)]" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[var(--fg)] text-lg">{d.nombre}</h3>
                            {d.predeterminada && (
                              <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-[var(--gold)]/20 to-[var(--gold)]/10 text-[var(--gold)] text-xs font-bold border border-[var(--gold)]/30">
                                <Star className="h-3 w-3 fill-current" />
                                Predeterminada
                              </div>
                            )}
                          </div>
                          {d.etiqueta && (
                            <p className="text-sm text-[var(--muted)] font-medium">{d.etiqueta}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Acciones */}
                      <div className="flex gap-2">
                        {!d.predeterminada && (
                          <button 
                            className="p-2 text-[var(--gold)] hover:text-[var(--gold-dark)] hover:bg-[var(--gold)]/10 rounded-xl transition-all duration-200 border border-[var(--gold)]/30 hover:border-[var(--gold)]"
                            onClick={() => onPredeterminar(d)}
                            title="Marcar como predeterminada"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => onDelete(d.id)}
                          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700"
                          title="Eliminar dirección"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Información de la dirección */}
                    <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-sm">
                          <p className="font-bold text-[var(--fg)]">{d.calle} {d.numero ?? ''} {d.pisoDepto ?? ''}</p>
                          <p className="text-[var(--fg)]">{d.ciudad}, {d.provincia} ({d.cp})</p>
                          <p className="text-[var(--muted)]">{d.pais}</p>
                        </div>
                      </div>
                      
                      {d.telefono && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-sm font-bold text-[var(--fg)]">{d.telefono}</span>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
          
          {/* Formulario para nueva dirección */}
          <Card>
            <CardBody>
              <form className="space-y-6" onSubmit={onCreate}>
                <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200">
                    <Plus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--fg)]">Nueva dirección</h3>
                    <p className="text-sm text-[var(--muted)]">Agregá una nueva dirección de facturación</p>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Input label="Nombre del destinatario" {...register('nombre')} />
                    {errors.nombre && <p className="text-sm text-red-600 mt-1">{errors.nombre.message}</p>}
                  </div>
                  <div>
                    <Input label="Teléfono" {...register('telefono')} />
                  </div>
                </div>
                
                <div>
                  <Input label="Etiqueta (ej: Casa, Trabajo, etc.)" {...register('etiqueta')} />
                </div>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Input label="Calle" {...register('calle')} />
                    {errors.calle && <p className="text-sm text-red-600 mt-1">{errors.calle.message}</p>}
                  </div>
                  <div>
                    <Input label="Número" {...register('numero')} />
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Input label="Piso/Depto" {...register('pisoDepto')} />
                  </div>
                  <div>
                    <Input label="Código Postal" {...register('cp')} />
                    {errors.cp && <p className="text-sm text-red-600 mt-1">{errors.cp.message}</p>}
                  </div>
                  <div>
                    <Input label="Ciudad" {...register('ciudad')} />
                    {errors.ciudad && <p className="text-sm text-red-600 mt-1">{errors.ciudad.message}</p>}
                  </div>
                </div>
                
                <div>
                  <Input label="Provincia" {...register('provincia')} />
                  {errors.provincia && <p className="text-sm text-red-600 mt-1">{errors.provincia.message}</p>}
                </div>
                
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--subtle)]">
                  <input 
                    id="pred" 
                    type="checkbox" 
                    {...register('predeterminada')}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <label htmlFor="pred" className="text-sm font-medium text-[var(--fg)] cursor-pointer">
                    Marcar como dirección predeterminada
                  </label>
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar dirección
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => reset()}
                    className="px-6 py-2.5 rounded-xl transition-all duration-200"
                  >
                    Limpiar
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
