import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, MenuItem } from '../types';

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  isOpen: boolean;
  addItem: (item: MenuItem, restaurantId: string, restaurantName: string) => boolean;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, delta: number) => void;
  clearCart: () => void;
  setIsOpen: (isOpen: boolean) => void;
  totalCount: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      restaurantName: null,
      isOpen: false,

      addItem: (item: MenuItem, restaurantId: string, restaurantName: string) => {
        const { items, restaurantId: currentRestId } = get();

        // If items exist from a different restaurant, check
        if (items.length > 0 && currentRestId && currentRestId !== restaurantId) {
          return false; // indicates conflict with existing restaurant
        }

        const existingIndex = items.findIndex((i) => i.menuItem.id === item.id);
        let newItems: CartItem[];

        if (existingIndex > -1) {
          newItems = items.map((i, idx) =>
            idx === existingIndex ? { ...i, quantity: i.quantity + 1 } : i
          );
        } else {
          newItems = [...items, { menuItem: item, restaurantId, restaurantName, quantity: 1 }];
        }

        set({
          items: newItems,
          restaurantId,
          restaurantName,
        });

        return true;
      },

      removeItem: (menuItemId: string) => {
        const { items } = get();
        const newItems = items.filter((i) => i.menuItem.id !== menuItemId);
        set({
          items: newItems,
          restaurantId: newItems.length === 0 ? null : get().restaurantId,
          restaurantName: newItems.length === 0 ? null : get().restaurantName,
        });
      },

      updateQuantity: (menuItemId: string, delta: number) => {
        const { items } = get();
        const newItems = items
          .map((i) => {
            if (i.menuItem.id === menuItemId) {
              const newQty = i.quantity + delta;
              return newQty > 0 ? { ...i, quantity: newQty } : null;
            }
            return i;
          })
          .filter(Boolean) as CartItem[];

        set({
          items: newItems,
          restaurantId: newItems.length === 0 ? null : get().restaurantId,
          restaurantName: newItems.length === 0 ? null : get().restaurantName,
        });
      },

      clearCart: () => {
        set({ items: [], restaurantId: null, restaurantName: null });
      },

      setIsOpen: (isOpen: boolean) => set({ isOpen }),

      totalCount: () => {
        return get().items.reduce((acc, item) => acc + item.quantity, 0);
      },

      subtotal: () => {
        return get().items.reduce(
          (acc, item) => acc + Number(item.menuItem.price) * item.quantity,
          0
        );
      },
    }),
    {
      name: 'orderflow-cart',
    }
  )
);
