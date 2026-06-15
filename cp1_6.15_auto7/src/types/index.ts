export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverUrl: string;
  description?: string;
  status: 'available' | 'borrowed';
  location?: string;
}

export interface Borrow {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowerName: string;
  borrowDate: string;
  expectedReturnDate: string;
  returnDate: string | null;
  status: 'borrowed' | 'returned' | 'overdue';
}

export interface LibraryLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  bookCount: number;
}

export type Category = '全部' | '小说' | '科技' | '历史' | '艺术' | '哲学' | '其他';

export const CATEGORIES: Category[] = ['全部', '小说', '科技', '历史', '艺术', '哲学', '其他'];
