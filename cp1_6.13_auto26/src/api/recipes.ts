import axios from 'axios';

export interface Recipe {
  id: string;
  name: string;
  image: string;
  tags: string[];
  duration: number;
  difficulty: '简单' | '中等' | '困难';
  steps: string[];
}

export interface FavoritesResponse {
  recipeIds: string[];
  recipes: Recipe[];
  order: string[];
}

export interface ShareResponse {
  shortCode: string;
  expiresAt: string;
  shareUrl: string;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const recipeApi = {
  getRecommendations: async (count: number = 3): Promise<Recipe[]> => {
    const response = await api.get(`/recommend?count=${count}`);
    return response.data;
  },

  getRecipesByTag: async (tag: string): Promise<Recipe[]> => {
    const response = await api.get(`/recipes/tag/${encodeURIComponent(tag)}`);
    return response.data;
  },

  getFavorites: async (): Promise<FavoritesResponse> => {
    const response = await api.get('/favorites');
    return response.data;
  },

  addFavorite: async (recipeId: string): Promise<{ success: boolean }> => {
    const response = await api.post('/favorites', { recipeId });
    return response.data;
  },

  removeFavorite: async (recipeId: string): Promise<{ success: boolean }> => {
    const response = await api.post('/favorites/remove', { recipeId });
    return response.data;
  },

  updateFavoriteOrder: async (order: string[]): Promise<{ success: boolean }> => {
    const response = await api.post('/favorites/order', { order });
    return response.data;
  },

  createShare: async (): Promise<ShareResponse> => {
    const response = await api.post('/favorites/share');
    return response.data;
  },

  getShare: async (shortCode: string): Promise<Recipe[]> => {
    const response = await api.get(`/share/${shortCode}`);
    return response.data;
  },

  getAllTags: async (): Promise<string[]> => {
    const response = await api.get('/tags');
    return response.data;
  },
};
