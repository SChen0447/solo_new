import { create } from 'zustand';
import axios from 'axios';
import type { Book, BookList, Rating, Review, UserStats } from '@/types';

interface UserRating extends Rating {
  book_title?: string;
  book_cover?: string;
  book_author?: string;
}

interface BookStoreState {
  books: Book[];
  bookLists: BookList[];
  recommendations: Book[];
  userRatings: UserRating[];
  userStats: UserStats | null;
  userReviews: Review[];
  loading: boolean;
  isAdmin: boolean;
  currentUserId: string;
  searchQuery: string;
  newBookListId: string | null;

  fetchBooks: () => Promise<void>;
  fetchBookLists: () => Promise<void>;
  fetchBookListDetail: (id: string) => Promise<BookList>;
  addRating: (userId: string, bookId: string, score: number) => Promise<void>;
  submitReview: (userId: string, bookId: string, content: string, score: number) => Promise<void>;
  fetchRecommendations: (userId: string) => Promise<void>;
  fetchUserRatings: (userId: string) => Promise<void>;
  fetchUserStats: (userId: string) => Promise<void>;
  fetchBookReviews: (bookId: string) => Promise<Review[]>;
  createBookList: (title: string, description: string, bookIds: string[]) => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleAdmin: () => void;
  dismissNewBadge: () => void;
}

const useBookStore = create<BookStoreState>()((set, get) => ({
  books: [],
  bookLists: [],
  recommendations: [],
  userRatings: [],
  userStats: null,
  userReviews: [],
  loading: false,
  isAdmin: !!localStorage.getItem('admin_token'),
  currentUserId: '1',
  searchQuery: '',
  newBookListId: null,

  fetchBooks: async () => {
    set({ loading: true });
    try {
      const res = await axios.get<Book[]>('/api/books');
      set({ books: res.data });
    } finally {
      set({ loading: false });
    }
  },

  fetchBookLists: async () => {
    set({ loading: true });
    try {
      const res = await axios.get<BookList[]>('/api/booklists');
      set({ bookLists: res.data });
    } finally {
      set({ loading: false });
    }
  },

  fetchBookListDetail: async (id: string) => {
    set({ loading: true });
    try {
      const res = await axios.get<BookList>(`/api/booklists/${id}`);
      return res.data;
    } finally {
      set({ loading: false });
    }
  },

  addRating: async (userId: string, bookId: string, score: number) => {
    await axios.post('/api/ratings', { user_id: userId, book_id: bookId, score });
    await get().fetchBooks();
    if (get().recommendations.length > 0) {
      await get().fetchRecommendations(userId);
    }
  },

  submitReview: async (userId: string, bookId: string, content: string, score: number) => {
    await axios.post('/api/reviews', { user_id: userId, book_id: bookId, content, score });
  },

  fetchRecommendations: async (userId: string) => {
    set({ loading: true });
    try {
      const res = await axios.get<Book[]>(`/api/recommendations/${userId}`);
      set({ recommendations: res.data });
    } finally {
      set({ loading: false });
    }
  },

  fetchUserRatings: async (userId: string) => {
    set({ loading: true });
    try {
      const res = await axios.get<UserRating[]>(`/api/user/${userId}/ratings`);
      set({ userRatings: res.data });
    } finally {
      set({ loading: false });
    }
  },

  fetchUserStats: async (userId: string) => {
    set({ loading: true });
    try {
      const res = await axios.get<UserStats>(`/api/user/${userId}/stats`);
      set({ userStats: res.data });
    } finally {
      set({ loading: false });
    }
  },

  fetchBookReviews: async (bookId: string) => {
    set({ loading: true });
    try {
      const res = await axios.get<Review[]>(`/api/reviews/book/${bookId}`);
      set({ userReviews: res.data });
      return res.data;
    } finally {
      set({ loading: false });
    }
  },

  createBookList: async (title: string, description: string, bookIds: string[]) => {
    set({ loading: true });
    try {
      const res = await axios.post<BookList>('/api/booklists', { title, description, bookIds });
      await get().fetchBookLists();
      set({ newBookListId: res.data.id });
    } finally {
      set({ loading: false });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  toggleAdmin: () => {
    const current = get().isAdmin;
    if (current) {
      localStorage.removeItem('admin_token');
    } else {
      localStorage.setItem('admin_token', 'true');
    }
    set({ isAdmin: !current });
  },

  dismissNewBadge: () => {
    set({ newBookListId: null });
  },
}));

export default useBookStore;
