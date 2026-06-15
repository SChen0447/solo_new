import { create } from 'zustand';
import type { User, Song, MoodType, SceneType } from '@/types';
import { usersApi } from '@/utils/api';

interface UserStore {
  user: User | null;
  mood: MoodType | null;
  scene: SceneType | null;
  history: Song[];
  loading: boolean;
  
  setMood: (mood: MoodType | null) => void;
  setScene: (scene: SceneType | null) => void;
  fetchUser: (id?: string) => Promise<void>;
  fetchHistory: () => Promise<void>;
  addToHistory: (song: Song) => Promise<void>;
  clearHistory: () => void;
}

const defaultUser: User = {
  id: 'user-default',
  name: '音乐爱好者',
  avatar: '',
  createdAt: Date.now(),
};

export const useUserStore = create<UserStore>((set, get) => ({
  user: defaultUser,
  mood: null,
  scene: null,
  history: [],
  loading: false,

  setMood: (mood) => set({ mood }),

  setScene: (scene) => set({ scene }),

  fetchUser: async (id = 'user-default') => {
    try {
      const user = await usersApi.detail(id);
      set({ user });
    } catch (e) {
      set({ user: defaultUser });
    }
  },

  fetchHistory: async () => {
    set({ loading: true });
    try {
      const history = await usersApi.getHistory('user-default');
      set({ history });
    } catch (e) {
      console.error('加载历史记录失败', e);
    } finally {
      set({ loading: false });
    }
  },

  addToHistory: async (song) => {
    set(s => {
      const filtered = s.history.filter(h => h.id !== song.id);
      const newHistory = [song, ...filtered].slice(0, 10);
      return { history: newHistory };
    });
  },

  clearHistory: () => set({ history: [] }),
}));
