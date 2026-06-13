import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { WordData, queryWord } from '../data/wordData';

export type PageMode = 'home' | 'card' | 'fireworks';

interface AppState {
  currentWord: string;
  wordData: WordData | null;
  pageMode: PageMode;
  isEtymologyExpanded: boolean;
  isSearching: boolean;
  fireworksTriggerId: number;
  showFpsCounter: boolean;

  setCurrentWord: (word: string) => void;
  searchWord: (word: string) => void;
  setPageMode: (mode: PageMode) => void;
  setIsEtymologyExpanded: (expanded: boolean) => void;
  toggleEtymology: () => void;
  triggerFireworks: () => void;
  enterFireworksMode: () => void;
  exitFireworksMode: () => void;
  clearSearch: () => void;
  setShowFpsCounter: (show: boolean) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentWord, setCurrentWord] = useState('');
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [pageMode, setPageMode] = useState<PageMode>('home');
  const [isEtymologyExpanded, setIsEtymologyExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [fireworksTriggerId, setFireworksTriggerId] = useState(0);
  const [showFpsCounter, setShowFpsCounter] = useState(false);

  const searchWord = useCallback((word: string) => {
    const trimmedWord = word.trim();
    if (!trimmedWord) return;

    setIsSearching(true);
    setCurrentWord(trimmedWord);
    setIsEtymologyExpanded(false);

    const t0 = performance.now();
    const result = queryWord(trimmedWord);
    const elapsed = performance.now() - t0;

    const delay = Math.max(120, 200 - elapsed);
    setTimeout(() => {
      setWordData(result);
      setPageMode('card');
      setIsSearching(false);
    }, delay);
  }, []);

  const clearSearch = useCallback(() => {
    setCurrentWord('');
    setWordData(null);
    setPageMode('home');
    setIsEtymologyExpanded(false);
    setFireworksTriggerId(0);
  }, []);

  const toggleEtymology = useCallback(() => {
    setIsEtymologyExpanded(prev => !prev);
  }, []);

  const triggerFireworks = useCallback(() => {
    setFireworksTriggerId(prev => prev + 1);
  }, []);

  const enterFireworksMode = useCallback(() => {
    setFireworksTriggerId(prev => prev + 1);
    setPageMode('fireworks');
  }, []);

  const exitFireworksMode = useCallback(() => {
    setPageMode('card');
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentWord,
        wordData,
        pageMode,
        isEtymologyExpanded,
        isSearching,
        fireworksTriggerId,
        showFpsCounter,
        setCurrentWord,
        searchWord,
        setPageMode,
        setIsEtymologyExpanded,
        toggleEtymology,
        triggerFireworks,
        enterFireworksMode,
        exitFireworksMode,
        clearSearch,
        setShowFpsCounter,
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
