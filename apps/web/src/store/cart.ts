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
  _hasHydrated: boolean;

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
  setHasHydrated: (val: boolean) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      hydrated: false,
      _hasHydrated: false,

      setHasHydrated: (val) => set({ _hasHydrated: val }),

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
      },

      increase: (id) => {
        get().setQty(id, (get().items.find(i => i.id === id && i.type === 'product')?.quantity || 0) + 1);
      },

      decrease: (id) => {
        get().setQty(id, (get().items.find(i => i.id === id && i.type === 'product')?.quantity || 0) - 1);
      },

      addProduct: async (line) => {
        const { items } = get();
        const existing = items.find(i => i.type === 'product' && i.id === line.id);
        
        if (existing) {
          get().setQty(line.id, existing.quantity + (line.quantity || 1));
        } else {
          set({
            items: [...items, { ...line, type: 'product', quantity: line.quantity || 1 }]
          });
        }
        
        // get().open(); // Eliminado para evitar apertura automática
        
        const newItem: CartLineProduct = { ...line, type: 'product', quantity: line.quantity || 1, id: line.id, slug: line.slug, title: line.title, price: line.price }; 
        cartApi.syncCart([newItem]).catch(() => {});
      },

      addCourse: async (line) => {
        const { items } = get();
        if (items.some(i => i.type === 'course' && i.id === line.id)) {
          // get().open(); // Eliminado
          return;
        }

        const newCourse: CartLineCourse = { ...line, type: 'course', quantity: 1, id: line.id, slug: line.slug, title: line.title, price: line.price };
        set({
          items: [...items, newCourse]
        });
        
        // get().open(); // Eliminado
        cartApi.syncCart([newCourse]).catch(() => {});
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
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
