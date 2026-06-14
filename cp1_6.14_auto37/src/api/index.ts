import axios from 'axios';
import { Recipe, RecipeFormData } from '../modules/recipes/types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchRecipes = async (): Promise<Recipe[]> => {
  const response = await api.get('/recipes');
  return response.data;
};

export const fetchRecipe = async (id: string): Promise<Recipe> => {
  const response = await api.get(`/recipes/${id}`);
  return response.data;
};

export const createRecipe = async (data: RecipeFormData): Promise<Recipe> => {
  const response = await api.post('/recipes', data);
  return response.data;
};

export const updateRecipe = async (id: string, data: RecipeFormData): Promise<Recipe> => {
  const response = await api.put(`/recipes/${id}`, data);
  return response.data;
};

export const deleteRecipe = async (id: string): Promise<void> => {
  await api.delete(`/recipes/${id}`);
};

export const fetchChartData = async (): Promise<Recipe[]> => {
  const response = await api.get('/chart-data');
  return response.data;
};

export default api;
