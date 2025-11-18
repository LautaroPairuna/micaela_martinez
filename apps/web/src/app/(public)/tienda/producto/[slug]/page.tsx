import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProductBySlug } from '@/lib/sdk/catalogApi';
import { ProductGallery } from '@/components/catalog/ProductGallery';
import { Price } from '@/components/ui/Price';
import { productJsonLd } from '@/lib/seo';
import { RatingStars } from '@/components/ui/RatingStars';
import { Pill as Badge } from '@/components/ui/Pill';
import { ShieldCheck, RefreshCcw, Check, AlertCircle } from 'lucide-react';
import { RelatedProducts } from '@/components/catalog/RelatedProducts';

// 🛒 botón cliente para carrito (asegurate de tenerlo creado)
import { AddProductButton } from '@/components/cart/AddProductButton';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';

export const revalidate = 120;

/* ===== Tipos mínimos usados en esta página (estructurales) ===== */
type Params = { slug: string };

type ProductImage = { url: string };

type Product = {
  id?: string;
  slug?: string;
  titulo: string;
  descripcionMD?: string | null;
  imagen?: string | null;
  imagenUrl?: string | null; // ✅ nuevo
  imagenes?: ProductImage[] | null;
  precio: number;
  precioLista?: number | null;
  stock?: number | null;
  marca?: { nombre?: string | null } | null;
  categoria?: { nombre?: string | null; slug?: string | null; id?: string | number | null } | null;
  ratingProm?: number | null;
  ratingConteo?: number | null;
  destacado?: boolean | null;
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const abs = (u?: string | null) => (u ? (u.startsWith('http') ? u : new URL(u, SITE).toString()) : undefined);

/** Normaliza el slug devuelto por la API (corto o completo) a una ruta canónica usable */
const canonicalFrom = (slugish?: string | null) => {
  if (!slugish) return '/tienda';
  const s = String(slugish).trim();
  if (s.startsWith('http')) return s;
  if (s.startsWith('/')) return s;             // ya viene '/tienda/...'
  if (s.startsWith('tienda')) return `/${s}`;  // viene 'tienda/...'
  return `/tienda/producto/${s}`;               // slug corto
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

  const p = (await getProductBySlug(slug)) as Product;
  const desc = (p.descripcionMD || p.titulo || '').toString().slice(0, 160);
  const url = canonicalFrom(p.slug);

  const images: string[] =
    p.imagenes && p.imagenes.length > 0
      ? p.imagenes
          .map((i) => abs(i.url))
          .filter((s): s is string => Boolean(s))
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

  const p = (await getProductBySlug(slug)) as Product;

  // Construir array de imágenes priorizando la imagen principal
  const buildImages = (mainImageUrl: string | null | undefined, galleryImages: ProductImage[] | null | undefined): ProductImage[] => {
    const main = mainImageUrl ? { url: mainImageUrl } : null;
    const gallery = galleryImages || [];
    
    if (!main && gallery.length === 0) {
      return [];
    }
    
    if (!main) {
      return gallery;
    }
    
    if (gallery.length === 0) {
      return [main];
    }
    
    // Si hay imagen principal y galería, asegurar que la principal esté primera
    // Filtrar la imagen principal de la galería para evitar duplicados
    const filteredGallery = gallery.filter(img => img.url !== main.url);
    return [main, ...filteredGallery];
  };

  const images: ProductImage[] = buildImages(p.imagenUrl ?? p.imagen ?? null, p.imagenes);

  const compareAt = p.precioLista ?? undefined;
  const hasDiscount = !!(compareAt && compareAt > p.precio);
  const offPct = hasDiscount ? Math.round(((Number(compareAt) - p.precio) / Number(compareAt)) * 100) : 0;
  const outOfStock = typeof p.stock === 'number' && p.stock <= 0;

  // Highlights: primeras líneas de la descripción (opcional)
  const highlights: string[] = String(p.descripcionMD ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s): s is string => s.length > 0)
    .slice(0, 6);

  // 🔧 FIX: asegurar string en `slug` para productJsonLd
  const jsonLd = productJsonLd({
    name: p.titulo,
    slug: p.slug ?? slug, // <= aquí el fallback elimina el error 2322
    price: p.precio, // precio directo
    images: images
      .map((i) => abs(i.url))
      .filter((s): s is string => Boolean(s)),
    brand: p.marca?.nombre ?? undefined,
    category: p.categoria?.nombre ?? undefined,
  });

  return (
    <article className="space-y-12 max-w-[1400px] mx-auto py-12">
      {/* Encabezado principal con galería y panel de compra */}
      <section className="grid gap-10 lg:gap-12 xl:grid-cols-12 items-start">
        {/* Galería de imágenes */}
        <div className="xl:col-span-7">
          <div className="relative rounded-2xl border border-default overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            {/* Badges superpuestos */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              {p.destacado && <Badge tone="gold">Destacado</Badge>}
              {hasDiscount && <Badge tone="danger">-{offPct}%</Badge>}
            </div>
            <ProductGallery images={images} />
          </div>
        </div>

        {/* Panel de información y compra */}
        <aside className="xl:col-span-5 space-y-8">
          {/* Información principal del producto */}
          <div className="rounded-2xl border border-default p-8 bg-[var(--bg)] shadow-sm">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="text-sm text-muted mb-6">
              <ol className="flex items-center gap-2">
                <li><Link href="/tienda" className="hover:text-[var(--pink)] transition-colors">Tienda</Link></li>
                {p.categoria?.nombre && (
                  <>
                    <li className="text-muted/60">›</li>
                    <li>
                      <Link
                        href={`/tienda/categoria-${p.categoria.slug ?? p.categoria.id ?? ''}`}
                        className="hover:text-[var(--pink)] transition-colors"
                      >
                        {p.categoria.nombre}
                      </Link>
                    </li>
                  </>
                )}
              </ol>
            </nav>

            {/* Título y metadatos */}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold leading-tight text-[var(--fg)]">{p.titulo}</h1>
              
              {/* Pills de marca, categoría y rating */}
              <div className="flex flex-wrap items-center gap-3">
                {p.marca?.nombre && <Badge tone="default">{p.marca.nombre}</Badge>}
                {p.categoria?.nombre && <Badge tone="muted">{p.categoria.nombre}</Badge>}
                {p.ratingProm && p.ratingConteo && p.ratingConteo > 0 && (
                  <div className="inline-flex items-center gap-2">
                    <RatingStars value={Number(p.ratingProm)} count={p.ratingConteo} size="sm" />
                    <span className="text-sm text-muted">({p.ratingConteo})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Precio */}
            <div className="mt-6 pt-6 border-t border-default">
              <Price value={p.precio} compareAt={compareAt ? compareAt : undefined} className="text-2xl" />
              {hasDiscount && (
                <p className="mt-2 text-sm text-emerald-600 font-medium">
                  Ahorrás ${(compareAt! - p.precio).toFixed(2)} ({offPct}% de descuento)
                </p>
              )}
            </div>

            {/* Estado de stock */}
            <div className="mt-4">
              {outOfStock ? (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200">
                  <AlertCircle className="size-4" />
                  <span className="font-medium">Sin stock disponible</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check className="size-4" />
                  <span className="font-medium">
                    {typeof p.stock === 'number' && p.stock <= 10 && p.stock > 0
                      ? `Últimas ${p.stock} unidades`
                      : 'Disponible'
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <AddProductButton
                p={{
                  id: p.slug ?? slug,
                  slug: p.slug ?? slug,
                  titulo: p.titulo,
                  precio: p.precio,
                  stock: typeof p.stock === 'number' ? p.stock : null,
                  imagen: p.imagen ?? null,
                  imagenes: p.imagenes ?? null,
                }}
                className="flex-1"
              />
              <Link 
                href="/tienda" 
                className="rounded-xl border border-default px-6 py-3 text-center hover:bg-subtle transition-colors font-medium"
              >
                Seguir comprando
              </Link>
            </div>
          </div>

          {/* Beneficios y garantías */}
          <div className="rounded-2xl border border-default p-6 bg-[var(--bg)] shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-[var(--fg)]">Beneficios</h3>
            <ul className="space-y-3">

              <li className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-green-50 text-green-600">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <p className="font-medium text-[var(--fg)]">Compra segura</p>
                  <p className="text-muted">Protección total de datos</p>
                </div>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <RefreshCcw className="size-4" />
                </div>
                <div>
                  <p className="font-medium text-[var(--fg)]">Devolución fácil</p>
                  <p className="text-muted">7 días para cambios</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Ficha técnica mejorada */}
          <div className="rounded-2xl border border-default p-6 bg-[var(--bg)] shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-[var(--fg)]">Información del producto</h3>
            <dl className="space-y-3">
              {p.marca?.nombre && (
                <div className="flex justify-between items-center py-2 border-b border-default/50">
                  <dt className="text-sm font-medium text-muted">Marca</dt>
                  <dd className="text-sm font-semibold text-[var(--fg)]">{p.marca.nombre}</dd>
                </div>
              )}
              {p.categoria?.nombre && (
                <div className="flex justify-between items-center py-2 border-b border-default/50">
                  <dt className="text-sm font-medium text-muted">Categoría</dt>
                  <dd className="text-sm font-semibold text-[var(--fg)]">{p.categoria.nombre}</dd>
                </div>
              )}
              {typeof p.stock === 'number' && (
                <div className="flex justify-between items-center py-2">
                  <dt className="text-sm font-medium text-muted">Stock disponible</dt>
                  <dd className="text-sm font-semibold text-[var(--fg)]">{p.stock} unidades</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </section>

      {/* Sección de contenido detallado */}
      {(highlights.length > 0 || p.descripcionMD) && (
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[var(--fg)] mb-2">Detalles del producto</h2>
            <p className="text-muted max-w-2xl mx-auto">
              Conocé todas las características y beneficios de este producto
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Características destacadas */}
            {highlights.length > 0 && (
              <div className="rounded-2xl border border-default p-8 bg-gradient-to-br from-[var(--gold)]/5 to-[var(--gold)]/10 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-[var(--gold)]/20">
                    <Check className="size-5 text-[var(--gold)]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--fg)]">Características destacadas</h3>
                </div>
                <ul className="space-y-4">
                  {highlights.map((highlight, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="size-4 mt-1 text-[var(--gold)] flex-shrink-0" />
                      <span className="text-[var(--fg)] leading-relaxed">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Descripción completa */}
            {p.descripcionMD && (
              <div className="rounded-2xl border border-default p-8 bg-[var(--bg)] shadow-sm">
                <h3 className="text-xl font-semibold text-[var(--fg)] mb-6">Descripción completa</h3>
                <div className="prose prose-sm max-w-none">
                  <div className="text-[var(--fg)] leading-relaxed whitespace-pre-line">
                    {p.descripcionMD}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Sección de reseñas */}
      <section className="mt-16">
        <ReviewsSection 
          productoId={p.id || p.slug || slug}
          title="Reseñas del producto"
        />
      </section>

      {/* Productos relacionados */}
      <section className="mt-16">
        <RelatedProducts 
          categoriaSlug={p.categoria?.slug}
          currentProductSlug={p.slug || ''}
          title="Productos relacionados"
        />
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
