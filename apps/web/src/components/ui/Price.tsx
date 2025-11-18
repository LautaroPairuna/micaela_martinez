import { formatCurrency } from '@/lib/format';
export function Price({ value, compareAt, className, tone = 'gold' }: { value: number; compareAt?: number; className?: string; tone?: 'gold' | 'pink' }) {
  const toneCls = tone === 'pink' ? 'text-[var(--pink)]' : 'text-gold';
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <span className={`${toneCls} font-semibold`}>{formatCurrency(value)}</span>
      {compareAt && compareAt > value && (
        <span className="text-muted line-through">{formatCurrency(compareAt)}</span>
      )}
    </div>
  );
}
