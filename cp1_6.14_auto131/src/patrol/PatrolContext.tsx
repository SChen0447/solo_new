import { create } from 'zustand';
import axios from 'axios';
import type { Patrol } from '@/types';

interface PatrolState {
  patrols: Patrol[];
  patrolsByVendor: Record<string, Patrol[]>;
  loading: boolean;
  error: string | null;
  selectedPatrol: Patrol | null;

  fetchPatrols: () => Promise<void>;
  fetchPatrolByVendor: (vendorId: string) => Promise<Patrol[]>;
  addPatrol: (data: Partial<Patrol> & { revokeVendor?: boolean }) => Promise<Patrol>;
  setSelectedPatrol: (patrol: Patrol | null) => void;
  getPatrolById: (id: string) => Patrol | undefined;
  getTodayStats: () => { total: number; violations: number };
}

export const usePatrolStore = create<PatrolState>((set, get) => ({
  patrols: [],
  patrolsByVendor: {},
  loading: false,
  error: null,
  selectedPatrol: null,

  fetchPatrols: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get('/api/patrols');
      const patrols = res.data as Patrol[];
      const byVendor: Record<string, Patrol[]> = {};
      patrols.forEach(p => {
        if (!byVendor[p.vendorId]) byVendor[p.vendorId] = [];
        byVendor[p.vendorId].push(p);
      });
      Object.keys(byVendor).forEach(k => {
        byVendor[k].sort(
          (a, b) => new Date(b.patrolTime).getTime() - new Date(a.patrolTime).getTime()
        );
      });
      set({ patrols, patrolsByVendor: byVendor, loading: false });
    } catch (err) {
      set({ error: '加载巡查数据失败', loading: false });
    }
  },

  fetchPatrolByVendor: async (vendorId) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get('/api/patrols', { params: { vendorId } });
      const patrols = res.data as Patrol[];
      set(state => ({
        patrolsByVendor: { ...state.patrolsByVendor, [vendorId]: patrols },
        loading: false,
      }));
      return patrols;
    } catch (err) {
      set({ error: '加载巡查记录失败', loading: false });
      return [];
    }
  },

  addPatrol: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post('/api/patrols', data);
      const newPatrol = res.data as Patrol;
      set(state => {
        const existing = state.patrolsByVendor[newPatrol.vendorId] || [];
        const updated = [newPatrol, ...existing].sort(
          (a, b) => new Date(b.patrolTime).getTime() - new Date(a.patrolTime).getTime()
        );
        return {
          patrols: [newPatrol, ...state.patrols],
          patrolsByVendor: {
            ...state.patrolsByVendor,
            [newPatrol.vendorId]: updated,
          },
          loading: false,
        };
      });
      return newPatrol;
    } catch (err) {
      set({ error: '添加巡查记录失败', loading: false });
      throw err;
    }
  },

  setSelectedPatrol: (patrol) => {
    set({ selectedPatrol: patrol });
  },

  getPatrolById: (id) => {
    return get().patrols.find(p => p.id === id);
  },

  getTodayStats: () => {
    const today = new Date().toISOString().split('T')[0];
    const todayPatrols = get().patrols.filter(p => p.patrolTime.startsWith(today));
    return {
      total: todayPatrols.length,
      violations: todayPatrols.filter(p => p.status !== '正常').length,
    };
  },
}));
