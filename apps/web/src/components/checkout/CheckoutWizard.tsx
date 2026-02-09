// src/components/checkout/CheckoutWizard.tsx
'use client';

import { useCheckout } from '@/store/checkout';
import { StepIndicator } from './StepIndicator';
import { CartStep } from './CartStep';
import { AddressStep } from './AddressStep';
import { PaymentStep } from './PaymentStep';
import { ConfirmationStep } from './ConfirmationStep';
import { Card, CardBody } from '@/components/ui/Card';
import { OrderSummary } from './OrderSummary';

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
      <Card>
        <CardBody className="p-6">
          <StepIndicator />
        </CardBody>
      </Card>

      {/* Contenido del paso actual */}
      <div className={`grid grid-cols-1 gap-8 ${!isCartStep ? 'lg:grid-cols-3' : ''}`}>
        {/* Contenido principal */}
        <div className={!isCartStep ? 'lg:col-span-2' : ''}>
          {renderStep()}
        </div>

        {/* Resumen lateral (oculto en carrito y confirmación) */}
        {!isCartStep && (
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="border border-[#2a2a2a] bg-[#1a1a1a]">
                <CardBody className="p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">
                    Resumen del pedido
                  </h3>
                  <OrderSummary />
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
