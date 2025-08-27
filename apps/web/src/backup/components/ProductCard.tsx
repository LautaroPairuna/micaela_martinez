"use client";

import Link from "next/link";
import type { Route } from "next";
import { Star, Info } from "lucide-react";
import { formatARS } from "@/lib/format";
import AddToCartButton from "@/backup/components/AddToCartButton";

export type ProductoMin = {
  id: string;
  slug: string;
  titulo: string;
  sku: string;
  precio: number;      // centavos
  stock?: number | null;
  rating?: number | null;
  imagen?: string | null;
};

const PLACEHOLDER = "/images/placeholder.jpg";

export default function ProductCard({ p }: { p: ProductoMin }) {
  const href = (`/tienda/${p.slug}`) as Route;
  const rating = (p.rating ?? 4.8).toFixed(1);

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04] hover:shadow-lg">
      {/* Media */}
      <div className="relative aspect-video rounded-t-2xl bg-gradient-to-br from-rose-500/15 via-transparent to-[#F2C94C]/15">
        <img
          src={p.imagen || PLACEHOLDER}
          alt={p.titulo}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            // Evita loops de onError si el placeholder fallara
            e.currentTarget.onerror = null;
            e.currentTarget.src = PLACEHOLDER;
          }}
          className="h-full w-full rounded-t-2xl object-cover opacity-95 transition-opacity group-hover:opacity-100"
        />
        <div className="pointer-events-none absolute inset-0 rounded-t-2xl ring-0 ring-[#F2C94C]/0 transition group-hover:ring-2 group-hover:ring-[#F2C94C]/30" />
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="rounded-full border border-rose-400/30 bg-rose-500/20 px-2 py-0.5 text-xs text-rose-200">
            Bestseller
          </span>
          <div className="flex items-center gap-1 text-[#F2C94C]">
            <Star className="h-4 w-4 fill-[#F2C94C]" />
            <span className="text-sm text-white/80">{rating}</span>
          </div>
        </div>

        <Link href={href} className="block font-medium leading-tight hover:underline">
          {p.titulo}
        </Link>
        <p className="mt-0.5 text-xs text-white/60">SKU: {p.sku}</p>

        {/* Footer */}
        <div className="mt-4 border-t border-white/10 pt-4">
          {/* Desktop */}
          <div className="mb-3 hidden items-center justify-between sm:flex">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F2C94C]/10 px-3 py-1 text-sm font-semibold text-[#F2C94C] shadow-[0_0_0_1px_rgba(242,201,76,.25)_inset]">
              {formatARS(p.precio)}
            </span>

            <div className="flex gap-2">
              <Link
                href={href}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white hover:border-[color:color-mix(in_oklab,var(--rose)_40%,white_10%)] hover:bg-white/10"
              >
                <Info className="h-4 w-4" />
                Ver detalle
              </Link>
              <AddToCartButton productId={p.id} size="sm" />
            </div>
          </div>

          {/* Mobile */}
          <div className="sm:hidden">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#F2C94C]/10 px-3 py-1 text-sm font-semibold text-[#F2C94C] shadow-[0_0_0_1px_rgba(242,201,76,.25)_inset]">
              {formatARS(p.precio)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={href}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:border-[color:color-mix(in_oklab,var(--rose)_40%,white_10%)] hover:bg-white/10"
              >
                <Info className="h-4 w-4" />
                Ver
              </Link>
              <AddToCartButton productId={p.id} size="sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
