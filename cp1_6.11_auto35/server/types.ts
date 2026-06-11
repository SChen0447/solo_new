export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface RecipeStep {
  order: number;
  description: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  cookingTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  coverImage: string;
  favorites: number;
  userId: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  favoriteIds: string[];
}

export interface Database {
  recipes: Recipe[];
  users: User[];
}

export interface SearchResult {
  recipe: Recipe;
  matchCount: number;
  matchText: string;
  matchedIngredients: string[];
}
