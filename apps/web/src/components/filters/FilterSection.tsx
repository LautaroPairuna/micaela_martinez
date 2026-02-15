'use client';

import { ReactNode, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const panelId = useId();

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all duration-400 ease-out hover:border-[var(--gold)] hover:shadow-lg hover:shadow-[var(--gold)]/10 hover:scale-[1.02]">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="
          flex w-full items-center justify-between rounded-2xl
          px-3 py-2.5 sm:px-4 sm:py-3
          transition-all duration-400 ease-out hover:bg-zinc-800/50
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--gold)]
        "
      >
        <span className="text-sm font-bold font-display text-[var(--gold)] uppercase tracking-wide transition-colors">
          {title}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0, scale: open ? 1.1 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown
            className={`size-4 text-[var(--gold)] ${!open && 'opacity-70'}`}
          />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { height: 'auto', opacity: 1, scale: 1 },
              collapsed: { height: 0, opacity: 0, scale: 0.98 }
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden origin-top"
          >
            <div className="px-2 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
