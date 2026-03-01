import { api } from './api';
import type { CartLine, CartKind } from '@/store/cart';

// Response types from backend
export interface CartItemResponse {
  id: number; // ItemCarrito ID
  tipo: 'PRODUCTO' | 'CURSO';
  productoId?: number | null;
  cursoId?: number | null;
  cantidad: number;
  producto?: {
    id: number;
    titulo: string;
    precio: number;
    descuento?: number | null;
    slug: string;
    imagen?: string | null;
    imagenes?: unknown; // Prisma might return array or json
    stock?: number;
  } | null;
  curso?: {
    id: number;
    titulo: string;
    precio: number;
    descuento?: number | null;
    slug: string;
    portada?: string | null;
  } | null;
}

export interface CartResponse {
  id: number;
  usuarioId: number;
  items: CartItemResponse[];
}

// DTOs for sync
export interface SyncItemDto {
  tipo: 'producto' | 'curso';
  productoId?: number | string;
  cursoId?: number | string;
  cantidad: number;
}

// Helper to reuse mapping logic
function mapResponseToLines(data: CartResponse): CartLine[] {
  if (!data || !data.items) return [];
  return data.items.map(item => {
    const isProduct = item.tipo === 'PRODUCTO';
    if (isProduct && item.producto) {
      // Handle images (legacy field vs array)
      let image = item.producto.imagen;
      if (Array.isArray(item.producto.imagenes) && item.producto.imagenes.length > 0) {
          const firstImg = item.producto.imagenes[0] as any;
          // Priorizamos 'url' si ya viene resuelta por el backend (/uploads/...)
          // sobre 'archivo' que es solo el nombre pelado en la DB.
          image = firstImg.url || firstImg.archivo || image;
          
          // Si es un nombre de archivo pelado (ej: foto.webp), inyectar /uploads/producto/
          if (image && !image.startsWith('/') && !image.startsWith('http')) {
              image = `/uploads/producto/${image}`;
          }
      }

      const p = item.producto;
      const desc = p.descuento || 0;
      const finalPrice = desc > 0 ? Number(p.precio) * (1 - desc / 100) : Number(p.precio);

      return {
        type: 'product',
        id: item.producto.id.toString(),
        slug: item.producto.slug,
        title: item.producto.titulo,
        price: finalPrice,
        image: image ?? null,
        quantity: item.cantidad,
        maxQty: item.producto.stock
      } as CartLine;
    } else if (!isProduct && item.curso) {
      const c = item.curso;
      const desc = c.descuento || 0;
      const finalPrice = desc > 0 ? Number(c.precio) * (1 - desc / 100) : Number(c.precio);

      return {
        type: 'course',
        id: item.curso.id.toString(),
        slug: item.curso.slug,
        title: item.curso.titulo,
        price: finalPrice,
        image: item.curso.portada ?? null,
        quantity: 1
      } as CartLine;
    }
    return null;
  }).filter((x): x is CartLine => x !== null);
}

export const cartApi = {
  getCart: async (): Promise<CartLine[]> => {
    try {
      const { data } = await api.get<CartResponse>('cart');
      return mapResponseToLines(data);
    } catch (error) {
      // If 401/403, just return empty array or throw? 
      // For getCart, if not auth, we shouldn't call it.
      throw error;
    }
  },

  syncCart: async (items: CartLine[]): Promise<CartLine[]> => {
    const dtoItems: SyncItemDto[] = items.map(i => {
      // Intentar convertir a número si es posible, si no dejar como string (para slugs)
      const parseId = (val: string) => {
        const n = Number(val);
        return isNaN(n) ? val : n;
      };

      return {
        tipo: i.type === 'product' ? 'producto' : 'curso',
        productoId: i.type === 'product' ? parseId(i.id) : undefined,
        cursoId: i.type === 'course' ? parseId(i.id) : undefined,
        cantidad: i.quantity
      };
    });

    const { data } = await api.post<CartResponse>('cart/sync', { items: dtoItems });
    return mapResponseToLines(data);
  },

  removeItem: async (type: CartKind, id: string): Promise<CartLine[]> => {
    const { data } = await api.delete<CartResponse>(`cart/item?type=${type === 'product' ? 'producto' : 'curso'}&refId=${id}`);
    return mapResponseToLines(data);
  },

  clearCart: async (): Promise<void> => {
    await api.delete('cart');
  },
};
