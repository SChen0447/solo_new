import { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  Book,
  BorrowRecord,
  BookFormData,
  BorrowFormData,
  BookStatus,
} from '@/types';

const BOOKS_KEY = 'library_books';
const RECORDS_KEY = 'library_records';

const loadFromStorage = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    console.error('Failed to save to localStorage');
  }
};

export const useLibrary = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<BookStatus | 'all'>('all');

  useEffect(() => {
    setBooks(loadFromStorage<Book>(BOOKS_KEY));
    setRecords(loadFromStorage<BorrowRecord>(RECORDS_KEY));
  }, []);

  useEffect(() => {
    saveToStorage(BOOKS_KEY, books);
  }, [books]);

  useEffect(() => {
    saveToStorage(RECORDS_KEY, records);
  }, [records]);

  const addBook = useCallback((data: BookFormData): Book => {
    const newBook: Book = {
      id: uuidv4(),
      ...data,
      createdAt: Date.now(),
    };
    setBooks(prev => [newBook, ...prev]);
    return newBook;
  }, []);

  const updateBook = useCallback((id: string, data: BookFormData): void => {
    setBooks(prev => prev.map(book =>
      book.id === id ? { ...book, ...data } : book
    ));
  }, []);

  const deleteBook = useCallback((id: string): void => {
    setBooks(prev => prev.filter(book => book.id !== id));
    setRecords(prev => prev.filter(record => record.bookId !== id));
  }, []);

  const borrowBook = useCallback((bookId: string, data: BorrowFormData): void => {
    const today = new Date().toISOString().split('T')[0];
    const newRecord: BorrowRecord = {
      id: uuidv4(),
      bookId,
      borrowerName: data.borrowerName,
      borrowDate: today,
      expectedReturnDate: data.expectedReturnDate,
      isReturned: false,
    };
    setRecords(prev => [newRecord, ...prev]);
    setBooks(prev => prev.map(book =>
      book.id === bookId ? { ...book, status: 'borrowed' as BookStatus } : book
    ));
  }, []);

  const returnBook = useCallback((bookId: string): void => {
    const today = new Date().toISOString().split('T')[0];
    setRecords(prev => prev.map(record =>
      record.bookId === bookId && !record.isReturned
        ? { ...record, isReturned: true, returnDate: today }
        : record
    ));
    setBooks(prev => prev.map(book =>
      book.id === bookId ? { ...book, status: 'available' as BookStatus } : book
    ));
  }, []);

  const getBookRecords = useCallback((bookId: string): BorrowRecord[] => {
    return records.filter(r => r.bookId === bookId).sort((a, b) =>
      new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime()
    );
  }, [records]);

  const filteredBooks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return books.filter(book => {
      if (filterStatus !== 'all' && book.status !== filterStatus) return false;
      if (!query) return true;
      return (
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      );
    });
  }, [books, searchQuery, filterStatus]);

  const stats = useMemo(() => ({
    total: books.length,
    available: books.filter(b => b.status === 'available').length,
    borrowed: books.filter(b => b.status === 'borrowed').length,
  }), [books]);

  return {
    books,
    filteredBooks,
    records,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    addBook,
    updateBook,
    deleteBook,
    borrowBook,
    returnBook,
    getBookRecords,
    stats,
  };
};
