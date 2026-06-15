import { create } from 'zustand';
import axios from 'axios';
import type { Book, Borrow, LibraryLocation } from '../types';

interface LibraryState {
  books: Book[];
  borrows: Borrow[];
  locations: LibraryLocation[];
  loading: boolean;
  error: string | null;

  fetchBooks: () => Promise<void>;
  fetchBorrows: () => Promise<void>;
  fetchLocations: () => Promise<void>;
  fetchAll: () => Promise<void>;

  addBook: (book: Omit<Book, 'id' | 'status'>) => Promise<void>;
  updateBook: (id: string, book: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;

  createBorrow: (borrow: Omit<Borrow, 'id' | 'returnDate' | 'status'>) => Promise<void>;
  returnBorrow: (id: string) => Promise<void>;

  getBookById: (id: string) => Book | undefined;
  getBorrowsByBookId: (bookId: string) => Borrow[];
  getStatistics: () => {
    total: number;
    available: number;
    borrowed: number;
    overdue: number;
  };
}

const updateBorrowStatus = (borrows: Borrow[]): Borrow[] => {
  const today = new Date().toISOString().split('T')[0];
  return borrows.map((b) => {
    if (b.status === 'borrowed' && b.expectedReturnDate < today) {
      return { ...b, status: 'overdue' as const };
    }
    return b;
  });
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  borrows: [],
  locations: [],
  loading: false,
  error: null,

  fetchBooks: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/api/books');
      set({ books: res.data, error: null });
    } catch (err) {
      set({ error: 'Failed to fetch books' });
    } finally {
      set({ loading: false });
    }
  },

  fetchBorrows: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/api/borrows');
      set({ borrows: updateBorrowStatus(res.data), error: null });
    } catch (err) {
      set({ error: 'Failed to fetch borrows' });
    } finally {
      set({ loading: false });
    }
  },

  fetchLocations: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/api/locations');
      set({ locations: res.data, error: null });
    } catch (err) {
      set({ error: 'Failed to fetch locations' });
    } finally {
      set({ loading: false });
    }
  },

  fetchAll: async () => {
    await Promise.all([
      get().fetchBooks(),
      get().fetchBorrows(),
      get().fetchLocations()
    ]);
  },

  addBook: async (book) => {
    try {
      const res = await axios.post('/api/books', book);
      set((state) => ({ books: [...state.books, res.data] }));
    } catch (err) {
      set({ error: 'Failed to add book' });
    }
  },

  updateBook: async (id, book) => {
    try {
      const res = await axios.put(`/api/books/${id}`, book);
      set((state) => ({
        books: state.books.map((b) => (b.id === id ? res.data : b))
      }));
    } catch (err) {
      set({ error: 'Failed to update book' });
    }
  },

  deleteBook: async (id) => {
    try {
      await axios.delete(`/api/books/${id}`);
      set((state) => ({
        books: state.books.filter((b) => b.id !== id)
      }));
    } catch (err) {
      set({ error: 'Failed to delete book' });
    }
  },

  createBorrow: async (borrow) => {
    try {
      const res = await axios.post('/api/borrows', borrow);
      set((state) => ({
        borrows: [...state.borrows, res.data],
        books: state.books.map((b) =>
          b.id === borrow.bookId ? { ...b, status: 'borrowed' as const } : b
        )
      }));
    } catch (err) {
      set({ error: 'Failed to create borrow record' });
    }
  },

  returnBorrow: async (id) => {
    try {
      const res = await axios.put(`/api/borrows/${id}/return`);
      const returnedBorrow: Borrow = res.data;
      set((state) => ({
        borrows: state.borrows.map((b) => (b.id === id ? returnedBorrow : b)),
        books: state.books.map((b) =>
          b.id === returnedBorrow.bookId ? { ...b, status: 'available' as const } : b
        )
      }));
    } catch (err) {
      set({ error: 'Failed to process return' });
    }
  },

  getBookById: (id) => {
    return get().books.find((b) => b.id === id);
  },

  getBorrowsByBookId: (bookId) => {
    return get()
      .borrows.filter((b) => b.bookId === bookId)
      .sort(
        (a, b) =>
          new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime()
      );
  },

  getStatistics: () => {
    const { books, borrows } = get();
    const total = books.length;
    const available = books.filter((b) => b.status === 'available').length;
    const borrowed = books.filter((b) => b.status === 'borrowed').length;
    const overdue = borrows.filter((b) => b.status === 'overdue').length;
    return { total, available, borrowed, overdue };
  }
}));
