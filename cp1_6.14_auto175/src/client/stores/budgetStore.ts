import { create } from 'zustand';
import axios from 'axios';
import type { Budget, Expense, Category } from '../../shared/types';

interface BudgetState {
  budget: Budget | null;
  loading: boolean;
  error: string | null;
  fetchBudget: (tourId: string) => Promise<void>;
  updateTotalBudget: (tourId: string, totalBudget: number) => Promise<Budget>;
  updateCategoryBudget: (tourId: string, category: Category, amount: number) => Promise<Budget>;
  addExpense: (tourId: string, expense: Omit<Expense, 'id'>) => Promise<Expense>;
  deleteExpense: (expenseId: string) => Promise<void>;
  getCategorySpent: (category: Category) => number;
  getTotalSpent: () => number;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budget: null,
  loading: false,
  error: null,

  fetchBudget: async (tourId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await axios.get<Budget>(`/api/tours/${tourId}/budget`);
      set({ budget: data });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  updateTotalBudget: async (tourId, totalBudget) => {
    const { data } = await axios.put<Budget>(`/api/tours/${tourId}/budget`, { totalBudget });
    set({ budget: data });
    return data;
  },

  updateCategoryBudget: async (tourId, category, amount) => {
    const { data } = await axios.put<Budget>(`/api/tours/${tourId}/budget`, {
      categoryBudgets: { [category]: amount },
    });
    set({ budget: data });
    return data;
  },

  addExpense: async (tourId, expense) => {
    set({ loading: true, error: null });
    const { data } = await axios.post<Expense>(`/api/tours/${tourId}/expenses`, expense);
    set((s) => ({
      budget: s.budget
        ? {
            ...s.budget,
            expenses: [...s.budget.expenses, data],
          }
        : s.budget,
    }));
    set({ loading: false });
    return data;
  },

  deleteExpense: async (expenseId) => {
    await axios.delete(`/api/expenses/${expenseId}`);
    set((s) => ({
      budget: s.budget
        ? {
            ...s.budget,
            expenses: s.budget.expenses.filter((e) => e.id !== expenseId),
          }
        : s.budget,
    }));
  },

  getCategorySpent: (category) => {
    const { budget } = get();
    if (!budget) return 0;
    return budget.expenses
      .filter((e) => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
  },

  getTotalSpent: () => {
    const { budget } = get();
    if (!budget) return 0;
    return budget.expenses.reduce((sum, e) => sum + e.amount, 0);
  },
}));
