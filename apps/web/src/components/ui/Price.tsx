import { formatCurrency } from '@/lib/format';
export function Price({ value, compareAt, className }: { value: number; compareAt?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <span className="text-gold font-semibold">{formatCurrency(value)}</span>
      {compareAt && compareAt > value && (
        <span className="text-muted line-through">{formatCurrency(compareAt)}</span>
      )}
    </div>
  );
}
