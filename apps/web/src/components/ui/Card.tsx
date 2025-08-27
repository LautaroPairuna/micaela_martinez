// components/ui/Card.tsx
import * as React from 'react';

export function Card({
  children,
  className = '',
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <article
      className={[
        'group/card rounded-xl2 border border-default bg-[var(--bg)] shadow-soft overflow-hidden',
        'transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-0.5',
        'focus-within:ring-2 focus-within:ring-[var(--gold)] focus-within:ring-offset-0',
        className,
      ].join(' ')}
      role="article"
    >
      {children}
    </article>
  );
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={['p-4', className].join(' ')}>{children}</div>;
}
