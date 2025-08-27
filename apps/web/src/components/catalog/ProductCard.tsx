import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { Pill } from '@/components/ui/Pill';
import { Price } from '@/components/ui/Price';
import { RatingStars } from '@/components/ui/RatingStars';
import { ShoppingCart } from 'lucide-react';

type ProductMinimal = {
  id?: string;
  slug: string;
  titulo: string;
  precio: number;             // centavos
  precioLista?: number | null;
  imagen?: string | null;
  imagenes?: { url: string }[];
  destacado?: boolean | null;
  stock?: number | null;
  ratingProm?: number | string | null;
  ratingConteo?: number | null;
  marca?: { nombre?: string | null } | null;
  categoria?: { nombre?: string | null } | null;
};

export function ProductCard({ p }: { p: ProductMinimal }) {
  const img = p.imagenes?.[0]?.url || p.imagen || null;
  const compareAt = p.precioLista ?? undefined;
  const hasDiscount = !!(compareAt && compareAt > p.precio);
  const offPct = hasDiscount ? Math.round(((Number(compareAt) - p.precio) / Number(compareAt)) * 100) : 0;
  const outOfStock = typeof p.stock === 'number' && p.stock <= 0;

  return (
    <Link
      href={`/tienda/detalle/${p.slug}`}
      className="group block h-full touch-manipulation focus:outline-none focus-visible:ring-2"
      style={{ outlineOffset: 2, WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Quitamos overflow en el wrapper para no cortar texto */}
      <Card className="h-full flex flex-col border transition-colors duration-200 group-hover:border-[color:var(--gold)]">
        {/* Imagen */}
        <div className="relative overflow-hidden">
          <SafeImage src={img} alt={p.titulo} ratio="1/1" />

          {/* Badges superiores */}
          <div className="pointer-events-none absolute inset-x-2 top-2 z-30 flex items-center gap-2">
            {p.destacado ? (
              <span
                className="rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-medium shadow-sm"
                style={{ color: 'var(--bg)', backgroundColor: 'var(--gold)' }}
              >
                Destacado
              </span>
            ) : null}
          </div>

          {/* Sin stock */}
          {outOfStock && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-white/70 backdrop-blur-sm">
              <Pill tone="neutral">Sin stock</Pill>
            </div>
          )}
        </div>

        {/* Cuerpo */}
        <CardBody className="flex flex-col gap-2 sm:gap-2.5 flex-1 p-2.5 sm:p-3">
          {/* Precio */}
          <div className="flex items-baseline justify-between">
            <Price value={p.precio / 100} compareAt={compareAt ? compareAt / 100 : undefined} />
            {hasDiscount && (
              <span className="pill-gold-outline rounded-full px-2 py-0.5 text-[11px] sm:text-xs font-medium">
                -{offPct}%
              </span>
            )}
          </div>

          {/* Título (dos líneas seguras) */}
          <h3
            className="text-[15px] sm:text-base font-medium leading-[1.35] line-clamp-2 transition-colors group-hover:text-[color:var(--gold)] pb-0.5 uppercase"
            style={{ minHeight: 'calc(2 * 1em * 1.35 + 2px)' }}
          >
            {p.titulo}
          </h3>

          {/* Meta — oculto en móvil para ganar espacio */}
          <div className="hidden sm:flex flex-wrap gap-2 leading-[1.25]" style={{ minHeight: '1.8rem' }}>
            {p.marca?.nombre ? (
              <span className="pill-gold-outline inline-flex items-center rounded-full px-2.5 py-1 text-xs">
                {p.marca.nombre}
              </span>
            ) : null}
            {p.categoria?.nombre ? (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs border border-default text-muted">
                {p.categoria.nombre}
              </span>
            ) : null}
          </div>

          {/* Rating */}
          <div className="h-[18px] sm:h-[20px]">
            {p.ratingProm ? (
              <RatingStars value={Number(p.ratingProm || 0)} count={p.ratingConteo || 0} size="sm" />
            ) : (
              <div className="h-full invisible" />
            )}
          </div>

          {/* CTA — solo en >= sm (en móvil toda la card ya es el CTA) */}
          <div className="mt-auto pt-1 hidden sm:block">
            <span className="inline-flex items-center gap-2 rounded-xl2 border border-default px-3 py-1.5 text-sm transition-colors">
              <ShoppingCart className="size-4" />
              <span className="transition-colors group-hover:text-[color:var(--gold)]">Ver producto</span>
            </span>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
