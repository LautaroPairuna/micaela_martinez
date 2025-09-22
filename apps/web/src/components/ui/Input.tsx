import { cn } from '@/lib/format';
type Props = React.InputHTMLAttributes<HTMLInputElement> & { 
  label?: string; 
  hint?: string; 
  error?: string;
};
export function Input({ label, hint, error, className, ...rest }: Props) {
  return (
    <label className="block space-y-1">
      {label && <span className="text-sm text-muted">{label}</span>}
      <input
        className={cn(
          'w-full rounded-xl2 border bg-[var(--bg-muted)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] px-3 py-2 outline-none focus:ring-2',
          // Ocultar flechas de inputs numéricos en todos los navegadores
          '[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0',
          '[&[type=number]]:[-moz-appearance:textfield]',
          error 
            ? 'border-red-500 ring-red-500/20 focus:ring-red-500/20' 
            : 'border-default ring-[var(--focus)]',
          className
        )}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...rest}
      />
      {error && (
        <span className="text-xs text-red-600 flex items-center gap-1">
          <span className="w-1 h-1 bg-red-600 rounded-full"></span>
          {error}
        </span>
      )}
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
