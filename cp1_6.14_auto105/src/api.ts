import axios from 'axios';
import type { Recipe, BakingExperiment } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const recipeApi = {
  async getAll(): Promise<Recipe[]> {
    const res = await api.get<Recipe[]>('/recipes');
    return res.data;
  },

  async getById(id: string): Promise<Recipe> {
    const res = await api.get<Recipe>(`/recipes/${id}`);
    return res.data;
  },

  async create(data: Omit<Recipe, 'id' | 'experiments' | 'createdAt' | 'updatedAt'>): Promise<Recipe> {
    const res = await api.post<Recipe>('/recipes', data);
    return res.data;
  },

  async update(id: string, data: Partial<Recipe>): Promise<Recipe> {
    const res = await api.put<Recipe>(`/recipes/${id}`, data);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/recipes/${id}`);
  },

  async addExperiment(
    recipeId: string,
    data: Omit<BakingExperiment, 'id' | 'createdAt'>
  ): Promise<BakingExperiment> {
    const res = await api.post<BakingExperiment>(`/recipes/${recipeId}/experiments`, data);
    return res.data;
  },

  async updateExperiment(
    recipeId: string,
    expId: string,
    data: Partial<BakingExperiment>
  ): Promise<BakingExperiment> {
    const res = await api.put<BakingExperiment>(`/recipes/${recipeId}/experiments/${expId}`, data);
    return res.data;
  },

  async removeExperiment(recipeId: string, expId: string): Promise<void> {
    await api.delete(`/recipes/${recipeId}/experiments/${expId}`);
  }
};

export default recipeApi;
