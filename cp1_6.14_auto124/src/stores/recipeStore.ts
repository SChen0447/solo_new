import { create } from 'zustand';
import axios from 'axios';
import type { Recipe } from '../types';

interface RecipeState {
  recipes: Recipe[];
  loading: boolean;
  fetchRecipes: () => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => Promise<void>;
  updateRecipe: (id: string, data: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
}

export const useRecipeStore = create<RecipeState>((set) => ({
  recipes: [],
  loading: false,

  fetchRecipes: async () => {
    set({ loading: true });
    const res = await axios.get<Recipe[]>('/api/recipes');
    set({ recipes: res.data, loading: false });
  },

  addRecipe: async (recipe) => {
    const res = await axios.post<Recipe>('/api/recipes', recipe);
    set((s) => ({ recipes: [...s.recipes, res.data] }));
  },

  updateRecipe: async (id, data) => {
    const res = await axios.put<Recipe>(`/api/recipes/${id}`, data);
    set((s) => ({ recipes: s.recipes.map((r) => (r.id === id ? res.data : r)) }));
  },

  deleteRecipe: async (id) => {
    await axios.delete(`/api/recipes/${id}`);
    set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) }));
  },
}));
