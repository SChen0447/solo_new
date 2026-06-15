import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Transaction,
  BudgetCategory,
  BudgetSetting,
  MonthlySummary,
  CategoryExpense,
  DailyTrend,
  BUDGET_CATEGORIES
} from './types';

interface DataStoreContextType {
  transactions: Transaction[];
  budgets: BudgetSetting[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateBudget: (category: BudgetCategory, amount: number) => void;
  getMonthlySummary: () => MonthlySummary;
  getCategoryExpenses: () => CategoryExpense[];
  getDailyTrends: (days: number) => DailyTrend[];
  getCategorySpent: (category: BudgetCategory) => number;
  getOverBudgetCategories: () => BudgetCategory[];
}

const DataStoreContext = createContext<DataStoreContextType | null>(null);

function generateMockTransactions(): Transaction[] {
  const categories: BudgetCategory[] = ['食品', '交通', '购物', '娱乐', '医疗', '其他'];
  const today = new Date();
  const txs: Transaction[] = [];

  for (let i = 0; i < 35; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const isExpense = Math.random() > 0.2;
    const amount = isExpense
      ? -Math.floor(Math.random() * 500 + 10) * 10 / 10
      : Math.floor(Math.random() * 2000 + 100) * 10 / 10;

    txs.push({
      id: uuidv4(),
      date: date.toISOString().split('T')[0],
      category: isExpense ? categories[Math.floor(Math.random() * categories.length)] : '其他',
      amount,
      note: isExpense ? `日常${categories[Math.floor(Math.random() * categories.length)]}消费` : '工资收入'
    });
  }

  return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function generateMockBudgets(): BudgetSetting[] {
  return [
    { category: '食品', amount: 2000 },
    { category: '交通', amount: 800 },
    { category: '购物', amount: 1500 },
    { category: '娱乐', amount: 600 },
    { category: '医疗', amount: 500 },
    { category: '其他', amount: 300 }
  ];
}

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => generateMockTransactions());
  const [budgets, setBudgets] = useState<BudgetSetting[]>(() => generateMockBudgets());

  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...tx, id: uuidv4() };
    setTransactions(prev => {
      const updated = [...prev, newTx];
      return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }, []);

  const updateBudget = useCallback((category: BudgetCategory, amount: number) => {
    setBudgets(prev => {
      const existing = prev.find(b => b.category === category);
      if (existing) {
        return prev.map(b => b.category === category ? { ...b, amount } : b);
      }
      return [...prev, { category, amount }];
    });
  }, []);

  const getCategorySpent = useCallback((category: BudgetCategory): number => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    return transactions
      .filter(tx => {
        const txDate = new Date(tx.date);
        return txDate.getFullYear() === year
          && txDate.getMonth() === month
          && tx.category === category
          && tx.amount < 0;
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }, [transactions]);

  const getMonthlySummary = useCallback((): MonthlySummary => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;

    let currentIncome = 0;
    let currentExpense = 0;
    let prevIncome = 0;
    let prevExpense = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const y = txDate.getFullYear();
      const m = txDate.getMonth();

      if (y === year && m === month) {
        if (tx.amount > 0) currentIncome += tx.amount;
        else currentExpense += Math.abs(tx.amount);
      } else if (y === prevYear && m === prevMonth) {
        if (tx.amount > 0) prevIncome += tx.amount;
        else prevExpense += Math.abs(tx.amount);
      }
    });

    const currentBalance = currentIncome - currentExpense;
    const prevBalance = prevIncome - prevExpense;

    const calcChange = (curr: number, prev: number) => {
      if (prev === 0) return 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      totalIncome: currentIncome,
      totalExpense: currentExpense,
      balance: currentBalance,
      incomeChange: calcChange(currentIncome, prevIncome),
      expenseChange: calcChange(currentExpense, prevExpense),
      balanceChange: calcChange(currentBalance, prevBalance)
    };
  }, [transactions]);

  const getCategoryExpenses = useCallback((): CategoryExpense[] => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const categoryTotals: Record<string, number> = {};
    let totalExpense = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === year && txDate.getMonth() === month && tx.amount < 0) {
        const amount = Math.abs(tx.amount);
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amount;
        totalExpense += amount;
      }
    });

    return BUDGET_CATEGORIES.map(cat => ({
      category: cat,
      amount: categoryTotals[cat] || 0,
      percentage: totalExpense > 0 ? ((categoryTotals[cat] || 0) / totalExpense) * 100 : 0
    })).filter(c => c.amount > 0);
  }, [transactions]);

  const getDailyTrends = useCallback((days: number): DailyTrend[] => {
    const result: DailyTrend[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      let income = 0;
      let expense = 0;

      transactions.forEach(tx => {
        if (tx.date === dateStr) {
          if (tx.amount > 0) income += tx.amount;
          else expense += Math.abs(tx.amount);
        }
      });

      result.push({ date: dateStr, income, expense });
    }

    return result;
  }, [transactions]);

  const getOverBudgetCategories = useCallback((): BudgetCategory[] => {
    return budgets
      .filter(b => b.amount > 0 && getCategorySpent(b.category) > b.amount)
      .map(b => b.category);
  }, [budgets, getCategorySpent]);

  const value = useMemo<DataStoreContextType>(() => ({
    transactions,
    budgets,
    addTransaction,
    updateBudget,
    getMonthlySummary,
    getCategoryExpenses,
    getDailyTrends,
    getCategorySpent,
    getOverBudgetCategories
  }), [
    transactions,
    budgets,
    addTransaction,
    updateBudget,
    getMonthlySummary,
    getCategoryExpenses,
    getDailyTrends,
    getCategorySpent,
    getOverBudgetCategories
  ]);

  return (
    <DataStoreContext.Provider value={value}>
      {children}
    </DataStoreContext.Provider>
  );
}

export function useDataStore() {
  const ctx = useContext(DataStoreContext);
  if (!ctx) {
    throw new Error('useDataStore must be used within DataStoreProvider');
  }
  return ctx;
}
