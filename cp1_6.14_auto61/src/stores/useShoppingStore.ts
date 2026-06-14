import { create } from 'zustand';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { WeekPlan, ShoppingList, ShoppingItem, FoodCategory } from '../types';

const CATEGORY_ORDER: FoodCategory[] = [
  '蔬菜水果',
  '肉类海鲜',
  '调料干货',
  '乳制品蛋类',
  '主食粮油',
  '其他',
];

const FOOD_CATEGORY_MAP: Record<string, FoodCategory> = {
  '豆腐': '蔬菜水果', '土豆': '蔬菜水果', '胡萝卜': '蔬菜水果',
  '洋葱': '蔬菜水果', '葱花': '蔬菜水果', '番茄': '蔬菜水果',
  '青菜': '蔬菜水果', '白菜': '蔬菜水果', '青椒': '蔬菜水果',
  '鸡腿肉': '肉类海鲜', '猪肉末': '肉类海鲜', '鸡胸肉': '肉类海鲜',
  '三文鱼': '肉类海鲜', '虾仁': '肉类海鲜', '牛肉': '肉类海鲜',
  '豆瓣酱': '调料干货', '花椒粉': '调料干货', '细砂糖': '调料干货',
  '可可粉': '调料干货', '酱油': '调料干货', '盐': '调料干货',
  '咖喱块': '调料干货', '胡椒': '调料干货',
  '马斯卡彭奶酪': '乳制品蛋类', '鸡蛋': '乳制品蛋类',
  '牛奶': '乳制品蛋类', '黄油': '乳制品蛋类', '奶酪': '乳制品蛋类',
  '米饭': '主食粮油', '面粉': '主食粮油', '食用油': '主食粮油',
  '手指饼干': '主食粮油', '面条': '主食粮油', '面包': '主食粮油',
  '浓缩咖啡': '其他',
};

function classifyIngredient(name: string): FoodCategory {
  for (const [key, cat] of Object.entries(FOOD_CATEGORY_MAP)) {
    if (name.includes(key) || key.includes(name)) return cat;
  }
  return '其他';
}

interface ShoppingState {
  plans: WeekPlan[];
  shoppingLists: ShoppingList[];
  loading: boolean;
  error: string | null;
  fetchPlans: () => Promise<void>;
  addPlan: (plan: Omit<WeekPlan, 'id' | 'createdAt'>) => Promise<WeekPlan>;
  updatePlan: (id: string, plan: Partial<WeekPlan>) => Promise<WeekPlan>;
  deletePlan: (id: string) => Promise<void>;
  fetchShoppingLists: () => Promise<void>;
  generateShoppingList: (planId: string) => Promise<ShoppingList>;
  toggleItemChecked: (listId: string, itemId: string) => Promise<void>;
  deleteShoppingList: (id: string) => Promise<void>;
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  plans: [],
  shoppingLists: [],
  loading: false,
  error: null,

  fetchPlans: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get<WeekPlan[]>('/api/plans');
      set({ plans: res.data, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch plans';
      set({ error: message, loading: false });
    }
  },

  addPlan: async (plan) => {
    const res = await axios.post<WeekPlan>('/api/plans', plan);
    set((state) => ({ plans: [...state.plans, res.data] }));
    return res.data;
  },

  updatePlan: async (id, plan) => {
    const res = await axios.put<WeekPlan>(`/api/plans/${id}`, plan);
    set((state) => ({
      plans: state.plans.map((p) => (p.id === id ? res.data : p)),
    }));
    return res.data;
  },

  deletePlan: async (id) => {
    await axios.delete(`/api/plans/${id}`);
    set((state) => ({ plans: state.plans.filter((p) => p.id !== id) }));
  },

  fetchShoppingLists: async () => {
    try {
      const res = await axios.get<ShoppingList[]>('/api/shopping');
      set({ shoppingLists: res.data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch shopping lists';
      set({ error: message });
    }
  },

  generateShoppingList: async (planId: string) => {
    const { plans } = get();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) throw new Error('Plan not found');

    const recipesRes = await axios.get<import('../types').Recipe[]>('/api/recipes');
    const allRecipes = recipesRes.data;

    const ingredientMap = new Map<string, { amount: number; unit: string; category: FoodCategory; units: Set<string> }>();

    for (const day of plan.days) {
      for (const meal of day.meals) {
        const recipe = allRecipes.find((r) => r.id === meal.recipeId);
        if (!recipe) continue;
        for (const ing of recipe.ingredients) {
          const key = ing.name;
          const cat = ing.category || classifyIngredient(ing.name);
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            existing.units.add(ing.unit);
            if (ing.unit === [...existing.units][0]) {
              existing.amount += ing.amount;
            }
          } else {
            ingredientMap.set(key, {
              amount: ing.amount,
              unit: ing.unit,
              category: cat,
              units: new Set([ing.unit]),
            });
          }
        }
      }
    }

    const items: ShoppingItem[] = [];
    for (const [name, data] of ingredientMap) {
      items.push({
        id: uuidv4(),
        name,
        amount: data.amount,
        unit: data.unit as import('../types').Unit,
        category: data.category,
        checked: false,
        hasUnitConflict: data.units.size > 1,
      });
    }

    items.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category);
      const bi = CATEGORY_ORDER.indexOf(b.category);
      return ai !== bi ? ai - bi : a.name.localeCompare(b.name, 'zh');
    });

    const shoppingList: ShoppingList = {
      id: '',
      planId,
      items,
      createdAt: new Date().toISOString(),
    };

    const res = await axios.post<ShoppingList>('/api/shopping', shoppingList);
    set((state) => ({ shoppingLists: [...state.shoppingLists, res.data] }));
    return res.data;
  },

  toggleItemChecked: async (listId, itemId) => {
    set((state) => {
      const lists = state.shoppingLists.map((list) => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map((item) =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          ),
        };
      });
      const updatedList = lists.find((l) => l.id === listId);
      if (updatedList) {
        axios.put(`/api/shopping/${listId}`, updatedList).catch(() => {});
      }
      return { shoppingLists: lists };
    });
  },

  deleteShoppingList: async (id) => {
    await axios.delete(`/api/shopping/${id}`);
    set((state) => ({ shoppingLists: state.shoppingLists.filter((s) => s.id !== id) }));
  },
}));
