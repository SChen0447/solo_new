import { create } from 'zustand';

export interface GameState {
  collectedKeys: number;
  totalKeys: number;
  timeRemaining: number;
  isPaused: boolean;
  isGameOver: boolean;
  isWin: boolean;
  isHurt: boolean;
  showMobileControls: boolean;
}

export interface GameActions {
  setCollectedKeys: (count: number) => void;
  incrementCollectedKeys: () => void;
  setTotalKeys: (count: number) => void;
  setTimeRemaining: (time: number) => void;
  decrementTime: (dt: number) => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  setGameOver: (over: boolean) => void;
  setWin: (win: boolean) => void;
  setHurt: (hurt: boolean) => void;
  setShowMobileControls: (show: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  collectedKeys: 0,
  totalKeys: 3,
  timeRemaining: 90,
  isPaused: false,
  isGameOver: false,
  isWin: false,
  isHurt: false,
  showMobileControls: typeof window !== 'undefined'
    ? 'ontouchstart' in window || navigator.maxTouchPoints > 0
    : false,

  setCollectedKeys: (count: number) => set({ collectedKeys: count }),
  incrementCollectedKeys: () => set({ collectedKeys: get().collectedKeys + 1 }),
  setTotalKeys: (count: number) => set({ totalKeys: count }),
  setTimeRemaining: (time: number) => set({ timeRemaining: time }),
  decrementTime: (dt: number) => set({ timeRemaining: Math.max(0, get().timeRemaining - dt) }),
  setPaused: (paused: boolean) => set({ isPaused: paused }),
  togglePause: () => set({ isPaused: !get().isPaused }),
  setGameOver: (over: boolean) => set({ isGameOver: over }),
  setWin: (win: boolean) => set({ isWin: win }),
  setHurt: (hurt: boolean) => set({ isHurt: hurt }),
  setShowMobileControls: (show: boolean) => set({ showMobileControls: show }),

  reset: () => set({
    collectedKeys: 0,
    timeRemaining: 90,
    isPaused: false,
    isGameOver: false,
    isWin: false,
    isHurt: false
  })
}));
