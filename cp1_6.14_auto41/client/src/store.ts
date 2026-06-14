import { create } from 'zustand';
import axios from 'axios';
import type {
  Portfolio,
  Category,
  QuoteRequest,
  QuoteResult,
  Order,
  OrderStatus,
  PaginatedResponse,
} from './types';

interface PortfolioState {
  portfolios: Portfolio[];
  total: number;
  page: number;
  pageSize: number;
  categoryFilter: Category | '全部';
  searchQuery: string;
  loading: boolean;
  selectedPortfolio: Portfolio | null;
  fetchPortfolios: (page?: number, category?: Category | '全部', search?: string) => Promise<void>;
  createPortfolio: (data: Omit<Portfolio, 'id'>) => Promise<void>;
  updatePortfolio: (id: string, data: Partial<Portfolio>) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  setSelectedPortfolio: (p: Portfolio | null) => void;
  setCategoryFilter: (c: Category | '全部') => void;
  setSearchQuery: (q: string) => void;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolios: [],
  total: 0,
  page: 1,
  pageSize: 12,
  categoryFilter: '全部',
  searchQuery: '',
  loading: false,
  selectedPortfolio: null,

  fetchPortfolios: async (page, category, search) => {
    set({ loading: true });
    const p = page ?? get().page;
    const c = category ?? get().categoryFilter;
    const s = search ?? get().searchQuery;
    const params: Record<string, string | number> = { page: p, pageSize: 12 };
    if (c !== '全部') params.category = c;
    if (s) params.search = s;
    try {
      const res = await axios.get<PaginatedResponse<Portfolio>>('/api/portfolios', { params });
      set({ portfolios: res.data.data, total: res.data.total, page: p, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createPortfolio: async (data) => {
    await axios.post('/api/portfolios', data);
    get().fetchPortfolios();
  },

  updatePortfolio: async (id, data) => {
    await axios.put(`/api/portfolios/${id}`, data);
    get().fetchPortfolios();
  },

  deletePortfolio: async (id) => {
    await axios.delete(`/api/portfolios/${id}`);
    get().fetchPortfolios();
  },

  setSelectedPortfolio: (p) => set({ selectedPortfolio: p }),
  setCategoryFilter: (c) => {
    set({ categoryFilter: c, page: 1 });
    get().fetchPortfolios(1, c);
  },
  setSearchQuery: (q) => {
    set({ searchQuery: q, page: 1 });
    get().fetchPortfolios(1, undefined, q);
  },
}));

interface QuoteState {
  quoteResult: QuoteResult | null;
  quoteLoading: boolean;
  calculateQuote: (req: QuoteRequest) => Promise<void>;
  confirmQuote: (req: QuoteRequest) => Promise<Order>;
}

export const useQuoteStore = create<QuoteState>((set) => ({
  quoteResult: null,
  quoteLoading: false,

  calculateQuote: async (req) => {
    set({ quoteLoading: true });
    try {
      const res = await axios.post<QuoteResult>('/api/quotes/calculate', req);
      set({ quoteResult: res.data, quoteLoading: false });
    } catch {
      set({ quoteLoading: false });
    }
  },

  confirmQuote: async (req) => {
    const res = await axios.post<Order>('/api/quotes/confirm', req);
    return res.data;
  },
}));

interface OrderState {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  statusFilter: OrderStatus | '全部';
  loading: boolean;
  fetchOrders: (page?: number, status?: OrderStatus | '全部') => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  addNote: (id: string, content: string, author: 'client' | 'designer') => Promise<void>;
  setStatusFilter: (s: OrderStatus | '全部') => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  total: 0,
  page: 1,
  pageSize: 20,
  statusFilter: '全部',
  loading: false,

  fetchOrders: async (page, status) => {
    set({ loading: true });
    const p = page ?? get().page;
    const s = status ?? get().statusFilter;
    const params: Record<string, string | number> = { page: p, pageSize: 20 };
    if (s !== '全部') params.status = s;
    try {
      const res = await axios.get<PaginatedResponse<Order>>('/api/quotes/orders', { params });
      set({ orders: res.data.data, total: res.data.total, page: p, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateOrderStatus: async (id, status) => {
    await axios.patch(`/api/quotes/orders/${id}/status`, { status });
    get().fetchOrders();
  },

  addNote: async (id, content, author) => {
    await axios.post(`/api/quotes/orders/${id}/notes`, { content, author });
    get().fetchOrders();
  },

  setStatusFilter: (s) => {
    set({ statusFilter: s, page: 1 });
    get().fetchOrders(1, s);
  },
}));
