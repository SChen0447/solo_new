import { create } from 'zustand';
import axios from 'axios';
import type { Tasting } from '../types';

interface TastingState {
  tastings: Tasting[];
  loading: boolean;
  fetchTastings: () => Promise<void>;
  addTasting: (tasting: Omit<Tasting, 'id' | 'createdAt'>) => Promise<void>;
  updateTasting: (id: string, data: Partial<Tasting>) => Promise<void>;
  deleteTasting: (id: string) => Promise<void>;
}

export const useTastingStore = create<TastingState>((set) => ({
  tastings: [],
  loading: false,

  fetchTastings: async () => {
    set({ loading: true });
    const res = await axios.get<Tasting[]>('/api/tastings');
    set({ tastings: res.data, loading: false });
  },

  addTasting: async (tasting) => {
    const res = await axios.post<Tasting>('/api/tastings', tasting);
    set((s) => ({ tastings: [...s.tastings, res.data] }));
  },

  updateTasting: async (id, data) => {
    const res = await axios.put<Tasting>(`/api/tastings/${id}`, data);
    set((s) => ({ tastings: s.tastings.map((t) => (t.id === id ? res.data : t)) }));
  },

  deleteTasting: async (id) => {
    await axios.delete(`/api/tastings/${id}`);
    set((s) => ({ tastings: s.tastings.filter((t) => t.id !== id) }));
  },
}));
