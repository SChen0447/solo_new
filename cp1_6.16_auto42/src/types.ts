export type BudgetCategory = '食品' | '交通' | '购物' | '娱乐' | '医疗' | '其他';

export const BUDGET_CATEGORIES: BudgetCategory[] = ['食品', '交通', '购物', '娱乐', '医疗', '其他'];

export const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  '食品': '#ff6b6b',
  '交通': '#4ecdc4',
  '购物': '#ffe66d',
  '娱乐': '#a8e6cf',
  '医疗': '#c7b8ea',
  '其他': '#95a5a6'
};

export interface Transaction {
  id: string;
  date: string;
  category: BudgetCategory;
  amount: number;
  note: string;
}

export interface BudgetSetting {
  category: BudgetCategory;
  amount: number;
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeChange: number;
  expenseChange: number;
  balanceChange: number;
}

export interface CategoryExpense {
  category: BudgetCategory;
  amount: number;
  percentage: number;
}

export interface DailyTrend {
  date: string;
  income: number;
  expense: number;
}
