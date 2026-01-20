// src/components/checkout/CartStep.tsx
'use client';

import { useCart, cartSelectors } from '@/store/cart';
import { useCheckout } from '@/store/checkout';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SafeImage } from '@/components/ui/SafeImage';
import { Price } from '@/components/ui/Price';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';



export function CartStep() {
  const { items, setQty, remove, clear } = useCart();
  const { nextStep, markStepCompleted } = useCheckout();
  
  const subtotal = cartSelectors.subtotal(items);
  const count = cartSelectors.count(items);

  const handleContinue = () => {
    markStepCompleted('cart');
    nextStep();
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-16">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-transparent border border-[var(--pink)]/40 flex items-center justify-center shadow-lg">
              <ShoppingCart className="h-10 w-10 text-[var(--pink)]" />
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
              <ShoppingCart className="h-4 w-4" />
              Explorar productos
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--fg)]">
                Revisar carrito
              </h2>
              <p className="text-[var(--muted)] mt-1">
                {count} {count === 1 ? 'producto' : 'productos'} en tu carrito
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clear}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Vaciar carrito
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Items del carrito */}
      <Card>
        <CardBody className="p-0">
          <div className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="p-6">
                <div className="flex items-start gap-4">
                  {/* Imagen */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--subtle)] flex-shrink-0">
                    <SafeImage
                      src={item.image || ''}
                      alt={item.title}
                      imgClassName="w-full h-full object-cover"
                      ratio="1/1"
                      fit="cover"
                      rounded="all"
                      withBg={false}
                      skeleton={false}
                    />
                  </div>

                  {/* Información */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-[var(--fg)] line-clamp-2">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-1 rounded-full bg-[var(--pink)]/10 text-[var(--pink)] border border-[var(--pink)]/30">
                            {item.type === 'course' ? 'Curso' : 'Producto'}
                          </span>
                          {item.type === 'product' && (
                            <span className="text-sm text-[var(--muted)]">
                              Stock disponible
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Precio */}
                      <div className="text-right ml-4">
                        <div className="font-semibold text-[var(--fg)]">
                          <Price value={item.price} />
                        </div>
                      </div>
                    </div>

                    {/* Controles de cantidad */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[var(--muted)]">
                          Cantidad:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQty(item.id, Math.max(1, item.quantity - 1))}
                            className="w-8 h-8 rounded-md border border-[var(--pink)]/40 flex items-center justify-center hover:bg-[var(--bg-subtle)] hover:border-[var(--pink)] transition-colors"
                            disabled={item.quantity <= 1 || item.type === 'course'}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => setQty(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-md border border-[var(--pink)]/40 flex items-center justify-center hover:bg-[var(--bg-subtle)] hover:border-[var(--pink)] transition-colors"
                            disabled={item.type === 'course'}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Eliminar */}
                      <button
                        onClick={() => remove(item.id, item.type)}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-md transition-colors"
                        title="Eliminar producto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Resumen y continuar */}
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--muted)]">
                Subtotal ({count} {count === 1 ? 'producto' : 'productos'})
              </div>
              <div className="text-2xl font-bold text-[var(--fg)]">
                <Price value={subtotal} />
              </div>

            </div>

            <Button
              onClick={handleContinue}
              className="bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-black font-semibold px-8 py-3 hover:shadow-lg transition-all duration-200"
            >
              Continuar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
