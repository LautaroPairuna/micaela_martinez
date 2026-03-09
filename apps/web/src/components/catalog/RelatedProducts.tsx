'use client';

import { useEffect, useState } from 'react';
import { getRelatedProducts } from '@/lib/sdk/catalogApi';
import { ProductCard } from './ProductCard';
import type { ProductListItem } from '@/lib/sdk/catalogApi';

type RelatedProductsProps = {
  categoriaSlug?: string | null;
  currentProductSlug: string;
  title?: string;
  limit?: number;
};

export function RelatedProducts({ 
  categoriaSlug, 
  currentProductSlug, 
  title = "Productos relacionados",
  limit = 4
}: RelatedProductsProps) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRelatedProducts() {
      if (!categoriaSlug) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await getRelatedProducts(categoriaSlug, currentProductSlug, limit);
        setProducts(response.items || []);
      } catch (err) {
        console.error('Error fetching related products:', err);
        setError('Error al cargar productos relacionados');
      } finally {
        setLoading(false);
      }
    }

    fetchRelatedProducts();
  }, [categoriaSlug, currentProductSlug, limit]);

  if (loading) {
    return (
      <section className="space-y-6">
        {title && <h2 className="text-2xl font-bold text-foreground">{title}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-4">
              <div className="aspect-square bg-muted rounded-xl" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || products.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      {title && <h2 className="text-2xl font-bold text-foreground">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} p={product} />
        ))}
      </div>
    </section>
  );
}