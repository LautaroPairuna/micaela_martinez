// src/app/(cuenta)/mi-cuenta/perfil/page.tsx
'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getMe, updateMe, type UsuarioMe } from '@/lib/sdk/userApi';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { User, Mail, Shield, CheckCircle, Calendar } from 'lucide-react';


const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres').optional().or(z.literal('').transform(() => undefined)),
});

type FormData = z.infer<typeof schema>;

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<UsuarioMe | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '' },
  });

  useEffect(() => {
    (async () => {
      try {
        const userData = await getMe({ cache: 'no-store' });
        setMe(userData);
        reset({ nombre: userData?.nombre ?? '' });
      } catch (error) {
        console.error('Error al cargar perfil:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [reset]);

  const handleFormSubmit = async (values: FormData) => {
    await updateMe({ nombre: values.nombre });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      
      <PageHeader
        icon={User}
        iconBg="bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)]"
        iconColor="text-black"
        title="Mi Perfil"
        description="Administrá tu información personal y configuración de cuenta"
        stats={me ? [
          {
            label: 'Cuenta activa',
            value: 'Verificada',
            icon: Shield,
            color: 'text-[var(--gold)]',
            bgColor: 'bg-[var(--gold)]/10',
            borderColor: 'border-[var(--gold)]/30'
          },
          {
            label: 'Miembro desde',
            value: '2024',
            icon: Calendar,
            color: 'text-[var(--muted)]',
            bgColor: 'bg-[var(--subtle)]',
            borderColor: 'border-[var(--border)]'
          }
        ] : undefined}
      />

      {loading ? (
        <Card>
          <CardBody className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-[var(--muted)]">Cargando información...</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Información de la cuenta */}
          <div className="lg:col-span-1">
            <Card>
              <CardBody className="space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--gold)]/15 flex items-center justify-center shadow-lg ring-4 ring-[var(--gold)]/40">
                    <span className="text-2xl font-bold text-[var(--gold)]">
                      {(me?.nombre || me?.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold">
                    {me?.nombre || 'Usuario'}
                  </h3>
                  <p className="text-[var(--muted)] text-sm">
                    {me?.email}
                  </p>
                </div>
                
                {/* Componente de tiempo restante de suscripción */}
                {null}
                
                <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-[var(--gold)]" />
                    <span className="text-[var(--muted)]">Email verificado</span>
                    <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span className="text-[var(--muted)]">Cuenta segura</span>
                    <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                  </div>
                </div>
              </CardBody>
            </Card>
            
            {/* Panel de información adicional */}
            <Card>
              <CardBody className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[var(--gold)]/15">
                    <Shield className="h-5 w-5 text-[var(--gold)]" />
                  </div>
                  <h4 className="font-semibold text-[var(--fg)]">
                    Seguridad
                  </h4>
                </div>
                <div className="space-y-3 text-sm text-[var(--muted)]">
                  <p>• Tu información está protegida con encriptación</p>
                  <p>• Solo vos podés modificar estos datos</p>
                  <p>• Los cambios se guardan automáticamente</p>
                </div>
              </CardBody>
            </Card>
            

          </div>

          {/* Formulario de edición */}
          <div className="lg:col-span-2">
            <Card>
              <CardBody>
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
                    <div className="p-2 rounded-xl bg-[var(--gold)]/15">
                      <User className="h-5 w-5 text-[var(--gold)]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--fg)]">Información Personal</h3>
                      <p className="text-[var(--muted)] text-sm">
                        Actualizá tu información personal para personalizar tu experiencia.
                      </p>
                    </div>
                  </div>

                  {success && (
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-xl">
                      <div className="p-1 rounded-full bg-green-500">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Perfil actualizado exitosamente
                      </span>
                    </div>
                  )}

                  <form className="space-y-6" onSubmit={handleSubmit(handleFormSubmit)}>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-[var(--fg)] mb-3">
                          Nombre completo
                        </label>
                        <Input 
                          placeholder="Ingresá tu nombre completo" 
                          {...register('nombre')}
                          className="h-12 text-base transition-all duration-200 focus:ring-2 focus:ring-[var(--pink)]/20 focus:border-[var(--pink)]"
                        />
                        {errors.nombre && (
                          <p className="text-sm text-red-600 mt-2 flex items-center gap-2">
                            <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                            {errors.nombre.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[var(--fg)] mb-3">
                          Dirección de email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--muted)]" />
                          <Input 
                            value={me?.email || ''}
                            disabled
                            className="h-12 pl-11 bg-[var(--subtle)] cursor-not-allowed text-[var(--muted)]"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-2">
                          El email no se puede modificar por razones de seguridad
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-[var(--border)]">
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[var(--gold)] hover:bg-[var(--gold-dark)] text-black font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Guardando...
                          </>
                        ) : (
                          'Guardar cambios'
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => reset({ nombre: me?.nombre ?? '' })}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium border-2 hover:bg-[var(--subtle)] transition-all duration-200"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
