import { create } from 'zustand';
import apiClient from '../utils/apiClient';

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  initial_quantity: number;
  unit_cost: number;
  created_at: string;
  updated_at: string;
}

export interface ConsumptionRecord {
  id: string;
  inventory_id: string;
  product_id: string;
  quantity_consumed: number;
  consumed_at: string;
  material_name?: string;
}

export interface TrendDataPoint {
  date: string;
  inventory_id: string;
  total_consumed: number;
}

interface InventoryState {
  items: InventoryItem[];
  consumption: ConsumptionRecord[];
  trendData: TrendDataPoint[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  fetchInventory: () => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'initial_quantity'>) => Promise<InventoryItem>;
  updateItem: (id: string, data: Partial<InventoryItem>) => Promise<InventoryItem>;
  deleteItem: (id: string) => Promise<void>;
  restockItem: (id: string, quantity: number) => Promise<InventoryItem>;
  setSearchTerm: (term: string) => void;
  getFilteredItems: () => InventoryItem[];
  getLowStockItems: () => InventoryItem[];
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  consumption: [],
  trendData: [],
  loading: false,
  error: null,
  searchTerm: '',

  fetchInventory: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/inventory');
      set({
        items: res.data.items,
        consumption: res.data.consumption,
        trendData: res.data.trendData,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addItem: async (item) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/inventory', item);
      const newItem = res.data;
      set((state) => ({
        items: [...state.items, newItem].sort((a, b) =>
          a.name.localeCompare(b.name, 'zh-CN')
        ),
        loading: false,
      }));
      return newItem;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateItem: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.put(`/inventory/${id}`, data);
      const updated = res.data;
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? updated : i)),
        loading: false,
      }));
      return updated;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteItem: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/inventory/${id}`);
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  restockItem: async (id, quantity) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post(`/inventory/restock/${id}`, { quantity });
      const updated = res.data;
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? updated : i)),
        loading: false,
      }));
      return updated;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  setSearchTerm: (term) => set({ searchTerm: term }),

  getFilteredItems: () => {
    const { items, searchTerm } = get();
    if (!searchTerm.trim()) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        item.unit.toLowerCase().includes(lower)
    );
  },

  getLowStockItems: () => {
    const { items } = get();
    return items.filter(
      (item) => item.initial_quantity > 0 && item.quantity < item.initial_quantity * 0.1
    );
  },
}));
