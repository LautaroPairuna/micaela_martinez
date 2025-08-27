import { cn } from '@/lib/format';
type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string };
export function Input({ label, hint, className, ...rest }: Props) {
  return (
    <label className="block space-y-1">
      {label && <span className="text-sm text-muted">{label}</span>}
      <input
        className={cn('w-full rounded-xl2 border border-default bg-bg-muted px-3 py-2 outline-none focus:ring-2 ring-[var(--focus)]', className)}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...rest}
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
