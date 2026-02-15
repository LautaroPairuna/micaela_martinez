// src/components/checkout/ConfirmationStep.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useCheckout } from '@/store/checkout';
import { useCart } from '@/store/cart';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

export function ConfirmationStep() {
  const router = useRouter();

  const { selectedPayment, reset, orderId } = useCheckout();

  const { clear } = useCart();

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
          isTransferPayment ? 'bg-[var(--gold)]/10' : 'bg-green-900/20'
        }`}
      >
        {isTransferPayment ? (
          <Clock className="h-10 w-10 text-[var(--gold)]" />
        ) : (
          <CheckCircle className="h-10 w-10 text-green-400" />
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {isTransferPayment ? '¡Orden creada!' : '¡Pedido confirmado!'}
        </h2>
        <p className="text-zinc-400 mb-4">
          {isTransferPayment
            ? 'Tu orden ha sido creada y está pendiente de pago'
            : 'Tu pedido ha sido procesado y pagado exitosamente'}
        </p>
        {orderId && (
          <p className="text-sm text-zinc-500">
            Número de orden: <span className="font-medium text-white">{orderId}</span>
          </p>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden text-left">
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-blue-950/20 border border-blue-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-blue-400" />
              <div className="text-left">
                <p className="font-medium text-blue-300">¿Qué sigue?</p>
                <p className="text-sm text-blue-400/80">
                  Te enviaremos un email con los detalles de tu pedido.
                </p>
              </div>
            </div>

            {isTransferPayment && (
              <div className="flex items-center gap-3 p-4 bg-yellow-950/20 border border-yellow-900/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div className="text-left">
                  <p className="font-medium text-yellow-300">Transferencia pendiente</p>
                  <p className="text-sm text-yellow-500/80">
                    Recordá enviar el comprobante de transferencia por WhatsApp para confirmar tu
                    pago.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
