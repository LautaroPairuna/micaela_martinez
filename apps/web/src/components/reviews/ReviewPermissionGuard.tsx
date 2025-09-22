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
      <Card className="border-amber-200 bg-amber-50">
        <CardBody className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">
              Inicia sesión para reseñar
            </h3>
          </div>
          <p className="text-amber-700 mb-4">
            Debes iniciar sesión para poder escribir una reseña de este {type === 'curso' ? 'curso' : 'producto'}.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="solid" size="sm">
              <Link href="/auth/login">
                Iniciar Sesión
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
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
      <Card className="border-blue-200 bg-blue-50">
        <CardBody className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <ActionIcon className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">
              {isCourse ? 'Inscríbete para reseñar' : 'Compra para reseñar'}
            </h3>
          </div>
          <p className="text-blue-700 mb-4">
            Para escribir una reseña de {itemTitle ? `"${itemTitle}"` : `este ${type}`}, 
            primero debes {actionText}.
          </p>
          <p className="text-sm text-blue-600 mb-4">
            Solo los {isCourse ? 'estudiantes inscritos' : 'compradores verificados'} pueden 
            escribir reseñas para garantizar la autenticidad de las opiniones.
          </p>
          <Button asChild variant="solid" size="sm">
            <Link href={isCourse ? `/cursos/detalle/${itemId}` : `/tienda/producto/${itemId}`}>
              {isCourse ? 'Ver Curso' : 'Ver Producto'}
            </Link>
          </Button>
        </CardBody>
      </Card>
    );
  }

  // Si tiene permisos o no se ha verificado aún, mostrar el contenido
  return <>{children}</>;
}