import { create } from 'zustand';
import axios from 'axios';
import type { Book } from '@/types';

interface BookState {
  books: Book[];
  total: number;
  currentPage: number;
  search: string;
  statusFilter: string;
  selectedBook: Book | null;
  loading: boolean;
  fetchBooks: (page?: number, search?: string, status?: string) => Promise<void>;
  fetchBookDetail: (id: string) => Promise<void>;
  clearSelectedBook: () => void;
}

export const useBookStore = create<BookState>((set, get) => ({
  books: [],
  total: 0,
  currentPage: 1,
  search: '',
  statusFilter: '',
  selectedBook: null,
  loading: false,

  fetchBooks: async (page?: number, search?: string, status?: string) => {
    set({ loading: true });
    try {
      const params: Record<string, string | number> = {
        page: page ?? get().currentPage,
        pageSize: 12,
      };
      if (search !== undefined) {
        params.search = search;
        set({ search });
      } else {
        params.search = get().search;
      }
      if (status !== undefined) {
        params.status = status;
        set({ statusFilter: status });
      } else {
        params.status = get().statusFilter;
      }
      set({ currentPage: params.page as number });

      const res = await axios.get('/api/books', { params });
      set({
        books: res.data.books ?? res.data,
        total: res.data.total ?? 0,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchBookDetail: async (id: string) => {
    set({ loading: true });
    try {
      const res = await axios.get(`/api/books/${id}`);
      set({ selectedBook: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  clearSelectedBook: () => set({ selectedBook: null }),
}));
