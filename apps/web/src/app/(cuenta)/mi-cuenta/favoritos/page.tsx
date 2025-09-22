// src/app/(cuenta)/mi-cuenta/favoritos/page.tsx
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { listFavoriteProducts, removeFavorite, type ProductMinimal } from '@/lib/sdk/userApi';
import { Card, CardBody } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { Price } from '@/components/ui/Price';
import { Button } from '@/components/ui/Button';
import { RatingStars } from '@/components/ui/RatingStars';
import { AddProductButton } from '@/components/cart/AddProductButton';
import { Heart, ShoppingBag, Trash2, ExternalLink, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ✅ Server Action: recibe FormData (no cierres sobre variables)
async function removeFavAction(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await removeFavorite(id);
  revalidatePath('/mi-cuenta/favoritos');
}

export default async function FavoritosPage() {
  let items: ProductMinimal[] = [];
  try {
    items = await listFavoriteProducts();
  } catch (error) {
    console.error('❌ Error al obtener favoritos:', error);
  }

  return (
    <div className="space-y-8">
      {/* Header mejorado */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[var(--gold)] via-[var(--gold-200)] to-[var(--gold-300)] shadow-xl">
                <Heart className="h-8 w-8 text-black" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{items.length}</span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--fg)] tracking-tight bg-gradient-to-r from-[var(--fg)] to-[var(--muted)] bg-clip-text">
                Mis Favoritos
              </h1>
              <p className="text-[var(--muted)] text-lg mt-1">
                {items.length > 0 
                  ? `${items.length} producto${items.length !== 1 ? 's' : ''} guardado${items.length !== 1 ? 's' : ''}`
                  : 'Guardá productos que te interesen'
                }
              </p>
            </div>
          </div>
          
          {/* Nota: Controles de vista y filtros removidos temporalmente */}
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="border-2 border-dashed border-[var(--border)] bg-gradient-to-br from-[var(--bg)] to-[var(--bg-secondary)]">
          <CardBody className="text-center py-20">
            <div className="max-w-lg mx-auto space-y-8">
              <div className="relative">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-[var(--gold)] via-[var(--gold-200)] to-[var(--gold-300)] flex items-center justify-center shadow-2xl">
                  <Heart className="h-12 w-12 text-black" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-sm font-bold text-white">0</span>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[var(--fg)] bg-gradient-to-r from-[var(--fg)] to-[var(--muted)] bg-clip-text">
                  Tu lista de favoritos está vacía
                </h3>
                <p className="text-[var(--muted)] text-lg leading-relaxed">
                  Descubrí productos increíbles en nuestra tienda y guardá los que más te gusten haciendo clic en el corazón ❤️
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/tienda">
                  <Button className="bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] hover:from-[var(--gold-dark)] hover:to-[var(--gold)] text-black font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-105 transform">
                    <ShoppingBag className="h-5 w-5 mr-3" />
                    Explorar tienda
                  </Button>
                </Link>
                <Link href="/cursos">
                  <Button variant="outline" className="px-8 py-4 rounded-xl border-2 border-[var(--border)] hover:border-[var(--gold)] hover:bg-[var(--gold)]/10 transition-all duration-300 hover:shadow-lg">
                    <Star className="h-5 w-5 mr-3" />
                    Ver cursos
                  </Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => {
            const priceValue = p.precio ?? 0;
            const compareAt = p.precioLista ?? undefined;
            const hasDiscount = !!(compareAt && compareAt > priceValue);
            const offPct = hasDiscount ? Math.round(((Number(compareAt) - priceValue) / Number(compareAt)) * 100) : 0;
            const img = p.imagenes?.[0]?.url || p.imagen || null;
            const outOfStock = typeof p.stock === 'number' && p.stock <= 0;

            return (
              <div key={p.id} className="group h-full touch-manipulation">
                <Card className="h-full flex flex-col border border-[var(--border)] bg-gradient-to-br from-[var(--bg)] to-[var(--bg-secondary)] transition-all duration-500 ease-out group-hover:border-[var(--gold)] group-hover:shadow-2xl group-hover:shadow-[var(--gold)]/20 group-hover:-translate-y-2 group-hover:scale-[1.02]">
                  {/* Imagen */}
                  <div className="relative overflow-hidden rounded-t-xl">
                    <div className="transition-transform duration-700 ease-out group-hover:scale-110">
                      <Link href={`/tienda/producto/${p.slug}`}>
                        <SafeImage 
                          src={img} 
                          alt={p.titulo} 
                          ratio="1/1" 
                          className="cursor-pointer"
                        />
                      </Link>
                    </div>

                    {/* Badges superiores */}
                    <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {p.destacado && (
                          <span className="animate-pulse rounded-full px-3 py-1.5 text-xs font-bold text-black shadow-lg border border-[var(--gold-700)] bg-[var(--gold)] flex items-center gap-1.5">
                            <Star className="h-3 w-3 fill-current" />
                            Destacado
                          </span>
                        )}
                        {hasDiscount && (
                          <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                            -{offPct}%
                          </span>
                        )}
                      </div>
                      
                      {/* Badge de favorito */}
                      <div className="pointer-events-auto">
                        <div className="p-2.5 rounded-full bg-red-500 shadow-xl border border-red-400/20">
                          <Heart className="h-4 w-4 text-white fill-current animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* Sin stock */}
                    {outOfStock && (
                      <div className="absolute inset-0 z-20 grid place-items-center bg-[var(--bg)]/90">
                        <div className="rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--fg)] shadow-xl border border-[var(--border)]">
                          Sin stock
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cuerpo */}
                  <CardBody className="flex flex-col gap-4 flex-1 p-5">
                    {/* Precio */}
                    <div className="flex items-baseline justify-between">
                      <Price value={priceValue} compareAt={compareAt} />
                    </div>

                    {/* Título */}
                    <Link href={`/tienda/producto/${p.slug}`}>
                      <h3 className="text-base sm:text-lg font-bold leading-tight line-clamp-2 min-h-[3.5rem] transition-all duration-300 group-hover:text-[var(--gold)] uppercase tracking-wide cursor-pointer">
                        {p.titulo}
                      </h3>
                    </Link>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-2 min-h-[2rem]">
                      {p.marca?.nombre && (
                        <span className="inline-flex items-center rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/30 px-3 py-1 text-xs font-medium text-[var(--gold)] transition-all duration-200 hover:bg-[var(--gold)]/20">
                          {p.marca.nombre}
                        </span>
                      )}
                      {p.categoria?.nombre && (
                        <span className="inline-flex items-center rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition-all duration-200 hover:bg-[var(--bg)]">
                          {p.categoria.nombre}
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="min-h-[24px] flex items-center">
                      {p.ratingProm ? (
                        <RatingStars value={Number(p.ratingProm || 0)} count={p.ratingConteo || 0} size="sm" />
                      ) : (
                        <span className="text-xs text-[var(--muted)]">Sin calificaciones</span>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="mt-auto pt-2 space-y-3">
                      <AddProductButton 
                        p={{
                          id: p.id || p.slug,
                          slug: p.slug,
                          titulo: p.titulo,
                          precio: priceValue,
                          stock: p.stock,
                          imagen: img,
                          imagenes: p.imagenes
                        }}
                        className="w-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-black font-bold hover:from-[var(--gold-dark)] hover:to-[var(--gold)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 transform"
                      />
                      <div className="flex gap-2">
                        <Link href={`/tienda/producto/${p.slug}`} className="flex-1">
                          <Button 
                            variant="outline" 
                            className="w-full rounded-xl bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg)] border border-[var(--border)] transition-all duration-300 group-hover:from-[var(--bg)] group-hover:to-[var(--bg-secondary)] group-hover:border-[var(--gold)]/50 group-hover:shadow-md hover:scale-105 transform"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            <span className="text-sm font-medium">Ver detalles</span>
                          </Button>
                        </Link>
                        
                        <form action={removeFavAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button 
                            type="submit" 
                            variant="outline"
                            className="p-3 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all duration-300 hover:scale-110 transform rounded-xl"
                            title="Eliminar de favoritos"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            );
          })}
        </div>
      )}
      
      {/* CTA adicional si hay favoritos */}
      {items.length > 0 && (
        <div className="text-center pt-8">
          <Link href="/tienda">
            <Button 
              variant="outline"
              className="px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Seguir comprando
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
