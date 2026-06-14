import axios from 'axios';
import type { Stats } from '@/shared/types';

const client = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const StatsService = {
  async getStats(): Promise<Stats> {
    const { data } = await client.get<Stats>('/stats');
    return data;
  },
};

export default StatsService;
