import { create } from 'zustand';
import axios from 'axios';
import type { Item } from '../types';

interface ItemState {
  items: Item[];
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<Item, 'id' | 'userId' | 'status' | 'createdAt'>) => Promise<Item>;
  deleteItem: (id: string) => Promise<void>;
  updateItemStatus: (id: string, status: Item['status']) => Promise<void>;
}

export const useItemStore = create<ItemState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get<Item[]>('/api/items');
      set({ items: res.data });
    } catch (err) {
      set({ error: '加载物品列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (item) => {
    try {
      const res = await axios.post<Item>('/api/items', item);
      set({ items: [res.data, ...get().items] });
      return res.data;
    } catch (err) {
      set({ error: '发布物品失败' });
      throw err;
    }
  },

  deleteItem: async (id) => {
    try {
      await axios.delete(`/api/items/${id}`);
      set({ items: get().items.filter((i) => i.id !== id) });
    } catch (err) {
      set({ error: '删除物品失败' });
      throw err;
    }
  },

  updateItemStatus: async (id, status) => {
    try {
      await axios.patch(`/api/items/${id}`, { status });
      set({
        items: get().items.map((i) => (i.id === id ? { ...i, status } : i)),
      });
    } catch (err) {
      set({ error: '更新物品状态失败' });
      throw err;
    }
  },
}));
