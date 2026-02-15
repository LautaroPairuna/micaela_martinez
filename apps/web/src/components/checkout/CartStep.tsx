// src/components/checkout/CartStep.tsx
'use client';

import { useCart, cartSelectors } from '@/store/cart';
import { useCheckout } from '@/store/checkout';
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-16 text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-lg">
              <ShoppingCart className="h-10 w-10 text-[var(--pink)]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">
                Tu carrito está vacío
              </h3>
              <p className="text-zinc-400">
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Revisar carrito
              </h2>
              <p className="text-zinc-400 mt-1">
                {count} {count === 1 ? 'producto' : 'productos'} en tu carrito
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clear}
              className="text-red-400 border-red-900/30 hover:bg-red-950/30 hover:text-red-300 hover:border-red-900/50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Vaciar carrito
            </Button>
          </div>
        </div>
      </div>

      {/* Items del carrito */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-0">
          <div className="divide-y divide-zinc-800">
            {items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="p-6">
                <div className="flex items-start gap-4">
                  {/* Imagen */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-950 flex-shrink-0 border border-zinc-800">
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
                        <h3 className="font-medium text-white line-clamp-2">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-1 rounded-full bg-[var(--pink)]/10 text-[var(--pink)] border border-[var(--pink)]/20">
                            {item.type === 'course' ? 'Curso' : 'Producto'}
                          </span>
                          {item.type === 'product' && (
                            <span className="text-sm text-zinc-500">
                              Stock disponible
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Precio */}
                      <div className="text-right ml-4">
                        <div className="font-semibold text-white">
                          <Price value={item.price} />
                        </div>
                      </div>
                    </div>

                    {/* Controles de cantidad */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-400">
                          Cantidad:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQty(item.id, Math.max(1, item.quantity - 1))}
                            className="w-8 h-8 rounded-md border border-zinc-700 flex items-center justify-center hover:bg-zinc-800 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={item.quantity <= 1 || item.type === 'course'}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => setQty(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-md border border-zinc-700 flex items-center justify-center hover:bg-zinc-800 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={item.type === 'course'}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Eliminar */}
                      <button
                        onClick={() => remove(item.id, item.type)}
                        className="text-zinc-500 hover:text-red-400 p-2 hover:bg-red-950/20 rounded-md transition-colors"
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
        </div>
      </div>

      {/* Resumen y continuar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-400">
                Subtotal ({count} {count === 1 ? 'producto' : 'productos'})
              </div>
              <div className="text-2xl font-bold text-white">
                <Price value={subtotal} />
              </div>
            </div>

            <Button
              onClick={handleContinue}
              variant="ghost"
              className="w-full sm:w-auto border !border-[var(--pink)] !text-[var(--pink)] font-bold text-base px-8 py-3 rounded-xl hover:!bg-[var(--pink)]/10 hover:!border-[var(--pink)] hover:!text-[var(--pink)] hover:shadow-[0_0_20px_-5px_var(--pink)] hover:scale-[1.02] transition-all duration-300 !ring-0 !ring-offset-0 !outline-none focus:!ring-0 focus-visible:!ring-0"
            >
              Continuar
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
