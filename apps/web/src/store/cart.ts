'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { cartApi } from '@/lib/sdk/cartApi';

export type CartKind = 'product' | 'course';

export type CartLineProduct = {
  type: 'product';
  id: string;            // id del producto
  slug: string;
  title: string;
  price: number;         // precio directo
  image?: string | null;
  quantity: number;      // >=1
  maxQty?: number | null;
};

export type CartLineCourse = {
  type: 'course';
  id: string;            // id del curso
  slug: string;
  title: string;
  price: number;         // precio directo
  image?: string | null;
  quantity: 1;           // fijo
};

export type CartLine = CartLineProduct | CartLineCourse;

export type CartState = {
  items: CartLine[];
  isOpen: boolean;
  hydrated: boolean;

  // Acciones UI
  open: () => void;
  close: () => void;
  toggle: () => void;

  // Acciones líneas
  clear: () => void;
  remove: (id: string, type: CartKind) => void;
  setQty: (id: string, qty: number) => void;
  increase: (id: string) => void;
  decrease: (id: string) => void;
  addProduct: (line: Omit<CartLineProduct, 'type' | 'quantity'> & { quantity?: number }) => Promise<void>;
  addCourse: (line: Omit<CartLineCourse, 'type' | 'quantity'>) => Promise<void>;
  syncWithBackend: () => Promise<void>;
  reset: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      hydrated: false,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set({ isOpen: !get().isOpen }),

      syncWithBackend: async () => {
        try {
          // Sincronizar estado actual con backend
          // El backend hace merge y devuelve el estado final
          const { items } = get();
          console.log('[CartStore] Syncing with backend...', items);
          const mergedItems = await cartApi.syncCart(items);
          console.log('[CartStore] Sync success, merged items:', mergedItems);
          set({ items: mergedItems, hydrated: true });
        } catch (error) {
          console.error('[CartStore] Sync cart failed:', error);
          // Si falla, al menos marcamos como hidratado para no bloquear UI si dependiera de ello
          set({ hydrated: true });
        }
      },

      clear: () => {
        set({ items: [] });
        cartApi.clearCart().catch(() => {});
      },
      reset: () => set({ items: [] }),
      remove: (id, type) => {
        set({ items: get().items.filter(i => !(i.id === id && i.type === type)) });
        cartApi.removeItem(type, id).catch(() => {});
      },

      setQty: (id, qty) => {
        if (qty < 1 || !Number.isFinite(qty)) return;
        const nextItems = get().items.map(i =>
          i.type === 'product' && i.id === id
            ? { ...i, quantity: Math.max(1, Math.min(qty, i.maxQty ?? 99)) }
            : i
        );
        set({ items: nextItems });

        // Sincronizar el item modificado
        const updatedItem = nextItems.find(i => i.id === id && i.type === 'product');
        if (updatedItem) {
          cartApi.syncCart([updatedItem]).catch(() => {});
        }
      },
      increase: (id) => {
        const it = get().items.find(i => i.id === id && i.type === 'product') as CartLineProduct | undefined;
        if (!it) return;
        const next = Math.min((it.quantity ?? 1) + 1, it.maxQty ?? 99);
        get().setQty(id, next);
      },
      decrease: (id) => {
        const it = get().items.find(i => i.id === id && i.type === 'product') as CartLineProduct | undefined;
        if (!it) return;
        const next = Math.max((it.quantity ?? 1) - 1, 1);
        get().setQty(id, next);
      },

      addProduct: async (line) => {
        const qty = Math.max(1, Math.min(line.quantity ?? 1, line.maxQty ?? 99));
        const cur = get().items;
        const idx = cur.findIndex(i => i.type === 'product' && i.id === line.id);
        
        if (idx >= 0) {
          const it = cur[idx] as CartLineProduct;
          const mergedQty = Math.min(it.quantity + qty, it.maxQty ?? line.maxQty ?? 99);
          const next = [...cur];
          next[idx] = { ...it, quantity: mergedQty };
          set({ items: next, isOpen: true });
          
          // Toast para producto actualizado
          try {
            const { toast } = await import('react-toastify');
            toast.success(`${line.title} actualizado en el carrito (${mergedQty})`, {
              position: 'bottom-right',
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          } catch (error) {
            console.error('Error al mostrar toast:', error);
          }
        } else {
          set({
            items: [
              ...cur,
              {
                type: 'product',
                id: line.id,
                slug: line.slug,
                title: line.title,
                price: line.price,
                image: line.image ?? null,
                quantity: qty,
                maxQty: line.maxQty ?? null,
              },
            ],
            isOpen: true,
          });
          
          // Toast para producto agregado
          try {
            const { toast } = await import('react-toastify');
            toast.success(`${line.title} agregado al carrito`, {
              position: 'bottom-right',
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          } catch (error) {
            console.error('Error al mostrar toast:', error);
          }
        }

        // Sincronizar con backend
        const finalItem = get().items.find(i => i.type === 'product' && i.id === line.id);
        if (finalItem) {
          cartApi.syncCart([finalItem]).catch(() => {});
        }
      },

      addCourse: async (line) => {
        const cur = get().items;
        const exists = cur.some(i => i.type === 'course' && i.id === line.id);
        
        if (!exists) {
          set({
            items: [
              ...cur,
              {
                type: 'course',
                id: line.id,
                slug: line.slug,
                title: line.title,
                price: line.price,
                image: line.image ?? null,
                quantity: 1,
              },
            ],
            isOpen: true,
          });
          
          // Toast para curso agregado
          try {
            const { toast } = await import('react-toastify');
            toast.success(`${line.title} agregado al carrito`, {
              position: 'bottom-right',
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          } catch (error) {
            console.error('Error al mostrar toast:', error);
          }
        } else {
          set({ isOpen: true });
          
          // Toast para curso ya existente
          try {
            const { toast } = await import('react-toastify');
            toast.info(`${line.title} ya está en tu carrito`, {
              position: 'bottom-right',
              autoClose: 2000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          } catch (error) {
            console.error('Error al mostrar toast:', error);
          }
        }

        // Sincronizar con backend
        const finalItem = get().items.find(i => i.type === 'course' && i.id === line.id);
        if (finalItem) {
             cartApi.syncCart([finalItem]).catch(() => {});
        }
      },
    }),
    {
      name: 'mp:cart:v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }), // solo persistimos items
      onRehydrateStorage: () => (state, error) => {
        // Se ejecuta post-hidratación
        if (error) console.error('[cart] persist error:', error);
      },
    }
  )
);

// Flag de hidratación para evitar mismatches del badge
// (patrón simple: marcar hydrated=true en client)
if (typeof window !== 'undefined') {
  // marcar hydrated después del primer tick
  requestAnimationFrame(() => {
    try {
      useCart.setState({ hydrated: true });
    } catch {}
  });
}

// Helpers derivados (no persistidos)
export const cartSelectors = {
  count: (items: CartLine[]) =>
    items.reduce((acc, it) => acc + (it.type === 'product' ? it.quantity : 1), 0),
  subtotal: (items: CartLine[]) =>
    items.reduce((acc, it) => acc + it.price * (it.type === 'product' ? it.quantity : 1), 0),
};
