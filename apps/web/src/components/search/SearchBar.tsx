'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { searchPattern } from '@/lib/patterns';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { useState } from 'react';

type WithQuery<T extends string> = `${T}?${string}`;
type Href = Route | WithQuery<Route>;

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname(); // p.ej. "/tienda" o "/cursos"
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  function makeHref(path: string, query: string, p: ReadonlyURLSearchParams): Href {
    const sp = new URLSearchParams(p.toString());
    if (query) sp.set('q', query); else sp.delete('q');
    const qs = sp.toString();
    return (qs ? (`${path}?${qs}` as Href) : (path as Href));
  }

  return (
    <form
      role="search"
      aria-label="Buscar cursos y productos"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        const href = makeHref(pathname, q, params);
        router.push(href);
      }}
    >
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar cursos y productos"
        pattern={searchPattern.source}
        title="Usa letras, números, espacios y .,´'- (máx. 80)"
        maxLength={80}
        inputMode="search"
        aria-describedby="search-help"
      />
      <Search className="absolute right-3 top-3 h-5 w-5 text-muted pointer-events-none" />
      <span id="search-help" className="sr-only">Pulsa Enter para buscar</span>
    </form>
  );
}
