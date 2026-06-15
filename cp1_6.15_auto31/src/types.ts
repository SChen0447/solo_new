export interface Transaction {
  id: string;
  amount: number;
  date: string;
  category: string;
  note: string;
  type: 'expense' | 'income';
}

export interface Budget {
  category: string;
  amount: number;
}

export interface FinanceReport {
  score: number;
  totalExpense: number;
  totalIncome: number;
  savingsRate: number;
  budgetAdherenceRate: number;
  stabilityScore: number;
  categoryBreakdown: Record<string, number>;
  suggestions: string[];
  generatedAt: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  '餐饮': '#f39c12',
  '交通': '#3498db',
  '购物': '#e74c3c',
  '娱乐': '#9b59b6',
  '居住': '#1abc9c',
  '医疗': '#e67e22',
  '教育': '#2ecc71',
  '通讯': '#34495e',
  '服饰': '#f1c40f',
  '美容': '#fd79a8',
  '运动': '#00cec9',
  '旅行': '#6c5ce7',
  '社交': '#ff7675',
  '宠物': '#a29bfe',
  '其他': '#95a5a6',
};

export const CATEGORIES = [
  '餐饮', '交通', '购物', '娱乐', '居住', '医疗',
  '教育', '通讯', '服饰', '美容', '运动', '旅行',
  '社交', '宠物', '其他',
];
