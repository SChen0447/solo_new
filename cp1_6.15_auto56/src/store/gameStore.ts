import { create } from 'zustand';

export type GameStatus = 'start' | 'playing' | 'victory' | 'gameover';
export type BulletPattern = 'fan' | 'spiral' | 'homing' | 'random';

export const PATTERN_NAMES: Record<BulletPattern, string> = {
  fan: '扇形扩散',
  spiral: '螺旋旋转',
  homing: '追踪导弹',
  random: '随机弹幕'
};

export const PATTERN_COLORS: Record<BulletPattern, string> = {
  fan: '#e74c3c',
  spiral: '#9b59b6',
  homing: '#e67e22',
  random: '#00bcd4'
};

interface GameState {
  status: GameStatus;
  lives: number;
  score: number;
  bossHp: number;
  bossMaxHp: number;
  currentPattern: BulletPattern;
  patternDisplayOpacity: number;
  flashRed: number;
  setStatus: (status: GameStatus) => void;
  setLives: (lives: number) => void;
  setScore: (score: number) => void;
  setBossHp: (hp: number) => void;
  setCurrentPattern: (pattern: BulletPattern) => void;
  setPatternDisplayOpacity: (opacity: number) => void;
  setFlashRed: (value: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  status: 'start',
  lives: 3,
  score: 0,
  bossHp: 100,
  bossMaxHp: 100,
  currentPattern: 'fan',
  patternDisplayOpacity: 0,
  flashRed: 0,
  setStatus: (status) => set({ status }),
  setLives: (lives) => set({ lives }),
  setScore: (score) => set({ score }),
  setBossHp: (bossHp) => set({ bossHp }),
  setCurrentPattern: (currentPattern) => set({ currentPattern }),
  setPatternDisplayOpacity: (patternDisplayOpacity) => set({ patternDisplayOpacity }),
  setFlashRed: (flashRed) => set({ flashRed }),
  reset: () =>
    set({
      status: 'playing',
      lives: 3,
      score: 0,
      bossHp: 100,
      bossMaxHp: 100,
      currentPattern: 'fan',
      patternDisplayOpacity: 0,
      flashRed: 0
    })
}));
