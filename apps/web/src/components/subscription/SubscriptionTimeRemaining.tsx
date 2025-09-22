'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface SubscriptionTimeRemainingProps {
  nextPaymentDate?: string | null;
  isActive?: boolean;
  className?: string;
}

export function SubscriptionTimeRemaining({
  nextPaymentDate,
  isActive = false,
  className,
}: SubscriptionTimeRemainingProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
  } | null>(null);
  
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!nextPaymentDate || !isActive) {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const paymentDate = new Date(nextPaymentDate);
      
      // Si la fecha de pago ya pasó
      if (paymentDate < now) {
        setIsExpired(true);
        setTimeRemaining(null);
        return;
      }
      
      setIsExpired(false);
      
      // Calcular diferencia en milisegundos
      const diffMs = paymentDate.getTime() - now.getTime();
      
      // Convertir a días, horas, minutos
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining({ days, hours, minutes });
    };

    // Calcular inicialmente
    calculateTimeRemaining();
    
    // Actualizar cada minuto
    const interval = setInterval(calculateTimeRemaining, 60000);
    
    return () => clearInterval(interval);
  }, [nextPaymentDate, isActive]);

  if (!isActive) {
    return null;
  }

  return (
    <Card className={cn("border-[var(--border)] bg-[var(--bg-secondary)]", className)}>
      <CardContent className="p-4">
        {isExpired ? (
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Suscripción vencida</p>
              <p className="text-sm text-[var(--muted)]">
                Tu próximo pago está pendiente
              </p>
            </div>
          </div>
        ) : timeRemaining ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-[var(--gold)]" />
              <h3 className="font-medium">Tiempo restante de suscripción</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[var(--bg-hover)] rounded-md p-2">
                <p className="text-xl font-bold text-[var(--gold)]">{timeRemaining.days}</p>
                <p className="text-xs text-[var(--muted)]">días</p>
              </div>
              <div className="bg-[var(--bg-hover)] rounded-md p-2">
                <p className="text-xl font-bold text-[var(--gold)]">{timeRemaining.hours}</p>
                <p className="text-xs text-[var(--muted)]">horas</p>
              </div>
              <div className="bg-[var(--bg-hover)] rounded-md p-2">
                <p className="text-xl font-bold text-[var(--gold)]">{timeRemaining.minutes}</p>
                <p className="text-xs text-[var(--muted)]">min</p>
              </div>
            </div>
            
            <p className="text-xs text-[var(--muted)] text-center">
              Próximo pago: {nextPaymentDate ? new Date(nextPaymentDate).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }) : 'No disponible'}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center p-2">
            <p className="text-sm text-[var(--muted)]">Cargando información...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}