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

// Forzamos que la página siempre se renderice en el servidor con datos frescos
export const dynamic = 'force-dynamic';
// Eliminamos revalidate=0 ya que causa conflictos con 'use client'

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
    console.error('❌ Error al obtener favoritos en la página:', error);
  }

  console.log('Items en FavoritosPage:', items);

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
          {items.map((p) => (
            <Card key={p.id} className="group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
              <CardBody className="p-0">
                <div className="absolute top-3 right-3 z-10">
                  <form action={removeFavAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button
                      type="submit"
                      size="icon"
                      className="bg-red-500/80 text-white rounded-full w-10 h-10 backdrop-blur-sm hover:bg-red-600 transition-all duration-200 group-hover:opacity-100 opacity-90"
                      aria-label="Quitar de favoritos"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </form>
                </div>

                <Link href={`/tienda/${p.slug}`} className="block">
                  <SafeImage
                    src={p.imagen ?? p.imagenes?.[0]?.url}
                    alt={`Imagen de ${p.titulo}`}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </Link>

                <div className="p-5 space-y-4 bg-gradient-to-t from-[var(--bg-secondary)] to-[var(--bg)]">
                  {p.categoria?.nombre && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] bg-clip-text">
                      {p.categoria.nombre}
                    </span>
                  )}
                  <h3 className="font-bold text-xl h-14 text-[var(--fg)] overflow-hidden">
                    {p.titulo}
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <Price
                      value={p.precio}
                      compareAt={p.precioLista ?? undefined}
                      className="text-2xl font-extrabold"
                    />
                    {p.ratingProm && (
                      <RatingStars value={typeof p.ratingProm === 'string' ? parseFloat(p.ratingProm) : (p.ratingProm ?? 0)} count={p.ratingConteo ?? undefined} />
                    )}
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-[var(--border)]">
                    <AddProductButton
                      p={{
                        id: p.id,
                        slug: p.slug,
                        titulo: p.titulo,
                        precio: p.precio,
                        stock: p.stock,
                        imagen: p.imagen,
                        imagenes: p.imagenes,
                      }}
                      className="flex-1 bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] hover:from-[var(--gold-dark)] hover:to-[var(--gold)] text-black font-bold"
                    />
                    <Link href={`/tienda/${p.slug}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <ExternalLink className="w-5 h-5 mr-2" />
                        Ver
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
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
