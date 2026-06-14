import { create } from 'zustand';
import axios from 'axios';
import type {
  Luggage,
  ShareItem,
  Event,
  ToastMessage,
  LuggageStatusFilter,
  ShareStatusFilter,
} from '../types';

interface AppState {
  luggageList: Luggage[];
  shareItems: ShareItem[];
  events: Event[];
  luggageSearchQuery: string;
  luggageStatusFilter: LuggageStatusFilter;
  luggageTypeFilter: string;
  shareSearchQuery: string;
  shareStatusFilter: ShareStatusFilter;
  sidebarOpen: boolean;
  toasts: ToastMessage[];
  loading: boolean;
  filteredLuggage: Luggage[];
  filteredShareItems: ShareItem[];

  fetchLuggage: () => Promise<void>;
  fetchShareItems: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchAllData: () => Promise<void>;

  addLuggage: (data: {
    name: string;
    phone: string;
    luggageType: string;
    notes: string;
    expectedPickupTime: string | null;
  }) => Promise<Luggage | null>;

  claimLuggage: (id: string, pickupCode: string) => Promise<boolean>;

  addShareItem: (data: {
    name: string;
    itemType: string;
    description: string;
  }) => Promise<ShareItem | null>;

  borrowItem: (id: string, borrowerName: string, expectedReturnAt?: string) => Promise<boolean>;
  returnItem: (id: string) => Promise<boolean>;

  setLuggageSearchQuery: (query: string) => void;
  setLuggageStatusFilter: (filter: LuggageStatusFilter) => void;
  setLuggageTypeFilter: (filter: string) => void;
  setShareSearchQuery: (query: string) => void;
  setShareStatusFilter: (filter: ShareStatusFilter) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  addToast: (type: 'success' | 'error', message: string) => void;
  removeToast: (id: string) => void;

  recalculateFilteredLuggage: () => void;
  recalculateFilteredShareItems: () => void;
}

function computeFilteredLuggage(
  luggageList: Luggage[],
  searchQuery: string,
  statusFilter: LuggageStatusFilter,
  typeFilter: string
): Luggage[] {
  return luggageList.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.luggageType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
}

function computeFilteredShareItems(
  shareItems: ShareItem[],
  searchQuery: string,
  statusFilter: ShareStatusFilter
): ShareItem[] {
  return shareItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  luggageList: [],
  shareItems: [],
  events: [],
  luggageSearchQuery: '',
  luggageStatusFilter: 'all',
  luggageTypeFilter: 'all',
  shareSearchQuery: '',
  shareStatusFilter: 'all',
  sidebarOpen: true,
  toasts: [],
  loading: false,
  filteredLuggage: [],
  filteredShareItems: [],

  recalculateFilteredLuggage: () => {
    const { luggageList, luggageSearchQuery, luggageStatusFilter, luggageTypeFilter } = get();
    set({
      filteredLuggage: computeFilteredLuggage(
        luggageList,
        luggageSearchQuery,
        luggageStatusFilter,
        luggageTypeFilter
      ),
    });
  },

  recalculateFilteredShareItems: () => {
    const { shareItems, shareSearchQuery, shareStatusFilter } = get();
    set({
      filteredShareItems: computeFilteredShareItems(
        shareItems,
        shareSearchQuery,
        shareStatusFilter
      ),
    });
  },

  fetchLuggage: async () => {
    try {
      const response = await axios.get('/api/luggage');
      const luggageList = response.data;
      set({ luggageList });
      get().recalculateFilteredLuggage();
    } catch (error) {
      console.error('Failed to fetch luggage:', error);
      get().addToast('error', '获取行李列表失败');
    }
  },

  fetchShareItems: async () => {
    try {
      const response = await axios.get('/api/shareItems');
      const shareItems = response.data;
      set({ shareItems });
      get().recalculateFilteredShareItems();
    } catch (error) {
      console.error('Failed to fetch share items:', error);
      get().addToast('error', '获取共享物品列表失败');
    }
  },

  fetchEvents: async () => {
    try {
      const response = await axios.get('/api/events?limit=50');
      set({ events: response.data });
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  },

  fetchAllData: async () => {
    set({ loading: true });
    try {
      await Promise.all([
        get().fetchLuggage(),
        get().fetchShareItems(),
        get().fetchEvents(),
      ]);
    } finally {
      set({ loading: false });
    }
  },

  addLuggage: async (data) => {
    try {
      const response = await axios.post('/api/luggage', data);
      const newLuggage = response.data;
      set((state) => ({
        luggageList: [...state.luggageList, newLuggage],
      }));
      get().recalculateFilteredLuggage();
      get().addToast('success', '行李寄存成功！');
      get().fetchEvents();
      return newLuggage;
    } catch (error: any) {
      const message = error.response?.data?.error || '行李寄存失败';
      get().addToast('error', message);
      return null;
    }
  },

  claimLuggage: async (id, pickupCode) => {
    try {
      await axios.put(`/api/luggage/${id}`, { status: 'claimed', pickupCode });
      set((state) => ({
        luggageList: state.luggageList.map((item) =>
          item.id === id
            ? { ...item, status: 'claimed' as const, claimedAt: new Date().toISOString() }
            : item
        ),
      }));
      get().recalculateFilteredLuggage();
      get().addToast('success', '取件成功！');
      get().fetchEvents();
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || '取件失败';
      get().addToast('error', message);
      return false;
    }
  },

  addShareItem: async (data) => {
    try {
      const response = await axios.post('/api/shareItems', data);
      const newItem = response.data;
      set((state) => ({
        shareItems: [...state.shareItems, newItem],
      }));
      get().recalculateFilteredShareItems();
      get().addToast('success', '物品添加成功！');
      get().fetchEvents();
      return newItem;
    } catch (error: any) {
      const message = error.response?.data?.error || '添加物品失败';
      get().addToast('error', message);
      return null;
    }
  },

  borrowItem: async (id, borrowerName, expectedReturnAt) => {
    try {
      await axios.put(`/api/shareItems/${id}`, {
        action: 'borrow',
        borrowerName,
        expectedReturnAt,
      });
      set((state) => ({
        shareItems: state.shareItems.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'borrowed' as const,
                borrowCount: item.borrowCount + 1,
                currentBorrower: borrowerName,
                borrowedAt: new Date().toISOString(),
                expectedReturnAt: expectedReturnAt || null,
              }
            : item
        ),
      }));
      get().recalculateFilteredShareItems();
      get().addToast('success', '借出成功！');
      get().fetchEvents();
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || '借出失败';
      get().addToast('error', message);
      return false;
    }
  },

  returnItem: async (id) => {
    try {
      await axios.put(`/api/shareItems/${id}`, { action: 'return' });
      set((state) => ({
        shareItems: state.shareItems.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'available' as const,
                currentBorrower: null,
                borrowedAt: null,
                expectedReturnAt: null,
                returnedAt: new Date().toISOString(),
              }
            : item
        ),
      }));
      get().recalculateFilteredShareItems();
      get().addToast('success', '归还成功！');
      get().fetchEvents();
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || '归还失败';
      get().addToast('error', message);
      return false;
    }
  },

  setLuggageSearchQuery: (query) => {
    set({ luggageSearchQuery: query });
    get().recalculateFilteredLuggage();
  },
  setLuggageStatusFilter: (filter) => {
    set({ luggageStatusFilter: filter });
    get().recalculateFilteredLuggage();
  },
  setLuggageTypeFilter: (filter) => {
    set({ luggageTypeFilter: filter });
    get().recalculateFilteredLuggage();
  },
  setShareSearchQuery: (query) => {
    set({ shareSearchQuery: query });
    get().recalculateFilteredShareItems();
  },
  setShareStatusFilter: (filter) => {
    set({ shareStatusFilter: filter });
    get().recalculateFilteredShareItems();
  },
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  addToast: (type, message) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));
