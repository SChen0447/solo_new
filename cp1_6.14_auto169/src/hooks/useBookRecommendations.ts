import { useState, useEffect, useCallback } from 'react';
import { useBookStore } from '@store/useBookStore';
import type { Book } from '@types/index';

interface UseBookRecommendationsReturn {
  books: Book[];
  isLoading: boolean;
  currentMood: string;
  fetchByMood: (mood: string) => void;
}

export const useBookRecommendations = (): UseBookRecommendationsReturn => {
  const {
    recommendedBooks,
    isLoading,
    currentMood,
    fetchRecommendations,
  } = useBookStore();

  const [localBooks, setLocalBooks] = useState<Book[]>([]);

  useEffect(() => {
    setLocalBooks(recommendedBooks);
  }, [recommendedBooks]);

  const fetchByMood = useCallback(
    (mood: string) => {
      fetchRecommendations(mood);
    },
    [fetchRecommendations]
  );

  return {
    books: localBooks,
    isLoading,
    currentMood,
    fetchByMood,
  };
};
