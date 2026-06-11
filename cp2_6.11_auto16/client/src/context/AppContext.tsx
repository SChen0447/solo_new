import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { Event, Vote, StatsResponse } from '@/types';

interface AppState {
  theme: 'light' | 'dark';
  currentEvent: Event | null;
  votes: Vote[];
  stats: StatsResponse | null;
  participantName: string;
}

type AppAction =
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_EVENT'; payload: Event }
  | { type: 'SET_VOTES'; payload: Vote[] }
  | { type: 'SET_STATS'; payload: StatsResponse }
  | { type: 'SET_PARTICIPANT'; payload: string }
  | { type: 'ADD_VOTE'; payload: Vote };

const initialState: AppState = {
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  currentEvent: null,
  votes: [],
  stats: null,
  participantName: localStorage.getItem('participantName') || '',
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'TOGGLE_THEME': {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return { ...state, theme: newTheme };
    }
    case 'SET_EVENT':
      return { ...state, currentEvent: action.payload };
    case 'SET_VOTES':
      return { ...state, votes: action.payload };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'SET_PARTICIPANT':
      localStorage.setItem('participantName', action.payload);
      return { ...state, participantName: action.payload };
    case 'ADD_VOTE': {
      const existingIndex = state.votes.findIndex(
        (v) => v.candidateTimeId === action.payload.candidateTimeId && v.participantName === action.payload.participantName
      );
      let newVotes;
      if (existingIndex >= 0) {
        newVotes = [...state.votes];
        newVotes[existingIndex] = action.payload;
      } else {
        newVotes = [...state.votes, action.payload];
      }
      return { ...state, votes: newVotes };
    }
    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
