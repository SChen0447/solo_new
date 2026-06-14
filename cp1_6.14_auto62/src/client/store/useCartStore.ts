import { create } from 'zustand';
import { CartItem } from '../types';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  closeCart: () => void;
  getTotalAmount: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,

  addItem: (item) => {
    set((state) => {
      const existingIndex = state.items.findIndex(i => i.productId === item.productId);
      if (existingIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingIndex] = item;
        return { items: newItems };
      }
      return { items: [...state.items, item] };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter(item => item.productId !== productId)
    }));
  },

  clearCart: () => {
    set({ items: [] });
  },

  toggleCart: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  closeCart: () => {
    set({ isOpen: false });
  },

  getTotalAmount: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.dailyRate * item.days, 0);
  },

  getItemCount: () => {
    const { items } = get();
    return items.length;
  }
}));
