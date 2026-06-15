import { create } from 'zustand';
import axios from 'axios';

export type TimeSlot = 'breakfast' | 'lunch' | 'dinner';

export interface Prices {
  breakfast: number;
  lunch: number;
  dinner: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  stock: number;
  recommended: boolean;
  prices: Prices;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  timeSlot: TimeSlot;
  createdAt: string;
}

interface MenuStore {
  menuItems: MenuItem[];
  orders: Order[];
  currentTimeSlot: TimeSlot;
  selectedItem: MenuItem | null;
  isLoading: boolean;
  error: string | null;

  fetchMenuItems: () => Promise<void>;
  createMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  updateMenuItem: (id: string, data: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  updateStock: (id: string, stock: number) => Promise<void>;
  setStockLocal: (id: string, stock: number) => void;
  setMenuItemLocal: (item: MenuItem) => void;
  removeMenuItemLocal: (id: string) => void;
  addMenuItemLocal: (item: MenuItem) => void;

  createOrder: (items: { id: string; quantity: number }[]) => Promise<void>;

  setCurrentTimeSlot: (slot: TimeSlot) => void;
  setSelectedItem: (item: MenuItem | null) => void;
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  menuItems: [],
  orders: [],
  currentTimeSlot: 'lunch',
  selectedItem: null,
  isLoading: false,
  error: null,

  fetchMenuItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.get('/api/menu');
      set({ menuItems: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || '加载菜单失败', isLoading: false });
    }
  },

  createMenuItem: async (item) => {
    set({ isLoading: true, error: null });
    try {
      await axios.post('/api/menu', item);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message || '创建菜品失败', isLoading: false });
    }
  },

  updateMenuItem: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await axios.put(`/api/menu/${id}`, data);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message || '更新菜品失败', isLoading: false });
    }
  },

  deleteMenuItem: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await axios.delete(`/api/menu/${id}`);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message || '删除菜品失败', isLoading: false });
    }
  },

  updateStock: async (id, stock) => {
    try {
      await axios.put(`/api/menu/${id}/stock`, { stock });
    } catch (err: any) {
      set({ error: err.message || '更新库存失败' });
    }
  },

  setStockLocal: (id, stock) => {
    set((state) => ({
      menuItems: state.menuItems.map((item) =>
        item.id === id ? { ...item, stock } : item
      )
    }));
  },

  setMenuItemLocal: (item) => {
    set((state) => ({
      menuItems: state.menuItems.map((i) => (i.id === item.id ? item : i))
    }));
  },

  removeMenuItemLocal: (id) => {
    set((state) => ({
      menuItems: state.menuItems.filter((i) => i.id !== id)
    }));
  },

  addMenuItemLocal: (item) => {
    set((state) => ({
      menuItems: [...state.menuItems, item]
    }));
  },

  createOrder: async (items) => {
    set({ isLoading: true, error: null });
    try {
      const timeSlot = get().currentTimeSlot;
      await axios.post('/api/orders', { items, timeSlot });
      set({ isLoading: false, selectedItem: null });
    } catch (err: any) {
      set({ error: err.message || '下单失败', isLoading: false });
      throw err;
    }
  },

  setCurrentTimeSlot: (slot) => set({ currentTimeSlot: slot }),
  setSelectedItem: (item) => set({ selectedItem: item })
}));

export function getTimeSlot(date: Date = new Date()): TimeSlot {
  const hour = date.getHours();
  if (hour >= 6 && hour <= 10) return 'breakfast';
  if (hour >= 11 && hour <= 16) return 'lunch';
  return 'dinner';
}

export const themeColors: Record<TimeSlot, {
  bg: string;
  cardBg: string;
  priceColor: string;
  primary: string;
  buttonBg: string;
  buttonHover: string;
}> = {
  breakfast: {
    bg: '#fff8e1',
    cardBg: '#fff8e1',
    priceColor: '#ff6d00',
    primary: '#ffcc80',
    buttonBg: '#1565c0',
    buttonHover: '#0d47a1'
  },
  lunch: {
    bg: '#e8f5e9',
    cardBg: '#e8f5e9',
    priceColor: '#00c853',
    primary: '#81c784',
    buttonBg: '#1565c0',
    buttonHover: '#0d47a1'
  },
  dinner: {
    bg: '#e3f2fd',
    cardBg: '#e3f2fd',
    priceColor: '#2979ff',
    primary: '#64b5f6',
    buttonBg: '#1565c0',
    buttonHover: '#0d47a1'
  }
};
