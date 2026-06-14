import { create } from 'zustand';
import axios from 'axios';

export interface Need {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  creatorId: string;
  acceptorId: string | null;
  status: string;
  isUrgent: boolean;
  proofPhoto: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NeedState {
  needs: Need[];
  currentNeed: Need | null;
  loading: boolean;
  error: string | null;
  fetchNeeds: () => Promise<void>;
  fetchNeedById: (id: string) => Promise<void>;
  createNeed: (data: Omit<Need, 'id' | 'creatorId' | 'acceptorId' | 'status' | 'isUrgent' | 'proofPhoto' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  acceptNeed: (id: string) => Promise<void>;
  completeNeed: (id: string, proofPhoto: string) => Promise<void>;
  confirmNeed: (id: string) => Promise<void>;
  toggleUrgent: (id: string) => Promise<void>;
}

const getUserId = (): string | null => {
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      return user.id ?? null;
    }
  } catch { /* ignore */ }
  return null;
};

export const useNeedStore = create<NeedState>((set) => ({
  needs: [],
  currentNeed: null,
  loading: false,
  error: null,

  fetchNeeds: async () => {
    set({ loading: true, error: null });
    try {
      const userId = getUserId();
      const res = await axios.get<Need[]>('/api/needs', {
        headers: userId ? { 'x-user-id': userId } : {},
      });
      set({ needs: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message ?? '获取需求列表失败', loading: false });
    }
  },

  fetchNeedById: async (id) => {
    set({ loading: true, error: null });
    try {
      const userId = getUserId();
      const res = await axios.get<Need>(`/api/needs/${id}`, {
        headers: userId ? { 'x-user-id': userId } : {},
      });
      set({ currentNeed: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message ?? '获取需求详情失败', loading: false });
    }
  },

  createNeed: async (data) => {
    set({ loading: true, error: null });
    try {
      const userId = getUserId();
      const res = await axios.post<Need>('/api/needs', data, {
        headers: userId ? { 'x-user-id': userId } : {},
      });
      set((state) => ({
        needs: [...state.needs, res.data],
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message ?? '创建需求失败', loading: false });
    }
  },

  acceptNeed: async (id) => {
    set({ loading: true, error: null });
    try {
      const userId = getUserId();
      const res = await axios.put<Need>(`/api/needs/${id}/accept`, {}, {
        headers: userId ? { 'x-user-id': userId } : {},
      });
      set((state) => ({
        needs: state.needs.map((n) => (n.id === id ? res.data : n)),
        currentNeed: state.currentNeed?.id === id ? res.data : state.currentNeed,
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message ?? '接受需求失败', loading: false });
    }
  },

  completeNeed: async (id, proofPhoto) => {
    set({ loading: true, error: null });
    try {
      const userId = getUserId();
      const res = await axios.put<Need>(`/api/needs/${id}/complete`, { proofPhoto }, {
        headers: userId ? { 'x-user-id': userId } : {},
      });
      set((state) => ({
        needs: state.needs.map((n) => (n.id === id ? res.data : n)),
        currentNeed: state.currentNeed?.id === id ? res.data : state.currentNeed,
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message ?? '完成需求失败', loading: false });
    }
  },

  confirmNeed: async (id) => {
    set({ loading: true, error: null });
    try {
      const userId = getUserId();
      const res = await axios.put<Need>(`/api/needs/${id}/confirm`, {}, {
        headers: userId ? { 'x-user-id': userId } : {},
      });
      set((state) => ({
        needs: state.needs.map((n) => (n.id === id ? res.data : n)),
        currentNeed: state.currentNeed?.id === id ? res.data : state.currentNeed,
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message ?? '确认需求失败', loading: false });
    }
  },

  toggleUrgent: async (id) => {
    set({ loading: true, error: null });
    try {
      const userId = getUserId();
      const res = await axios.put<Need>(`/api/needs/${id}/urgent`, {}, {
        headers: userId ? { 'x-user-id': userId } : {},
      });
      set((state) => ({
        needs: state.needs.map((n) => (n.id === id ? res.data : n)),
        currentNeed: state.currentNeed?.id === id ? res.data : state.currentNeed,
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message ?? '切换紧急状态失败', loading: false });
    }
  },
}));
