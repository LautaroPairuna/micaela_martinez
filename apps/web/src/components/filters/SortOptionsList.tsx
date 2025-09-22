import Link from 'next/link';

type Option = { value: string; label: string };

export function SortOptionsList({
  current,
  hrefFor,
  options,
  title = 'Ordenar por',
}: {
  current: string;
  hrefFor: (sortValue: string | null) => string;
  options: Option[];
  title?: string;
}) {
  const isActive = (v: string) => current === v;

  return (
    <section aria-labelledby="sort-title" className="rounded-xl2 border border-default bg-background">
      <header className="px-4 py-3 border-b border-default">
        <h3 id="sort-title" className="text-sm font-medium font-display text-foreground">{title}</h3>
      </header>
      <ul className="p-4 space-y-3">
        {options.map((o) => {
          const href = hrefFor(o.value === 'relevancia' ? null : o.value);
          const active = isActive(o.value);
          return (
            <li key={o.value}>
              <Link
                href={href}
                aria-current={active ? 'true' : undefined}
                className={[
                  'flex items-center gap-3 rounded-full border-2 px-4 py-2.5 transition-all duration-200 mx-2',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]',
                  active 
                    ? 'text-[var(--gold)] font-medium bg-[var(--gold)]/10 border-[var(--gold)]' 
                    : 'text-[var(--gold)] bg-transparent border-[var(--gold)]/50 hover:bg-[var(--gold)]/5 hover:border-[var(--gold)]'
                ].join(' ')}
              >
                <span className={[
                  'flex items-center justify-center rounded-full border-2 w-5 h-5 transition-colors',
                  active ? 'border-[var(--gold)] bg-[var(--gold)]' : 'border-[var(--gold)]/50'
                ].join(' ')}>
                  <span className={[
                    'block rounded-full w-1.5 h-1.5 transition-colors',
                    active ? 'bg-white' : 'bg-transparent'
                  ].join(' ')} />
                </span>
                <span className="text-sm font-medium">{o.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
