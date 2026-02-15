// src/app/(cuenta)/mi-cuenta/favoritos/page.tsx
'use client';

import Link from 'next/link';
import { listFavoriteProducts, type ProductMinimal } from '@/lib/sdk/userApi';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/catalog/ProductCard';
import { Heart, ShoppingBag, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function FavoritosPage() {
  const [favoriteProducts, setFavoriteProducts] = useState<ProductMinimal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Mostrar loading mientras se cargan los favoritos
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-6 pb-6 border-b border-white/5">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold-dark)]/5 border border-[var(--gold)]/20 shadow-[0_0_30px_-10px_rgba(197,164,109,0.3)]">
          <Heart className="h-8 w-8 text-[var(--gold)] drop-shadow-md" />
        </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-medium text-white tracking-tight">
              Mis Favoritos
            </h1>
            <p className="text-zinc-400 text-lg">
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
      <div className="flex items-center gap-6 pb-6 border-b border-white/5">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold-dark)]/5 border border-[var(--gold)]/20 shadow-[0_0_30px_-10px_rgba(197,164,109,0.3)]">
          <Heart className="h-8 w-8 text-[var(--gold)] drop-shadow-md" />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-white tracking-tight">
            Mis Favoritos
          </h1>
          <p className="text-zinc-400 text-lg">
            {items.length === 0 
              ? 'Colección personal' 
              : `${items.length} producto${items.length === 1 ? '' : 's'} guardado${items.length === 1 ? '' : 's'}`
            }
          </p>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="text-center py-20 space-y-6">
          <div className="mx-auto w-24 h-24 rounded-full bg-zinc-900/50 border border-white/5 flex items-center justify-center">
            <Heart className="h-10 w-10 text-zinc-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-medium text-white">
              Tu lista de deseos está vacía
            </h3>
            <p className="text-zinc-400 max-w-md mx-auto">
              Guarda aquí los productos que te encantan para no perderlos de vista.
            </p>
          </div>
          <Link href="/tienda">
            <Button className="bg-[var(--gold)] hover:bg-[var(--gold-200)] text-black font-semibold px-8 py-6 rounded-xl transition-all duration-300 shadow-[0_0_20px_-5px_rgba(197,164,109,0.3)] hover:shadow-[0_0_30px_-5px_rgba(197,164,109,0.5)] hover:-translate-y-1">
              <ShoppingBag className="h-5 w-5 mr-2" />
              Ir a la Tienda
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((product) => (
            <ProductCard key={product.id} p={product} />
          ))}
        </div>
      )}
    </div>
  );
}
