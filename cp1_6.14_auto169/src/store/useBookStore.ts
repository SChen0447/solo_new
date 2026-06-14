import { create } from 'zustand';
import axios from 'axios';
import type { Book, ShelfBook, ShelfState } from '@types/index';

interface BookStore {
  recommendedBooks: Book[];
  shelfBooks: ShelfBook[];
  selectedBook: Book | null;
  isLoading: boolean;
  isSaving: boolean;
  currentMood: string;

  fetchRecommendations: (mood: string) => Promise<void>;
  fetchShelf: () => Promise<void>;
  saveShelf: () => Promise<void>;
  addBookToShelf: (book: Book, position: number) => void;
  removeBookFromShelf: (bookId: string) => void;
  moveBookOnShelf: (bookId: string, newPosition: number) => void;
  setSelectedBook: (book: Book | null) => void;
  setCurrentMood: (mood: string) => void;
}

export const useBookStore = create<BookStore>((set, get) => ({
  recommendedBooks: [],
  shelfBooks: [],
  selectedBook: null,
  isLoading: false,
  isSaving: false,
  currentMood: '',

  fetchRecommendations: async (mood: string) => {
    set({ isLoading: true, currentMood: mood });
    try {
      const response = await axios.get<Book[]>('/api/recommendations', {
        params: { mood },
      });
      set({ recommendedBooks: response.data });
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchShelf: async () => {
    try {
      const response = await axios.get<ShelfState>('/api/shelf');
      set({
        shelfBooks: response.data.books,
      });
    } catch (error) {
      console.error('Failed to fetch shelf:', error);
    }
  },

  saveShelf: async () => {
    set({ isSaving: true });
    try {
      const { shelfBooks } = get();
      await axios.post('/api/shelf', {
        books: shelfBooks,
        layout: shelfBooks.map((b) => b.position),
      });
    } catch (error) {
      console.error('Failed to save shelf:', error);
    } finally {
      set({ isSaving: false });
    }
  },

  addBookToShelf: (book: Book, position: number) => {
    set((state) => {
      const existingBook = state.shelfBooks.find((b) => b.id === book.id);
      if (existingBook) {
        return state;
      }

      const newShelfBook: ShelfBook = {
        ...book,
        position,
      };

      return {
        shelfBooks: [...state.shelfBooks, newShelfBook],
      };
    });
  },

  removeBookFromShelf: (bookId: string) => {
    set((state) => ({
      shelfBooks: state.shelfBooks.filter((b) => b.id !== bookId),
    }));
  },

  moveBookOnShelf: (bookId: string, newPosition: number) => {
    set((state) => {
      const targetBook = state.shelfBooks.find((b) => b.id === bookId);
      if (!targetBook) return state;

      const otherBooks = state.shelfBooks.filter((b) => b.id !== bookId);
      const bookAtNewPos = otherBooks.find((b) => b.position === newPosition);

      if (bookAtNewPos) {
        const oldPosition = targetBook.position;
        return {
          shelfBooks: state.shelfBooks.map((b) => {
            if (b.id === bookId) return { ...b, position: newPosition };
            if (b.id === bookAtNewPos.id) return { ...b, position: oldPosition };
            return b;
          }),
        };
      }

      return {
        shelfBooks: state.shelfBooks.map((b) =>
          b.id === bookId ? { ...b, position: newPosition } : b
        ),
      };
    });
  },

  setSelectedBook: (book: Book | null) => {
    set({ selectedBook: book });
  },

  setCurrentMood: (mood: string) => {
    set({ currentMood: mood });
  },
}));
