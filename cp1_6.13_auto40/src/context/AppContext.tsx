import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { WordData, queryWord } from '../data/wordData';

export type PageMode = 'home' | 'card' | 'fireworks';

interface AppState {
  currentWord: string;
  wordData: WordData | null;
  pageMode: PageMode;
  isEtymologyExpanded: boolean;
  isSearching: boolean;
  setCurrentWord: (word: string) => void;
  searchWord: (word: string) => void;
  setPageMode: (mode: PageMode) => void;
  setIsEtymologyExpanded: (expanded: boolean) => void;
  clearSearch: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentWord, setCurrentWord] = useState('');
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [pageMode, setPageMode] = useState<PageMode>('home');
  const [isEtymologyExpanded, setIsEtymologyExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const searchWord = useCallback((word: string) => {
    const trimmedWord = word.trim();
    if (!trimmedWord) return;

    setIsSearching(true);
    setCurrentWord(trimmedWord);

    setTimeout(() => {
      const result = queryWord(trimmedWord);
      setWordData(result);
      setPageMode('card');
      setIsEtymologyExpanded(false);
      setIsSearching(false);
    }, 150);
  }, []);

  const clearSearch = useCallback(() => {
    setCurrentWord('');
    setWordData(null);
    setPageMode('home');
    setIsEtymologyExpanded(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentWord,
        wordData,
        pageMode,
        isEtymologyExpanded,
        isSearching,
        setCurrentWord,
        searchWord,
        setPageMode,
        setIsEtymologyExpanded,
        clearSearch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
