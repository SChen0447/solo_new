import { create } from 'zustand';
import { Recipe, RecipeFormData } from '../modules/recipes/types';
import {
  fetchRecipes,
  createRecipe as apiCreateRecipe,
  updateRecipe as apiUpdateRecipe,
  deleteRecipe as apiDeleteRecipe,
} from '../api';

interface RecipeStore {
  recipes: Recipe[];
  favorites: string[];
  selectedIds: string[];
  loading: boolean;
  error: string | null;
  loadRecipes: () => Promise<void>;
  createRecipe: (data: RecipeFormData) => Promise<Recipe>;
  updateRecipe: (id: string, data: RecipeFormData) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  isFavorite: (id: string) => boolean;
  isSelected: (id: string) => boolean;
}

const loadFavoritesFromStorage = (): string[] => {
  try {
    const stored = localStorage.getItem('coffee-favorites');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveFavoritesToStorage = (favorites: string[]) => {
  try {
    localStorage.setItem('coffee-favorites', JSON.stringify(favorites));
  } catch {
    // ignore
  }
};

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  recipes: [],
  favorites: loadFavoritesFromStorage(),
  selectedIds: [],
  loading: false,
  error: null,

  loadRecipes: async () => {
    set({ loading: true, error: null });
    try {
      const recipes = await fetchRecipes();
      set({ recipes, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createRecipe: async (data) => {
    const recipe = await apiCreateRecipe(data);
    set((state) => ({
      recipes: [...state.recipes, recipe],
    }));
    return recipe;
  },

  updateRecipe: async (id, data) => {
    const recipe = await apiUpdateRecipe(id, data);
    set((state) => ({
      recipes: state.recipes.map((r) => (r.id === id ? recipe : r)),
    }));
    return recipe;
  },

  deleteRecipe: async (id) => {
    await apiDeleteRecipe(id);
    set((state) => ({
      recipes: state.recipes.filter((r) => r.id !== id),
      favorites: state.favorites.filter((fid) => fid !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    }));
  },

  toggleFavorite: (id) => {
    set((state) => {
      const favorites = state.favorites.includes(id)
        ? state.favorites.filter((fid) => fid !== id)
        : [...state.favorites, id];
      saveFavoritesToStorage(favorites);
      return { favorites };
    });
  },

  toggleSelect: (id) => {
    set((state) => {
      const selectedIds = state.selectedIds.includes(id)
        ? state.selectedIds.filter((sid) => sid !== id)
        : [...state.selectedIds, id];
      return { selectedIds };
    });
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  isFavorite: (id) => {
    return get().favorites.includes(id);
  },

  isSelected: (id) => {
    return get().selectedIds.includes(id);
  },
}));
