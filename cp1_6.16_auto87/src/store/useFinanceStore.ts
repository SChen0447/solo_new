import { create } from 'zustand';
import type {
  Account,
  Transaction,
  AssetAllocation,
  AssetClass,
} from '../types';
import { api } from '../api';

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  selectedAccountId: string | null;
  isLoading: boolean;
  error: string | null;
  recentlyAddedTransactionId: string | null;
  removingAccountIds: Set<string>;
  addingAccountIds: Set<string>;

  fetchAccounts: () => Promise<void>;
  fetchTransactions: (accountId: string) => Promise<void>;
  addAccount: (data: {
    name: string;
    category: string;
    parentId?: string | null;
    initialPrincipal?: number;
  }) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  selectAccount: (id: string | null) => void;

  addTransaction: (data: {
    accountId: string;
    date: string;
    type: '买入' | '卖出';
    assetClass: AssetClass;
    amount: number;
    note?: string;
  }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  clearRecentlyAddedTransaction: () => void;

  calculateTotalAssets: (accountId: string) => number;
  calculateProfitRate: (accountId: string) => number;
  calculateAssetAllocations: (accountId: string) => AssetAllocation[];

  getSelectedAccount: () => Account | null;
  getSelectedAccountTransactions: () => Transaction[];
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  accounts: [],
  transactions: [],
  selectedAccountId: null,
  isLoading: false,
  error: null,
  recentlyAddedTransactionId: null,
  removingAccountIds: new Set(),
  addingAccountIds: new Set(),

  fetchAccounts: async () => {
    try {
      set({ isLoading: true, error: null });
      const accounts = await api.getAccounts();
      set({ accounts, isLoading: false });
      if (accounts.length > 0 && !get().selectedAccountId) {
        set({ selectedAccountId: accounts[0].id });
        get().fetchTransactions(accounts[0].id);
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchTransactions: async (accountId: string) => {
    try {
      set({ isLoading: true, error: null });
      const transactions = await api.getTransactions(accountId);
      set({ transactions, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addAccount: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const newAccount = await api.addAccount(data);
      set((state) => ({
        accounts: [...state.accounts, newAccount],
        addingAccountIds: new Set([...state.addingAccountIds, newAccount.id]),
        isLoading: false,
      }));

      setTimeout(() => {
        set((state) => {
          const newSet = new Set(state.addingAccountIds);
          newSet.delete(newAccount.id);
          return { addingAccountIds: newSet };
        });
      }, 300);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteAccount: async (id: string) => {
    try {
      set((state) => ({
        removingAccountIds: new Set([...state.removingAccountIds, id]),
      }));

      await new Promise((resolve) => setTimeout(resolve, 300));

      await api.deleteAccount(id);

      set((state) => {
        const childIds = new Set<string>();
        function findChildren(parentId: string) {
          state.accounts
            .filter((a) => a.parentId === parentId)
            .forEach((child) => {
              childIds.add(child.id);
              findChildren(child.id);
            });
        }
        findChildren(id);
        childIds.add(id);

        const newAccounts = state.accounts.filter((a) => !childIds.has(a.id));
        const newTransactions = state.transactions.filter(
          (t) => !childIds.has(t.accountId)
        );
        const newRemovingIds = new Set(state.removingAccountIds);
        newRemovingIds.delete(id);

        let newSelectedId = state.selectedAccountId;
        if (childIds.has(state.selectedAccountId || '')) {
          newSelectedId = newAccounts.length > 0 ? newAccounts[0].id : null;
          if (newSelectedId) {
            api.getTransactions(newSelectedId).then((transactions) => {
              set({ transactions });
            });
          }
        }

        return {
          accounts: newAccounts,
          transactions: newTransactions,
          selectedAccountId: newSelectedId,
          removingAccountIds: newRemovingIds,
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
      set((state) => {
        const newSet = new Set(state.removingAccountIds);
        newSet.delete(id);
        return { removingAccountIds: newSet };
      });
    }
  },

  selectAccount: (id: string | null) => {
    set({ selectedAccountId: id });
    if (id) {
      get().fetchTransactions(id);
    }
  },

  addTransaction: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const newTransaction = await api.addTransaction(data);
      set((state) => ({
        transactions: [newTransaction, ...state.transactions].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
        recentlyAddedTransactionId: newTransaction.id,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteTransaction: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await api.deleteTransaction(id);
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearRecentlyAddedTransaction: () => {
    set({ recentlyAddedTransactionId: null });
  },

  calculateTotalAssets: (accountId: string) => {
    const state = get();
    const accountTransactions = state.transactions.filter(
      (t) => t.accountId === accountId
    );

    const classValues: Record<AssetClass, number> = {
      '股票': 0,
      '基金': 0,
      '加密货币': 0,
      '现金': 0,
    };

    accountTransactions.forEach((tx) => {
      const sign = tx.type === '买入' ? 1 : -1;
      classValues[tx.assetClass] += sign * tx.amount;
    });

    const total = Object.values(classValues).reduce(
      (sum, val) => sum + Math.max(0, val),
      0
    );

    return Math.round(total * 100) / 100;
  },

  calculateProfitRate: (accountId: string) => {
    const state = get();
    const account = state.accounts.find((a) => a.id === accountId);
    if (!account || account.initialPrincipal <= 0) return 0;

    const totalAssets = get().calculateTotalAssets(accountId);
    const profit = totalAssets - account.initialPrincipal;
    const rate = (profit / account.initialPrincipal) * 100;

    return Math.round(rate * 100) / 100;
  },

  calculateAssetAllocations: (accountId: string) => {
    const state = get();
    const accountTransactions = state.transactions.filter(
      (t) => t.accountId === accountId
    );

    const classValues: Record<AssetClass, number> = {
      '股票': 0,
      '基金': 0,
      '加密货币': 0,
      '现金': 0,
    };

    accountTransactions.forEach((tx) => {
      const sign = tx.type === '买入' ? 1 : -1;
      classValues[tx.assetClass] += sign * tx.amount;
    });

    const totalAssets = Object.values(classValues).reduce(
      (sum, val) => sum + Math.max(0, val),
      0
    );

    const allocations: AssetAllocation[] = Object.entries(classValues)
      .filter(([, value]) => value > 0)
      .map(([assetClass, value]) => ({
        assetClass: assetClass as AssetClass,
        value: Math.round(value * 100) / 100,
        percentage:
          totalAssets > 0 ? Math.round((value / totalAssets) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return allocations;
  },

  getSelectedAccount: () => {
    const state = get();
    return state.accounts.find((a) => a.id === state.selectedAccountId) || null;
  },

  getSelectedAccountTransactions: () => {
    const state = get();
    return state.transactions.filter(
      (t) => t.accountId === state.selectedAccountId
    );
  },
}));
