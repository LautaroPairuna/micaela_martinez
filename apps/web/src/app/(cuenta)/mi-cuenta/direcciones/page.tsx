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
import { MapPin, Plus, Star, Trash2, Home, Building, Phone, User, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
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

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

export default function DireccionesPage() {
  const [items, setItems] = useState<Direccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [editingAddress, setEditingAddress] = useState<Direccion | null>(null);

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
    try {
      const rows = await listAddresses({ cache: 'no-store' });
      // Validación defensiva por si la API devuelve un objeto de error o null
      if (Array.isArray(rows)) {
        setItems(rows);
      } else {
        console.error('La respuesta de direcciones no es un array:', rows);
        setItems([]);
      }
      return true;
    } catch (error) {
      console.error('Error al cargar direcciones:', error);
      setItems([]);
      return false;
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const openNew = () => {
    setEditingAddress(null);
    reset({
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
    });
    setIsDialogOpen(true);
  };

  const openEdit = (d: Direccion) => {
    setEditingAddress(d);
    reset({
      nombre: d.nombre,
      telefono: d.telefono || '',
      etiqueta: d.etiqueta || '',
      calle: d.calle,
      numero: d.numero || '',
      pisoDepto: d.pisoDepto || '',
      ciudad: d.ciudad,
      provincia: d.provincia,
      cp: d.cp,
      pais: d.pais || 'AR',
      predeterminada: d.predeterminada,
    });
    setIsDialogOpen(true);
  };

  const onSave = handleSubmit(async (values) => {
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

      if (editingAddress) {
        await upsertAddress({ ...payload, id: editingAddress.id });
      } else {
        await addAddress(payload);
      }
      
      reset();
      await refresh();
      setIsDialogOpen(false);
    } finally {
      setSaving(false);
    }
  });

  const onPredeterminar = async (d: Direccion) => {
    // Limpiar el objeto para enviar solo los campos editables
    const payload: DireccionInput & { id: string } = {
      id: d.id,
      nombre: d.nombre,
      telefono: d.telefono,
      etiqueta: d.etiqueta,
      calle: d.calle,
      numero: d.numero,
      pisoDepto: d.pisoDepto,
      ciudad: d.ciudad,
      provincia: d.provincia,
      cp: d.cp,
      pais: d.pais || 'AR',
      predeterminada: true,
    };
    
    try {
      await upsertAddress(payload);
      await refresh();
    } catch (error) {
      console.error('Error al establecer como predeterminada:', error);
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
            <MapPin className="h-8 w-8 text-[var(--gold)]" />
          </div>
          <div>
            <h1 className="text-3xl font-serif text-white">Mis Direcciones</h1>
            <p className="text-zinc-400 mt-1">Gestiona tus direcciones de envío y facturación</p>
          </div>
        </div>
        
        <Button 
          onClick={openNew}
          className="rounded-xl border border-[var(--gold)] bg-transparent px-4 py-2 text-sm font-bold text-[var(--gold)] hover:bg-[var(--gold)]/10 hover:shadow-[0_0_20px_-5px_var(--gold)] transition-all duration-300"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva dirección
        </Button>
      </div>

      {/* Lista de direcciones */}
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((d) => (
          <div key={d.id} className={cn(
            "group relative overflow-hidden rounded-2xl border transition-all duration-300",
            d.predeterminada 
              ? "bg-[var(--gold)]/5 border-[var(--gold)]/30 shadow-[0_0_30px_-10px_rgba(212,175,55,0.1)]" 
              : "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700"
          )}>
            {/* ... card content ... */}
            <div className="p-6 space-y-4 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl border",
                    d.predeterminada 
                      ? "bg-[var(--gold)]/10 border-[var(--gold)]/30 text-[var(--gold)]" 
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 group-hover:text-white transition-colors"
                  )}>
                    {(d.etiqueta?.toLowerCase().includes('casa') || d.etiqueta?.toLowerCase().includes('hogar')) ? (
                      <Home className="h-5 w-5" />
                    ) : (
                      <Building className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className={cn(
                      "font-semibold text-lg",
                      d.predeterminada ? "text-[var(--gold)]" : "text-white"
                    )}>
                      {d.etiqueta || 'Dirección'}
                    </h3>
                    {d.predeterminada && (
                      <span className="text-xs font-medium text-[var(--gold)]/80 flex items-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-[var(--gold)]/80" />
                        Predeterminada
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button 
                    onClick={() => openEdit(d)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-all duration-200 border border-blue-500/20 hover:border-blue-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    title="Editar dirección"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {!d.predeterminada && (
                    <button 
                      className="p-2 text-[var(--gold)] hover:text-[var(--gold)] hover:bg-[var(--gold)]/10 rounded-xl transition-all duration-200 border border-[var(--gold)]/30 hover:border-[var(--gold)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40"
                      onClick={() => onPredeterminar(d)}
                      title="Marcar como predeterminada"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => onDelete(d.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 border border-red-500/20 hover:border-red-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                    title="Eliminar dirección"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Información de la dirección */}
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--pink)]/10 border border-[var(--pink)]/20">
                    <MapPin className="h-4 w-4 text-[var(--pink)]" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Destinatario</p>
                    <p className="text-sm text-zinc-300">{d.nombre}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <MapPin className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Dirección</p>
                    <p className="text-sm text-zinc-300">
                      {d.calle} {d.numero} {d.pisoDepto ? `(${d.pisoDepto})` : ''}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {d.ciudad}, {d.provincia} ({d.cp})
                    </p>
                  </div>
                </div>

                {d.telefono && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <Phone className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Contacto</p>
                      <p className="text-sm text-zinc-300">{d.telefono}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Editar dirección' : 'Nueva dirección'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={onSave} className="space-y-6 mt-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-6">
              <div className="p-2 rounded-xl bg-[var(--pink)]/10 border border-[var(--pink)]/20">
                {editingAddress ? (
                  <Pencil className="h-5 w-5 text-[var(--pink)]" />
                ) : (
                  <Plus className="h-5 w-5 text-[var(--pink)]" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Detalles de envío</h3>
                <p className="text-sm text-zinc-400">
                  {editingAddress ? 'Modifica los datos de tu dirección' : 'Ingresa los datos para la nueva dirección'}
                </p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input label="Nombre del destinatario" {...register('nombre')} />
                {errors.nombre && <p className="text-sm text-red-400 mt-1">{errors.nombre.message}</p>}
              </div>
              <div>
                <Input label="Teléfono (Opcional)" {...register('telefono')} />
              </div>
            </div>
            
            <div>
              <Input label="Etiqueta (ej: Casa, Trabajo, etc.) (Opcional)" {...register('etiqueta')} />
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <Input label="Calle" {...register('calle')} />
                {errors.calle && <p className="text-sm text-red-400 mt-1">{errors.calle.message}</p>}
              </div>
              <div>
                <Input label="Número (Opcional)" {...register('numero')} />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Input label="Piso / Depto (Opcional)" {...register('pisoDepto')} />
              </div>
              <div className="md:col-span-2">
                <Input label="Ciudad" {...register('ciudad')} />
                {errors.ciudad && <p className="text-sm text-red-400 mt-1">{errors.ciudad.message}</p>}
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input label="Provincia" {...register('provincia')} />
                {errors.provincia && <p className="text-sm text-red-400 mt-1">{errors.provincia.message}</p>}
              </div>
              <div>
                <Input label="Código Postal" {...register('cp')} />
                {errors.cp && <p className="text-sm text-red-400 mt-1">{errors.cp.message}</p>}
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <input 
                id="pred" 
                type="checkbox" 
                {...register('predeterminada')}
                className="w-4 h-4 text-[var(--gold)] bg-zinc-800 border-zinc-700 rounded focus:ring-[var(--gold)] focus:ring-2"
              />
              <label htmlFor="pred" className="text-sm font-medium text-zinc-300 cursor-pointer">
                Marcar como dirección predeterminada
              </label>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-zinc-800">
              <Button 
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="flex-1 rounded-xl border border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)] hover:bg-[var(--gold)]/20 font-bold"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--gold)] mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    {editingAddress ? (
                      <Pencil className="h-4 w-4 mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {editingAddress ? 'Guardar cambios' : 'Guardar dirección'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
