import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  color: string;
  cursorPosition?: number;
  isEditing: boolean;
}

export interface Timer {
  id: string;
  stepId: string;
  duration: number;
  remaining: number;
  isRunning: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

export interface RecipeStep {
  id: string;
  content: string;
  timer?: Timer;
}

export interface HistoryEntry {
  id: string;
  content: string;
  timestamp: number;
  userId: string;
  userName: string;
}

interface RecipeState {
  recipeId: string | null;
  title: string;
  content: string;
  steps: RecipeStep[];
  ingredients: Ingredient[];
  history: HistoryEntry[];
  users: User[];
  currentUserId: string | null;
  currentUser: User | null;
  timers: Timer[];
  isDarkMode: boolean;
  isHistoryOpen: boolean;
  isIngredientsOpen: boolean;
  isLoading: boolean;
  error: string | null;

  setRecipeId: (id: string) => void;
  setRecipeData: (data: Partial<RecipeState>) => void;
  setContent: (content: string) => void;
  setCurrentUser: (user: User) => void;
  setCurrentUserId: (id: string) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  updateUsers: (users: User[]) => void;
  updateCursor: (userId: string, position: number) => void;
  setUserEditing: (userId: string, isEditing: boolean) => void;

  updateTimer: (timerId: string, updates: Partial<Timer>) => void;
  setTimers: (timers: Timer[]) => void;
  startTimer: (timerId: string) => void;
  pauseTimer: (timerId: string) => void;
  resetTimer: (timerId: string) => void;
  setTimerDuration: (timerId: string, duration: number) => void;

  addIngredient: (ingredient: Ingredient) => void;
  removeIngredient: (ingredientId: string) => void;
  updateIngredient: (ingredientId: string, updates: Partial<Ingredient>) => void;

  addStep: (step: RecipeStep) => void;
  updateStep: (stepId: string, content: string) => void;

  addHistoryEntry: (entry: HistoryEntry) => void;
  toggleHistory: () => void;
  toggleIngredients: () => void;
  toggleDarkMode: () => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const COLOR_PALETTE = [
  '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#ffc107', '#ff9800', '#ff5722',
];

const initialState = {
  recipeId: null,
  title: '',
  content: '',
  steps: [],
  ingredients: [],
  history: [],
  users: [],
  currentUserId: null,
  currentUser: null,
  timers: [],
  isDarkMode: false,
  isHistoryOpen: false,
  isIngredientsOpen: true,
  isLoading: false,
  error: null,
};

export const useRecipeStore = create<RecipeState>((set, get) => ({
  ...initialState,

  setRecipeId: (id) => set({ recipeId: id }),

  setRecipeData: (data) => set((state) => ({ ...state, ...data })),

  setContent: (content) => set({ content }),

  setCurrentUser: (user) => set({ currentUser: user, currentUserId: user.id }),

  setCurrentUserId: (id) => set({ currentUserId: id }),

  addUser: (user) =>
    set((state) => ({
      users: state.users.some((u) => u.id === user.id)
        ? state.users
        : [...state.users, user],
    })),

  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
    })),

  updateUsers: (users) => set({ users }),

  updateCursor: (userId, position) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, cursorPosition: position } : u
      ),
    })),

  setUserEditing: (userId, isEditing) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, isEditing } : u
      ),
    })),

  updateTimer: (timerId, updates) =>
    set((state) => ({
      timers: state.timers.map((t) =>
        t.id === timerId ? { ...t, ...updates } : t
      ),
    })),

  setTimers: (timers) => set({ timers }),

  startTimer: (timerId) =>
    set((state) => ({
      timers: state.timers.map((t) =>
        t.id === timerId ? { ...t, isRunning: true } : t
      ),
    })),

  pauseTimer: (timerId) =>
    set((state) => ({
      timers: state.timers.map((t) =>
        t.id === timerId ? { ...t, isRunning: false } : t
      ),
    })),

  resetTimer: (timerId) =>
    set((state) => ({
      timers: state.timers.map((t) =>
        t.id === timerId
          ? { ...t, isRunning: false, remaining: t.duration }
          : t
      ),
    })),

  setTimerDuration: (timerId, duration) =>
    set((state) => ({
      timers: state.timers.map((t) =>
        t.id === timerId
          ? { ...t, duration, remaining: t.isRunning ? t.remaining : duration }
          : t
      ),
    })),

  addIngredient: (ingredient) =>
    set((state) => ({
      ingredients: [ingredient, ...state.ingredients],
    })),

  removeIngredient: (ingredientId) =>
    set((state) => ({
      ingredients: state.ingredients.filter((i) => i.id !== ingredientId),
    })),

  updateIngredient: (ingredientId, updates) =>
    set((state) => ({
      ingredients: state.ingredients.map((i) =>
        i.id === ingredientId ? { ...i, ...updates } : i
      ),
    })),

  addStep: (step) =>
    set((state) => ({
      steps: [...state.steps, step],
      timers: step.timer ? [...state.timers, step.timer] : state.timers,
    })),

  updateStep: (stepId, content) =>
    set((state) => ({
      steps: state.steps.map((s) =>
        s.id === stepId ? { ...s, content } : s
      ),
    })),

  addHistoryEntry: (entry) =>
    set((state) => {
      const newHistory = [...state.history, entry];
      if (newHistory.length > 30) {
        return { history: newHistory.slice(-30) };
      }
      return { history: newHistory };
    }),

  toggleHistory: () =>
    set((state) => ({ isHistoryOpen: !state.isHistoryOpen })),

  toggleIngredients: () =>
    set((state) => ({ isIngredientsOpen: !state.isIngredientsOpen })),

  toggleDarkMode: () =>
    set((state) => ({ isDarkMode: !state.isDarkMode })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));

export function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const chars = name.trim();
  return chars.charAt(0).toUpperCase();
}
