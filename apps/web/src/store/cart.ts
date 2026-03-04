'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { cartApi } from '@/lib/sdk/cartApi';

export type CartKind = 'product' | 'course';

export type CartLineProduct = {
  type: 'product';
  id: string;
  slug: string;
  title: string;
  price: number;
  image?: string | null;
  quantity: number;
  maxQty?: number | null;
  descuento?: number | null;
};

export type CartLineCourse = {
  type: 'course';
  id: string;
  slug: string;
  title: string;
  price: number;
  image?: string | null;
  quantity: 1;
  descuento?: number | null;
};

export type CartLine = CartLineProduct | CartLineCourse;

export type CartState = {
  items: CartLine[];
  isOpen: boolean;
  hydrated: boolean;
  _hasHydrated: boolean;

  open: () => void;
  close: () => void;
  toggle: () => void;

  clear: () => void;
  remove: (id: string, type: CartKind) => void;
  setQty: (id: string, qty: number) => void;
  increase: (id: string) => void;
  decrease: (id: string) => void;

  addProduct: (
    line: Omit<CartLineProduct, 'type' | 'quantity'> & { quantity?: number },
  ) => Promise<void>;

  addCourse: (line: Omit<CartLineCourse, 'type' | 'quantity'>) => Promise<void>;

  syncWithBackend: () => Promise<void>;
  reset: () => void;
  setHasHydrated: (val: boolean) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => {
      const syncNow = async (nextItems: CartLine[]) => {
        try {
          console.log('[CartStore] Syncing full cart with backend...', nextItems);
          const mergedItems = await cartApi.syncCart(nextItems);
          console.log('[CartStore] Sync success, merged:', mergedItems);
          set({ items: mergedItems, hydrated: true });
        } catch (error) {
          console.error('[CartStore] Sync failed:', error);
          set({ hydrated: true });
        }
      };

      return {
        items: [],
        isOpen: false,
        hydrated: false,
        _hasHydrated: false,

        setHasHydrated: (val) => set({ _hasHydrated: val }),

        open: () => set({ isOpen: true }),
        close: () => set({ isOpen: false }),
        toggle: () => set({ isOpen: !get().isOpen }),

        syncWithBackend: async () => {
          await syncNow(get().items);
        },

        clear: () => {
          set({ items: [] });
          cartApi.clearCart().catch(() => {});
        },

        reset: () => set({ items: [] }),

        remove: (id, type) => {
          const next = get().items.filter((i) => !(i.id === id && i.type === type));
          set({ items: next });
          // ✅ sync full cart, no solo remove
          syncNow(next).catch(() => {});
        },

        setQty: (id, qty) => {
          if (qty < 1 || !Number.isFinite(qty)) return;

          const nextItems = get().items.map((i) =>
            i.type === 'product' && i.id === id
              ? { ...i, quantity: Math.max(1, Math.min(qty, i.maxQty ?? 99)) }
              : i,
          );

          set({ items: nextItems });
          syncNow(nextItems).catch(() => {});
        },

        increase: (id) => {
          const current = get().items.find((i) => i.id === id && i.type === 'product') as
            | CartLineProduct
            | undefined;
          get().setQty(id, (current?.quantity ?? 0) + 1);
        },

        decrease: (id) => {
          const current = get().items.find((i) => i.id === id && i.type === 'product') as
            | CartLineProduct
            | undefined;
          get().setQty(id, (current?.quantity ?? 0) - 1);
        },

        addProduct: async (line) => {
          const items = get().items;

          const hasCourses = items.some((i) => i.type === 'course');
          if (hasCourses) {
            throw new Error(
              'No puedes mezclar productos con suscripciones a cursos. Finalizá tu compra de cursos primero o vaciá el carrito.',
            );
          }

          const qty = Math.max(1, Number(line.quantity ?? 1));
          const existing = items.find((i) => i.type === 'product' && i.id === line.id) as
            | CartLineProduct
            | undefined;

          let nextItems: CartLine[];
          if (existing) {
            nextItems = items.map((i) =>
              i.type === 'product' && i.id === line.id
                ? {
                    ...i,
                    quantity: Math.max(1, Math.min(i.quantity + qty, i.maxQty ?? 99)),
                  }
                : i,
            );
          } else {
            const newItem: CartLineProduct = {
              ...line,
              type: 'product',
              quantity: qty,
              id: line.id,
              slug: line.slug,
              title: line.title,
              price: line.price,
            };
            nextItems = [...items, newItem];
          }

          set({ items: nextItems });
          await syncNow(nextItems);
        },

        addCourse: async (line) => {
          const items = get().items;

          const hasProducts = items.some((i) => i.type === 'product');
          if (hasProducts) {
            throw new Error(
              'No puedes mezclar suscripciones a cursos con productos físicos. Finalizá tu compra de productos primero o vaciá el carrito.',
            );
          }

          if (items.some((i) => i.type === 'course' && i.id === line.id)) {
            return;
          }

          const newCourse: CartLineCourse = {
            ...line,
            type: 'course',
            quantity: 1,
            id: line.id,
            slug: line.slug,
            title: line.title,
            price: line.price,
          };

          const nextItems = [...items, newCourse];
          set({ items: nextItems });
          await syncNow(nextItems);
        },
      };
    },
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

if (typeof window !== 'undefined') {
  requestAnimationFrame(() => {
    try {
      useCart.setState({ hydrated: true });
    } catch {}
  });
}

export const cartSelectors = {
  count: (items: CartLine[]) =>
    items.reduce((acc, it) => acc + (it.type === 'product' ? it.quantity : 1), 0),
  subtotal: (items: CartLine[]) =>
    items.reduce((acc, it) => acc + it.price * (it.type === 'product' ? it.quantity : 1), 0),
};