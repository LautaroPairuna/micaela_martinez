// components/ui/Pill.tsx
'use client';
import * as React from 'react';

type PillTone =
  | 'default'   // borde por defecto
  | 'brand'     // rosa de marca
  | 'muted'     // texto atenuado
  | 'neutral'   // intermedio
  | 'gold'      // dorado del tema
  | 'success'
  | 'warning'
  | 'danger';

type PillSize = 'sm' | 'md';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
  size?: PillSize;
  leadingIcon?: React.ReactNode;
}

export function Pill({
  tone = 'default',
  size = 'md',
  leadingIcon,
  className = '',
  children,
  ...rest
}: PillProps) {
  const toneCls =
    tone === 'brand'
      ? 'border-[var(--pink)] text-[var(--pink)] bg-[var(--pink)]/12'
      : tone === 'muted'
      ? 'border-default text-muted bg-subtle'
      : tone === 'neutral'
      ? 'border-default text-foreground/80 bg-subtle'
      : tone === 'gold'
      ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/14'
      : tone === 'success'
      ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
      : tone === 'warning'
      ? 'border-yellow-300 text-yellow-800 bg-yellow-50'
      : tone === 'danger'
      ? 'border-red-300 text-red-700 bg-red-50'
      : 'border-default text-foreground bg-muted';

  const sizeCls = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      {...rest}
      className={[
        'inline-flex items-center gap-1 rounded-full border align-middle select-none',
        sizeCls,
        toneCls,
        className,
      ].join(' ')}
    >
      {leadingIcon ? <i aria-hidden className="inline-grid place-items-center">{leadingIcon}</i> : null}
      {children}
    </span>
  );
}

export function Badge({ children, tone='pink' }: React.PropsWithChildren<{ tone?: 'pink'|'gold'|'neutral' }>) {
  const m = tone === 'pink' ? 'bg-[var(--pink)] text-white' :
            tone === 'gold' ? 'bg-[var(--gold)] text-black' :
            'bg-subtle text-[var(--fg)]';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs ${m}`}>{children}</span>;
}
