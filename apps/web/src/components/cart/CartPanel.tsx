'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Trash2, Plus, Minus, ShoppingCart, AlertCircle } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';
import { formatCurrency } from '@/lib/format';
import { useCart, cartSelectors, CartLineProduct } from '@/store/cart';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/contexts/ToastContext';

// Type-guard sin `any`
function isCartLineProduct(it: unknown): it is CartLineProduct {
  return !!it && typeof it === 'object' && 'type' in it && (it as { type?: unknown }).type === 'product';
}

export function CartPanel() {
  const router = useRouter();
  const { me, loading } = useSession();
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const inc = useCart((s) => s.increase);
  const dec = useCart((s) => s.decrease);
  const clear = useCart((s) => s.clear);
  const { warning: showWarning, success: showSuccess } = useToast();

  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => setShow(true));
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      setShow(false);
    };
  }, [isOpen]);

  // Trap + ESC
  useEffect(() => {
    if (!isOpen) return;
    const el = panelRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = el.querySelectorAll<HTMLElement>(
        'a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0],
        last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  if (!mounted || !isOpen) return null;

  const subtotal = cartSelectors.subtotal(items);
  const count = cartSelectors.count(items);

  return createPortal(
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label="Carrito">
      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden="true"
        className={[
          'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity',
          show ? 'opacity-100' : 'opacity-0',
          'motion-reduce:transition-none',
        ].join(' ')}
      />
      {/* Panel */}
      <aside
        ref={panelRef}
        className={[
          'absolute right-0 top-0 h-dvh w-full max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl',
          'grid grid-rows-[auto_1fr_auto]',
          'transform-gpu transition-transform duration-300',
          show ? 'translate-x-0' : 'translate-x-full',
          'motion-reduce:transition-none',
        ].join(' ')}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 h-20 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-[var(--gold)]/10 via-[var(--pink)]/10 to-[var(--gold-dark)]/10 border border-[var(--pink)]/20">
              <ShoppingCart className="size-5 text-[var(--pink)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Tu carrito</h2>
              <span className="text-sm text-zinc-400">{count} {count === 1 ? 'artículo' : 'artículos'}</span>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            onClick={close}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pink)]/40"
            aria-label="Cerrar carrito"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 mb-6">
                <ShoppingCart className="size-12 text-[var(--pink)] mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Tu carrito está vacío</h3>
              <p className="text-sm text-zinc-400 mb-6 max-w-[20rem]">Descubre nuestros productos y cursos para comenzar tu compra</p>
              <div className="flex flex-col gap-3 w-full max-w-[16rem]">
                <Link 
                  href="/tienda" 
                  onClick={close} 
                  className="w-full rounded-xl border border-[var(--gold)] bg-transparent text-[var(--gold)] font-bold px-4 py-3 hover:bg-[var(--gold)]/10 hover:shadow-[0_0_20px_-5px_var(--gold)] transition-all duration-300 transform hover:scale-[1.02] text-center"
                >
                  Explorar tienda
                </Link>
              </div>
            </div>
          ) : (
            items.map((it) => {
              const href = it.type === 'product' ? `/tienda/producto/${it.slug}` : `/cursos/${it.slug}`;
              const qty = it.quantity;
              const lineTotal = it.price * qty;
              
              const canDec = qty > 1;
              const maxQty = isCartLineProduct(it) ? it.maxQty : undefined;
              const canInc = typeof maxQty === 'number' ? qty < maxQty : true;

              const onIncSafe = () => {
                if (!isCartLineProduct(it)) return;
                if (typeof maxQty === 'number' && qty >= maxQty) return; // bloqueo duro
                inc(it.id);
              };

              return (
                <div
                   key={`${it.type}-${it.id}`}
                   className="bg-zinc-900/30 rounded-xl border border-zinc-800/60 p-3 hover:border-zinc-700/80 hover:bg-zinc-900/50 transition-all duration-200 group"
                 >
                   <div className="flex gap-3">
                     {/* Miniatura */}
                     <Link href={href} onClick={close} className="block focus:outline-none focus:ring-2 focus:ring-[var(--pink)]/40 rounded-lg flex-shrink-0">
                       <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800">
                         <SafeImage src={it.image || '/images/placeholder.jpg'} alt={it.title} ratio="1/1" className="object-cover" />
                       </div>
                     </Link>

                    {/* Info principal */}
                     <div className="flex-1 min-w-0">
                      <Link href={href} onClick={close} className="block">
                        <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-[var(--pink)] line-clamp-2 transition-colors">
                          {it.title}
                        </h4>
                      </Link>
                       
                       <div className="mt-1 flex items-center gap-2">
                         <span className="text-xs text-zinc-500">Precio:</span>
                         <span className="text-sm font-medium text-zinc-300">{formatCurrency(it.price)}</span>
                       </div>

                      {/* Controles de cantidad y acciones */}
                       <div className="mt-2 flex items-center justify-between">
                         {isCartLineProduct(it) ? (
                           <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-1">
                              <button
                                 onClick={() => dec(it.id)}
                                 className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors focus:outline-none"
                                 aria-label="Disminuir cantidad"
                                 disabled={!canDec}
                               >
                                 <Minus className="h-3 w-3" />
                               </button>
                               <span className="min-w-[1.5rem] text-center text-sm font-bold text-zinc-200 tabular-nums px-1">{qty}</span>
                               <button
                                 onClick={onIncSafe}
                                 className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors focus:outline-none"
                                 aria-label="Aumentar cantidad"
                                 disabled={!canInc}
                                 title={canInc ? '' : 'Sin stock disponible'}
                               >
                                 <Plus className="h-3 w-3" />
                               </button>
                          </div>
                          {typeof maxQty === 'number' && (
                             <span className="text-xs text-zinc-500">Stock: {maxQty}</span>
                          )}
                           </div>
                         ) : (
                          <div className="text-xs text-zinc-500">Curso</div>
                         )}
                         
                         <button
                           onClick={() => remove(it.id, it.type)}
                           className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                           aria-label="Eliminar"
                           title="Eliminar del carrito"
                         >
                           <Trash2 className="size-3.5" />
                         </button>
                       </div>
                      
                      {/* Precio total */}
                       <div className="mt-2 pt-2 border-t border-zinc-800/50 flex justify-between items-center">
                         <span className="text-xs text-zinc-500">Total:</span>
                         <div className="text-right">
                           <div className="text-sm font-bold text-[var(--gold)] tabular-nums" aria-live="polite" aria-atomic="true">
                             {formatCurrency(lineTotal)}
                           </div>
                           {isCartLineProduct(it) && qty > 1 && (
                             <div className="text-xs text-zinc-500 tabular-nums">({formatCurrency(it.price)} c/u)</div>
                           )}
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur p-6">
          <div className="space-y-4">
            {/* Resumen de totales */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <span>Subtotal ({count} {count === 1 ? 'artículo' : 'artículos'}):</span>
                <span className="tabular-nums font-medium text-zinc-300">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold text-white pt-2 border-t border-zinc-800">
                <span>Total:</span>
                <span className="tabular-nums text-xl" aria-live="polite" aria-atomic="true">
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="space-y-3">
              {!loading && !me ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl backdrop-blur-sm">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--pink)]/10 ring-1 ring-[var(--pink)]/20 flex-shrink-0">
                      <ShoppingCart className="h-5 w-5 text-[var(--pink)]" />
                    </div>
                    <div className="text-sm">
                      <p className="font-bold text-white">Inicia sesión para continuar</p>
                      <p className="text-zinc-400 text-xs">Necesitas una cuenta para proceder al pago</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      close();
                      router.push('/auth?redirect=/checkout');
                    }}
                    className="block w-full rounded-xl border border-[var(--gold)] bg-transparent px-6 py-4 text-center font-bold text-[var(--gold)] hover:bg-[var(--gold)]/10 hover:shadow-[0_0_20px_-5px_var(--gold)] transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    Iniciar sesión y continuar
                  </button>
                </div>
              ) : (
                <Link
                  href="/checkout"
                  onClick={close}
                  className="block w-full rounded-xl border border-[var(--gold)] bg-transparent px-6 py-4 text-center font-bold text-[var(--gold)] hover:bg-[var(--gold)]/10 hover:shadow-[0_0_20px_-5px_var(--gold)] transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40"
                >
                  Proceder al pago
                </Link>
              )}
              <div className="flex gap-2">
                <Link
                  href="/tienda"
                  onClick={close}
                  className="flex-1 rounded-xl border border-[var(--pink)] bg-transparent px-4 py-3 text-center font-bold text-[var(--pink)] hover:bg-[var(--pink)]/10 hover:shadow-[0_0_15px_-5px_var(--pink)] hover:scale-[1.02] transition-all duration-300"
                >
                  Seguir comprando
                </Link>
                {items.length > 0 && (
                  <button
                    onClick={() => {
                      showWarning(
                        'Confirmar acción',
                        '¿Estás seguro de que quieres vaciar el carrito? Esta acción no se puede deshacer.',
                        10000
                      );
                      setTimeout(() => {
                        if (window.confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
                          clear();
                          showSuccess('Carrito vaciado', 'Se han eliminado todos los productos del carrito');
                        }
                      }, 100);
                    }}
                    className="px-4 py-3 rounded-xl border border-red-900/30 text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
                    title="Vaciar carrito"
                  >
                    <Trash2 className="size-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
