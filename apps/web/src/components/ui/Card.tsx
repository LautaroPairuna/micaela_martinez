// components/ui/Card.tsx
import * as React from 'react';

export function Card({
  children,
  className = '',
  ...props
}: React.PropsWithChildren<{ className?: string } & React.HTMLAttributes<HTMLElement>>) {
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
      {...props}
    >
      {children}
    </article>
  );
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={['p-4', className].join(' ')}>{children}</div>;
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={['p-6 pb-4', className].join(' ')}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={['text-lg font-semibold text-[var(--fg)]', className].join(' ')}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={['text-sm text-[var(--fg-muted)] mt-1', className].join(' ')}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={['p-6 pt-0', className].join(' ')}>{children}</div>;
}
