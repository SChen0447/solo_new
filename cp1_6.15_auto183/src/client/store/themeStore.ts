import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const savedTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('theme') as Theme) || 'light';

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: savedTheme,
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      if (typeof localStorage !== 'undefined') localStorage.setItem('theme', next);
      return { theme: next };
    }),
  setTheme: (t) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('theme', t);
    set({ theme: t });
  },
}));
