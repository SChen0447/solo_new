import type { Transaction, Budget } from '../types';

interface ScoreInput {
  transactions: Transaction[];
  budgets: Budget[];
  months?: number;
}

interface ScoreResult {
  score: number;
  savingsRate: number;
  budgetAdherenceRate: number;
  stabilityScore: number;
  incomeVsExpense: 'surplus' | 'deficit' | 'balanced';
  details: {
    totalExpense: number;
    totalIncome: number;
    categoryBreakdown: Record<string, number>;
  };
}

export function calculateFinanceScore({ transactions, budgets, months = 3 }: ScoreInput): ScoreResult {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const recentTx = transactions.filter((t) => new Date(t.date) >= startDate);

  const totalExpense = recentTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = recentTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  const budgetMap = new Map(budgets.map((b) => [b.category, b.amount]));
  const categoryExpense = new Map<string, number>();
  for (const t of recentTx.filter((t) => t.type === 'expense')) {
    categoryExpense.set(t.category, (categoryExpense.get(t.category) || 0) + t.amount);
  }

  let budgetCompliance = 0;
  let budgetCount = 0;
  for (const [cat, spent] of categoryExpense) {
    const limit = budgetMap.get(cat) || 0;
    if (limit > 0) {
      budgetCount++;
      if (spent <= limit) budgetCompliance++;
    }
  }
  const budgetAdherenceRate = budgetCount > 0 ? (budgetCompliance / budgetCount) * 100 : 100;

  const monthlyExpenses = new Map<string, number>();
  for (const t of recentTx.filter((t) => t.type === 'expense')) {
    const key = t.date.slice(0, 7);
    monthlyExpenses.set(key, (monthlyExpenses.get(key) || 0) + t.amount);
  }
  const expenseValues = Array.from(monthlyExpenses.values());
  const avgExpense = expenseValues.length > 0 ? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length : 0;
  const variance = expenseValues.length > 1
    ? expenseValues.reduce((s, v) => s + Math.pow(v - avgExpense, 2), 0) / (expenseValues.length - 1)
    : 0;
  const stabilityScore = avgExpense > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avgExpense) * 100) : 50;

  const incomeVsExpense = totalIncome > totalExpense * 1.1 ? 'surplus' : totalExpense > totalIncome * 1.1 ? 'deficit' : 'balanced';

  const score = Math.round(
    Math.min(100, Math.max(0,
      savingsRate * 0.35 +
      budgetAdherenceRate * 0.3 +
      stabilityScore * 0.2 +
      (incomeVsExpense === 'surplus' ? 15 : incomeVsExpense === 'balanced' ? 8 : 0)
    ))
  );

  return {
    score,
    savingsRate: Math.round(savingsRate * 10) / 10,
    budgetAdherenceRate: Math.round(budgetAdherenceRate * 10) / 10,
    stabilityScore: Math.round(stabilityScore * 10) / 10,
    incomeVsExpense,
    details: {
      totalExpense,
      totalIncome,
      categoryBreakdown: Object.fromEntries(categoryExpense),
    },
  };
}
