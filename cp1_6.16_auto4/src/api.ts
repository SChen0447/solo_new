import axios from 'axios';

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Expense {
  id: string;
  date: string;
  categoryId: string;
  amount: number;
  note: string;
  description?: string;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const fetchCategories = (): Promise<Category[]> => {
  return api.get('/categories').then(res => res.data);
};

export const fetchExpenses = (month: string): Promise<Expense[]> => {
  return api.get(`/expenses?month=${month}`).then(res => res.data);
};
