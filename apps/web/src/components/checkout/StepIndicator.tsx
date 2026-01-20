// src/components/checkout/StepIndicator.tsx
'use client';

import { useCheckout, checkoutSelectors, type CheckoutStep } from '@/store/checkout';
import { ShoppingCart, MapPin, CreditCard, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/format';

const stepConfig = {
  cart: {
    label: 'Carrito',
    icon: ShoppingCart,
    description: 'Revisar productos'
  },
  address: {
    label: 'Dirección',
    icon: MapPin,
    description: 'Dirección de facturación'
  },
  payment: {
    label: 'Pago',
    icon: CreditCard,
    description: 'Método de pago'
  },
  confirmation: {
    label: 'Confirmación',
    icon: CheckCircle,
    description: 'Revisar y confirmar'
  }
};

const steps: CheckoutStep[] = ['cart', 'address', 'payment', 'confirmation'];

export function StepIndicator() {
  const checkout = useCheckout();
  const currentStepIndex = checkoutSelectors.getCurrentStepIndex(checkout);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const config = stepConfig[step];
          const Icon = config.icon;
          const isActive = checkout.currentStep === step;
          const isCompleted = checkoutSelectors.isStepCompleted(checkout, step);
          const isPast = index < currentStepIndex;
          const isAccessible = index <= currentStepIndex;

          return (
            <div key={step} className="flex items-center flex-1">
              {/* Paso */}
              <div className="flex flex-col items-center">
                {/* Icono */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 ease-out',
                    {
                      'bg-[var(--pink)] border-[var(--pink)] text-black': isActive,
                      'bg-[var(--pink)]/10 border-[var(--pink)] text-[var(--pink)]': isCompleted,
                      'bg-[var(--subtle)] border-[var(--pink)] text-[var(--pink)]/70': isPast && !isCompleted,
                      'bg-[var(--subtle)] border-[var(--border)] text-[var(--muted)]': !isActive && !isPast && !isCompleted,
                      'cursor-pointer hover:scale-105': isAccessible,
                    }
                  )}
                  onClick={() => {
                    if (isAccessible) {
                      checkout.setStep(step);
                    }
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>

                {/* Label */}
                <div className="mt-3 text-center">
                  <div
                    className={cn(
                      'text-sm font-medium transition-colors ease-out',
                      {
                        'text-[var(--fg)]': isActive,
                        'text-[var(--pink)]': isCompleted,
                        'text-[var(--pink)]/70': isPast && !isCompleted,
                        'text-[var(--muted)]': !isActive && !isPast && !isCompleted,
                      }
                    )}
                  >
                    {config.label}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {config.description}
                  </div>
                </div>
              </div>

              {/* Línea conectora */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4 mt-[-2rem]">
                  <div
                    className={cn(
                      'h-0.5 transition-colors duration-200 ease-out',
                      {
                        'bg-[var(--pink)]': index < currentStepIndex,
                        'bg-[var(--border)]': index >= currentStepIndex,
                      }
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progreso móvil (versión simplificada) */}
      <div className="md:hidden mt-6">
        <div className="flex items-center justify-between text-sm text-[var(--muted)]">
          <span>Paso {currentStepIndex + 1} de {steps.length}</span>
          <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}% completado</span>
        </div>
        <div className="mt-2 w-full bg-[var(--border)] rounded-full h-2">
          <div
            className="bg-[var(--pink)] h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
