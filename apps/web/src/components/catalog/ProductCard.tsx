'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { Price } from '@/components/ui/Price';
import { RatingStars } from '@/components/ui/RatingStars';
import { useFavorites } from '@/store/favorites';
import { AddProductButton } from '@/components/cart/AddProductButton';
import { Heart, Star } from 'lucide-react';

type ProductMinimal = {
  id?: string;
  slug: string;
  titulo: string;
  precio: number;
  precioLista?: number | null;
  imagen?: string | null;
  imagenes?: { url: string }[];
  destacado?: boolean | null;
  stock?: number | null;
  ratingProm?: number | string | null;
  ratingConteo?: number | null;
  marca?: { nombre?: string | null } | null;
  categoria?: { nombre?: string | null } | null;
  /** opcional, si tu API ya manda la URL resuelta */
  imagenUrl?: string;
};

/** Normaliza una referencia de imagen para que funcione con el rewrite de Next y use el thumbnail cuando sea de productos. */
function resolveProductThumb(src?: string | null): string | undefined {
  if (!src) return undefined;

  // Remota/CDN → dejar como está
  if (src.startsWith('http://') || src.startsWith('https://')) return src;

  // Ya viene con /images...
  if (src.startsWith('/images/')) {
    // Si no tiene /thumbs/ en el tramo de la carpeta, lo insertamos
    // /images/<folder>/[thumbs/]filename
    if (!/\/images\/[^/]+\/thumbs\//.test(src)) {
      return src.replace(/^\/images\/([^/]+)\//, '/images/$1/thumbs/');
    }
    return src;
  }

  // Viene como 'producto/foo.webp' o 'producto/thumbs/foo.webp'
  if (/^[^/]+\/[^/]+/.test(src)) {
    // Si ya está el segmento thumbs, prefijamos /images/ y salimos
    if (/^[^/]+\/thumbs\//.test(src)) {
      return `/images/${src}`;
    }
    // Insertar thumbs entre la carpeta y el archivo
    return `/images/${src.replace(/^([^/]+)\//, '$1/thumbs/')}`;
  }

  // Solo filename → asumir carpeta 'producto'
  return `/images/producto/thumbs/${src}`;
}

/** Para casos donde quieras el original (detalle de producto, zoom, etc.) */
export function resolveProductOriginal(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('/images/')) {
    return src.replace('/thumbs/', '/'); // si venía con thumbs, lo quitamos
  }
  if (/^[^/]+\/thumbs\//.test(src)) {
    return `/images/${src.replace('/thumbs/', '/')}`;
  }
  if (/^[^/]+\/[^/]+/.test(src)) {
    return `/images/${src}`;
  }
  return `/images/producto/${src}`;
}

export function ProductCard({ p }: { p: ProductMinimal }) {
  const [mounted, setMounted] = useState(false);

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

  const { isFavorite, toggleFavorite, isLoading } = useFavorites();
  const isFav = mounted && p.id ? isFavorite(p.id) : false;

  useEffect(() => setMounted(true), []);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (p.id && !isLoading) {
      await toggleFavorite(p.id, p.titulo);
    }
  };

  // Navegación por click a toda la tarjeta (manteniendo el Link del CTA)
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    window.location.href = `/tienda/producto/${p.slug}`;
  };

  return (
    <Card
      className="group h-full flex flex-col border border-gray-700 bg-gray-900 backdrop-blur-sm transition-all duration-300 ease-out hover:border-[var(--gold)] hover:shadow-xl hover:shadow-[var(--gold)]/20 hover:-translate-y-1 touch-manipulation cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Imagen */}
      <div className="relative overflow-hidden rounded-t-xl">
        <div className="transition-transform duration-500 ease-out group-hover:scale-105">
          <SafeImage src={img} alt={p.titulo} ratio="1/1" />
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
              <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                -{offPct}%
              </span>
            )}
          </div>

          {/* Botón de favoritos */}
          {p.id && (
            <button
              onClick={handleFavoriteClick}
              disabled={isLoading}
              className="pointer-events-auto group/fav relative p-2.5 rounded-full bg-gray-800/95 backdrop-blur-md shadow-lg hover:bg-gray-700 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 border border-gray-600/20"
              title={isFav ? 'Eliminar de favoritos' : 'Agregar a favoritos'}
            >
              <Heart
                className={`h-4 w-4 transition-all duration-300 ${
                  isFav
                    ? 'fill-red-500 text-red-500 animate-pulse'
                    : 'text-gray-300 group-hover/fav:text-red-500 group-hover/fav:scale-110'
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
      <CardBody className="flex flex-col gap-3 flex-1 p-4 sm:p-5">
        {/* Precio */}
        <div className="flex items-baseline justify-between">
          <Price value={p.precio} compareAt={compareAt ?? undefined} />
        </div>

        {/* Título */}
        <h3 className="text-base sm:text-lg font-semibold leading-tight line-clamp-2 min-h-[3.5rem] transition-all duration-300 group-hover:text-[var(--gold)] uppercase tracking-wide text-white">
          {p.titulo}
        </h3>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 min-h-[2rem]">
          {p.marca?.nombre ? (
            <span className="inline-flex items-center rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/30 px-3 py-1 text-xs font-medium text-[var(--gold)] transition-all duration-200 hover:bg-[var(--gold)]/20">
              {p.marca.nombre}
            </span>
          ) : null}
          {p.categoria?.nombre ? (
            <span className="inline-flex items-center rounded-full bg-gray-700 border border-gray-600 px-3 py-1 text-xs font-medium text-gray-300 transition-all duration-200 hover:bg-gray-600">
              {p.categoria.nombre}
            </span>
          ) : null}
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

        {/* CTA */}
        <div className="mt-auto pt-2 space-y-2">
          <AddProductButton
            p={{
              id: p.id || p.slug,
              slug: p.slug,
              titulo: p.titulo,
              precio: p.precio,
              stock: p.stock,
              imagen: img,          // usamos la misma url normalizada
              imagenes: p.imagenes,
            }}
            className="w-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-black font-bold hover:from-[var(--gold-dark)] hover:to-[var(--gold)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Link
            href={`/tienda/producto/${p.slug}`}
            className="block w-full rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 px-4 py-2 text-center transition-all duration-300 group-hover:from-gray-700 group-hover:to-gray-600 group-hover:border-[var(--gold)]/50 group-hover:shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-200 transition-colors group-hover:text-[var(--gold)]">
              <span>Ver detalles</span>
            </div>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
