import Link from 'next/link';
import { X } from 'lucide-react';

export function FilterChips({
  items,
  clearHref,
}: {
  items: Array<{ label: string; href: string }>;
  clearHref?: string;
}) {
  if (!items?.length && !clearHref) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it, i) => (
        <Link
          key={i}
          href={it.href}
          className="inline-flex items-center gap-1 rounded-full pill-gold-outline px-3 py-1 text-sm hover:opacity-90"
        >
          {it.label}
          <X className="size-3" aria-hidden="true" />
          <span className="sr-only">Quitar filtro {it.label}</span>
        </Link>
      ))}

      {clearHref && (
        <Link
          href={clearHref}
          className="ml-auto inline-flex items-center gap-1 rounded-xl2 border border-default px-3 py-1.5 text-sm hover:bg-subtle"
        >
          Limpiar filtros
        </Link>
      )}
    </div>
  );
}
