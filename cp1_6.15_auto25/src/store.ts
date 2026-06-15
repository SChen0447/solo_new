import { create } from 'zustand';
import { matchRecipe, type Recipe, type Ingredient, INGREDIENTS } from './recipeMatcher';
import { PhysicsEngine } from './physicsEngine';

export type EffectMode = 'none' | 'success' | 'fail';

export interface UnlockedRecipe {
  recipeId: string;
  name: string;
  resultColor: string;
  effectType: string;
  description: string;
  ingredientIds: string[];
  unlockedAt: number;
}

interface PotionStore {
  addedIngredients: Ingredient[];
  stirAccum: number;
  temperature: number;
  effectMode: EffectMode;
  effectStartTime: number | null;
  matchedRecipe: Recipe | null;
  resultColor: string | null;
  unlockedRecipes: UnlockedRecipe[];
  encyclopediaOpen: boolean;
  engine: PhysicsEngine | null;
  shakeActive: boolean;

  setEngine: (engine: PhysicsEngine) => void;
  addIngredient: (ingredient: Ingredient, cx: number, cy: number) => void;
  removeIngredient: (ingredientId: string) => void;
  updateStirAccum: (value: number) => void;
  updateTemperature: (value: number) => void;
  checkRecipe: () => void;
  setEffectMode: (mode: EffectMode) => void;
  clearCauldron: () => void;
  toggleEncyclopedia: () => void;
  setShakeActive: (v: boolean) => void;
  loadUnlockedRecipes: () => void;
}

function loadFromStorage(): UnlockedRecipe[] {
  try {
    const data = localStorage.getItem('potion_unlocked_recipes');
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return [];
}

function saveToStorage(recipes: UnlockedRecipe[]) {
  try {
    localStorage.setItem('potion_unlocked_recipes', JSON.stringify(recipes));
  } catch { /* ignore */ }
}

export const usePotionStore = create<PotionStore>((set, get) => ({
  addedIngredients: [],
  stirAccum: 0,
  temperature: 0,
  effectMode: 'none',
  effectStartTime: null,
  matchedRecipe: null,
  resultColor: null,
  unlockedRecipes: loadFromStorage(),
  encyclopediaOpen: false,
  engine: null,
  shakeActive: false,

  setEngine: (engine) => set({ engine }),

  addIngredient: (ingredient, cx, cy) => {
    const state = get();
    if (state.addedIngredients.some(i => i.id === ingredient.id)) return;
    const engine = state.engine;
    if (!engine) return;
    const particleCount = 30 + Math.floor(Math.random() * 21);
    engine.addParticles(cx, cy, particleCount, ingredient.color, ingredient.density, ingredient.id);
    const newIngredients = [...state.addedIngredients, ingredient];
    const fireCount = newIngredients.filter(i => i.isFireProperty).length;
    const newTemp = Math.min(100, fireCount * 33);
    engine.setTemperature(newTemp);
    set({
      addedIngredients: newIngredients,
      temperature: newTemp,
    });
  },

  removeIngredient: (ingredientId) => {
    const state = get();
    const engine = state.engine;
    if (engine) engine.removeParticlesByIngredient(ingredientId);
    const newIngredients = state.addedIngredients.filter(i => i.id !== ingredientId);
    const fireCount = newIngredients.filter(i => i.isFireProperty).length;
    const newTemp = Math.min(100, fireCount * 33);
    if (engine) engine.setTemperature(newTemp);
    set({
      addedIngredients: newIngredients,
      temperature: newTemp,
    });
  },

  updateStirAccum: (value) => {
    set({ stirAccum: Math.max(0, Math.min(100, value)) });
  },

  updateTemperature: (value) => {
    set({ temperature: Math.max(0, Math.min(100, value)) });
  },

  checkRecipe: () => {
    const state = get();
    const ingredientIds = state.addedIngredients.map(i => i.id);
    if (ingredientIds.length < 2) return;
    const result = matchRecipe(ingredientIds);
    if (result.matched && result.recipe) {
      const engine = state.engine;
      if (engine) engine.startBlendColor(result.resultColor!);
      const alreadyUnlocked = state.unlockedRecipes.some(r => r.recipeId === result.recipe!.id);
      const newUnlocked = alreadyUnlocked
        ? state.unlockedRecipes
        : [
            ...state.unlockedRecipes,
            {
              recipeId: result.recipe.id,
              name: result.recipe.name,
              resultColor: result.recipe.resultColor,
              effectType: result.recipe.effectType,
              description: result.recipe.description,
              ingredientIds: result.recipe.ingredientIds,
              unlockedAt: Date.now(),
            },
          ];
      saveToStorage(newUnlocked);
      set({
        effectMode: 'success',
        effectStartTime: Date.now(),
        matchedRecipe: result.recipe,
        resultColor: result.resultColor,
        unlockedRecipes: newUnlocked,
      });
    } else {
      set({
        effectMode: 'fail',
        effectStartTime: Date.now(),
        matchedRecipe: null,
        resultColor: null,
        shakeActive: true,
      });
      setTimeout(() => set({ shakeActive: false }), 800);
    }
  },

  setEffectMode: (mode) => set({ effectMode: mode }),

  clearCauldron: () => {
    const engine = get().engine;
    if (engine) engine.clear();
    set({
      addedIngredients: [],
      stirAccum: 0,
      temperature: 0,
      effectMode: 'none',
      effectStartTime: null,
      matchedRecipe: null,
      resultColor: null,
    });
  },

  toggleEncyclopedia: () => set(s => ({ encyclopediaOpen: !s.encyclopediaOpen })),

  setShakeActive: (v) => set({ shakeActive: v }),

  loadUnlockedRecipes: () => set({ unlockedRecipes: loadFromStorage() }),
}));

export function getIngredientById(id: string): Ingredient | undefined {
  return INGREDIENTS.find(i => i.id === id);
}
