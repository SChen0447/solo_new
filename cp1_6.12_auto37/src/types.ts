export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
}

export interface Step {
  id: string;
  description: string;
  emoji?: string;
}

export interface Recipe {
  id: string;
  name: string;
  coverScheme: number;
  cookTime: number;
  difficulty: Difficulty;
  emoji: string;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
  createdAt: string;
  tags: string[];
}

export interface ShoppingItem {
  name: string;
  quantities: string[];
  inPantry: boolean;
  recipeSources: string[];
}

export interface ShoppingList {
  totalItems: number;
  needToBuy: number;
  alreadyHave: number;
  items: ShoppingItem[];
}
