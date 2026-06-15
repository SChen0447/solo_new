import { create } from 'zustand';
import type { CartItem, Book } from '../api/books';
import { calculateTotal } from '../api/books';

interface CartStore {
  items: CartItem[];
  isCartOpen: boolean;
  addItem: (book: Book, edition: 'hardcover' | 'special' | 'collectors', engraving: string) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  closeCart: () => void;
  total: number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isCartOpen: false,
  
  addItem: (book, edition, engraving) => {
    const { items } = get();
    const existingIndex = items.findIndex(
      item => item.book.id === book.id && 
              item.edition === edition && 
              item.engraving === engraving
    );
    
    if (existingIndex !== -1) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      set({ items: newItems, total: calculateTotal(newItems) });
    } else {
      const newItem: CartItem = {
        book,
        edition,
        engraving,
        quantity: 1
      };
      const newItems = [...items, newItem];
      set({ items: newItems, total: calculateTotal(newItems) });
    }
    set({ isCartOpen: true });
  },
  
  removeItem: (index) => {
    const { items } = get();
    const newItems = items.filter((_, i) => i !== index);
    set({ items: newItems, total: calculateTotal(newItems) });
  },
  
  updateQuantity: (index, quantity) => {
    if (quantity <= 0) {
      get().removeItem(index);
      return;
    }
    const { items } = get();
    const newItems = [...items];
    newItems[index].quantity = quantity;
    set({ items: newItems, total: calculateTotal(newItems) });
  },
  
  clearCart: () => set({ items: [], total: 0 }),
  
  toggleCart: () => set(state => ({ isCartOpen: !state.isCartOpen })),
  
  closeCart: () => set({ isCartOpen: false }),
  
  total: 0
}));
