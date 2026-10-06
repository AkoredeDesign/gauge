import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Global cart store, read by the bag drawer, the Bag counters and Add to bag.
 *
 * Persisted to sessionStorage so the cart survives client-side navigation and
 * reloads within a tab (same behaviour as KESTREL), but closes with the tab.
 *
 * Components subscribe directly — no provider:
 *   const items = useCartStore((s) => s.items);
 *   const addItem = useCartStore((s) => s.addItem);
 *
 * Hydration: `skipHydration` is on so the server render and the first client
 * render agree (both see an empty cart). BagDrawer (mounted once, in the root
 * layout) calls `useCartStore.persist.rehydrate()` in its mount effect.
 */

export const MAX_QTY = 9;

export type CartItem = {
  /** Unique line id: `${slug}:${variantId}` */
  id: string;
  slug: string;        // e.g. "gauge-01"
  variantId: string;   // e.g. "steel-black-strap"
  name: string;        // e.g. "GAUGE-01"
  variantLabel: string;
  price: number;       // whole USD, display-only
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id" | "quantity">, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
};

const lineId = (slug: string, variantId: string) => `${slug}:${variantId}`;
const clampQty = (n: number) => Math.min(MAX_QTY, Math.max(0, Math.floor(n)));

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item, quantity = 1) =>
        set((state) => {
          const id = lineId(item.slug, item.variantId);
          const existing = state.items.find((i) => i.id === id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === id ? { ...i, quantity: clampQty(i.quantity + quantity) } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, id, quantity: clampQty(quantity) }] };
        }),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, quantity) =>
        set((state) => {
          const q = clampQty(quantity);
          if (q === 0) return { items: state.items.filter((i) => i.id !== id) };
          return { items: state.items.map((i) => (i.id === id ? { ...i, quantity: q } : i)) };
        }),

      clear: () => set({ items: [] }),
    }),
    {
      name: "gauge-cart",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
    },
  ),
);

/* Derived selectors — use as useCartStore(selectItemCount) */
export const selectItemCount = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.quantity, 0);

export const selectSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
