'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, BookOpen, ShoppingBag, TrendingUp, Star } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';
import { useSearchSuggestions, usePopularSearchTerms, addRecentSearch } from '@/hooks/useSearchSuggestions';
import { formatCurrency } from '@/lib/format';
import type { SearchResult } from '@/hooks/useSearchSuggestions';

type SearchDropdownProps = {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: SearchResult) => void;
};

function SearchResultItem({ result, isHighlighted, onClick }: {
  result: SearchResult;
  isHighlighted: boolean;
  onClick: () => void;
}) {
  const href = result.type === 'course' 
    ? `/cursos/detalle/${result.slug}`
    : `/tienda/producto/${result.slug}`;

  const Icon = result.type === 'course' ? BookOpen : ShoppingBag;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'flex items-center gap-3 p-3 rounded-lg transition-all duration-200',
        'hover:bg-gradient-to-r hover:from-[var(--gold)]/5 hover:to-[var(--gold)]/10',
        'focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30',
        isHighlighted ? 'bg-gradient-to-r from-[var(--gold)]/5 to-[var(--gold)]/10' : '',
      ].join(' ')}
    >
      {/* Imagen o ícono */}
      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
        {result.image ? (
          <SafeImage
            src={result.image}
            alt={result.title}
            className="w-full h-full"
            imgClassName="object-cover"
            ratio="1/1"
            withBg={false}
            rounded="all"
            skeleton={false}
            sizes="48px"
          />
        ) : (
          <Icon className="w-6 h-6 text-neutral-500" />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-black truncate">
          {result.title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-neutral-600 capitalize">
            {result.type === 'course' ? 'Curso' : 'Producto'}
          </span>
          {result.rating && typeof result.rating === 'number' && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-[var(--gold)] fill-current" />
              <span className="text-xs text-neutral-600">
                {result.rating.toFixed(1)}
              </span>
              {result.ratingCount && (
                <span className="text-xs text-neutral-600">
                  ({result.ratingCount})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Precio */}
      <div className="flex-shrink-0">
        <span className="font-semibold text-sm text-[var(--gold)]">
          {formatCurrency(result.price)}
        </span>
      </div>
    </Link>
  );
}

function PopularTerms({ onSelectTerm }: { onSelectTerm: (term: string) => void }) {
  const { courses, products, isLoading } = usePopularSearchTerms();

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[var(--gold)]" />
          <span className="text-sm font-medium text-black">
            Cargando sugerencias...
          </span>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 bg-neutral-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-[var(--gold)]" />
        <span className="text-sm font-medium text-black">
          Búsquedas populares
        </span>
      </div>
      
      <div className="space-y-3">
        {courses.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-neutral-600 mb-2">Cursos</h5>
            <div className="flex flex-wrap gap-2">
              {courses.map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    onSelectTerm(term);
                    addRecentSearch(term);
                  }}
                  className="px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-[var(--gold)]/10 to-[var(--gold)]/5 text-black hover:from-[var(--gold)]/20 hover:to-[var(--gold)]/10 transition-all duration-200"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {products.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-neutral-600 mb-2">Productos</h5>
            <div className="flex flex-wrap gap-2">
              {products.map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    onSelectTerm(term);
                    addRecentSearch(term);
                  }}
                  className="px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-neutral-100 to-neutral-50 text-black hover:from-neutral-200 hover:to-neutral-100 transition-all duration-200"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SearchDropdown({ query, isOpen, onClose, onSelectResult }: SearchDropdownProps) {
  const { courses, products, isLoading } = useSearchSuggestions(query);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasResults = courses.length > 0 || products.length > 0;
  const showPopular = !query.trim() || (!hasResults && !isLoading);

  // Manejar navegación por teclado
  useEffect(() => {
    const allResults = [...courses, ...products];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < allResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : allResults.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && allResults[highlightedIndex]) {
            onSelectResult(allResults[highlightedIndex]);
            onClose();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, courses, products, highlightedIndex, onSelectResult, onClose]);

  // Reset highlight cuando cambian los resultados
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className={[
          'absolute top-full left-0 right-0 mt-2 z-50',
          'bg-white rounded-xl2 shadow-2xl border border-neutral-200/60',
          'max-h-96 overflow-y-auto overscroll-contain',
          'animate-in slide-in-from-top-2 duration-200',
        ].join(' ')}
      >
        {isLoading && (
          <div className="p-4 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-neutral-600">
              <div className="w-4 h-4 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
              Buscando...
            </div>
          </div>
        )}

        {!isLoading && hasResults && (
          <div className="py-2">
            {courses.length > 0 && (
              <div className="mb-4">
                <div className="px-4 py-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[var(--gold)]" />
                    <span className="text-sm font-medium text-black">
                      Cursos ({courses.length})
                    </span>
                  </div>
                </div>
                <div className="px-2 py-1 space-y-1">
                  {courses.map((result, index) => (
                    <SearchResultItem
                      key={`course-${result.id}`}
                      result={result}
                      isHighlighted={index === highlightedIndex}
                      onClick={() => {
                        onSelectResult(result);
                        addRecentSearch(query.trim() || result.title);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {products.length > 0 && (
              <div>
                <div className="px-4 py-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[var(--gold)]" />
                    <span className="text-sm font-medium text-black">
                      Productos ({products.length})
                    </span>
                  </div>
                </div>
                <div className="px-2 py-1 space-y-1">
                  {products.map((result, index) => (
                    <SearchResultItem
                      key={`product-${result.id}`}
                      result={result}
                      isHighlighted={courses.length + index === highlightedIndex}
                      onClick={() => {
                        onSelectResult(result);
                        addRecentSearch(query.trim() || result.title);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && !hasResults && query.trim() && (
          <div className="p-6 text-center">
            <Search className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm text-neutral-600 mb-1">
              No encontramos resultados para &quot;{query}&quot;
            </p>
            <p className="text-xs text-neutral-600">
              Intenta con otros términos de búsqueda
            </p>
          </div>
        )}

        {showPopular && (
          <PopularTerms 
            onSelectTerm={(term) => {
              // Usar el término seleccionado para realizar búsqueda
              onSelectResult({ id: term, title: term, type: 'course', slug: term, price: 0 });
              onClose();
            }} 
          />
        )}
      </div>
    </>
  );
}