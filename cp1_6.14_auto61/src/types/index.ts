export type Difficulty = '简单' | '中等' | '困难';

export type Unit = '克' | '毫升' | '个' | '勺' | '包';

export type FoodCategory =
  | '蔬菜水果'
  | '肉类海鲜'
  | '调料干货'
  | '乳制品蛋类'
  | '主食粮油'
  | '其他';

export interface Ingredient {
  name: string;
  amount: number;
  unit: Unit;
  category?: FoodCategory;
}

export interface Step {
  description: string;
  imageUrl?: string;
}

export interface Recipe {
  id: string;
  title: string;
  imageUrl?: string;
  difficulty: Difficulty;
  cookTime: number;
  servings: number;
  tags: string[];
  ingredients: Ingredient[];
  steps: Step[];
  createdAt: string;
  updatedAt: string;
}

export interface MealSlot {
  id: string;
  recipeId: string;
  mealType: '早餐' | '午餐' | '晚餐' | '加餐1' | '加餐2';
}

export interface PlanDay {
  date: string;
  meals: MealSlot[];
}

export interface WeekPlan {
  id: string;
  name: string;
  days: PlanDay[];
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: number;
  unit: Unit;
  category: FoodCategory;
  checked: boolean;
  hasUnitConflict: boolean;
}

export interface ShoppingList {
  id: string;
  planId: string;
  items: ShoppingItem[];
  createdAt: string;
}
