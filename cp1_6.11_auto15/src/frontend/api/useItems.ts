import { useState, useEffect, useCallback } from 'react';

export interface OfficeItem {
  id: string;
  name: string;
  code: string;
  department: string;
  status: 'available' | 'borrowed';
  borrowCount: number;
}

export interface BorrowRecord {
  id: string;
  itemId: string;
  employeeId: string;
  employeeName: string;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  isOverdue: boolean;
}

export interface OverdueItem {
  record: BorrowRecord;
  item: OfficeItem;
}

export interface Stats {
  totalItems: number;
  totalBorrowCount: number;
  currentlyBorrowed: number;
  overdueCount: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(BASE_URL + url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (e) {
    throw new Error('网络请求失败，请检查服务器是否启动');
  }
  if (!response.ok) {
    let errorMessage = `请求失败（${response.status}）`;
    try {
      const json: ApiResponse<T> = await response.json();
      if (json.error) errorMessage = json.error;
    } catch {
      // ignore json parse error for non-json responses
    }
    throw new Error(errorMessage);
  }
  const json: ApiResponse<T> = await response.json();
  if (!json.success && json.error) {
    throw new Error(json.error);
  }
  return json.data as T;
}

export function useItems() {
  const [items, setItems] = useState<OfficeItem[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalItems: 0,
    totalBorrowCount: 0,
    currentlyBorrowed: 0,
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, recordsData, overdueData, statsData] = await Promise.all([
        request<OfficeItem[]>('/items'),
        request<BorrowRecord[]>('/borrow-records'),
        request<OverdueItem[]>('/items/overdue'),
        request<Stats>('/stats'),
      ]);
      setItems(itemsData);
      setBorrowRecords(recordsData);
      setOverdueItems(overdueData);
      setStats(statsData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addItem = useCallback(
    async (data: { name: string; code: string; department: string }) => {
      setLoading(true);
      try {
        const result = await request<OfficeItem>('/items', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        await fetchAll();
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : '添加失败');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchAll]
  );

  const updateItem = useCallback(
    async (id: string, data: Partial<{ name: string; code: string; department: string }>) => {
      setLoading(true);
      try {
        const result = await request<OfficeItem>(`/items/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        await fetchAll();
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : '更新失败');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchAll]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await request<void>(`/items/${id}`, { method: 'DELETE' });
        await fetchAll();
      } catch (e) {
        setError(e instanceof Error ? e.message : '删除失败');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchAll]
  );

  const borrowItem = useCallback(
    async (
      itemId: string,
      data: { employeeId: string; employeeName: string; expectedReturnDate: string }
    ) => {
      setLoading(true);
      try {
        const result = await request<{ record: BorrowRecord; item: OfficeItem }>(
          `/items/borrow/${itemId}`,
          {
            method: 'POST',
            body: JSON.stringify(data),
          }
        );
        await fetchAll();
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : '借出失败');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchAll]
  );

  const returnItem = useCallback(
    async (recordId: string, employeeId: string) => {
      setLoading(true);
      try {
        const result = await request<{ record: BorrowRecord; item: OfficeItem }>(
          `/items/return/${recordId}`,
          {
            method: 'POST',
            body: JSON.stringify({ employeeId }),
          }
        );
        await fetchAll();
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : '归还失败');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchAll]
  );

  return {
    items,
    borrowRecords,
    overdueItems,
    stats,
    loading,
    error,
    fetchAll,
    addItem,
    updateItem,
    deleteItem,
    borrowItem,
    returnItem,
  };
}
