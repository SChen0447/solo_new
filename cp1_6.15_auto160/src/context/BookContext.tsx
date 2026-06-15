import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { Book, Review, BookContextType } from '../types';

const BookContext = createContext<BookContextType | undefined>(undefined);

export const useBookContext = () => {
  const context = useContext(BookContext);
  if (!context) {
    throw new Error('useBookContext must be used within a BookProvider');
  }
  return context;
};

interface BookProviderProps {
  children: ReactNode;
}

export const BookProvider: React.FC<BookProviderProps> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get<Book[]>('/api/books');
      setBooks(response.data);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBookById = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await axios.get<Book>(`/api/books/${id}`);
      setSelectedBook(response.data);
    } catch (error) {
      console.error('Failed to fetch book:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReviewsByBookId = useCallback(async (bookId: string) => {
    try {
      const response = await axios.get<Review[]>('/api/reviews', {
        params: { bookId }
      });
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  }, []);

  const addReview = useCallback(async (review: Omit<Review, 'id' | 'createdAt'>) => {
    try {
      const response = await axios.post<Review>('/api/reviews', review);
      setReviews(prev => [response.data, ...prev]);
      setBooks(prev => prev.map(book => 
        book.id === review.bookId 
          ? { ...book, reviewCount: (book.reviewCount || 0) + 1 }
          : book
      ));
      return true;
    } catch (error) {
      console.error('Failed to add review:', error);
      return false;
    }
  }, []);

  const value: BookContextType = {
    books,
    selectedBook,
    reviews,
    loading,
    fetchBooks,
    fetchBookById,
    fetchReviewsByBookId,
    addReview,
    setSelectedBook,
    searchQuery,
    setSearchQuery
  };

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  );
};
