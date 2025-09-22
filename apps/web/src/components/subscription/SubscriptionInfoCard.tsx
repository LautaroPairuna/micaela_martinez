'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CalendarIcon, ClockIcon, RefreshCcw } from 'lucide-react';
import { SubscriptionCancelButton } from './SubscriptionCancelButton';
import { formatDate } from '@/lib/utils/date';

interface SubscriptionInfoCardProps {
  subscriptionInfo: {
    isActive: boolean;
    nextPaymentDate: string | null;
    subscriptionId: string | null;
    frequency: string | null;
    frequencyType: string | null;
    orderId?: string | null;
  };
  onSubscriptionCancelled?: () => void;
}

export function SubscriptionInfoCard({ 
  subscriptionInfo, 
  onSubscriptionCancelled 
}: SubscriptionInfoCardProps) {
  const [isCancelled, setIsCancelled] = useState(false);

  if (!subscriptionInfo.isActive && !isCancelled) {
    return null;
  }

  const handleCancelled = () => {
    setIsCancelled(true);
    if (onSubscriptionCancelled) {
      onSubscriptionCancelled();
    }
  };

  return (
    <Card className="w-full border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCcw className="h-5 w-5 text-primary" />
          {isCancelled ? 'Suscripción cancelada' : 'Suscripción activa'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isCancelled ? (
          <>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  {subscriptionInfo.frequency && subscriptionInfo.frequencyType 
                    ? `Renovación ${subscriptionInfo.frequency} ${subscriptionInfo.frequencyType}` 
                    : 'Renovación mensual'}
                </span>
              </div>
              
              {subscriptionInfo.nextPaymentDate && (
                <div className="flex items-center gap-2 text-sm">
                  <ClockIcon className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Próximo pago: {formatDate(new Date(subscriptionInfo.nextPaymentDate))}
                  </span>
                </div>
              )}
            </div>
            
            {subscriptionInfo.orderId && (
              <SubscriptionCancelButton 
                orderId={subscriptionInfo.orderId}
              />
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tu suscripción ha sido cancelada. Mantendrás acceso a los cursos hasta el final del período actual.
          </p>
        )}
      </CardContent>
    </Card>
  );
}