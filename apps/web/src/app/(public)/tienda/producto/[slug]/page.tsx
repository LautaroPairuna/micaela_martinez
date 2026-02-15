import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProductBySlug } from '@/lib/sdk/catalogApi';
import { ProductGallery } from '@/components/catalog/ProductGallery';
import { productJsonLd } from '@/lib/seo';
import { RatingStars } from '@/components/ui/RatingStars';
import { 
  ShieldCheck, 
  RefreshCcw, 
  Check, 
  Truck, 
  ArrowLeft,
  ShoppingCart
} from 'lucide-react';
import { RelatedProducts } from '@/components/catalog/RelatedProducts';
import { AddProductButton } from '@/components/cart/AddProductButton';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { formatCurrency } from '@/lib/format';
import { FadeIn } from '@/components/ui/Motion';

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
  imagenUrl?: string | null;
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
  if (s.startsWith('/')) return s;             
  if (s.startsWith('tienda')) return `/${s}`;  
  return `/tienda/producto/${s}`;               
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

  const p = (await getProductBySlug(slug).catch(() => null)) as Product | null;
  
  if (!p) {
    return {
      title: 'Producto no encontrado',
    };
  }

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

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  if (looksLikeTiendaFilterSlug(slug)) {
    redirect(`/tienda/${slug}`);
  }

  const product = (await getProductBySlug(slug).catch(() => null)) as Product | null;

  if (!product) {
    redirect('/tienda');
  }

  // Unificar imagen principal + galería
  const galleryImages = [];
  if (product.imagenUrl) {
    galleryImages.push({ url: product.imagenUrl, alt: product.titulo });
  }
  if (product.imagenes && product.imagenes.length > 0) {
    product.imagenes.forEach((img: any) => {
      if (img.url && img.url !== product.imagenUrl) {
        galleryImages.push({ url: img.url, alt: product.titulo });
      }
    });
  }

  // Calcular descuento
  const compareAt = product.precioLista ?? undefined;
  const hasDiscount = !!(compareAt && compareAt > product.precio);
  const discount = hasDiscount ? Math.round(((Number(compareAt) - product.precio) / Number(compareAt)) * 100) : 0;
  
  // JSON-LD
  const jsonLd = productJsonLd({
    name: product.titulo,
    slug: product.slug ?? slug,
    price: product.precio,
    images: galleryImages.map(i => abs(i.url)).filter(Boolean) as string[],
    brand: product.marca?.nombre ?? undefined,
    category: product.categoria?.nombre ?? undefined,
  });

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-zinc-200 font-sans selection:bg-pink-500/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4 py-8 lg:py-12">
        <FadeIn>
          {/* Breadcrumb / Volver */}
          <div className="mb-8">
            <Link 
              href="/tienda" 
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-pink-400 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Volver a productos
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16">
            {/* Columna Izquierda: Galería */}
            <div className="space-y-6">
              <div className="relative">
                {hasDiscount && (
                  <span className="absolute top-4 left-4 z-10 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-pink-500/20">
                    OFERTA
                  </span>
                )}
                {/* Contenedor de galería con estilo flotante (sin bordes/fondo) y tamaño reducido */}
                <div className="rounded-2xl overflow-hidden max-w-[90%] mx-auto">
                  <ProductGallery images={galleryImages} />
                </div>
              </div>
            </div>

            {/* Columna Derecha: Información */}
            <div className="flex flex-col">
              {/* Categoría Badge */}
              {product.categoria?.nombre && (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 rounded-full border border-zinc-700 bg-zinc-800/50 text-xs font-medium text-zinc-300 backdrop-blur-sm">
                    {product.categoria.nombre}
                  </span>
                </div>
              )}

              {/* Título */}
              <h1 className="text-3xl lg:text-4xl font-serif text-white mb-4 leading-tight">
                {product.titulo}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex text-[var(--gold)]">
                  <RatingStars value={product.ratingProm || 0} size="md" />
                </div>
                {product.ratingConteo && product.ratingConteo > 0 && (
                  <span className="text-sm text-zinc-500 font-medium">
                    ({product.ratingConteo} {product.ratingConteo === 1 ? 'reseña' : 'reseñas'})
                  </span>
                )}
              </div>

              {/* Precios */}
              <div className="flex items-end gap-4 mb-8 pb-8 border-b border-zinc-800">
                <span className="text-4xl font-bold text-pink-500 tracking-tight">
                  {formatCurrency(product.precio)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-zinc-500 line-through mb-1">
                      {formatCurrency(compareAt!)}
                    </span>
                    <span className="mb-2 px-2 py-0.5 bg-pink-500/10 text-pink-500 text-xs font-bold rounded border border-pink-500/20">
                      {discount}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Descripción Corta */}
              <div className="prose prose-invert prose-p:text-zinc-400 prose-sm mb-8 max-w-none">
                {product.descripcionMD ? (
                  <p>{product.descripcionMD.slice(0, 300)}{product.descripcionMD.length > 300 ? '...' : ''}</p>
                ) : (
                  <p className="text-zinc-500 italic">Sin descripción disponible.</p>
                )}
              </div>

              {/* Características (Simuladas visualmente como en el diseño) */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 font-serif">
                  Características:
                </h3>
                <ul className="space-y-3">
                  {[
                    'Alta calidad profesional',
                    'Garantía de satisfacción',
                    'Envío seguro y rápido',
                    'Soporte post-venta incluido',
                    'Devolución fácil y rápida'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                      <Check className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Acciones de Compra */}
              <div className="mt-auto space-y-6">
                <div className="w-full">
                  <AddProductButton 
                    p={{
                      id: product.id || product.slug || slug,
                      slug: product.slug || slug,
                      titulo: product.titulo,
                      precio: product.precio,
                      stock: product.stock,
                      imagen: product.imagen,
                      imagenes: product.imagenes,
                    }}
                    className="w-full !bg-pink-500 hover:!bg-pink-600 text-white h-14 rounded-lg font-bold text-lg shadow-lg shadow-pink-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Agregar al carrito
                  </AddProductButton>
                </div>

                {/* Beneficios Footer */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-zinc-800">
                  <div className="text-center px-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 mb-3 text-pink-400">
                      <Truck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-zinc-300">Envío gratis +$50</p>
                  </div>
                  <div className="text-center px-2 border-l border-zinc-800">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 mb-3 text-pink-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-zinc-300">Garantía 30 días</p>
                  </div>
                  <div className="text-center px-2 border-l border-zinc-800">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 mb-3 text-pink-400">
                      <RefreshCcw className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-zinc-300">Devolución fácil</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Productos Relacionados */}
        <FadeIn delay={0.2}>
          <div className="mt-24 border-t border-zinc-800 pt-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl lg:text-3xl font-serif text-white">
                Productos relacionados
              </h2>
              <Link href="/tienda" className="text-sm text-pink-500 hover:text-pink-400 font-medium">
                Ver todos
              </Link>
            </div>
            <RelatedProducts 
               categoriaSlug={product.categoria?.slug}
               currentProductSlug={product.slug || ''}
               title="" // Ya puse el título arriba manualmente para control de estilo
            />
          </div>

          {/* Reseñas */}
          <div className="mt-24 border-t border-zinc-800 pt-16">
            <ReviewsSection 
               productoId={product.id}
               title="Opiniones de clientes"
            />
          </div>
        </FadeIn>
      </div>
    </div>
  );
}