import { create } from 'zustand';
import type { StatusChange } from './StoryEngine';

export interface InventoryItem {
  name: string;
  id: string;
}

interface GameStateStore {
  hp: number;
  mp: number;
  inventory: InventoryItem[];
  currentNodeId: string;
  unlockedEndings: string[];
  newlyAddedItem: string | null;
  setHp: (hp: number) => void;
  setMp: (mp: number) => void;
  addItem: (itemName: string) => void;
  removeItem: (itemName: string) => void;
  setCurrentNodeId: (nodeId: string) => void;
  unlockEnding: (endingType: string) => void;
  applyStatusChanges: (changes: StatusChange[]) => void;
  resetGame: () => void;
  clearNewlyAddedItem: () => void;
}

const INITIAL_HP = 80;
const INITIAL_MP = 30;
const MAX_HP = 100;
const MAX_MP = 100;

let itemIdCounter = 0;

export const useGameStore = create<GameStateStore>((set, get) => ({
  hp: INITIAL_HP,
  mp: INITIAL_MP,
  inventory: [],
  currentNodeId: 'start',
  unlockedEndings: [],
  newlyAddedItem: null,

  setHp: (hp: number) => {
    set({ hp: Math.max(0, Math.min(MAX_HP, hp)) });
  },

  setMp: (mp: number) => {
    set({ mp: Math.max(0, Math.min(MAX_MP, mp)) });
  },

  addItem: (itemName: string) => {
    const { inventory } = get();
    if (!inventory.find(item => item.name === itemName)) {
      const newItem: InventoryItem = {
        name: itemName,
        id: `item_${itemIdCounter++}`
      };
      set({ inventory: [...inventory, newItem], newlyAddedItem: newItem.id });
    }
  },

  removeItem: (itemName: string) => {
    const { inventory } = get();
    set({ inventory: inventory.filter(item => item.name !== itemName) });
  },

  setCurrentNodeId: (nodeId: string) => {
    set({ currentNodeId: nodeId });
  },

  unlockEnding: (endingType: string) => {
    const { unlockedEndings } = get();
    if (!unlockedEndings.includes(endingType)) {
      set({ unlockedEndings: [...unlockedEndings, endingType] });
    }
  },

  applyStatusChanges: (changes: StatusChange[]) => {
    changes.forEach(change => {
      switch (change.type) {
        case 'hp':
          const currentHp = get().hp;
          set({ hp: Math.max(0, Math.min(MAX_HP, currentHp + (change.value as number))) });
          break;
        case 'mp':
          const currentMp = get().mp;
          set({ mp: Math.max(0, Math.min(MAX_MP, currentMp + (change.value as number))) });
          break;
        case 'addItem':
          get().addItem(change.value as string);
          break;
        case 'removeItem':
          get().removeItem(change.value as string);
          break;
      }
    });
  },

  resetGame: () => {
    set({
      hp: INITIAL_HP,
      mp: INITIAL_MP,
      inventory: [],
      currentNodeId: 'start',
      newlyAddedItem: null
    });
  },

  clearNewlyAddedItem: () => {
    set({ newlyAddedItem: null });
  }
}));

export { MAX_HP, MAX_MP, INITIAL_HP, INITIAL_MP };
