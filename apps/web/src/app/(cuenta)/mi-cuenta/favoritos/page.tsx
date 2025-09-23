// src/app/(cuenta)/mi-cuenta/favoritos/page.tsx
'use client';

import Link from 'next/link';
import { useFavorites } from '@/store/favorites';
import { listFavoriteProducts, removeFavorite, type ProductMinimal } from '@/lib/sdk/userApi';
import { Card, CardBody } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { Price } from '@/components/ui/Price';
import { Button } from '@/components/ui/Button';
import { RatingStars } from '@/components/ui/RatingStars';
import { AddProductButton } from '@/components/cart/AddProductButton';
import { Heart, ShoppingBag, Trash2, ExternalLink, Star, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function FavoritosPage() {
  const { removeFromFavorites, isLoading: storeLoading } = useFavorites();
  const [favoriteProducts, setFavoriteProducts] = useState<ProductMinimal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // Cargar productos favoritos completos
  useEffect(() => {
    const loadFavoriteProducts = async () => {
      try {
        setIsLoading(true);
        const products = await listFavoriteProducts();
        setFavoriteProducts(products);
      } catch (error) {
        console.error('❌ Error al cargar productos favoritos:', error);
        setFavoriteProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadFavoriteProducts();
  }, []);

  const handleRemoveFavorite = async (productId: string, productTitle: string) => {
    try {
      setRemovingIds(prev => new Set(prev).add(productId));
      await removeFromFavorites(productId, productTitle);
      // Actualizar la lista local
      setFavoriteProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('❌ Error al quitar de favoritos:', error);
    } finally {
      setRemovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Mostrar loading mientras se cargan los favoritos
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[var(--gold)] via-[var(--gold-200)] to-[var(--gold-300)] shadow-xl">
            <Heart className="h-8 w-8 text-black" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--fg)] tracking-tight">
              Mis Favoritos
            </h1>
            <p className="text-[var(--muted)] text-lg mt-1">
              Cargando tus productos favoritos...
            </p>
          </div>
        </div>
        
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
        </div>
      </div>
    );
  }

  const items = favoriteProducts;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[var(--gold)] via-[var(--gold-200)] to-[var(--gold-300)] shadow-xl">
          <Heart className="h-8 w-8 text-black" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--fg)] tracking-tight">
            Mis Favoritos
          </h1>
          <p className="text-[var(--muted)] text-lg mt-1">
            {items.length === 0 
              ? 'Aún no tienes productos favoritos' 
              : `${items.length} producto${items.length === 1 ? '' : 's'} guardado${items.length === 1 ? '' : 's'}`
            }
          </p>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="text-center py-20 space-y-6">
          <div className="mx-auto w-24 h-24 rounded-full bg-[var(--muted-bg)] flex items-center justify-center">
            <Heart className="h-12 w-12 text-[var(--muted)]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-[var(--fg)]">
              No tienes favoritos aún
            </h3>
            <p className="text-[var(--muted)] max-w-md mx-auto">
              Explora nuestro catálogo y guarda los productos que más te gusten para encontrarlos fácilmente después.
            </p>
          </div>
          <Link href="/productos">
            <Button className="bg-[var(--gold)] hover:bg-[var(--gold-200)] text-black font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl">
              <ShoppingBag className="h-5 w-5 mr-2" />
              Explorar Productos
            </Button>
          </Link>
        </div>
      ) : (
        /* Products Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((product: ProductMinimal) => (
            <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <CardBody className="p-0">
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden bg-[var(--muted-bg)]">
                  <SafeImage
                    src={product.imagen ?? product.imagenes?.[0]?.url}
                    alt={product.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Remove from Favorites Button */}
                  <Button
                    onClick={() => handleRemoveFavorite(product.id, product.titulo)}
                    disabled={removingIds.has(product.id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-red-500 hover:text-red-600 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                    size="sm"
                  >
                    {removingIds.has(product.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Product Info */}
                <div className="p-6 space-y-4">
                  {/* Title and Link */}
                  <div className="space-y-2">
                    <Link 
                      href={`/tienda/${product.slug}`}
                      className="block group-hover:text-[var(--gold)] transition-colors duration-200"
                    >
                      <h3 className="font-semibold text-lg text-[var(--fg)] line-clamp-2 leading-tight">
                        {product.titulo}
                      </h3>
                    </Link>
                    
                    {/* Rating */}
                    {product.ratingProm && (
                      <div className="flex items-center gap-2">
                        <RatingStars value={typeof product.ratingProm === 'string' ? parseFloat(product.ratingProm) : (product.ratingProm ?? 0)} count={product.ratingConteo ?? undefined} />
                        <span className="text-sm text-[var(--muted)]">
                          ({product.ratingProm})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <Price 
                      value={product.precio} 
                      compareAt={product.precioLista ?? undefined}
                      className="text-xl font-bold"
                    />
                    {product.precioLista && product.precioLista > product.precio && (
                      <div className="text-sm text-green-600 font-medium">
                        Ahorrás ${(product.precioLista - product.precio).toLocaleString('es-AR')}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <AddProductButton 
                      p={{
                        id: product.id,
                        slug: product.slug,
                        titulo: product.titulo,
                        precio: product.precio,
                        stock: product.stock,
                        imagen: product.imagen,
                        imagenes: product.imagenes,
                      }}
                      className="flex-1 bg-[var(--gold)] hover:bg-[var(--gold-200)] text-black font-semibold py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                    />
                    <Link href={`/tienda/${product.slug}`}>
                      <Button 
                        variant="outline" 
                        className="p-2.5 border-[var(--border)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all duration-200"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
