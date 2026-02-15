// src/components/checkout/CheckoutWizard.tsx
'use client';

import { useCheckout } from '@/store/checkout';
import { StepIndicator } from './StepIndicator';
import { CartStep } from './CartStep';
import { AddressStep } from './AddressStep';
import { PaymentStep } from './PaymentStep';
import { ConfirmationStep } from './ConfirmationStep';
import { OrderSummary } from './OrderSummary';
import { AnimatePresence, motion } from 'framer-motion';

export function CheckoutWizard() {
  const { currentStep } = useCheckout();
  const isCartStep = currentStep === 'cart' || currentStep === 'confirmation';

  const renderStep = () => {
    switch (currentStep) {
      case 'cart':
        return <CartStep />;
      case 'address':
        return <AddressStep />;
      case 'payment':
        return <PaymentStep />;
      case 'confirmation':
        return <ConfirmationStep />;
      default:
        return <CartStep />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Indicador de pasos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-6">
        <StepIndicator />
      </div>

      {/* Contenido del paso actual */}
      <div className={`grid grid-cols-1 gap-8 ${!isCartStep ? 'lg:grid-cols-3' : ''}`}>
        {/* Contenido principal */}
        <div className={!isCartStep ? 'lg:col-span-2' : ''}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Resumen lateral (oculto en carrito y confirmación) */}
        {!isCartStep && (
          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="sticky top-24">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Resumen del pedido
                  </h3>
                  <OrderSummary />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
