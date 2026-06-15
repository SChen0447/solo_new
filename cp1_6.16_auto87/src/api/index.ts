import type {
  Account,
  Transaction,
  AccountSummary,
  ApiResponse,
} from '../types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const result = (await response.json()) as ApiResponse<T>;

  if (!result.success) {
    throw new Error(result.error || '请求失败');
  }

  return result.data as T;
}

export const api = {
  getAccounts: (): Promise<Account[]> =>
    request<Account[]>('/api/accounts'),

  addAccount: (data: {
    name: string;
    category: string;
    parentId?: string | null;
    initialPrincipal?: number;
  }): Promise<Account> =>
    request<Account>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteAccount: (id: string): Promise<{ deleted: boolean }> =>
    request<{ deleted: boolean }>(`/api/accounts/${id}`, {
      method: 'DELETE',
    }),

  getAccountSummary: (id: string): Promise<AccountSummary> =>
    request<AccountSummary>(`/api/accounts/${id}/summary`),

  getTransactions: (accountId?: string): Promise<Transaction[]> => {
    const url = accountId
      ? `/api/transactions?accountId=${accountId}`
      : '/api/transactions';
    return request<Transaction[]>(url);
  },

  addTransaction: (data: {
    accountId: string;
    date: string;
    type: '买入' | '卖出';
    assetClass: '股票' | '基金' | '加密货币' | '现金';
    amount: number;
    note?: string;
  }): Promise<Transaction> =>
    request<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: string): Promise<{ deleted: boolean }> =>
    request<{ deleted: boolean }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    }),
};
