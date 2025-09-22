// src/components/checkout/CheckoutWizard.tsx
'use client';

import { useCheckout } from '@/store/checkout';
import { StepIndicator } from './StepIndicator';
import { CartStep } from './CartStep';
import { AddressStep } from './AddressStep';
import { PaymentStep } from './PaymentStep';
import { ConfirmationStep } from './ConfirmationStep';
import { Card, CardBody } from '@/components/ui/Card';

export function CheckoutWizard() {
  const { currentStep } = useCheckout();

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contenido principal */}
        <div className="lg:col-span-2">
          {renderStep()}
        </div>

        {/* Resumen lateral */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card>
              <CardBody className="p-6">
                <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
                  Resumen del pedido
                </h3>
                {/* El resumen se renderiza en cada paso */}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}