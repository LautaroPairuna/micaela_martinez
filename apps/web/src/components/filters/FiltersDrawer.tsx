'use client';

import { ReactNode, useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { createPortal } from 'react-dom';

// Hook simple de media query (SSR-safe)
function useMediaQuery(query: string) {
  const get = () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener?.('change', onChange);
    // sync en mount
    setMatches(mq.matches);
    return () => mq.removeEventListener?.('change', onChange);
  }, [query]);
  return matches;
}

export function FiltersDrawer({
  children,
  badgeCount = 0,
  label = 'Filtros',
}: {
  children: ReactNode;
  badgeCount?: number;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const isLg = useMediaQuery('(min-width:1024px)');

  // Montaje (portal listo)
  useEffect(() => setMounted(true), []);

  // Lock/unlock scroll del body
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      // cleanup ante cualquier cambio/unmount
      document.body.style.overflow = prev;
    };
  }, [open, mounted]);

  // Al pasar a lg, cerramos el drawer y liberamos body
  useEffect(() => {
    if (isLg && open) setOpen(false);
  }, [isLg, open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      {/* visible solo < lg */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center gap-2 rounded-xl2 border border-default px-3 py-2 hover:bg-subtle"
      >
        <SlidersHorizontal className="size-4" />
        {label}
        {badgeCount > 0 && (
          <span
            className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full text-xs"
            style={{ color: 'var(--bg)', backgroundColor: 'var(--gold)' }}
          >
            {badgeCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label="Filtros">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 opacity-100 transition-opacity"
              onClick={() => setOpen(false)}
            />
            {/* Sheet inferior */}
            <aside
              className="
                absolute inset-x-0 bottom-0 h-[85vh] rounded-t-2xl bg-[var(--bg)]
                border-t border-default shadow-2xl
                transition-transform duration-300 translate-y-0 will-change-transform
              "
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-default">
                <div className="font-medium">{label}</div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl2 border border-default px-2 py-1.5 hover:bg-subtle"
                >
                  <X className="size-4" /> Cerrar
                </button>
              </div>

              <div className="h-[calc(85vh-3rem)] overflow-y-auto p-3">
                {children}
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
