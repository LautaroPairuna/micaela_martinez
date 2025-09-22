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

  // Animación abrir/cerrar mejorada
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
      el.style.opacity = '0';
      el.style.transform = 'scale(0.95)';
      el.getBoundingClientRect(); // reflow
      el.style.height = `${target}px`;
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    } else {
      const current = el.scrollHeight;
      el.style.height = `${current}px`;
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
      el.getBoundingClientRect(); // reflow
      el.style.height = '0px';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.95)';
    }

    return () => el.removeEventListener('transitionend', onEnd);
  }, [open]);

  // Altura correcta al montar
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = open ? 'auto' : '0px';
  }, [open]); // mount

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
    <section className="rounded-2xl border border-gray-700 bg-gray-900 backdrop-blur-sm transition-all duration-400 ease-out hover:border-[var(--gold)] hover:shadow-lg hover:shadow-[var(--gold)]/10 hover:scale-[1.02]">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="
          flex w-full items-center justify-between rounded-2xl
          px-3 py-2.5 sm:px-4 sm:py-3
          transition-all duration-400 ease-out hover:bg-gray-800/50
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--gold)]
        "
      >
        <span className="text-sm font-bold font-display text-[var(--gold)] uppercase tracking-wide transition-colors">
          {title}
        </span>
        <ChevronDown
          className={`size-4 transition-all duration-400 ease-out ${
            open 
              ? 'rotate-180 text-[var(--gold)] scale-110' 
              : 'text-[var(--gold)]/70 scale-100'
          }`}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        ref={contentRef}
        className="overflow-hidden transition-all duration-400 ease-out will-change-[height,opacity,transform]"
        style={{ transformOrigin: 'top center' }}
      >
        <div className="px-2 pb-3">{children}</div>
      </div>
    </section>
  );
}
