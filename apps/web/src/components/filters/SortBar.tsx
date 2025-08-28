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
      'rounded-full border px-3 py-1.5 text-sm transition-colors whitespace-nowrap';
    const activeCls =
      'text-[color:var(--gold)] bg-subtle/50 border-[color:color-mix(in oklab,var(--gold) 70%,#000 30%)]';
    const idleCls = 'border-default hover:bg-subtle';

    return (
      <div className="min-w-0">
        <nav aria-label="Orden" className="text-sm">
          <ul
            className="
              sortbar-chips
              -mx-2 px-2 flex items-center gap-2 sm:gap-3
              overflow-x-auto no-scrollbar
              snap-x snap-mandatory
            "
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

      <label className="text-sm text-muted">
        Ordenar:&nbsp;
        <select
          name="sort"
          className="rounded-xl2 border border-default bg-bg-muted px-2 py-1"
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
          className="rounded-xl2 border border-default px-2 py-1 text-sm hover:bg-subtle"
        >
          Aplicar
        </button>
      )}
    </form>
  );
}
