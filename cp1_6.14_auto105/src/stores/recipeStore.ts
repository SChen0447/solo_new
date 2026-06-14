import { create } from 'zustand';
import type { RecipeStoreState, Recipe, BakingExperiment } from '../types';
import { recipeApi } from '../api';

export const useRecipeStore = create<RecipeStoreState>((set, get) => ({
  recipes: [],
  selectedRecipeId: null,
  loading: false,
  error: null,

  fetchRecipes: async () => {
    set({ loading: true, error: null });
    try {
      const recipes = await recipeApi.getAll();
      set({ recipes, loading: false });
    } catch (err: any) {
      set({ error: err.message || '加载配方失败', loading: false });
    }
  },

  fetchRecipe: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const recipe = await recipeApi.getById(id);
      set(state => ({
        recipes: state.recipes.some(r => r.id === id)
          ? state.recipes.map(r => (r.id === id ? recipe : r))
          : [...state.recipes, recipe],
        selectedRecipeId: id,
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message || '加载配方失败', loading: false });
    }
  },

  createRecipe: async (data) => {
    set({ loading: true, error: null });
    const recipe = await recipeApi.create(data);
    set(state => ({
      recipes: [...state.recipes, recipe],
      loading: false
    }));
    return recipe;
  },

  updateRecipe: async (id, data) => {
    set({ loading: true, error: null });
    const updated = await recipeApi.update(id, data);
    set(state => ({
      recipes: state.recipes.map(r => (r.id === id ? updated : r)),
      loading: false
    }));
  },

  deleteRecipe: async (id) => {
    set({ loading: true, error: null });
    await recipeApi.remove(id);
    set(state => ({
      recipes: state.recipes.filter(r => r.id !== id),
      selectedRecipeId: state.selectedRecipeId === id ? null : state.selectedRecipeId,
      loading: false
    }));
  },

  addExperiment: async (recipeId, data) => {
    set({ loading: true, error: null });
    const exp = await recipeApi.addExperiment(recipeId, data);
    set(state => ({
      recipes: state.recipes.map(r =>
        r.id === recipeId
          ? { ...r, experiments: [...r.experiments, exp] }
          : r
      ),
      loading: false
    }));
  },

  setSelectedRecipeId: (id) => {
    set({ selectedRecipeId: id });
  },

  getSelectedRecipe: () => {
    const { recipes, selectedRecipeId } = get();
    return recipes.find(r => r.id === selectedRecipeId) || null;
  }
}));
