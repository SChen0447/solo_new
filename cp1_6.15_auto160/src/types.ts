export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  year: number;
  summary: string;
  reviewCount?: number;
}

export interface Review {
  id: string;
  bookId: string;
  nickname: string;
  content: string;
  createdAt: string;
}

export interface BookContextType {
  books: Book[];
  selectedBook: Book | null;
  reviews: Review[];
  loading: boolean;
  fetchBooks: () => Promise<void>;
  fetchBookById: (id: string) => Promise<void>;
  fetchReviewsByBookId: (bookId: string) => Promise<void>;
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => Promise<boolean>;
  setSelectedBook: (book: Book | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}
