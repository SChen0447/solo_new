import { create } from 'zustand';
import axios from 'axios';

export interface Rating {
  id: string;
  needId: string;
  fromUserId: string;
  toUserId: string;
  score: number;
  comment: string;
  createdAt: string;
}

interface RatingState {
  currentRatings: Rating[];
  userRatings: Rating[];
  loading: boolean;
  error: string | null;
  submitRating: (needId: string, toUserId: string, score: number, comment: string) => Promise<void>;
  fetchNeedRatings: (needId: string) => Promise<void>;
  fetchUserRatings: (userId: string) => Promise<void>;
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

export const useRatingStore = create<RatingState>((set) => ({
  currentRatings: [],
  userRatings: [],
  loading: false,
  error: null,

  submitRating: async (needId, toUserId, score, comment) => {
    set({ loading: true, error: null });
    try {
      const userId = getUserId();
      const res = await axios.post<Rating>('/api/ratings', { needId, toUserId, score, comment }, {
        headers: userId ? { 'x-user-id': userId } : {},
      });
      set((state) => ({
        currentRatings: [...state.currentRatings, res.data],
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message ?? '提交评分失败', loading: false });
    }
  },

  fetchNeedRatings: async (needId) => {
    set({ loading: true, error: null });
    try {
      const userId = getUserId();
      const res = await axios.get<Rating[]>(`/api/ratings/${needId}`, {
        headers: userId ? { 'x-user-id': userId } : {},
      });
      set({ currentRatings: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message ?? '获取需求评分失败', loading: false });
    }
  },

  fetchUserRatings: async (userId) => {
    set({ loading: true, error: null });
    try {
      const currentUserId = getUserId();
      const res = await axios.get<Rating[]>(`/api/ratings/user/${userId}`, {
        headers: currentUserId ? { 'x-user-id': currentUserId } : {},
      });
      set({ userRatings: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message ?? '获取用户评分失败', loading: false });
    }
  },
}));
