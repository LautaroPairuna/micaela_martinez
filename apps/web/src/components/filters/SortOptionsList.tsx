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
    <section aria-labelledby="sort-title" className="rounded-xl2 border border-default">
      <header className="px-3 py-2 border-b border-default">
        <h3 id="sort-title" className="text-sm font-medium font-display">{title}</h3>
      </header>
      <ul className="py-1">
        {options.map((o) => {
          const href = hrefFor(o.value === 'relevancia' ? null : o.value);
          const active = isActive(o.value);
          return (
            <li key={o.value}>
              <Link
                href={href}
                aria-current={active ? 'true' : undefined}
                className={[
                  'flex items-center gap-3 px-3 py-2 transition-colors',
                  'hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]',
                  active ? 'text-[color:var(--gold)] bg-subtle/50' : '',
                ].join(' ')}
              >
                <span aria-hidden className={['grid place-items-center rounded-full border w-4 h-4', active ? 'border-[color:var(--gold)]' : 'border-default'].join(' ')}>
                  <span className={['block rounded-full w-2 h-2', active ? 'bg-[color:var(--gold)]' : 'bg-transparent'].join(' ')} />
                </span>
                <span className="text-sm">{o.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
