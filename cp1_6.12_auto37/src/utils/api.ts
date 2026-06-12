import type { Recipe, ShoppingList } from '../types';

const BASE = '/api';

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

export const api = {
  getRecipes: (params?: { search?: string; difficulty?: string; tag?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.difficulty) qs.set('difficulty', params.difficulty);
    if (params?.tag) qs.set('tag', params.tag);
    const q = qs.toString();
    return req<Recipe[]>(`/recipes${q ? '?' + q : ''}`);
  },

  getRecipe: (id: string) => req<Recipe>(`/recipes/${id}`),

  createRecipe: (data: Partial<Recipe>) =>
    req<Recipe>('/recipes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRecipe: (id: string, data: Partial<Recipe>) =>
    req<Recipe>(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteRecipe: (id: string) =>
    req<{ success: boolean }>(`/recipes/${id}`, { method: 'DELETE' }),

  getShoppingList: (recipeIds: string[]) =>
    req<ShoppingList>('/shopping-list', {
      method: 'POST',
      body: JSON.stringify({ recipeIds }),
    }),

  getPantry: () => req<string[]>('/pantry'),
};
