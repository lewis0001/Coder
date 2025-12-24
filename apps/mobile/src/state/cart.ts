import { create } from 'zustand';

export type CartItemType = 'FOOD' | 'SHOP';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  type: CartItemType;
  sourceId?: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string, type: CartItemType) => void;
  updateQuantity: (id: string, type: CartItemType, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id && i.type === item.type);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id && i.type === item.type
              ? { ...i, quantity: Math.min(i.quantity + 1, 99) }
              : i,
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    });
  },
  removeItem: (id, type) => set((state) => ({ items: state.items.filter((i) => !(i.id === id && i.type === type)) })),
  updateQuantity: (id, type, quantity) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.id === id && i.type === type ? { ...i, quantity: Math.max(1, quantity) } : i))
        .filter((i) => i.quantity > 0),
    })),
  clear: () => set({ items: [] }),
}));

export function getCartTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
