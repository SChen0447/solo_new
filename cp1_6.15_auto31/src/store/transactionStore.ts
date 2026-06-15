import { create } from 'zustand';
import axios from 'axios';
import type { Transaction, Budget, FinanceReport } from '../types';

interface TransactionState {
  transactions: Transaction[];
  budgets: Budget[];
  report: FinanceReport | null;
  loading: boolean;
  csvResult: { total: number; imported: number; unmatched: { index: number; row: Record<string, string> }[] } | null;

  fetchTransactions: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateCategory: (id: string, category: string) => Promise<void>;

  fetchBudgets: () => Promise<void>;
  updateBudgets: (budgets: Budget[]) => Promise<void>;

  uploadCSV: (file: File) => Promise<void>;
  clearCSVResult: () => void;

  generateReport: () => Promise<void>;
  exportPDF: (html: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  budgets: [],
  report: null,
  loading: false,
  csvResult: null,

  fetchTransactions: async () => {
    set({ loading: true });
    try {
      const res = await axios.get<Transaction[]>('/api/transactions');
      set({ transactions: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addTransaction: async (tx) => {
    const res = await axios.post<Transaction>('/api/transactions', tx);
    set((state) => ({ transactions: [...state.transactions, res.data] }));
  },

  updateTransaction: async (id, tx) => {
    const res = await axios.put<Transaction>(`/api/transactions/${id}`, tx);
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? res.data : t)),
    }));
  },

  deleteTransaction: async (id) => {
    await axios.delete(`/api/transactions/${id}`);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },

  updateCategory: async (id, category) => {
    const res = await axios.put(`/api/transactions/${id}/category`, { category });
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, category: res.data.category } : t)),
    }));
  },

  fetchBudgets: async () => {
    const res = await axios.get<Budget[]>('/api/budgets');
    set({ budgets: res.data });
  },

  updateBudgets: async (budgets) => {
    const res = await axios.put<Budget[]>('/api/budgets', { budgets });
    set({ budgets: res.data });
  },

  uploadCSV: async (file) => {
    set({ loading: true });
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('/api/csv/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set((state) => ({
        loading: false,
        csvResult: { total: res.data.total, imported: res.data.imported, unmatched: res.data.unmatched },
        transactions: [...state.transactions, ...res.data.transactions],
      }));
    } catch {
      set({ loading: false });
    }
  },

  clearCSVResult: () => set({ csvResult: null }),

  generateReport: async () => {
    set({ loading: true });
    try {
      const res = await axios.post<FinanceReport>('/api/report/generate');
      set({ report: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  exportPDF: async (html) => {
    const res = await axios.post('/api/report/export-pdf', { html }, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'finance-report.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
}));
