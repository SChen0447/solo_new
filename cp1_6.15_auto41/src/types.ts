export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Step {
  id: string;
  order: number;
  image: string;
  description: string;
  timerPreset?: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Recipe {
  id: string;
  title: string;
  coverImage: string;
  authorId: string;
  authorName: string;
  difficulty: Difficulty;
  estimatedTime: number;
  tags: string[];
  ingredients: Ingredient[];
  steps: Step[];
  ratings: Rating[];
  likes: string[];
  favorites: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Rating {
  userId: string;
  score: number;
}

export interface User {
  id: string;
  username: string;
  password: string;
  avatar: string;
  createdRecipes: string[];
  favoritedRecipes: string[];
}

export interface Collaborator {
  id: string;
  username: string;
  avatar: string;
}
