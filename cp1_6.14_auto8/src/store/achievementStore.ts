import { create } from 'zustand';
import axios from 'axios';

export type Platform = 'Steam' | 'Xbox' | 'PlayStation' | 'Nintendo';

export interface Achievement {
  id: string;
  gameName: string;
  achievementName: string;
  description: string;
  platform: Platform;
  unlockDate: string;
  difficulty: number;
  unlocked: boolean;
  createdAt: string;
}

interface AchievementState {
  achievements: Achievement[];
  loading: boolean;
  filterPlatform: Platform | 'All';
  filterDifficulty: number | 'All';
  expandedId: string | null;

  fetchAchievements: () => Promise<void>;
  addAchievement: (data: Omit<Achievement, 'id' | 'createdAt'>) => Promise<void>;
  deleteAchievement: (id: string) => Promise<void>;
  setFilterPlatform: (platform: Platform | 'All') => void;
  setFilterDifficulty: (difficulty: number | 'All') => void;
  setExpandedId: (id: string | null) => void;

  filteredAchievements: () => Achievement[];
  totalCount: () => number;
  platformCount: () => number;
  averageCompletion: () => number;
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  achievements: [],
  loading: false,
  filterPlatform: 'All',
  filterDifficulty: 'All',
  expandedId: null,

  fetchAchievements: async () => {
    set({ loading: true });
    try {
      const res = await axios.get<Achievement[]>('/api/achievements');
      set({ achievements: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addAchievement: async (data) => {
    try {
      const res = await axios.post<Achievement>('/api/achievements', data);
      set((state) => ({ achievements: [res.data, ...state.achievements] }));
    } catch {
      // handle error
    }
  },

  deleteAchievement: async (id) => {
    try {
      await axios.delete(`/api/achievements/${id}`);
      set((state) => ({
        achievements: state.achievements.filter((a) => a.id !== id),
        expandedId: state.expandedId === id ? null : state.expandedId,
      }));
    } catch {
      // handle error
    }
  },

  setFilterPlatform: (platform) => set({ filterPlatform: platform }),
  setFilterDifficulty: (difficulty) => set({ filterDifficulty: difficulty }),
  setExpandedId: (id) => set({ expandedId: id }),

  filteredAchievements: () => {
    const { achievements, filterPlatform, filterDifficulty } = get();
    return achievements.filter((a) => {
      if (filterPlatform !== 'All' && a.platform !== filterPlatform) return false;
      if (filterDifficulty !== 'All' && a.difficulty !== filterDifficulty) return false;
      return true;
    });
  },

  totalCount: () => get().achievements.length,

  platformCount: () => {
    const { achievements, filterPlatform } = get();
    if (filterPlatform === 'All') return achievements.length;
    return achievements.filter((a) => a.platform === filterPlatform).length;
  },

  averageCompletion: () => {
    const { achievements, filterPlatform } = get();
    const filtered =
      filterPlatform === 'All'
        ? achievements
        : achievements.filter((a) => a.platform === filterPlatform);
    if (filtered.length === 0) return 0;
    const unlocked = filtered.filter((a) => a.unlocked).length;
    return Math.round((unlocked / filtered.length) * 100);
  },
}));
