// apps/web/src/components/ui/EmptyState.tsx
import Link from 'next/link';
import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  primary,
  secondary,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
  children?: ReactNode; // Sugerencias extra (chips/listas)
}) {
  return (
    <div className="rounded-xl2 border border-dashed border-default p-8 text-center space-y-3">
      {icon && <div className="mx-auto inline-flex items-center justify-center rounded-full border border-default p-3">{icon}</div>}
      <h2 className="text-lg font-medium">{title}</h2>
      {description && <p className="text-sm text-muted">{description}</p>}

      {(primary || secondary) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {primary && (
            <Link href={primary.href} className="rounded-xl2 border border-default px-3 py-1.5 hover:bg-subtle">
              {primary.label}
            </Link>
          )}
          {secondary && (
            <Link href={secondary.href} className="rounded-xl2 border border-default px-3 py-1.5 hover:bg-subtle">
              {secondary.label}
            </Link>
          )}
        </div>
      )}

      {children && <div className="pt-2">{children}</div>}
    </div>
  );
}
