import { create } from 'zustand';
import axios from 'axios';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  deadline: number;
  likes: number;
  participants: number;
  created_at: number;
}

export interface User {
  id: string;
  username: string;
  avatar: string;
  points: number;
}

export interface PointsHistoryItem {
  id: string;
  user_id: string;
  action: string;
  points: number;
  description: string | null;
  created_at: number;
}

interface ChallengeStore {
  challenges: Challenge[];
  leaderboard: User[];
  currentUser: User;
  pointsHistory: PointsHistoryItem[];
  joinedChallenges: Record<string, boolean>;
  loading: boolean;
  fetchChallenges: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  fetchPointsHistory: (userId: string, offset?: number) => Promise<void>;
  likeChallenge: (challengeId: string) => Promise<void>;
  joinChallenge: (challengeId: string, userId: string) => Promise<void>;
  addPoints: (userId: string, points: number, action?: string, description?: string) => Promise<void>;
}

const CURRENT_USER_ID = 'user-current';

export const useChallengeStore = create<ChallengeStore>((set, get) => ({
  challenges: [],
  leaderboard: [],
  currentUser: {
    id: CURRENT_USER_ID,
    username: '我',
    avatar: '😊',
    points: 0,
  },
  pointsHistory: [],
  joinedChallenges: {},
  loading: false,

  fetchChallenges: async () => {
    set({ loading: true });
    try {
      const { data } = await axios.get('/api/challenges');
      set({ challenges: data, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },

  fetchLeaderboard: async () => {
    try {
      const { data } = await axios.get('/api/points/leaderboard');
      const { data: userData } = await axios.get(`/api/points/${CURRENT_USER_ID}`);
      set((state) => ({
        leaderboard: data,
        currentUser: { ...state.currentUser, points: userData.points },
      }));
    } catch (e) {
      // ignore
    }
  },

  fetchPointsHistory: async (userId: string, offset = 0) => {
    try {
      const { data } = await axios.get(`/api/points/${userId}/history?limit=20&offset=${offset}`);
      set((state) => ({
        pointsHistory: offset === 0 ? data : [...state.pointsHistory, ...data],
      }));
    } catch (e) {
      // ignore
    }
  },

  likeChallenge: async (challengeId: string) => {
    try {
      const { data } = await axios.post(`/api/challenges/${challengeId}/like`);
      set((state) => ({
        challenges: state.challenges.map((c) => (c.id === challengeId ? data : c)),
      }));
    } catch (e) {
      // ignore
    }
  },

  joinChallenge: async (challengeId: string, userId: string) => {
    try {
      const { data } = await axios.post(`/api/challenges/${challengeId}/join`, { userId });
      set((state) => ({
        challenges: state.challenges.map((c) => (c.id === challengeId ? data.challenge : c)),
        currentUser: data.user,
        joinedChallenges: { ...state.joinedChallenges, [challengeId]: true },
      }));
    } catch (e) {
      // ignore
    }
  },

  addPoints: async (userId: string, points: number, action = 'bonus', description = '') => {
    try {
      const { data } = await axios.post(`/api/points/${userId}/add`, { points, action, description });
      set({ currentUser: data });
    } catch (e) {
      // ignore
    }
  },
}));
