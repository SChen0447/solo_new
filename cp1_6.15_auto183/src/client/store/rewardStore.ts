import { create } from 'zustand';
import axios from 'axios';

export interface Reward {
  id: string;
  name: string;
  thumbnail: string;
  cost: number;
  description: string | null;
  type: string;
  created_at: number;
}

export interface ExchangeRecord {
  id: string;
  user_id: string;
  reward_id: string;
  cost: number;
  created_at: number;
  name?: string;
  thumbnail?: string;
}

interface RewardStore {
  rewards: Reward[];
  exchangeRecords: ExchangeRecord[];
  loading: boolean;
  fetchRewards: () => Promise<void>;
  fetchExchangeRecords: (userId: string) => Promise<void>;
  exchangeReward: (userId: string, rewardId: string) => Promise<boolean>;
}

export const useRewardStore = create<RewardStore>((set) => ({
  rewards: [],
  exchangeRecords: [],
  loading: false,

  fetchRewards: async () => {
    set({ loading: true });
    try {
      const { data } = await axios.get('/api/rewards');
      set({ rewards: data, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },

  fetchExchangeRecords: async (userId: string) => {
    try {
      const { data } = await axios.get(`/api/exchange/${userId}`);
      set({ exchangeRecords: data });
    } catch (e) {
      // ignore
    }
  },

  exchangeReward: async (userId: string, rewardId: string) => {
    try {
      const { data } = await axios.post('/api/exchange', { userId, rewardId });
      set({ exchangeRecords: data.exchangeRecords });
      return true;
    } catch (e) {
      return false;
    }
  },
}));
