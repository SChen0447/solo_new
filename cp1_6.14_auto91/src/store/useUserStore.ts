import { create } from 'zustand';
import axios from 'axios';

export interface User {
  id: string;
  username: string;
  pointsBalance: number;
  totalPointsEarned: number;
  avatar: string;
}

interface LeaderboardEntry {
  id: string;
  username: string;
  pointsBalance: number;
  avatar: string;
}

interface UserState {
  currentUser: User | null;
  leaderboard: LeaderboardEntry[];
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchProfile: (userId: string) => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
}

const USER_STORAGE_KEY = 'user';

const saveUserToStorage = (user: User) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

const removeUserFromStorage = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
};

const restoreUserFromStorage = (): User | null => {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as User;
    }
  } catch { /* ignore */ }
  return null;
};

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: restoreUserFromStorage(),
  leaderboard: [],
  isLoggedIn: !!restoreUserFromStorage(),
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post<User>('/api/auth/login', { username, password });
      const user = res.data;
      saveUserToStorage(user);
      set({ currentUser: user, isLoggedIn: true, loading: false });
    } catch (err: any) {
      set({ error: err.message ?? '登录失败', loading: false });
    }
  },

  register: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post<User>('/api/auth/register', { username, password });
      const user = res.data;
      saveUserToStorage(user);
      set({ currentUser: user, isLoggedIn: true, loading: false });
    } catch (err: any) {
      set({ error: err.message ?? '注册失败', loading: false });
    }
  },

  logout: () => {
    removeUserFromStorage();
    set({ currentUser: null, isLoggedIn: false });
  },

  fetchProfile: async (userId) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get<User>(`/api/users/${userId}`, {
        headers: { 'x-user-id': userId },
      });
      const user = res.data;
      saveUserToStorage(user);
      set({ currentUser: user, loading: false });
    } catch (err: any) {
      set({ error: err.message ?? '获取用户信息失败', loading: false });
    }
  },

  fetchLeaderboard: async () => {
    set({ loading: true, error: null });
    try {
      const userId = get().currentUser?.id;
      const res = await axios.get<LeaderboardEntry[]>('/api/users/leaderboard/top20', {
        headers: userId ? { 'x-user-id': userId } : {},
      });
      set({ leaderboard: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message ?? '获取排行榜失败', loading: false });
    }
  },
}));

const stored = restoreUserFromStorage();
if (stored) {
  useUserStore.getState().fetchProfile(stored.id);
}
