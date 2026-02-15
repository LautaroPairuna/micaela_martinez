'use client';

import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ShoppingCart, BookOpen, Lock } from 'lucide-react';
import Link from 'next/link';

interface ReviewPermissionGuardProps {
  type: 'curso' | 'producto';
  itemId: string;
  itemTitle?: string;
  children: React.ReactNode;
  hasPermission?: boolean;
  isLoading?: boolean;
  sessionLoading?: boolean;
}

export function ReviewPermissionGuard({
  type,
  itemId,
  itemTitle,
  children,
  hasPermission,
  isLoading = false,
  sessionLoading = false
}: ReviewPermissionGuardProps) {
  const { me } = useSession();

  // Si la sesión está cargando, mostrar skeleton
  if (sessionLoading) {
    return (
      <Card>
        <CardBody className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Si no hay usuario, mostrar mensaje de login
  if (!me) {
    return (
      <Card className="border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <CardBody className="p-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[var(--pink)]/10 ring-1 ring-[var(--pink)]/20">
            <Lock className="h-6 w-6 text-[var(--pink)]" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-white">
            Inicia sesión para reseñar
          </h3>
          <p className="mx-auto mb-6 max-w-md text-zinc-400">
            Debes iniciar sesión para poder escribir una reseña de este {type === 'curso' ? 'curso' : 'producto'} y compartir tu experiencia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              asChild 
              variant="ghost" 
              className="w-full sm:w-auto min-w-[140px] border !border-[var(--pink)] !text-[var(--pink)] font-bold text-base px-6 py-2.5 rounded-xl hover:!bg-[var(--pink)]/10 hover:!border-[var(--pink)] hover:!text-[var(--pink)] hover:shadow-[0_0_20px_-5px_var(--pink)] hover:scale-[1.02] transition-all duration-300 !ring-0 !ring-offset-0 !outline-none focus:!ring-0 focus-visible:!ring-0"
            >
              <Link href="/auth/login">
                Iniciar Sesión
              </Link>
            </Button>
            <Button 
              asChild 
              variant="ghost" 
              className="w-full sm:w-auto min-w-[140px] border border-zinc-700 text-zinc-300 font-bold text-base px-6 py-2.5 rounded-xl hover:bg-zinc-800 hover:border-zinc-500 hover:text-white hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.1)] hover:scale-[1.02] transition-all duration-300 !ring-0 !ring-offset-0 !outline-none"
            >
              <Link href="/auth/register">
                Registrarse
              </Link>
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <Card>
        <CardBody className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Si no tiene permisos, mostrar mensaje de compra/inscripción
  if (hasPermission === false) {
    const isCourse = type === 'curso';
    const actionText = isCourse ? 'inscribirte' : 'comprarlo';
    const actionIcon = isCourse ? BookOpen : ShoppingCart;
    const ActionIcon = actionIcon;

    return (
      <Card className="border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <CardBody className="p-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[var(--gold)]/10 ring-1 ring-[var(--gold)]/20">
            <ActionIcon className="h-6 w-6 text-[var(--gold)]" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-white">
            {isCourse ? 'Inscríbete para reseñar' : 'Compra para reseñar'}
          </h3>
          <p className="mx-auto mb-2 max-w-md text-zinc-400">
            Para escribir una reseña de {itemTitle ? `"${itemTitle}"` : `este ${type}`}, 
            primero debes {actionText}.
          </p>
          <p className="mx-auto mb-6 max-w-md text-sm text-zinc-500">
            Solo los {isCourse ? 'estudiantes inscritos' : 'compradores verificados'} pueden 
            escribir reseñas para garantizar la autenticidad de las opiniones.
          </p>
          <div className="flex justify-center">
            <Button 
              asChild 
              variant="ghost" 
              className="w-full sm:w-auto min-w-[140px] border !border-[var(--gold)] !text-[var(--gold)] font-bold text-base px-6 py-2.5 rounded-xl hover:!bg-[var(--gold)]/10 hover:!border-[var(--gold)] hover:!text-[var(--gold)] hover:shadow-[0_0_20px_-5px_var(--gold)] hover:scale-[1.02] transition-all duration-300 !ring-0 !ring-offset-0 !outline-none focus:!ring-0 focus-visible:!ring-0"
            >
              <Link href={isCourse ? `/cursos/detalle/${itemId}` : `/tienda/producto/${itemId}`}>
                {isCourse ? 'Ver Curso' : 'Ver Producto'}
              </Link>
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Si tiene permisos o no se ha verificado aún, mostrar el contenido
  return <>{children}</>;
}