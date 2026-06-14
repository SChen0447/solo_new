export type RecipeType = 'bread' | 'cake' | 'cookie' | 'pie' | 'muffin';

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unitCost: number;
}

export interface Recipe {
  id: string;
  name: string;
  type: RecipeType;
  ingredients: Ingredient[];
  experiments: BakingExperiment[];
  createdAt: string;
  updatedAt: string;
}

export interface BakingExperiment {
  id: string;
  recipeId: string;
  bakingDate: string;
  actualWeight: number;
  browningScore: number;
  riseUniformity: number;
  textureDescription: string;
  costNote?: string;
  photos: string[];
  actualCost: number;
  createdAt: string;
}

export interface RecipeStoreState {
  recipes: Recipe[];
  selectedRecipeId: string | null;
  loading: boolean;
  error: string | null;
  fetchRecipes: () => Promise<void>;
  fetchRecipe: (id: string) => Promise<void>;
  createRecipe: (data: Omit<Recipe, 'id' | 'experiments' | 'createdAt' | 'updatedAt'>) => Promise<Recipe>;
  updateRecipe: (id: string, data: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  addExperiment: (recipeId: string, data: Omit<BakingExperiment, 'id' | 'createdAt'>) => Promise<void>;
  setSelectedRecipeId: (id: string | null) => void;
  getSelectedRecipe: () => Recipe | null;
}

export const RECIPE_TYPE_LABELS: Record<RecipeType, string> = {
  bread: '面包',
  cake: '蛋糕',
  cookie: '饼干',
  pie: '派',
  muffin: '马芬'
};

export function calculateRecipeCost(ingredients: Ingredient[]): number {
  return ingredients.reduce((total, ing) => total + ing.amount * ing.unitCost, 0);
}
