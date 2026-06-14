export interface PathHistoryEntry {
  id: string;
  date: string;
  event: 'add' | 'borrow' | 'return' | 'request';
  description: string;
  person: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  year: number;
  condition: '全新' | '近新' | '良好' | '一般' | '较差';
  currentHolder: string;
  borrowCount: number;
  status: 'available' | 'borrowed' | 'pending';
  borrower: string | null;
  borrowDate: string | null;
  expectedReturnDate: string | null;
  requester: string | null;
  color: string;
  pathHistory: PathHistoryEntry[];
}

export interface BookStore {
  books: Book[];
  selectedBook: Book | null;
  searchQuery: string;
  loading: boolean;
  error: string | null;
  fetchBooks: () => Promise<void>;
  searchBooks: (query: string) => Promise<void>;
  fetchBookById: (id: string) => Promise<void>;
  requestBorrow: (bookId: string, requester: string) => Promise<void>;
  confirmBorrow: (bookId: string, returnDate: string) => Promise<void>;
  markReturned: (bookId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}
