// src/components/checkout/StepIndicator.tsx
'use client';

import { useCheckout, checkoutSelectors, type CheckoutStep } from '@/store/checkout';
import { ShoppingCart, MapPin, CreditCard, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/format';
import { motion } from 'framer-motion';

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
  const totalSteps = steps.length;
  
  // Calculamos el progreso (0 a 1)
  // Si estamos en el paso 0, progreso 0.
  // Si estamos en el último paso, progreso 1.
  const progress = currentStepIndex / (totalSteps - 1);

  return (
    <div className="w-full relative">
      {/* Líneas de fondo y progreso (Posicionadas absolutamente detrás de los pasos) */}
      {/* 
         Usamos left y right calculados para que la línea empiece y termine 
         exactamente en el centro del primer y último círculo.
         En un grid de 4 columnas, el centro de la primera es 1/8 (12.5%) 
         y el centro de la última es 7/8 (87.5%).
         Margen lateral = 100% / (2 * steps)
      */}
      <div 
        className="absolute top-6 left-0 right-0 h-[2px] bg-zinc-800 -z-0"
        style={{ 
          left: `${100 / (totalSteps * 2)}%`, 
          right: `${100 / (totalSteps * 2)}%` 
        }}
      >
        <motion.div 
          className="absolute top-0 left-0 bottom-0 bg-[var(--pink)]"
          initial={{ width: '0%' }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>

      <div className="grid grid-cols-4 w-full relative z-10">
        {steps.map((step, index) => {
          const config = stepConfig[step];
          const Icon = config.icon;
          const isActive = checkout.currentStep === step;
          // Solo marcar como completado si el paso ya fue completado Y es un paso anterior al actual
          const isCompleted = checkoutSelectors.isStepCompleted(checkout, step) && index < currentStepIndex;
          const isPast = index < currentStepIndex;
          const isAccessible = index <= currentStepIndex;

          return (
            <div key={step} className="flex flex-col items-center group">
              {/* Icono */}
              <motion.button
                type="button"
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-300 relative bg-[#09090b]', // Fondo opaco para tapar línea
                  {
                    'border-[var(--pink)] text-black': isActive, // El icono activo suele tener fondo rosa en el diseño original? 
                    // Revisando original: 'bg-[var(--pink)] border-[var(--pink)] text-black': isActive
                    // Si pongo bg-pink, tapa la línea bien.
                    // Si es inactivo, bg-[#09090b] (zinc-950) tapa la línea.
                  },
                  isActive ? 'bg-[var(--pink)]' : 'bg-[#09090b]', // Fondo dinámico
                  {
                    'border-[var(--pink)] text-[var(--pink)]': isCompleted && !isActive, // Completado pero no actual
                    'border-zinc-800 text-zinc-500': !isActive && !isCompleted && !isPast, // Futuro
                    'cursor-pointer': isAccessible,
                    'cursor-default': !isAccessible
                  }
                )}
                whileHover={isAccessible ? { scale: 1.1 } : {}}
                animate={{ 
                  scale: isActive ? 1.1 : 1,
                  transition: { type: 'spring', stiffness: 300, damping: 20 }
                }}
                onClick={() => {
                  if (isAccessible) {
                    checkout.setStep(step);
                  }
                }}
              >
                {isCompleted && !isActive ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Icon className={cn("w-6 h-6", isActive ? "text-black" : "")} />
                )}
              </motion.button>

              {/* Label */}
              <div className="mt-3 text-center px-2">
                <div
                  className={cn(
                    'text-sm font-medium transition-colors ease-out',
                    {
                      'text-white': isActive,
                      'text-[var(--pink)]': isCompleted && !isActive,
                      'text-zinc-500': !isActive && !isCompleted,
                    }
                  )}
                >
                  {config.label}
                </div>
                <div className="text-xs text-zinc-600 mt-1 hidden sm:block">
                  {config.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progreso móvil (versión simplificada) */}
      <div className="md:hidden mt-8 px-4">
        <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
          <span>Paso {currentStepIndex + 1} de {totalSteps}</span>
          <span>{Math.round(((currentStepIndex + 1) / totalSteps) * 100)}%</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="bg-[var(--pink)] h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}
