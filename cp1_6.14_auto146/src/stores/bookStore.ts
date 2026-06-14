import { create } from 'zustand';
import axios from 'axios';
import type { Book, BookStore } from '../types';

export const useBookStore = create<BookStore>((set, get) => ({
  books: [],
  selectedBook: null,
  searchQuery: '',
  loading: false,
  error: null,

  fetchBooks: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/books');
      set({ books: response.data, loading: false });
    } catch {
      set({ error: '加载图书列表失败，请稍后重试', loading: false });
    }
  },

  searchBooks: async (query: string) => {
    set({ loading: true, error: null, searchQuery: query });
    try {
      const response = await axios.get(`/api/books?q=${encodeURIComponent(query)}`);
      set({ books: response.data, loading: false });
    } catch {
      set({ error: '搜索失败，请稍后重试', loading: false });
    }
  },

  fetchBookById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`/api/books/${id}`);
      set({ selectedBook: response.data, loading: false });
    } catch {
      set({ error: '加载图书详情失败，请稍后重试', loading: false });
    }
  },

  requestBorrow: async (bookId: string, requester: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`/api/books/${bookId}/request`, { requester });
      const updatedBook = response.data;
      set((state) => ({
        books: state.books.map((b) => (b.id === bookId ? updatedBook : b)),
        selectedBook: state.selectedBook?.id === bookId ? updatedBook : state.selectedBook,
        loading: false
      }));
    } catch {
      set({ error: '预约失败，请稍后重试', loading: false });
    }
  },

  confirmBorrow: async (bookId: string, returnDate: string) => {
    set({ loading: true, error: null });
    try {
      const book = get().books.find((b) => b.id === bookId);
      const response = await axios.post(`/api/books/${bookId}/borrow`, {
        borrower: book?.requester || '读者',
        returnDate
      });
      const updatedBook = response.data;
      set((state) => ({
        books: state.books.map((b) => (b.id === bookId ? updatedBook : b)),
        selectedBook: state.selectedBook?.id === bookId ? updatedBook : state.selectedBook,
        loading: false
      }));
    } catch {
      set({ error: '确认借出失败，请稍后重试', loading: false });
    }
  },

  markReturned: async (bookId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`/api/books/${bookId}/return`);
      const updatedBook = response.data;
      set((state) => ({
        books: state.books.map((b) => (b.id === bookId ? updatedBook : b)),
        selectedBook: state.selectedBook?.id === bookId ? updatedBook : state.selectedBook,
        loading: false
      }));
    } catch {
      set({ error: '标记归还失败，请稍后重试', loading: false });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  clearError: () => {
    set({ error: null });
  }
}));
