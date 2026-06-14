import axios from 'axios';
import type { Card, BattleResult } from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const cardApi = {
  getAllCards: async (): Promise<Card[]> => {
    const response = await api.get('/cards');
    return response.data;
  },

  createCard: async (card: Omit<Card, 'id'>): Promise<Card> => {
    const response = await api.post('/cards', card);
    return response.data;
  },

  deleteCard: async (id: string): Promise<void> => {
    await api.delete(`/cards/${id}`);
  },
};

export const battleApi = {
  startBattle: async (): Promise<BattleResult> => {
    const response = await api.post('/battle/start');
    return response.data;
  },
};
