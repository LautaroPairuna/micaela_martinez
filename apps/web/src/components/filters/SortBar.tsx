// SSR-friendly (sin "use client")
import Link from 'next/link';

type Option = { value: string; label: string };

export function SortBar({
  current,
  hrefFor,
  actionHref,
  hiddenFields = {},
  showButton = true,
  options,
}: {
  options: Option[];
  current?: string;
  hrefFor?: (sortValue: string | null) => string;
  actionHref?: string;
  hiddenFields?: Record<string, string | number | undefined | null>;
  showButton?: boolean;
}) {
  // ---- MODO LINKS (recomendado)
  if (typeof hrefFor === 'function') {
    const chipBase =
      'rounded-full border-2 px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';
    const activeCls =
      'text-[var(--gold)] bg-[var(--gold)]/10 border-[var(--gold)] shadow-sm focus-visible:ring-[var(--gold)]';
    const idleCls = 'text-[var(--gold)] bg-transparent border-[var(--gold)]/50 hover:bg-[var(--gold)]/5 hover:border-[var(--gold)] focus-visible:ring-[var(--gold)]';

    return (
      <div className="min-w-0">
        <nav aria-label="Orden" className="text-sm">
          <ul
            className="
              sortbar-chips
              -mx-1 px-3 py-3 flex items-center gap-3 sm:gap-4
              overflow-x-auto no-scrollbar
              snap-x snap-mandatory
              scrollbar-none
            "
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {options.map((o) => {
              const href = hrefFor(o.value === 'relevancia' ? null : o.value);
              const isActive = current === o.value;
              return (
                <li key={o.value} className="shrink-0 snap-start">
                  <Link
                    href={href}
                    aria-current={isActive ? 'true' : undefined}
                    className={`${chipBase} ${isActive ? activeCls : idleCls}`}
                  >
                    {o.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    );
  }

  // ---- MODO FORM (fallback retro-compat)
  // Resolvemos defaultValue sin `any`, y evitamos duplicar `sort` en los hidden
  const sortCandidate = (hiddenFields && hiddenFields['sort']) ?? current;
  const defaultSort =
    typeof sortCandidate === 'string' || typeof sortCandidate === 'number'
      ? String(sortCandidate)
      : 'relevancia';

  return (
    <form method="GET" action={actionHref} className="flex items-center gap-2">
      {Object.entries(hiddenFields)
        .filter(([k]) => k !== 'sort') // no dupliquemos `sort`
        .map(([k, v]) =>
          v === null || v === undefined || v === '' ? null : (
            <input key={k} type="hidden" name={k} defaultValue={String(v)} />
          )
        )}

      <label className="text-sm text-muted-foreground font-medium">
        Ordenar:&nbsp;
        <select
          name="sort"
          className="rounded-xl2 border border-default bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground"
          defaultValue={defaultSort}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {showButton && (
        <button
          type="submit"
          className="rounded-xl2 border border-default px-3 py-2 text-sm font-medium transition-colors hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground"
        >
          Aplicar
        </button>
      )}
    </form>
  );
}
