// components/ui/RatingStars.tsx
import * as React from 'react';
import { Star } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg';

interface RatingStarsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;        // 0..5 (acepta decimales)
  count?: number;        // total de reseñas
  size?: Size;           // tamaño de estrella
  showCount?: boolean;   // mostrar (n)
  showValue?: boolean;   // mostrar 4.3/5
  ariaLabel?: string;    // sobreescribe etiqueta accesible
  colorClass?: string;   // por si querés otro color (default: var(--gold))
}

export function RatingStars({
  value = 0,
  count = 0,
  size = 'md',
  showCount = true,
  showValue = false,
  ariaLabel,
  colorClass = 'text-[var(--gold)]',
  className = '',
  ...rest
}: RatingStarsProps) {
  // clamp estable para SSR
  const v = Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0;

  // formateo de conteo
  const nf = React.useMemo(() => new Intl.NumberFormat('es-AR'), []);
  const countLabel = count > 0 ? `(${nf.format(count)})` : '(0)';

  const a11y = ariaLabel ?? `Calificación ${v.toFixed(1)} de 5, ${nf.format(count)} reseñas`;

  const sizeCls =
    size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <div
      className={['inline-flex items-center gap-1', colorClass, className].join(' ')}
      role="img"
      aria-label={a11y}
      {...rest}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        // cuánto se rellena esta estrella (0..1)
        const fill = Math.max(0, Math.min(1, v - i));
        return <StarFraction key={i} fill={fill} sizeCls={sizeCls} />;
      })}

      {showValue && (
        <span className="ml-1 text-xs text-foreground/80">{v.toFixed(1)}</span>
      )}

      {showCount && (
        <span className="ml-1 text-xs text-muted">{countLabel}</span>
      )}

      {/* texto oculto extra para lectores (evita redundancia visual) */}
      <span className="sr-only">{a11y}</span>
    </div>
  );
}

/** Estrella con relleno fraccional usando un overlay recortado */
function StarFraction({ fill, sizeCls }: { fill: number; sizeCls: string }) {
  return (
    <span className="relative inline-block" aria-hidden="true">
      {/* base: contorno sutil */}
      <Star className={[sizeCls, 'stroke-current opacity-30'].join(' ')} />
      {/* overlay: relleno recortado al % */}
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${Math.round(fill * 100)}%` }}
      >
        <Star
          className={[
            sizeCls,
            'fill-current',          // usa currentColor (heredado del contenedor)
            'stroke-[color:transparent]', // evita remarcar bordes (si tu Tailwind no soporta, podés quitarla)
          ].join(' ')}
        />
      </span>
    </span>
  );
}
