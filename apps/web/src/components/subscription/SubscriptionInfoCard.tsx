'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CalendarIcon, ClockIcon, RefreshCcw, CreditCard, Timer, AlertCircle, Info } from 'lucide-react';
import { SubscriptionCancelButton } from './SubscriptionCancelButton';
import { formatDate } from '@/lib/utils/date';
import { Badge } from '@/components/ui/Pill';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface SubscriptionItem {
  isActive: boolean;
  orderId: string | number;
  subscriptionId: string | null;
  startDate: string;
  nextPaymentDate: string | null;
  frequency: number;
  frequencyType: string;
  daysLeft: number | null;
  hoursLeft: number | null;
}

interface SubscriptionInfoCardProps {
  subscriptionInfo: SubscriptionItem;
  onSubscriptionCancelled?: () => void;
  variant?: 'card' | 'button';
}

export function SubscriptionInfoCard({ 
  subscriptionInfo, 
  onSubscriptionCancelled,
  variant = 'card'
}: SubscriptionInfoCardProps) {
  const [isCancelled, setIsCancelled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCancelled = () => {
    setIsCancelled(true);
    if (onSubscriptionCancelled) {
      onSubscriptionCancelled();
    }
  };

  // Si no está activa, mostramos un mensaje de "En proceso" en lugar de null
  const isPending = !subscriptionInfo.isActive && !isCancelled;

  const getFrequencyText = () => {
    const { frequency, frequencyType } = subscriptionInfo;
    if (frequencyType === 'month') {
      return frequency === 1 ? 'Mensual' : `Cada ${frequency} meses`;
    }
    if (frequencyType === 'day') {
      return frequency === 1 ? 'Diario' : `Cada ${frequency} días`;
    }
    return `${frequency} ${frequencyType}`;
  };

  const renderCountdown = () => {
    if (isPending) {
      return (
        <Badge tone="gold" className="font-medium animate-pulse">
          <ClockIcon className="h-3 w-3" />
          Activación en proceso
        </Badge>
      );
    }

    if (subscriptionInfo.hoursLeft !== null && subscriptionInfo.hoursLeft >= 0 && subscriptionInfo.hoursLeft < 24) {
      return (
        <Badge tone="gold" className="font-medium">
          <Timer className="h-3 w-3" />
          Vence en {subscriptionInfo.hoursLeft} {subscriptionInfo.hoursLeft === 1 ? 'hora' : 'horas'}
        </Badge>
      );
    }
    
    if (subscriptionInfo.daysLeft !== null && subscriptionInfo.daysLeft >= 0) {
      return (
        <Badge tone="gold" className="font-medium">
          <ClockIcon className="h-3 w-3" />
          {subscriptionInfo.daysLeft} {subscriptionInfo.daysLeft === 1 ? 'día restante' : 'días restantes'}
        </Badge>
      );
    }

    if (subscriptionInfo.daysLeft !== null && subscriptionInfo.daysLeft < 0) {
      return (
        <Badge tone="neutral" className="bg-red-500 text-white font-medium">
          <AlertCircle className="h-3 w-3" />
          Vencida
        </Badge>
      );
    }

    return null;
  };

  const content = (
    <div className="space-y-6">
      {isPending && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 mt-0.5" />
          <p className="text-sm text-blue-200/80 leading-relaxed">
            Tu suscripción está siendo procesada por Mercado Pago. Esto puede demorar entre 2 y 5 horas.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-bold">Fecha de Inicio</p>
          <div className="flex items-center gap-2.5 text-sm text-zinc-200">
            <div className="p-1.5 rounded-md bg-white/5 border border-white/5">
              <CalendarIcon className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <span className="font-medium">{formatDate(new Date(subscriptionInfo.startDate))}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-bold">Próximo Cobro</p>
          <div className="flex items-center gap-2.5 text-sm text-zinc-200">
            <div className="p-1.5 rounded-md bg-white/5 border border-white/5">
              <CreditCard className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <span className="font-medium">
              {subscriptionInfo.nextPaymentDate 
                ? formatDate(new Date(subscriptionInfo.nextPaymentDate))
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between border-t border-white/5 mt-2">
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
          <RefreshCcw className="h-3 w-3 text-zinc-600" />
          <span>Plan {getFrequencyText()}</span>
        </div>
        
        {subscriptionInfo.orderId && (
          <SubscriptionCancelButton 
            orderId={subscriptionInfo.orderId.toString()}
            onCancelled={handleCancelled}
          />
        )}
      </div>
    </div>
  );

  if (variant === 'button') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          className="bg-black/60 hover:bg-black/80 border border-white/30 backdrop-blur-md text-white transition-all duration-300 gap-2 h-9 rounded-xl shadow-xl px-4"
        >
          <Info className="h-4 w-4 text-[var(--gold)]" />
          <span className="text-xs font-bold tracking-wide uppercase">Info</span>
        </Button>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-[#0f0f0f] border border-white/10 p-0 overflow-hidden max-w-lg shadow-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xs font-bold flex items-center gap-2 text-zinc-500 uppercase tracking-[0.1em]">
                  <RefreshCcw className="h-3.5 w-3.5 text-[var(--gold)] animate-spin-slow" />
                  {isCancelled ? 'Suscripción cancelada' : isPending ? 'Activación en proceso' : 'Suscripción activa'}
                </DialogTitle>
                {renderCountdown()}
              </div>
            </DialogHeader>
            <div className="p-6">
              {!isCancelled ? content : (
                <div className="py-2 flex items-start gap-3 text-zinc-400">
                  <AlertCircle className="h-5 w-5 text-zinc-600 mt-0.5" />
                  <p className="text-sm leading-relaxed italic">
                    Tu suscripción ha sido cancelada. Mantendrás acceso a los cursos hasta el final del período actual.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card className="w-full border-white/5 bg-[#0f0f0f] overflow-hidden group hover:border-[var(--gold)]/30 transition-all duration-500 shadow-2xl shadow-black/50">
      <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold flex items-center gap-2 text-zinc-500 uppercase tracking-[0.1em]">
            <RefreshCcw className="h-3.5 w-3.5 text-[var(--gold)] animate-spin-slow" />
            {isCancelled ? 'Suscripción cancelada' : isPending ? 'Activación en proceso' : 'Suscripción activa'}
          </CardTitle>
          {renderCountdown()}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {!isCancelled ? content : (
          <div className="py-2 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-zinc-600 mt-0.5" />
            <p className="text-sm text-zinc-500 leading-relaxed italic">
              Tu suscripción ha sido cancelada. Mantendrás acceso a los cursos hasta el final del período actual.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}