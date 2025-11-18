import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCourses, getProducts } from '@/lib/sdk/catalogApi';
import type { CourseListItem, ProductListItem } from '@/lib/sdk/catalogApi';

export type SearchResult = {
  type: 'course' | 'product';
  id: string;
  title: string;
  slug: string;
  price: number;
  image?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
};

export type SearchSuggestions = {
  courses: SearchResult[];
  products: SearchResult[];
  isLoading: boolean;
  error: string | null;
};

const SEARCH_DELAY = 300; // ms
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS_PER_TYPE = 5;

export function useSearchSuggestions(query: string) {
  const debouncedQuery = useMemo(() => query.trim(), [query]);

  const q = useQuery<SearchSuggestions>({
    queryKey: ['searchSuggestions', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < MIN_QUERY_LENGTH) {
        return { courses: [], products: [], isLoading: false, error: null };
      }
      const [coursesResponse, productsResponse] = await Promise.allSettled([
        getCourses({ q: debouncedQuery, perPage: MAX_RESULTS_PER_TYPE }),
        getProducts({ q: debouncedQuery, perPage: MAX_RESULTS_PER_TYPE }),
      ]);

      const courses: SearchResult[] = coursesResponse.status === 'fulfilled'
        ? coursesResponse.value.items.map((course: CourseListItem) => ({
            type: 'course' as const,
            id: course.id,
            title: course.titulo,
            slug: course.slug,
            price: course.precio,
            image: course.portadaUrl,
            rating: course.ratingProm,
            ratingCount: course.ratingConteo,
          }))
        : [];

      const products: SearchResult[] = productsResponse.status === 'fulfilled'
        ? productsResponse.value.items.map((product: ProductListItem) => ({
            type: 'product' as const,
            id: product.id,
            title: product.titulo,
            slug: product.slug,
            price: product.precio,
            image: product.imagen || product.imagenes?.[0]?.url,
            rating: product.ratingProm,
            ratingCount: product.ratingConteo,
          }))
        : [];

      return { courses, products, isLoading: false, error: null };
    },
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) return;
    const t = setTimeout(() => { q.refetch(); }, SEARCH_DELAY);
    return () => clearTimeout(t);
  }, [debouncedQuery, q]);

  return {
    courses: q.data?.courses ?? [],
    products: q.data?.products ?? [],
    isLoading: q.isLoading,
    error: q.error ? (q.error instanceof Error ? q.error.message : 'Error en la búsqueda') : null,
  } satisfies SearchSuggestions;
}

// Hook para términos de búsqueda populares dinámicos
export function usePopularSearchTerms() {
  const [popularTerms, setPopularTerms] = useState<{
    courses: string[];
    products: string[];
  }>({ courses: [], products: [] });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPopularTerms = async () => {
      try {
        setIsLoading(true);
        
        // Obtener datos reales del sistema con límite pequeño para performance
        const [coursesData, productsData] = await Promise.allSettled([
          getCourses({ perPage: 8, sort: 'rating_desc' }),
          getProducts({ perPage: 8, sort: 'rating_desc' })
        ]);

        // Extraer términos de cursos reales
        const courseTerms: string[] = [];
        if (coursesData.status === 'fulfilled') {
          coursesData.value.items.forEach((course: CourseListItem) => {
            // Agregar título del curso
            courseTerms.push(course.titulo);
            
            // Extraer palabras clave del título (palabras de 4+ caracteres)
            const keywords = course.titulo
              .split(/\s+/)
              .filter(word => word.length >= 4 && !['para', 'con', 'sin', 'más', 'muy'].includes(word.toLowerCase()))
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
            
            courseTerms.push(...keywords);
          });
        }

        // Extraer términos de productos reales
        const productTerms: string[] = [];
        if (productsData.status === 'fulfilled') {
          productsData.value.items.forEach((product: ProductListItem) => {
            // Agregar título del producto
            productTerms.push(product.titulo);
            
            // Extraer palabras clave del título
            const keywords = product.titulo
              .split(/\s+/)
              .filter(word => word.length >= 4 && !['para', 'con', 'sin', 'más', 'muy'].includes(word.toLowerCase()))
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
            
            productTerms.push(...keywords);
          });
        }

        // Obtener términos de localStorage (búsquedas recientes del usuario)
        const recentSearches = getRecentSearches();
        
        // Combinar y filtrar términos únicos
        const uniqueCourseTerms = Array.from(new Set([
          ...recentSearches.filter(term => courseTerms.some(ct => 
            ct.toLowerCase().includes(term.toLowerCase()) || term.toLowerCase().includes(ct.toLowerCase())
          )),
          ...courseTerms
        ])).slice(0, 5);

        const uniqueProductTerms = Array.from(new Set([
          ...recentSearches.filter(term => productTerms.some(pt => 
            pt.toLowerCase().includes(term.toLowerCase()) || term.toLowerCase().includes(pt.toLowerCase())
          )),
          ...productTerms
        ])).slice(0, 5);

        setPopularTerms({
          courses: uniqueCourseTerms,
          products: uniqueProductTerms
        });
      } catch (error) {
        console.warn('Error fetching popular terms, using fallback:', error);
        // Fallback con términos alineados a la base de datos real
        setPopularTerms({
          courses: ['Maquillaje Profesional', 'Skincare', 'Cejas', 'Ojos', 'Dermocosmética'],
          products: ['Delineador', 'Máscara', 'Protector Solar', 'Sérum', 'Crema']
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularTerms();
  }, []);

  return { ...popularTerms, isLoading };
}

// Utilidades para manejo de búsquedas recientes
function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('recent_searches');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string) {
  if (typeof window === 'undefined' || !term.trim() || term.length < 2) return;
  
  try {
    const recent = getRecentSearches();
    const filtered = recent.filter(t => t.toLowerCase() !== term.toLowerCase());
    const updated = [term, ...filtered].slice(0, 10); // Mantener solo 10 búsquedas recientes
    
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  } catch (error) {
    console.warn('Error saving recent search:', error);
  }
}