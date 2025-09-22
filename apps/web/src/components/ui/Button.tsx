import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/format';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: 'solid' | 'outline' | 'ghost';
  tone?: 'pink' | 'gold' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
};
export function Button({ asChild, className, variant='solid', tone='neutral', size='md', ...rest }: Props) {
  const Cmp = asChild ? Slot : 'button';
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  const base = `inline-flex items-center justify-center rounded-xl2 ${sizeClasses[size]} focus:outline-none focus-visible:ring-2 ring-offset-2`;
  const tones = {
    neutral: variant === 'solid'
      ? 'bg-black text-white hover:opacity-90 ring-offset-[var(--bg)]'
      : variant === 'outline'
      ? 'border border-default text-[var(--fg)] hover:bg-muted'
      : 'text-[var(--fg)] hover:bg-subtle',
    pink: variant === 'solid'
      ? 'bg-[var(--pink)] text-white hover:bg-[var(--pink-600)]'
      : variant === 'outline'
      ? 'border border-default text-[var(--pink)] hover:bg-subtle'
      : 'text-[var(--pink)] hover:bg-subtle',
    gold: variant === 'solid'
      ? 'bg-[var(--gold)] text-black hover:bg-[var(--gold-600)]'
      : variant === 'outline'
      ? 'border border-default text-[var(--gold)] hover:bg-subtle'
      : 'text-[var(--gold)] hover:bg-subtle',
  };
  return <Cmp className={cn(base, tones[tone], className)} {...rest} />;
}
