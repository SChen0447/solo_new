import { create } from 'zustand';
import { Brick, GameMode, BrickShape, BrickMaterial, Position } from '../types';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  brickId: string;
}

interface GameState {
  bricks: Brick[];
  selectedBrickId: string | null;
  stability: number;
  gameMode: GameMode;
  maxBricks: number;
  contextMenu: ContextMenuState;
  addBrick: (brick: Brick) => boolean;
  removeBrick: (id: string) => void;
  selectBrick: (id: string | null) => void;
  updateBrick: (id: string, updates: Partial<Brick>) => void;
  setStability: (stability: number) => void;
  toggleDayNight: () => void;
  clearAllBricks: () => void;
  updateBrickPosition: (id: string, position: Position) => void;
  checkAndUpdateStability: () => void;
  setContextMenu: (menu: ContextMenuState) => void;
  hideContextMenu: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  bricks: [],
  selectedBrickId: null,
  stability: 100,
  gameMode: 'day',
  maxBricks: 50,
  contextMenu: { visible: false, x: 0, y: 0, brickId: '' },

  addBrick: (brick) => {
    const state = get();
    if (state.bricks.length >= state.maxBricks) {
      return false;
    }
    set((state) => ({
      bricks: [...state.bricks, brick],
    }));
    get().checkAndUpdateStability();
    return true;
  },

  removeBrick: (id) => {
    set((state) => ({
      bricks: state.bricks.filter((b) => b.id !== id),
      selectedBrickId: state.selectedBrickId === id ? null : state.selectedBrickId,
    }));
    get().checkAndUpdateStability();
  },

  selectBrick: (id) => {
    set((state) => ({
      selectedBrickId: id,
      bricks: state.bricks.map((b) => ({
        ...b,
        isSelected: b.id === id,
      })),
    }));
  },

  updateBrick: (id, updates) => {
    set((state) => ({
      bricks: state.bricks.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }));
  },

  setStability: (stability) => {
    set({ stability });
  },

  toggleDayNight: () => {
    set((state) => ({
      gameMode: state.gameMode === 'day' ? 'night' : 'day',
    }));
  },

  clearAllBricks: () => {
    set({ bricks: [], selectedBrickId: null, stability: 100 });
  },

  updateBrickPosition: (id, position) => {
    set((state) => ({
      bricks: state.bricks.map((b) =>
        b.id === id ? { ...b, position } : b
      ),
    }));
    get().checkAndUpdateStability();
  },

  checkAndUpdateStability: () => {
    const { bricks } = get();
    if (bricks.length === 0) {
      set({ stability: 100 });
      return;
    }

    const stableCount = bricks.filter((b) => b.isStable).length;
    const stability = Math.round((stableCount / bricks.length) * 100);
    set({ stability });
  },

  setContextMenu: (menu) => {
    set({ contextMenu: menu });
  },

  hideContextMenu: () => {
    set({ contextMenu: { visible: false, x: 0, y: 0, brickId: '' } });
  },
}));
