import { create } from 'zustand';
import axios from 'axios';
import type { Bean, Batch } from '../types';

interface BeanState {
  beans: Bean[];
  batches: Batch[];
  loading: boolean;
  fetchBeans: () => Promise<void>;
  fetchBatches: () => Promise<void>;
  addBean: (bean: Omit<Bean, 'id' | 'createdAt'>) => Promise<void>;
  updateBean: (id: string, data: Partial<Bean>) => Promise<void>;
  deleteBean: (id: string) => Promise<void>;
  addBatch: (batch: Omit<Batch, 'id' | 'createdAt'>) => Promise<void>;
  updateBatch: (id: string, data: Partial<Batch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
}

export const useBeanStore = create<BeanState>((set) => ({
  beans: [],
  batches: [],
  loading: false,

  fetchBeans: async () => {
    set({ loading: true });
    const res = await axios.get<Bean[]>('/api/beans');
    set({ beans: res.data, loading: false });
  },

  fetchBatches: async () => {
    set({ loading: true });
    const res = await axios.get<Batch[]>('/api/batches');
    set({ batches: res.data, loading: false });
  },

  addBean: async (bean) => {
    const res = await axios.post<Bean>('/api/beans', bean);
    set((s) => ({ beans: [...s.beans, res.data] }));
  },

  updateBean: async (id, data) => {
    const res = await axios.put<Bean>(`/api/beans/${id}`, data);
    set((s) => ({ beans: s.beans.map((b) => (b.id === id ? res.data : b)) }));
  },

  deleteBean: async (id) => {
    await axios.delete(`/api/beans/${id}`);
    set((s) => ({ beans: s.beans.filter((b) => b.id !== id) }));
  },

  addBatch: async (batch) => {
    const res = await axios.post<Batch>('/api/batches', batch);
    set((s) => ({ batches: [...s.batches, res.data] }));
  },

  updateBatch: async (id, data) => {
    const res = await axios.put<Batch>(`/api/batches/${id}`, data);
    set((s) => ({ batches: s.batches.map((b) => (b.id === id ? res.data : b)) }));
  },

  deleteBatch: async (id) => {
    await axios.delete(`/api/batches/${id}`);
    set((s) => ({ batches: s.batches.filter((b) => b.id !== id) }));
  },
}));
