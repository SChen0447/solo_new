export type Difficulty = '简单' | '中等' | '困难';

export type Unit = '克' | '毫升' | '个' | '茶匙' | '汤匙';

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: Unit;
  percentage: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  prepTime: number;
  bakeTemp: number;
  bakeTime: number;
  originalServings: number;
  color: string;
  ingredients: Ingredient[];
  createdAt: number;
  updatedAt?: number;
}

export interface UserSettings {
  theme: string;
  defaultServings: number;
  searchDebounce: number;
}

export interface RecipeState {
  recipes: Recipe[];
  currentRecipe: Recipe | null;
  favorites: string[];
  settings: UserSettings;
  searchQuery: string;
  difficultyFilter: Difficulty[];
  loading: boolean;
  error: string | null;
}

export interface AdjustedIngredient extends Ingredient {
  adjustedAmount: number;
}
