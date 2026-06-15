import { create } from 'zustand';
import axios from 'axios';

export interface Nutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  cookTime: number;
  nutrition: Nutrition;
  allergens: string[];
}

export interface SearchResult extends Recipe {
  matchedCount: number;
  totalIngredients: number;
  matchPercentage: number;
}

export interface Favorite {
  id: string;
  recipeId: string;
  recipeName: string;
  addedAt: number;
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  note: string;
}

interface Store {
  searchResults: SearchResult[];
  loading: boolean;
  error: string | null;
  favorites: Favorite[];
  userIngredients: string[];

  searchRecipes: (ingredients: string[]) => Promise<void>;
  fetchFavorites: () => Promise<void>;
  addFavorite: (recipeId: string, recipeName: string) => Promise<void>;
  removeFavorite: (recipeId: string) => Promise<void>;
  isFavorite: (recipeId: string) => boolean;
  updateFavorite: (id: string, data: Partial<Pick<Favorite, 'rating' | 'note'>>) => Promise<void>;
  setUserIngredients: (ingredients: string[]) => void;
  clearError: () => void;
}

const api = axios.create({ baseURL: '/api' });

export const useStore = create<Store>((set, get) => ({
  searchResults: [],
  loading: false,
  error: null,
  favorites: [],
  userIngredients: [],

  searchRecipes: async (ingredients) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/search', { ingredients });
      set({ searchResults: data.results || [], loading: false });
    } catch (e: any) {
      set({ error: e?.response?.data?.error || '搜索失败', loading: false, searchResults: [] });
    }
  },

  fetchFavorites: async () => {
    try {
      const { data } = await api.get('/favorites');
      set({ favorites: data.favorites || [] });
    } catch (e) {
      console.error('获取收藏失败', e);
    }
  },

  addFavorite: async (recipeId, recipeName) => {
    try {
      const { data } = await api.post('/favorites', { recipeId, recipeName });
      set((state) => {
        if (state.favorites.some((f) => f.recipeId === recipeId)) return state;
        return { favorites: [...state.favorites, data.favorite] };
      });
    } catch (e) {
      console.error('添加收藏失败', e);
    }
  },

  removeFavorite: async (recipeId) => {
    try {
      await api.delete(`/favorites/recipe/${recipeId}`);
      set((state) => ({ favorites: state.favorites.filter((f) => f.recipeId !== recipeId) }));
    } catch (e) {
      console.error('删除收藏失败', e);
    }
  },

  isFavorite: (recipeId) => {
    return get().favorites.some((f) => f.recipeId === recipeId);
  },

  updateFavorite: async (id, data) => {
    try {
      const { data: resp } = await api.put(`/favorites/${id}`, data);
      set((state) => ({
        favorites: state.favorites.map((f) => (f.id === id ? resp.favorite : f)),
      }));
    } catch (e) {
      console.error('更新收藏失败', e);
    }
  },

  setUserIngredients: (ingredients) => set({ userIngredients: ingredients }),

  clearError: () => set({ error: null }),
}));
