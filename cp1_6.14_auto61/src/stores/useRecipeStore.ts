import { create } from 'zustand';
import axios from 'axios';
import type { Recipe, Difficulty } from '../types';

interface RecipeState {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedTags: string[];
  selectedDifficulty: Difficulty | '';
  maxTime: number | null;
  fetchRecipes: () => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Recipe>;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSelectedDifficulty: (difficulty: Difficulty | '') => void;
  setMaxTime: (time: number | null) => void;
  getFilteredRecipes: () => Recipe[];
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  loading: false,
  error: null,
  searchQuery: '',
  selectedTags: [],
  selectedDifficulty: '',
  maxTime: null,

  fetchRecipes: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get<Recipe[]>('/api/recipes');
      set({ recipes: res.data, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch recipes';
      set({ error: message, loading: false });
    }
  },

  addRecipe: async (recipe) => {
    const res = await axios.post<Recipe>('/api/recipes', recipe);
    set((state) => ({ recipes: [...state.recipes, res.data] }));
    return res.data;
  },

  updateRecipe: async (id, recipe) => {
    const res = await axios.put<Recipe>(`/api/recipes/${id}`, recipe);
    set((state) => ({
      recipes: state.recipes.map((r) => (r.id === id ? res.data : r)),
    }));
    return res.data;
  },

  deleteRecipe: async (id) => {
    await axios.delete(`/api/recipes/${id}`);
    set((state) => ({ recipes: state.recipes.filter((r) => r.id !== id) }));
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  setSelectedDifficulty: (difficulty) => set({ selectedDifficulty: difficulty }),
  setMaxTime: (time) => set({ maxTime: time }),

  getFilteredRecipes: () => {
    const { recipes, searchQuery, selectedTags, selectedDifficulty, maxTime } = get();
    return recipes.filter((r) => {
      const matchesQuery = !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = selectedTags.length === 0 || selectedTags.some((t) => r.tags.includes(t));
      const matchesDifficulty = !selectedDifficulty || r.difficulty === selectedDifficulty;
      const matchesTime = maxTime === null || r.cookTime <= maxTime;
      return matchesQuery && matchesTags && matchesDifficulty && matchesTime;
    });
  },
}));
