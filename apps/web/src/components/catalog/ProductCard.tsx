// components/catalog/ProductCard.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { buildTiendaPrettyPath } from '@/lib/routes';
import { Card, CardBody } from '@/components/ui/Card';
import { Price } from '@/components/ui/Price';
import { RatingStars } from '@/components/ui/RatingStars';
import { useFavoritesClient } from '@/hooks/useFavoritesData';
import { AddProductButton } from '@/components/cart/AddProductButton';
import { Heart, Star, ShoppingCart, Eye } from 'lucide-react';
import { resolveProductThumb } from '@/lib/image-utils';
import { SafeImage } from '@/components/ui/SafeImage';
import { calculatePrice } from '@/lib/price-utils';

export type ProductCardProps = {
  id?: string | number;
  slug: string;
  titulo: string;
  precio: number;
  descuento?: number | null;
  imagen?: string | null;
  imagenes?: { url: string }[] | null;
  destacado?: boolean | null;
  stock?: number | null;
  ratingProm?: number | string | null;
  ratingConteo?: number | null;
  marca?: { nombre?: string | null; slug?: string | null } | null;
  categoria?: { nombre?: string | null; slug?: string | null } | null;
  /** opcional, si tu API ya manda la URL resuelta */
  imagenUrl?: string;
};

export function ProductCard({ p }: { p: ProductCardProps }) {
  const [mounted, setMounted] = useState(false);

  const slugify = (s?: string | null) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  // Origen de imagen: prioridad imagenUrl → primera de imagenes → imagen
  const rawImg: string | null = p.imagenUrl ?? p.imagenes?.[0]?.url ?? p.imagen ?? null;

  // Para el grid usamos el THUMB
  const img = resolveProductThumb(rawImg);

  const { precio, stock } = p;
  const isOutOfStock = (stock ?? 0) <= 0;

  // Calculamos el precio final usando la utilidad centralizada
  const { final: precioFinal, original: precioOriginal, hasDiscount, discountPercentage } = calculatePrice(
    precio,
    p.descuento
  );

  const { isFavorite, toggleFavorite, isLoading } = useFavoritesClient();
  const numericId = p.id
    ? typeof p.id === 'number'
      ? p.id
      : /^\d+$/.test(String(p.id))
        ? Number(p.id)
        : undefined
    : undefined;

  const isFav = mounted && numericId ? isFavorite(numericId) : false;

  useEffect(() => setMounted(true), []);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!numericId) return;
    if (!isLoading) {
      await toggleFavorite(numericId, p.titulo);
    }
  };

  return (
    <div className="relative group">
      <div className="pointer-events-none absolute -inset-6 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100 bg-[radial-gradient(80%_80%_at_50%_50%,rgba(255,45,149,0.55),transparent_72%)]" />

      <Card className="relative h-full flex flex-col border border-[#131313] bg-[#141414] backdrop-blur-sm transition-all duration-300 ease-out hover:border-[var(--gold)] hover:shadow-xl hover:shadow-[var(--gold)]/20 hover:-translate-y-1 touch-manipulation rounded-xl">
        {/* Imagen */}
        <div className="relative overflow-hidden rounded-t-xl">
          <div className="transition-transform duration-500 ease-out group-hover:scale-105">
            <Link href={`/tienda/producto/${p.slug}`} className="block aspect-[4/5] bg-gray-900 relative">
              {img ? (
                <SafeImage
                  src={img}
                  alt={p.titulo}
                  className="w-full h-full object-cover"
                  ratio="4/5"
                  fit="cover"
                  hoverZoom={false} // Ya tenemos zoom en el wrapper
                  useBackendProxy={false} // img ya viene resuelto
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-gray-700">
                  <span className="text-xs">Sin imagen</span>
                </div>
              )}
            </Link>

            {/* Overlay Hover Actions */}
            <div className="absolute inset-0 z-20 hidden lg:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/60 backdrop-blur-[3px] rounded-t-xl">
              <div className="flex flex-col gap-3 w-full px-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <AddProductButton
                  p={{
                    id: p.id || p.slug,
                    slug: p.slug,
                    titulo: p.titulo,
                    precio: precioFinal,
                    stock: p.stock,
                    imagen: img,
                    imagenes: p.imagenes,
                    descuento: p.descuento,
                  }}
                  className="w-full bg-[var(--pink)] text-white hover:bg-[var(--pink-strong)] shadow-lg shadow-[var(--pink)]/20 border border-[var(--pink-strong)]/30 font-bold tracking-wide"
                />
                <Link
                  href={`/tienda/producto/${p.slug}`}
                  className="group/btn flex items-center justify-center w-full py-2 rounded-xl bg-white text-black hover:bg-gray-100 shadow-lg font-bold tracking-wide transition-all duration-200"
                >
                  <Eye className="w-4 h-4 mr-2 transition-transform group-hover/btn:scale-110" />
                  Ver detalle
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Badges superiores */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {p.destacado ? (
              <span className="animate-pulse rounded-full px-3 py-1.5 text-xs font-bold text-black shadow-lg backdrop-blur-sm border border-[var(--gold-700)] bg-[var(--gold)] flex items-center gap-1.5">
                <Star className="h-3 w-3 fill-current" />
                Destacado
              </span>
            ) : null}

            {hasDiscount && (
              <span className="rounded-full bg-[var(--pink)] px-2.5 py-1 text-xs font-bold text-black shadow-lg border border-[var(--pink-strong)]/30">
                -{discountPercentage}%
              </span>
            )}
          </div>

          {/* Botón de favoritos */}
          {numericId && (
            <button
              onClick={handleFavoriteClick}
              disabled={isLoading}
              className="pointer-events-auto group/fav relative p-2.5 rounded-full bg-gray-800/95 backdrop-blur-md shadow-lg hover:bg-gray-700 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 border border-gray-600/20"
              title={isFav ? 'Eliminar de favoritos' : 'Agregar a favoritos'}
            >
              <Heart
                className={`h-4 w-4 transition-all duration-300 ${
                  isFav
                    ? 'fill-[var(--pink)] text-[var(--pink)] animate-pulse'
                    : 'text-gray-300 group-hover/fav:text-[var(--pink)] group-hover/fav:scale-110'
                }`}
              />
            </button>
          )}
        </div>

        {/* Sin stock */}
        {isOutOfStock && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-gray-900/90 backdrop-blur-md">
            <div className="rounded-full bg-gray-800 px-4 py-2 text-sm font-semibold text-white shadow-xl border border-gray-600">
              Sin stock
            </div>
          </div>
        )}

        {/* Cuerpo */}
        <CardBody className="flex flex-col gap-3 flex-1 p-3 sm:p-4 bg-[#141414] rounded-b-xl">
          {/* Precio */}
          <div className="flex items-baseline justify-between">
            <Price value={precioFinal} compareAt={precioOriginal} tone="pink" />
          </div>

          {/* Título */}
          <h3 className="relative text-base sm:text-lg font-semibold leading-tight line-clamp-2 min-h-[3.5rem] transition-all duration-300 group-hover:text-[var(--gold)] uppercase tracking-wide text-white after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-[var(--pink-strong)] after:rounded-full group-hover:after:w-3/4">
            {p.titulo}
          </h3>

          {/* Rating */}
          {p.ratingConteo && p.ratingConteo > 0 ? (
            <div className="flex items-center gap-2 h-5">
              <RatingStars value={Number(p.ratingProm || 0)} size="sm" />
              <span className="text-xs text-gray-500">({p.ratingConteo})</span>
            </div>
          ) : (
            <>
              <div className="h-5" />
              {/* Espaciador para mantener altura consistente */}
            </>
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {p.marca?.nombre ? (
              <Link
                href={buildTiendaPrettyPath({
                  marca: p.marca.slug || slugify(p.marca.nombre),
                })}
                className="inline-flex items-center rounded-full bg-[var(--gold)]/15 border border-[var(--gold)]/30 px-3 py-1 text-xs font-medium text-[var(--gold)] transition-all duration-200 hover:bg-[var(--gold)]/25"
              >
                {p.marca.nombre}
              </Link>
            ) : null}

            {p.categoria?.nombre ? (
              <Link
                href={buildTiendaPrettyPath({
                  categoria: p.categoria.slug || slugify(p.categoria.nombre),
                })}
                className="inline-flex items-center rounded-full bg-[var(--pink)]/10 border border-[var(--pink)]/25 px-3 py-1 text-xs font-medium text-[var(--pink)] transition-all duration-200 hover:bg-[var(--pink)]/20"
              >
                {p.categoria.nombre}
              </Link>
            ) : null}
          </div>

          {/* Botones Móviles (Touch) */}
          <div className="flex gap-2 mt-3 lg:hidden">
            <AddProductButton
              p={{
                id: p.id || p.slug,
                slug: p.slug,
                titulo: p.titulo,
                precio: precioFinal,
                stock: p.stock,
                imagen: img,
                imagenes: p.imagenes,
                descuento: p.descuento,
              }}
              className="flex-1 bg-[var(--gold)] text-black text-xs font-bold py-2 rounded-lg hover:bg-[var(--gold-200)] shadow-sm"
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
              Agregar
            </AddProductButton>

            <Link
              href={`/tienda/producto/${p.slug}`}
              className="flex items-center justify-center px-3 py-2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-zinc-200 hover:bg-[#252525] transition-colors"
              aria-label="Ver detalles"
            >
              <Eye className="h-4 w-4" />
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}