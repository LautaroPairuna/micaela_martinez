// src/components/courses/SubscriptionStatus.tsx
import React, { useState, useEffect } from 'react';
import { fetchSubscriptionInfo } from '../../lib/courses';
import { Badge } from '@/components/ui/Pill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CalendarIcon, ClockIcon, CheckCircleIcon } from 'lucide-react';

interface SubscriptionStatusProps {
  courseId: string;
}

interface SubscriptionInfo {
  isPermanent: boolean;
  hasAccess: boolean;
  expirationDate?: string | null; // usado sólo cuando hasAccess && !isPermanent
  daysLeft?: number;              // idem
}

export function SubscriptionStatus({ courseId }: SubscriptionStatusProps) {
  const [data, setData] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadSubscriptionInfo = async () => {
      try {
        setIsLoading(true);
        const result = await fetchSubscriptionInfo(courseId);
        // Si fetchSubscriptionInfo devuelve más campos, los ignoramos.
        // Mapeamos a nuestro contrato mínimo.
        const normalized: SubscriptionInfo = {
          isPermanent: Boolean(result?.isPermanent),
          hasAccess: Boolean(result?.hasAccess),
          expirationDate: result?.expirationDate ?? null,
          daysLeft:
            typeof result?.daysLeft === 'number' ? result.daysLeft : undefined,
        };
        setData(normalized);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error desconocido'));
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionInfo();
  }, [courseId]);

  if (isLoading) {
    return (
      <Card className="w-full bg-muted/30">
        <CardContent className="p-4">
          <div className="h-16 animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  // Si el acceso es permanente
  if (data.isPermanent) {
    return (
      <Card className="w-full border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-300">
              Acceso permanente
            </p>
            <p className="text-sm text-green-700/80 dark:text-green-400/80">
              Tienes acceso ilimitado a este curso
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si no tiene acceso
  if (!data.hasAccess) {
    return (
      <Card className="w-full border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-4">
          <p className="font-medium text-red-800 dark:text-red-300">
            Suscripción vencida
          </p>
          <p className="text-sm text-red-700/80 dark:text-red-400/80 mt-1">
            Tu suscripción ha expirado. Renueva para seguir accediendo al
            contenido.
          </p>
          <button className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors">
            Renovar suscripción
          </button>
        </CardContent>
      </Card>
    );
  }

  // Si tiene acceso activo
  const expiration = data.expirationDate
    ? new Date(data.expirationDate)
    : null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          Estado de suscripción
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Activa
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {expiration && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <CalendarIcon className="h-4 w-4" />
            <span>
              Vence el{' '}
              {expiration.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
        {typeof data.daysLeft === 'number' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <ClockIcon className="h-4 w-4" />
            <span>
              {data.daysLeft === 1
                ? '1 día restante'
                : `${data.daysLeft} días restantes`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
