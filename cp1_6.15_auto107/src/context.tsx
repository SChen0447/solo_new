import React, { createContext, useContext } from 'react';
import { useEmotionData } from './hooks/useEmotionData';

export type EmotionContextValue = ReturnType<typeof useEmotionData>;

const EmotionContext = createContext<EmotionContextValue | null>(null);

export function EmotionProvider({ children }: { children: React.ReactNode }) {
  const value = useEmotionData();
  return <EmotionContext.Provider value={value}>{children}</EmotionContext.Provider>;
}

export function useEmotionContext(): EmotionContextValue {
  const ctx = useContext(EmotionContext);
  if (!ctx) throw new Error('useEmotionContext must be used within EmotionProvider');
  return ctx;
}
