'use client';

import { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Animación abrir/cerrar
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'height' && open) {
        el.style.height = 'auto'; // al terminar apertura
      }
    };
    el.addEventListener('transitionend', onEnd);

    if (open) {
      const target = el.scrollHeight;
      el.style.height = '0px';
      el.getBoundingClientRect(); // reflow
      el.style.height = `${target}px`;
    } else {
      const current = el.scrollHeight;
      el.style.height = `${current}px`;
      el.getBoundingClientRect(); // reflow
      el.style.height = '0px';
    }

    return () => el.removeEventListener('transitionend', onEnd);
  }, [open]);

  // Altura correcta al montar
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = open ? 'auto' : '0px';
  }, []); // mount

  // 🔧 Recalcular en cambios de tamaño/rehidratación para evitar “tiezo”
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      if (open) {
        // si está abierto, aseguramos layout fluido
        el.style.height = 'auto';
      } else {
        // si está cerrado, mantenemos 0
        el.style.height = '0px';
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  return (
    <section className="rounded-xl2 border border-default">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="
          flex w-full items-center justify-between rounded-xl2
          px-3 py-2 sm:px-3 sm:py-2
          hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]
        "
      >
        <span className={`text-sm font-medium font-display ${open ? 'text-[color:var(--gold)]' : ''}`}>
          {title}
        </span>
        <ChevronDown
          className={`size-4 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        ref={contentRef}
        className="overflow-hidden transition-[height] duration-300 ease-in-out will-change-[height]"
      >
        <div className="px-1 pb-2">{children}</div>
      </div>
    </section>
  );
}
