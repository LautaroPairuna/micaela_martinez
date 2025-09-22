'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { searchPattern } from '@/lib/patterns';
import { SearchDropdown } from './SearchDropdown';
import type { SearchResult } from '@/hooks/useSearchSuggestions';

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = Object.fromEntries(searchParams.entries());
  const [q, setQ] = useState(params.q || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Handlers para el dropdown
  const handleInputFocus = () => {
    setIsFocused(true);
    setIsDropdownOpen(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // Delay para permitir clicks en el dropdown
    setTimeout(() => setIsDropdownOpen(false), 150);
  };

  const handleSelectResult = (result: SearchResult) => {
    const href = result.type === 'course' 
      ? `/cursos/detalle/${result.slug}`
      : `/tienda/producto/${result.slug}`;
    router.push(href);
    setIsDropdownOpen(false);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    
    // Construir href basado en la ruta actual
    const searchParams = new URLSearchParams(params);
    searchParams.set('q', q.trim());
    const href = `${pathname}?${searchParams.toString()}`;
    router.push(href);
    setIsDropdownOpen(false);
    inputRef.current?.blur();
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <form
      ref={formRef}
      role="search"
      aria-label="Buscar cursos y productos"
      className="relative group"
      onSubmit={handleSubmit}
    >
      <div className="relative">
        {/* Fondo con gradiente y efectos */}
        <div className={[
          'absolute inset-0 bg-gradient-to-r from-[var(--gold)]/5 via-transparent to-[var(--gold)]/5 rounded-xl2',
          'transition-opacity duration-300',
          isFocused || isDropdownOpen ? 'opacity-100' : 'opacity-0'
        ].join(' ')} />
        <div className={[
          'absolute inset-0 bg-gradient-to-r from-white to-neutral-50/80 rounded-xl2',
          'transition-shadow duration-300',
          isFocused || isDropdownOpen ? 'shadow-md' : 'shadow-sm'
        ].join(' ')} />
        
        {/* Input mejorado */}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder="Buscar cursos y productos..."
          pattern={searchPattern.source}
          title="Usa letras, números, espacios y .,´'- (máx. 80)"
          maxLength={80}
          inputMode="search"
          aria-describedby="search-help"
          aria-haspopup="listbox"
          className={[
            'relative w-full h-12 pl-12 pr-4 rounded-xl2',
            'border border-neutral-200/60 bg-transparent',
            'text-black placeholder:text-neutral-500',
            'outline-none transition-all duration-300',
            'focus:border-[var(--gold)]/60 focus:ring-2 focus:ring-[var(--gold)]/20',
            'group-hover:border-neutral-300/80',
            'font-medium text-sm'
          ].join(' ')}
        />
        
        {/* Ícono de búsqueda mejorado */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className={[
            'p-1 rounded-lg bg-gradient-to-br transition-all duration-300',
            isFocused || isDropdownOpen 
              ? 'from-[var(--gold)]/30 to-[var(--gold)]/20' 
              : 'from-[var(--gold)]/20 to-[var(--gold)]/10'
          ].join(' ')}>
            <Search className={[
              'h-4 w-4 text-[var(--gold)] transition-transform duration-300',
              isFocused || isDropdownOpen ? 'scale-110' : ''
            ].join(' ')} />
          </div>
        </div>
        
        {/* Indicador de actividad */}
        {q && (isFocused || isDropdownOpen) && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse" />
          </div>
        )}
      </div>
      
      {/* Dropdown de resultados */}
      <SearchDropdown
        query={q}
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        onSelectResult={handleSelectResult}
      />
      
      <span id="search-help" className="sr-only">Pulsa Enter para buscar</span>
    </form>
  );
}
