import { create } from 'zustand';
import type { Recipe, Difficulty, UserSettings, RecipeState } from './types';
import { recipeApi, favoriteApi, settingsApi } from './api';

const defaultSettings: UserSettings = {
  theme: 'warm',
  defaultServings: 4,
  searchDebounce: 300,
};

interface RecipeStore extends RecipeState {
  fetchAllData: () => Promise<void>;
  fetchRecipes: () => Promise<void>;
  fetchRecipeById: (id: string) => Promise<Recipe | null>;
  setCurrentRecipe: (recipe: Recipe | null) => void;
  createRecipe: (recipe: Partial<Recipe>) => Promise<Recipe | null>;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => Promise<Recipe | null>;
  deleteRecipe: (id: string) => Promise<boolean>;
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setDifficultyFilter: (difficulties: Difficulty[]) => void;
  getFilteredRecipes: () => Recipe[];
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  recipes: [],
  currentRecipe: null,
  favorites: [],
  settings: defaultSettings,
  searchQuery: '',
  difficultyFilter: [],
  loading: false,
  error: null,

  fetchAllData: async () => {
    set({ loading: true, error: null });
    try {
      const [recipes, favorites, settings] = await Promise.all([
        recipeApi.getAll(),
        favoriteApi.getAll(),
        settingsApi.get(),
      ]);
      set({ recipes, favorites, settings, loading: false });
    } catch (error: any) {
      set({ error: error.message || '加载数据失败', loading: false });
    }
  },

  fetchRecipes: async () => {
    set({ loading: true, error: null });
    try {
      const recipes = await recipeApi.getAll();
      set({ recipes, loading: false });
    } catch (error: any) {
      set({ error: error.message || '加载食谱失败', loading: false });
    }
  },

  fetchRecipeById: async (id: string) => {
    try {
      const recipe = await recipeApi.getById(id);
      set({ currentRecipe: recipe });
      return recipe;
    } catch (error: any) {
      set({ error: error.message || '加载食谱详情失败' });
      return null;
    }
  },

  setCurrentRecipe: (recipe) => set({ currentRecipe: recipe }),

  createRecipe: async (recipe) => {
    try {
      const newRecipe = await recipeApi.create(recipe);
      set((state) => ({ recipes: [newRecipe, ...state.recipes] }));
      return newRecipe;
    } catch (error: any) {
      set({ error: error.response?.data?.error || '创建食谱失败' });
      return null;
    }
  },

  updateRecipe: async (id, recipe) => {
    try {
      const updated = await recipeApi.update(id, recipe);
      set((state) => ({
        recipes: state.recipes.map((r) => (r.id === id ? updated : r)),
        currentRecipe: state.currentRecipe?.id === id ? updated : state.currentRecipe,
      }));
      return updated;
    } catch (error: any) {
      set({ error: error.response?.data?.error || '更新食谱失败' });
      return null;
    }
  },

  deleteRecipe: async (id) => {
    try {
      const result = await recipeApi.remove(id);
      if (result.success) {
        set((state) => ({
          recipes: state.recipes.filter((r) => r.id !== id),
          currentRecipe: state.currentRecipe?.id === id ? null : state.currentRecipe,
          favorites: state.favorites.filter((fid) => fid !== id),
        }));
        return true;
      }
      return false;
    } catch (error: any) {
      set({ error: error.message || '删除食谱失败' });
      return false;
    }
  },

  fetchFavorites: async () => {
    try {
      const favorites = await favoriteApi.getAll();
      set({ favorites });
    } catch (error: any) {
      set({ error: error.message || '加载收藏失败' });
    }
  },

  toggleFavorite: async (id) => {
    const { favorites } = get();
    const isFavorite = favorites.includes(id);
    try {
      const newFavorites = isFavorite
        ? await favoriteApi.remove(id)
        : await favoriteApi.add(id);
      set({ favorites: newFavorites });
    } catch (error: any) {
      set({ error: error.message || '更新收藏失败' });
    }
  },

  fetchSettings: async () => {
    try {
      const settings = await settingsApi.get();
      set({ settings });
    } catch (error: any) {
      set({ error: error.message || '加载设置失败' });
    }
  },

  updateSettings: async (settings) => {
    try {
      const updated = await settingsApi.update(settings);
      set({ settings: updated });
    } catch (error: any) {
      set({ error: error.message || '更新设置失败' });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setDifficultyFilter: (difficulties) => set({ difficultyFilter: difficulties }),

  getFilteredRecipes: () => {
    const { recipes, searchQuery, difficultyFilter, favorites } = get();
    let filtered = recipes;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(query));
    }

    if (difficultyFilter.length > 0) {
      filtered = filtered.filter((r) => difficultyFilter.includes(r.difficulty));
    }

    const favoriteRecipes = filtered
      .filter((r) => favorites.includes(r.id))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const normalRecipes = filtered
      .filter((r) => !favorites.includes(r.id))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return [...favoriteRecipes, ...normalRecipes];
  },
}));
