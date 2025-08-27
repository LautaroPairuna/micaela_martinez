import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProductBySlug } from '@/lib/api';
import { ProductGallery } from '@/components/catalog/ProductGallery';
import { Price } from '@/components/ui/Price';
import { productJsonLd } from '@/lib/seo';
import { RatingStars } from '@/components/ui/RatingStars';
import { Button } from '@/components/ui/Button';
import { Pill, Badge } from '@/components/ui/Pill';
import { Truck, ShieldCheck, RefreshCcw, Check, AlertCircle } from 'lucide-react';

// 🛒 botón cliente para carrito (asegurate de tenerlo creado)
import { AddProductButton } from '@/components/cart/AddProductButton';

export const revalidate = 120;

type Params = { slug: string };

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const abs = (u?: string) => (u ? (u.startsWith('http') ? u : new URL(u, SITE).toString()) : undefined);

/** Normaliza el slug devuelto por la API (corto o completo) a una ruta canónica usable */
const canonicalFrom = (slugish?: string) => {
  if (!slugish) return '/tienda';
  const s = String(slugish).trim();
  if (s.startsWith('http')) return s;
  if (s.startsWith('/')) return s;             // ya viene '/tienda/...'
  if (s.startsWith('tienda')) return `/${s}`;  // viene 'tienda/...'
  return `/tienda/detalle/${s}`;               // slug corto
};

function looksLikeTiendaFilterSlug(slug: string) {
  return /^(marca-|categoria-|pagina-|orden-)/.test(slug);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;

  if (looksLikeTiendaFilterSlug(slug)) {
    const url = `/tienda/${slug}`;
    return {
      title: 'Tienda',
      description: 'Listado de productos',
      alternates: { canonical: url },
      robots: { index: false, follow: true },
    };
  }

  const p = await getProductBySlug(slug);
  const desc = (p.descripcionMD || p.titulo || '').toString().slice(0, 160);
  const url = canonicalFrom(p.slug);

  const images: string[] = p.imagenes?.length
    ? p.imagenes.map((i: any) => abs(i.url)!).filter(Boolean)
    : p.imagen
      ? [abs(p.imagen)!]
      : [];

  return {
    title: `${p.titulo} — Comprar`,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: p.titulo, description: desc, url: abs(url), images },
  };
}

export default async function ProductoPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  if (looksLikeTiendaFilterSlug(slug)) {
    redirect(`/tienda/${slug}`);
  }

  const p = await getProductBySlug(slug);

  const images = p.imagenes?.length ? p.imagenes : (p.imagen ? [{ url: p.imagen }] : []);
  const compareAt = p.precioLista ?? undefined;
  const hasDiscount = !!(compareAt && compareAt > p.precio);
  const offPct = hasDiscount ? Math.round(((Number(compareAt) - p.precio) / Number(compareAt)) * 100) : 0;
  const outOfStock = typeof p.stock === 'number' && p.stock <= 0;

  // Highlights: primeras líneas de la descripción (opcional)
  const highlights: string[] = String(p.descripcionMD ?? '')
    .split(/\r?\n/)
    .map((s: string) => s.trim())
    .filter((s: string): s is string => s.length > 0)
    .slice(0, 6);

  const jsonLd = productJsonLd({
    name: p.titulo,
    slug: p.slug,
    price: p.precio, // centavos
    images: images.map((i: any) => abs(i.url)!).filter(Boolean),
    brand: p.marca?.nombre,
    category: p.categoria?.nombre,
  });

  return (
    <article className="space-y-10">
      {/* Encabezado en split: galería a la izquierda, panel de compra + ficha a la derecha */}
      <section className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Izquierda: galería */}
        <div className="lg:col-span-6">
          <div className="relative rounded-xl2 border border-default overflow-hidden">
            {/* Badges superpuestos */}
            <div className="absolute top-3 left-3 z-10 flex gap-2">
              {p.destacado && <Badge tone="gold">Destacado</Badge>}
              {hasDiscount && <Badge tone="pink">-{offPct}%</Badge>}
            </div>
            <ProductGallery images={images} />
          </div>
        </div>

        {/* Derecha: panel de compra + ficha */}
        <aside className="lg:col-span-6 space-y-6">
          <div className="rounded-xl2 border border-default p-6 bg-[var(--bg)]">
            <nav aria-label="Breadcrumb" className="text-xs text-muted mb-2">
              <ol className="flex items-center gap-1">
                <li><Link href="/tienda" className="hover:text-[var(--pink)]">Tienda</Link></li>
                {p.categoria?.nombre && (
                  <>
                    <li>›</li>
                    <li>
                      <Link
                        href={`/tienda/categoria-${p.categoria.slug ?? p.categoria.id}`}
                        className="hover:text-[var(--pink)]"
                      >
                        {p.categoria.nombre}
                      </Link>
                    </li>
                  </>
                )}
              </ol>
            </nav>

            <h1 className="text-2xl font-semibold leading-tight">{p.titulo}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
              {p.marca?.nombre && <Pill>{p.marca.nombre}</Pill>}
              {p.categoria?.nombre && <Pill>{p.categoria.nombre}</Pill>}
              {typeof p.ratingProm === 'number' && (
                <span className="inline-flex items-center gap-2">
                  <RatingStars value={Number(p.ratingProm)} count={p.ratingConteo || 0} size="sm" />
                </span>
              )}
            </div>

            <div className="mt-4">
              <Price value={p.precio/100} compareAt={compareAt ? compareAt/100 : undefined} />
            </div>

            <div className="mt-4 flex gap-2">
              {/* 🛒 integra carrito */}
              <AddProductButton p={p} />
              <Link href="/tienda" className="rounded-xl2 border border-default px-3 py-2 hover:bg-subtle">
                Seguir viendo
              </Link>
            </div>

            {/* Benefits */}
            <ul className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted">
              <li className="rounded-xl2 border border-default p-2 flex items-center gap-2">
                <Truck className="size-4" /> Envíos
              </li>
              <li className="rounded-xl2 border border-default p-2 flex items-center gap-2">
                <ShieldCheck className="size-4" /> Seguro
              </li>
              <li className="rounded-xl2 border border-default p-2 flex items-center gap-2">
                <RefreshCcw className="size-4" /> Devolución 7d
              </li>
            </ul>

            {/* Estado de stock */}
            <div className="mt-3 text-xs">
              {outOfStock ? (
                <span className="inline-flex items-center gap-1 text-red-600">
                  <AlertCircle className="size-3" /> Sin stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="size-3" /> Disponible
                </span>
              )}
            </div>
          </div>

          {/* Ficha técnica */}
          <div className="rounded-xl2 border border-default p-6">
            <h3 className="text-sm font-medium mb-3">Ficha</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted">
              {p.marca?.nombre && (<><dt>Marca</dt><dd className="text-[var(--fg)]">{p.marca.nombre}</dd></>)}
              {p.categoria?.nombre && (<><dt>Categoría</dt><dd className="text-[var(--fg)]">{p.categoria.nombre}</dd></>)}
              {typeof p.stock === 'number' && (<><dt>Stock</dt><dd className="text-[var(--fg)]">{p.stock}</dd></>)}
              {hasDiscount && (<><dt>Descuento</dt><dd className="text-[var(--fg)]">-{offPct}%</dd></>)}
            </dl>
          </div>
        </aside>
      </section>

      {/* Cuerpo editorial: destacados + descripción */}
      <section className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-8">
          {highlights.length > 0 && (
            <div className="rounded-xl2 border border-default p-6">
              <h2 className="text-lg font-medium mb-3">Lo más destacado</h2>
              <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {highlights.map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="size-4 mt-0.5 text-[var(--gold)]" />
                    <span className="text-muted">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.descripcionMD && (
            <div className="rounded-xl2 border border-default p-6">
              <h2 className="text-lg font-medium mb-2">Descripción</h2>
              <div className="prose prose-sm max-w-none text-muted">
                <p className="whitespace-pre-line">{p.descripcionMD}</p>
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha vacía para mantener ritmo en desktop */}
        <div className="lg:col-span-5" />
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}
