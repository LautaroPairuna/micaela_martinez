import Link from 'next/link';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/format';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hrefFor: (page: number | null) => string;
  className?: string;
  showFirstLast?: boolean;
  maxVisiblePages?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  hrefFor,
  className,
  showFirstLast = true,
  maxVisiblePages = 7,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();
  const showStartEllipsis = visiblePages[0] > 2;
  const showEndEllipsis = visiblePages[visiblePages.length - 1] < totalPages - 1;

  return (
    <nav
      className={cn('flex items-center justify-center gap-2 py-4', className)}
      aria-label="Paginación"
    >
      {/* Botón Anterior */}
      {currentPage > 1 ? (
        <Link
          href={hrefFor(currentPage > 1 ? currentPage - 1 : null)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-default hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] transition-all duration-200 hover:scale-105"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      ) : (
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-default/50 text-muted cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" />
        </span>
      )}

      {/* Primera página */}
      {showFirstLast && visiblePages[0] > 1 && (
        <>
          <Link
            href={hrefFor(null)}
            className="inline-flex items-center justify-center min-w-[2.5rem] h-10 px-3 rounded-xl border border-default hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] transition-all duration-200 hover:scale-105 font-medium"
            aria-label="Primera página"
          >
            1
          </Link>
          {showStartEllipsis && (
            <span className="inline-flex items-center justify-center w-10 h-10 text-muted">
              <MoreHorizontal className="w-4 h-4" />
            </span>
          )}
        </>
      )}

      {/* Páginas visibles */}
      {visiblePages.map((pageNum) => {
        const isActive = currentPage === pageNum;
        const href = hrefFor(pageNum > 1 ? pageNum : null);

        return (
          <Link
            key={pageNum}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex items-center justify-center min-w-[2.5rem] h-10 px-3 rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] font-medium',
              isActive
                ? 'border-[color:var(--gold)] bg-[color:var(--gold)]/10 text-[color:var(--gold)] shadow-sm scale-105'
                : 'border-default hover:bg-subtle hover:scale-105'
            )}
          >
            {pageNum}
          </Link>
        );
      })}

      {/* Última página */}
      {showFirstLast && visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {showEndEllipsis && (
            <span className="inline-flex items-center justify-center w-10 h-10 text-muted">
              <MoreHorizontal className="w-4 h-4" />
            </span>
          )}
          <Link
            href={hrefFor(totalPages)}
            className="inline-flex items-center justify-center min-w-[2.5rem] h-10 px-3 rounded-xl border border-default hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] transition-all duration-200 hover:scale-105 font-medium"
            aria-label="Última página"
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* Botón Siguiente */}
      {currentPage < totalPages ? (
        <Link
          href={hrefFor(currentPage + 1)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-default hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] transition-all duration-200 hover:scale-105"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-default/50 text-muted cursor-not-allowed">
          <ChevronRight className="w-4 h-4" />
        </span>
      )}
    </nav>
  );
}

// Componente simplificado para casos básicos
export function SimplePagination({
  currentPage,
  totalPages,
  hrefFor,
  className,
}: Omit<PaginationProps, 'showFirstLast' | 'maxVisiblePages'>) {
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      hrefFor={hrefFor}
      className={className}
      showFirstLast={false}
      maxVisiblePages={5}
    />
  );
}