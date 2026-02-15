import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/format';
import { Loader2 } from 'lucide-react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: 'solid' | 'outline' | 'ghost';
  tone?: 'pink' | 'gold' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
};

export function Button({ 
  asChild, 
  className, 
  variant='solid', 
  tone='neutral', 
  size='md', 
  isLoading,
  children,
  disabled,
  ...rest 
}: Props) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'h-10 w-10',
  };
  const base = `inline-flex items-center justify-center rounded-xl transition-colors ${sizeClasses[size]} focus:outline-none focus-visible:ring-2 ring-offset-2 disabled:opacity-50 disabled:pointer-events-none`;
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
      ? 'bg-[var(--gold)] text-black hover:bg-[var(--gold-600)] hover:text-white'
      : variant === 'outline'
      ? 'border border-default text-[var(--gold)] hover:bg-subtle'
      : 'text-[var(--gold)] hover:bg-subtle',
  };

  const classes = cn(base, tones[tone], className);

  if (asChild) {
    return (
      <Slot 
        className={classes} 
        {...rest}
      >
        {children}
      </Slot>
    );
  }

  return (
    <button 
      className={classes} 
      disabled={disabled || isLoading}
      {...rest} 
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
