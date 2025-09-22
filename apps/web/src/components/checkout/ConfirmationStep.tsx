// src/components/checkout/ConfirmationStep.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useCheckout } from '@/store/checkout';
import { useCart, cartSelectors } from '@/store/cart';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Clock, AlertCircle, Lock } from 'lucide-react';

export function ConfirmationStep() {
  const router = useRouter();

  const { selectedPayment, reset, orderId } = useCheckout();

  const { items, clear } = useCart();
  const total = cartSelectors.subtotal(items); // Precio directo (si lo necesitás para mostrarlo, usá `total` en el UI)

  // El pedido ya fue procesado y pagado en el PaymentStep
  // Solo necesitamos mostrar la confirmación y limpiar el estado
  const handleFinishOrder = () => {
    clear(); // Limpiar carrito
    reset(); // Limpiar estado de checkout
    router.push('/mi-cuenta/pedidos');
  };

  const handleContinueShopping = () => {
    router.push('/tienda');
  };

  const handleViewOrder = () => {
    router.push('/mi-cuenta/pedidos');
  };

  // Mostrar confirmación según el tipo de pago
  const isTransferPayment = selectedPayment?.type === 'transfer';

  return (
    <div className="text-center space-y-6">
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
          isTransferPayment ? 'bg-[var(--gold)]/10' : 'bg-green-100'
        }`}
      >
        {isTransferPayment ? (
          <Clock className="h-10 w-10 text-[var(--gold)]" />
        ) : (
          <CheckCircle className="h-10 w-10 text-green-600" />
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[var(--fg)] mb-2">
          {isTransferPayment ? '¡Orden creada!' : '¡Pedido confirmado!'}
        </h2>
        <p className="text-[var(--muted)] mb-4">
          {isTransferPayment
            ? 'Tu orden ha sido creada y está pendiente de pago'
            : 'Tu pedido ha sido procesado y pagado exitosamente'}
        </p>
        {orderId && (
          <p className="text-sm text-[var(--muted)]">
            Número de orden: <span className="font-medium text-[var(--fg)]">{orderId}</span>
          </p>
        )}
      </div>

      <Card>
        <CardBody className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <p className="font-medium text-blue-800">¿Qué sigue?</p>
                <p className="text-sm text-blue-600">
                  Te enviaremos un email con los detalles de tu pedido.
                </p>
              </div>
            </div>

            {isTransferPayment && (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div className="text-left">
                  <p className="font-medium text-yellow-800">Transferencia pendiente</p>
                  <p className="text-sm text-yellow-600">
                    Recordá enviar el comprobante de transferencia por WhatsApp para confirmar tu
                    pago.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={handleViewOrder}
          className="bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-black font-semibold px-6 py-2 hover:shadow-lg transition-all duration-200"
        >
          Ver mis pedidos
        </Button>
        <Button
          onClick={handleContinueShopping}
          variant="outline"
          className="border-[var(--border)] text-[var(--fg)] hover:bg-[var(--subtle)] px-6 py-2"
        >
          Seguir comprando
        </Button>
      </div>

      {/* Botón para finalizar y limpiar estado */}
      <div className="text-center">
        <Button
          onClick={handleFinishOrder}
          className="bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold px-8 py-3 hover:shadow-lg transition-all duration-200"
        >
          Finalizar y ver mis pedidos
        </Button>
      </div>
    </div>
  );
}
