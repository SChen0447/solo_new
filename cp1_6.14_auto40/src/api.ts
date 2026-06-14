import axios from 'axios';
import type { Recipe, UserSettings } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const recipeApi = {
  getAll: async (): Promise<Recipe[]> => {
    const res = await api.get('/recipes');
    return res.data;
  },

  getById: async (id: string): Promise<Recipe> => {
    const res = await api.get(`/recipes/${id}`);
    return res.data;
  },

  create: async (recipe: Partial<Recipe>): Promise<Recipe> => {
    const res = await api.post('/recipes', recipe);
    return res.data;
  },

  update: async (id: string, recipe: Partial<Recipe>): Promise<Recipe> => {
    const res = await api.put(`/recipes/${id}`, recipe);
    return res.data;
  },

  remove: async (id: string): Promise<{ success: boolean }> => {
    const res = await api.delete(`/recipes/${id}`);
    return res.data;
  },
};

export const favoriteApi = {
  getAll: async (): Promise<string[]> => {
    const res = await api.get('/favorites');
    return res.data;
  },

  add: async (id: string): Promise<string[]> => {
    const res = await api.post(`/favorites/${id}`);
    return res.data;
  },

  remove: async (id: string): Promise<string[]> => {
    const res = await api.delete(`/favorites/${id}`);
    return res.data;
  },
};

export const settingsApi = {
  get: async (): Promise<UserSettings> => {
    const res = await api.get('/settings');
    return res.data;
  },

  update: async (settings: Partial<UserSettings>): Promise<UserSettings> => {
    const res = await api.put('/settings', settings);
    return res.data;
  },
};

export const healthCheck = async (): Promise<{ status: string; message: string }> => {
  const res = await api.get('/health');
  return res.data;
};
