'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { buildTiendaPrettyPath } from '@/lib/routes';
import { Card, CardBody } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { Price } from '@/components/ui/Price';
import { RatingStars } from '@/components/ui/RatingStars';
import { useFavoritesClient } from '@/hooks/useFavoritesData';
import { AddProductButton } from '@/components/cart/AddProductButton';
import { Heart, Star, ShoppingCart, Eye } from 'lucide-react';

import { resolveProductThumb } from '@/lib/image-utils';

export type ProductCardProps = {
  id?: string | number;
  slug: string;
  titulo: string;
  precio: number;
  precioLista?: number | null;
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
  const rawImg: string | null =
    p.imagenUrl ??
    p.imagenes?.[0]?.url ??
    p.imagen ??
    null;

  // Para el grid usamos el THUMB
  const img = resolveProductThumb(rawImg);

  const compareAt = p.precioLista ?? undefined;
  const hasDiscount = !!(compareAt && compareAt > p.precio);
  const offPct = hasDiscount
    ? Math.round(((Number(compareAt) - p.precio) / Number(compareAt)) * 100)
    : 0;
  const outOfStock = typeof p.stock === 'number' && p.stock <= 0;

  const { isFavorite, toggleFavorite, isLoading } = useFavoritesClient();
  const numericId = p.id 
    ? (typeof p.id === 'number' ? p.id : (/^\d+$/.test(p.id) ? Number(p.id) : undefined))
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
          <SafeImage src={img} alt={p.titulo} ratio="1/1" />
        </div>

        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 translate-y-2 transition-all duration-300 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto">
          <div className="w-[85%] space-y-2">
            <AddProductButton
              p={{
                id: p.id || p.slug,
                slug: p.slug,
                titulo: p.titulo,
                precio: p.precio,
                stock: p.stock,
                imagen: img,
                imagenes: p.imagenes,
              }}
            />
            <Link
              href={`/tienda/producto/${p.slug}`}
              className="block w-full rounded-xl bg-[var(--gold)] px-4 py-2 text-center transition-all duration-300 text-black hover:bg-[var(--gold-200)] hover:shadow-md"
            >
              <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                <span>Ver detalles</span>
              </div>
            </Link>
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
                -{offPct}%
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
        {outOfStock && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-gray-900/90 backdrop-blur-md">
            <div className="rounded-full bg-gray-800 px-4 py-2 text-sm font-semibold text-white shadow-xl border border-gray-600">
              Sin stock
            </div>
          </div>
        )}
        </div>

        {/* Cuerpo */}
        <CardBody className="flex flex-col gap-3 flex-1 p-3 sm:p-4 bg-[#141414] rounded-b-xl">
          {/* Precio */}
          <div className="flex items-baseline justify-between">
            <Price value={p.precio} compareAt={compareAt ?? undefined} tone="pink" />
          </div>

          {/* Título */}
          <h3 className="relative text-base sm:text-lg font-semibold leading-tight line-clamp-2 min-h-[3.5rem] transition-all duration-300 group-hover:text-[var(--gold)] uppercase tracking-wide text-white after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-[var(--pink-strong)] after:rounded-full group-hover:after:w-3/4">
            {p.titulo}
          </h3>

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
                  categoria:
                    p.categoria.slug || slugify(p.categoria.nombre),
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
                precio: p.precio,
                stock: p.stock,
                imagen: img,
                imagenes: p.imagenes,
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

          {/* Rating */}
          {p.ratingProm && p.ratingConteo && p.ratingConteo > 0 && (
            <div className="min-h-[24px] flex items-center">
              <RatingStars
                value={Number(p.ratingProm || 0)}
                count={p.ratingConteo || 0}
                size="sm"
              />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
