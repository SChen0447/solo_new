export interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'member';
  avatar?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  isbn: string;
  coverUrl: string;
  totalCopies: number;
  availableCopies: number;
  status: 'available' | 'borrowed' | 'reserved';
  reviews?: Review[];
}

export interface Review {
  id: string;
  userId: string;
  username: string;
  rating: number;
  content: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
}

export interface ReservationRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  reserveDate: string;
  status: 'waiting' | 'fulfilled' | 'cancelled';
}

export interface AdminStats {
  totalBooks: number;
  totalMembers: number;
  monthlyBorrows: number;
  pendingReviews: number;
}

export interface BorrowTrendItem {
  date: string;
  count: number;
}
