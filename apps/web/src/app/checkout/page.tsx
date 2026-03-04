// src/app/checkout/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/store/cart';
import { useCheckout } from '@/store/checkout';
import { CheckoutWizard } from '@/components/checkout/CheckoutWizard';
import { Card, CardBody } from '@/components/ui/Card';
import { ShoppingCart, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, _hasHydrated } = useCart();
  const { orderId, currentStep } = useCheckout();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirigir si el carrito está vacío, pero permitiendo flujo de pago activo
  useEffect(() => {
    if (!isClient || !_hasHydrated) return;

    // Si hay items, todo correcto
    if (items.length > 0) return;

    // Si estamos en confirmación, permitimos carrito vacío
    if (currentStep === 'confirmation') return;

    // Si hay una orden activa (proceso de pago iniciado), permitimos carrito vacío
    // Esto es crucial porque PaymentStep limpia el carrito al crear la orden
    if (orderId) return;

    // Si no se cumple nada de lo anterior, redirigir
    router.push('/tienda');
  }, [items.length, router, isClient, _hasHydrated, orderId, currentStep]);

  if (!isClient || !_hasHydrated) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  // Renderizado condicional: Solo mostrar "Carrito vacío" si realmente no deberíamos estar aquí
  const shouldShowEmptyCart = items.length === 0 && !orderId && currentStep !== 'confirmation';

  if (shouldShowEmptyCart) {
    return (
      <div className="min-h-screen bg-[var(--bg)] py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <CardBody className="text-center py-16">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/10 flex items-center justify-center shadow-lg">
                  <ShoppingCart className="h-10 w-10 text-[var(--gold)]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[var(--fg)]">
                    Tu carrito está vacío
                  </h3>
                  <p className="text-[var(--muted)]">
                    Agregá productos o cursos para continuar con la compra.
                  </p>
                </div>
                <Link
                  href="/tienda"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-black font-bold rounded-xl hover:shadow-lg transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a la tienda
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/tienda"
            className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Continuar comprando
          </Link>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--fg)] mb-2">
            Finalizar Compra
          </h1>
          <p className="text-[var(--muted)]">
            Completá los siguientes pasos para confirmar tu pedido
          </p>
        </div>

        <CheckoutWizard />
      </div>
    </div>
  );
}