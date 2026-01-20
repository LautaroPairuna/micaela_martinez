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
          'absolute right-0 top-0 h-dvh w-full max-w-md bg-[var(--bg)] border-l border-[var(--border)] shadow-2xl',
          'grid grid-rows-[auto_1fr_auto]',
          'transform-gpu transition-transform duration-300',
          show ? 'translate-x-0' : 'translate-x-full',
          'motion-reduce:transition-none',
        ].join(' ')}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 h-20 flex items-center justify-between px-6 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-[var(--gold)]/25 via-[var(--pink)]/20 to-[var(--gold-dark)]/25 border border-[var(--pink)]/40">
              <ShoppingCart className="size-5 text-[var(--pink)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--fg)]">Tu carrito</h2>
              <span className="text-sm text-[var(--muted)]">{count} {count === 1 ? 'artículo' : 'artículos'}</span>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            onClick={close}
            className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pink)]/40"
            aria-label="Cerrar carrito"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[var(--bg-subtle)] to-[var(--bg-hover)] border border-[var(--border)] mb-6">
                <ShoppingCart className="size-12 text-[var(--pink)] mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--fg)] mb-2">Tu carrito está vacío</h3>
              <p className="text-sm text-[var(--muted)] mb-6 max-w-[20rem]">Descubre nuestros productos y cursos para comenzar tu compra</p>
              <div className="flex flex-col gap-3 w-full max-w-[16rem]">
                <Link 
                  href="/tienda" 
                  onClick={close} 
                  className="w-full rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-black font-semibold px-4 py-3 hover:shadow-lg transition-all duration-200 text-center"
                >
                  Explorar tienda
                </Link>
                <Link 
                  href="/cursos" 
                  onClick={close} 
                  className="w-full rounded-xl border border-[var(--pink)] bg-transparent text-[var(--pink)] font-semibold px-4 py-3 hover:bg-[var(--pink)] hover:text-black transition-colors text-center"
                >
                  Ver cursos
                </Link>
              </div>
            </div>
          ) : (
            items.map((it) => {
              const href = it.type === 'product' ? `/tienda/producto/${it.slug}` : `/cursos/detalle/${it.slug}`;
              const qty = isCartLineProduct(it) ? it.quantity : 1;

              // Usamos maxQty del store si está presente (evitamos `any`)
              const maxQty =
                isCartLineProduct(it) && (it as { maxQty?: number | null }).maxQty != null
                  ? (it as { maxQty?: number | null }).maxQty!
                  : undefined;

              const canDec = isCartLineProduct(it) ? qty > 1 : false;
              const canInc = isCartLineProduct(it)
                ? typeof maxQty === 'number'
                  ? qty < maxQty
                  : true
                : false;

              const lineTotal = isCartLineProduct(it) ? it.price * qty : it.price;

              const onIncSafe = () => {
                if (!isCartLineProduct(it)) return;
                if (typeof maxQty === 'number' && qty >= maxQty) return; // bloqueo duro
                inc(it.id);
              };

              return (
                <div
                   key={`${it.type}-${it.id}`}
                   className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-3 hover:shadow-sm transition-shadow duration-200"
                 >
                   <div className="flex gap-3">
                     {/* Miniatura */}
                     <Link href={href} onClick={close} className="block focus:outline-none focus:ring-2 focus:ring-[var(--pink)]/40 rounded-lg flex-shrink-0">
                       <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border)]">
                         <SafeImage src={it.image || '/images/placeholder.jpg'} alt={it.title} ratio="1/1" className="object-cover" />
                       </div>
                     </Link>

                    {/* Info principal */}
                     <div className="flex-1 min-w-0">
                      <Link href={href} onClick={close} className="block">
                        <h4 className="text-sm font-semibold text-[var(--fg)] hover:text-[var(--pink)] line-clamp-2 transition-colors">
                          {it.title}
                        </h4>
                      </Link>
                       
                       <div className="mt-1 flex items-center gap-2">
                         <span className="text-xs text-[var(--muted)]">Precio:</span>
                         <span className="text-sm font-medium text-[var(--fg)]">{formatCurrency(it.price)}</span>
                       </div>

                      {/* Controles de cantidad y acciones */}
                       <div className="mt-2 flex items-center justify-between">
                         {isCartLineProduct(it) ? (
                           <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 rounded-md border border-[var(--pink)]/40 bg-[var(--bg)] px-2 py-1">
                              <button
                                 onClick={() => dec(it.id)}
                                 className="p-1.5 rounded-md text-[var(--fg)] hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pink)]/40"
                                 aria-label="Disminuir cantidad"
                                 disabled={!canDec}
                               >
                                 <Minus className="h-3.5 w-3.5" />
                               </button>
                               <span className="min-w-[1.75rem] text-center text-sm font-bold text-[var(--fg)] tabular-nums px-1.5">{qty}</span>
                               <button
                                 onClick={onIncSafe}
                                 className="p-1.5 rounded-md text-[var(--fg)] hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pink)]/40"
                                 aria-label="Aumentar cantidad"
                                 disabled={!canInc}
                                 title={canInc ? '' : 'Sin stock disponible'}
                               >
                                 <Plus className="h-3.5 w-3.5" />
                               </button>
                          </div>
                          {typeof maxQty === 'number' && (
                             <span className="text-xs text-[var(--muted)]">Stock: {maxQty}</span>
                          )}
                           </div>
                         ) : (
                          <div className="text-xs text-[var(--muted)]">Curso</div>
                         )}
                         
                         <button
                           onClick={() => remove(it.id, it.type)}
                           className="p-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                           aria-label="Eliminar"
                           title="Eliminar del carrito"
                         >
                           <Trash2 className="size-3" />
                         </button>
                       </div>
                      
                      {/* Precio total */}
                       <div className="mt-2 pt-2 border-t border-[var(--border)] flex justify-between items-center">
                         <span className="text-xs text-[var(--muted)]">Total:</span>
                         <div className="text-right">
                           <div className="text-sm font-bold text-[var(--fg)] tabular-nums" aria-live="polite" aria-atomic="true">
                             {formatCurrency(lineTotal)}
                           </div>
                           {isCartLineProduct(it) && qty > 1 && (
                             <div className="text-xs text-[var(--muted)] tabular-nums">({formatCurrency(it.price)} c/u)</div>
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
        <div className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur p-6">
          <div className="space-y-4">
            {/* Resumen de totales */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-[var(--muted)]">
                <span>Subtotal ({count} {count === 1 ? 'artículo' : 'artículos'}):</span>
                <span className="tabular-nums font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold text-[var(--fg)] pt-2 border-t border-[var(--border)]">
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
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">Inicia sesión para continuar</p>
                      <p className="text-yellow-600">Necesitas una cuenta para proceder al pago</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      close();
                      router.push('/auth?redirect=/checkout');
                    }}
                    className="block w-full rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] px-6 py-4 text-center font-bold text-black hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    Iniciar sesión y continuar
                  </button>
                </div>
              ) : (
                <Link
                  href="/checkout"
                  onClick={close}
                  className="block w-full rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] px-6 py-4 text-center font-bold text-black hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pink)]/40"
                >
                  Proceder al pago
                </Link>
              )}
              <div className="flex gap-2">
                <Link
                  href="/tienda"
                  onClick={close}
                  className="flex-1 rounded-xl border border-[var(--pink)] bg-transparent px-4 py-3 text-center font-semibold text-[var(--pink)] hover:bg-[var(--pink)] hover:text-black transition-colors"
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
                      // Por ahora mantenemos la funcionalidad básica
                      // TODO: Implementar modal de confirmación personalizado
                      setTimeout(() => {
                        if (window.confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
                          clear();
                          showSuccess('Carrito vaciado', 'Se han eliminado todos los productos del carrito');
                        }
                      }, 100);
                    }}
                    className="px-4 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
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
