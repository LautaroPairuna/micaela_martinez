'use client';

import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { X, Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';
import { useCart, cartSelectors, CartLineProduct } from '@/store/cart';

const money = (cents: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(cents / 100);

function isCartLineProduct(it: any): it is CartLineProduct {
  return it?.type === 'product';
}

export function CartPanel() {
  const isOpen = useCart(s => s.isOpen);
  const close = useCart(s => s.close);
  const items = useCart(s => s.items);
  const remove = useCart(s => s.remove);
  const inc = useCart(s => s.increase);
  const dec = useCart(s => s.decrease);
  const clear = useCart(s => s.clear);

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
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const focusables = el.querySelectorAll<HTMLElement>('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  if (!mounted || !isOpen) return null;

  const subtotal = cartSelectors.subtotalCents(items);
  const count = cartSelectors.count(items);

  return createPortal(
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label="Carrito">
      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden="true"
        className={['absolute inset-0 bg-black/60 backdrop-blur-[1px] transition-opacity',
          show ? 'opacity-100' : 'opacity-0','motion-reduce:transition-none'].join(' ')}
      />
      {/* Panel */}
      <aside
        ref={panelRef}
        className={[
          'absolute right-0 top-0 h-dvh w-full max-w-md bg-[var(--bg)] border-l border-default shadow-2xl',
          'grid grid-rows-[auto_1fr_auto]',
          'transform-gpu transition-transform duration-300',
          show ? 'translate-x-0' : 'translate-x-full',
          'motion-reduce:transition-none'
        ].join(' ')}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 h-16 flex items-center justify-between px-4 border-b border-default bg-[var(--bg)]/95 backdrop-blur">
          <div className="inline-flex items-center gap-2">
            <ShoppingCart className="size-5" />
            <h2 className="text-base font-medium">Tu carrito</h2>
            <span className="text-sm text-muted">({count})</span>
          </div>
          <button
            ref={closeBtnRef}
            onClick={close}
            className="inline-flex items-center gap-2 rounded-xl2 px-2 py-1.5 border border-default hover:bg-subtle"
            aria-label="Cerrar carrito"
          >
            <X className="size-4" /> Cerrar
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-default/70 bg-subtle/30 py-12 text-center">
              <div className="max-w-[18rem] text-sm text-muted">
                Tu carrito está vacío.
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Link href="/tienda" onClick={close} className="rounded-xl2 border border-default px-3 py-1.5 hover:bg-subtle">
                    Ir a la tienda
                  </Link>
                  <Link href="/cursos" onClick={close} className="rounded-xl2 border border-default px-3 py-1.5 hover:bg-subtle">
                    Ver cursos
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            items.map((it) => {
              const href = it.type === 'product' ? `/tienda/detalle/${it.slug}` : `/cursos/detalle/${it.slug}`;
              const qty = isCartLineProduct(it) ? it.quantity : 1;
              const stock = isCartLineProduct(it) ? (it as any).stock as number | undefined : undefined;
              const canDec = isCartLineProduct(it) ? qty > 1 : false;
              const canInc = isCartLineProduct(it) ? (typeof stock === 'number' ? qty < stock : true) : false;

              const lineTotalCents = isCartLineProduct(it) ? it.priceCents * qty : it.priceCents;

              const onIncSafe = () => {
                if (!isCartLineProduct(it)) return;
                if (typeof stock === 'number' && qty >= stock) return; // bloqueo duro
                inc(it.id);
              };

              return (
                <div
                  key={`${it.type}-${it.id}`}
                  className="grid grid-cols-[64px_1fr_auto] gap-3 items-center rounded-xl2 border border-default p-2 bg-[var(--bg)]"
                >
                  {/* Miniatura */}
                  <Link href={href} onClick={close} className="block focus:outline-none focus:ring-2 focus:ring-[var(--pink)] rounded-lg">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-subtle border border-default/60">
                      <SafeImage
                        src={it.image || '/images/placeholder.jpg'}
                        alt={it.title}
                        ratio="1/1"
                        className="object-cover"
                      />
                    </div>
                  </Link>

                  {/* Info + stepper */}
                  <div className="min-w-0">
                    <Link href={href} onClick={close} className="text-sm font-medium hover:text-[var(--pink)] line-clamp-2">
                      {it.title}
                    </Link>

                    {/* Precio unitario */}
                    <div className="mt-0.5 text-xs text-muted">Precio unitario: {money(it.priceCents)}</div>

                    {isCartLineProduct(it) && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-lg border border-default bg-[var(--bg)] px-1 py-1">
                        <button
                          onClick={() => dec(it.id)}
                          className="grid h-7 w-7 place-items-center rounded-md hover:bg-subtle disabled:opacity-40"
                          aria-label="Disminuir cantidad"
                          disabled={!canDec}
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="min-w-[1.75rem] text-center text-sm tabular-nums">{qty}</span>
                        <button
                          onClick={onIncSafe}
                          className="grid h-7 w-7 place-items-center rounded-md hover:bg-subtle disabled:opacity-40"
                          aria-label="Aumentar cantidad"
                          disabled={!canInc}
                          title={canInc ? '' : 'Sin stock disponible'}
                        >
                          <Plus className="size-4" />
                        </button>
                        {typeof stock === 'number' && (
                          <span className="ml-2 text-xs text-muted">Stock: {stock}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Precio total del ítem + eliminar */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-sm font-semibold tabular-nums" aria-live="polite" aria-atomic="true">
                      {money(lineTotalCents)}
                    </div>
                    {isCartLineProduct(it) && (
                      <div className="text-[11px] text-muted tabular-nums">({money(it.priceCents)} c/u)</div>
                    )}
                    <button
                      onClick={() => remove(it.id, it.type)}
                      className="rounded-md border border-default px-2 py-1 text-xs hover:bg-subtle"
                      aria-label="Eliminar"
                      title="Eliminar"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 h-16 px-4 border-t border-default bg-[var(--bg)]/95 backdrop-blur flex items-center justify-between gap-2">
          <div className="text-sm">
            <div className="text-muted">Subtotal</div>
            <div className="font-medium" aria-live="polite" aria-atomic="true">{money(subtotal)}</div>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button onClick={clear} className="rounded-xl2 border border-default px-3 py-1.5 text-sm hover:bg-subtle">
                Vaciar
              </button>
            )}
            <Link
              href="/checkout"
              onClick={close}
              className="rounded-xl2 border border-default px-3 py-1.5 text-sm bg-[var(--gold)] text-neutral-950 hover:brightness-95"
              aria-disabled={items.length === 0}
            >
              Finalizar compra
            </Link>
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}
