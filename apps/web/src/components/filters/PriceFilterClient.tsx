'use client';
import { useState } from 'react';
import { buildTiendaPrettyPath } from '@/lib/routes';

export function PriceFilterClient({
  categoria,
  marca,
  q,
  sort,
  minPrice,
  maxPrice,
  placeholderMin,
  placeholderMax,
}: {
  categoria?: string;
  marca?: string;
  q: string;
  sort: string | null;
  minPrice?: number;
  maxPrice?: number;
  placeholderMin?: number;
  placeholderMax?: number;
}) {
  const [minV, setMinV] = useState<string>(minPrice != null ? String(minPrice) : '');
  const [maxV, setMaxV] = useState<string>(maxPrice != null ? String(maxPrice) : '');

  return (
    <form
      method="GET"
      action={buildTiendaPrettyPath({ categoria, marca, q, sort, page: null })}
      className="space-y-2 sm:space-y-3"
      aria-label="Filtrar por precio"
    >
      <input type="hidden" name="q" defaultValue={q} />
      {categoria && <input type="hidden" name="categoria" value={categoria} />}
      {marca && <input type="hidden" name="marca" value={marca} />}

      <label className="text-xs font-medium text-zinc-400">Mín. precio (ARS)</label>
      <input
        name="minPrice"
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        pattern="[0-9]*"
        value={minV}
        placeholder={placeholderMin != null ? String(placeholderMin) : undefined}
        onChange={(e) => setMinV(e.target.value)}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900/50 text-white px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pink)] placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <label className="text-xs font-medium text-zinc-400">Máx. precio (ARS)</label>
      <input
        name="maxPrice"
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        pattern="[0-9]*"
        value={maxV}
        placeholder={placeholderMax != null ? String(placeholderMax) : undefined}
        onChange={(e) => setMaxV(e.target.value)}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900/50 text-white px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pink)] placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <button
        className="w-full rounded-xl2 border border-[color:var(--gold)] text-[color:var(--gold)] px-3 py-2 transition-colors hover:bg-[color:var(--gold)]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!minV && !maxV}
        aria-disabled={!minV && !maxV || undefined}
      >
        Aplicar
      </button>
    </form>
  );
}