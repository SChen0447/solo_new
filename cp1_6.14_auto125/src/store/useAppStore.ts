import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ScrollData, FusionHistoryEntry, FusionResult } from '@/scroll/types';
import { calculateFusion, generateInitialScrolls } from '@/fusion/FusionEngine';

interface FusionSlot {
  scroll: ScrollData | null;
}

interface AppState {
  scrolls: ScrollData[];
  selectedScrollId: string | null;
  fusionSlots: [FusionSlot, FusionSlot];
  history: FusionHistoryEntry[];
  isFusing: boolean;
  gold: number;
  activeTab: 'collection' | 'history';

  selectScroll: (id: string | null) => void;
  setFusionSlot: (slotIndex: 0 | 1, scroll: ScrollData | null) => void;
  startFusion: () => FusionResult | null;
  obtainScroll: (element: string, rarity: string) => void;
  setActiveTab: (tab: 'collection' | 'history') => void;
  clearHistory: () => void;
}

const STORAGE_KEY = 'magic-scroll-workshop-state';

function loadState(): Partial<AppState> | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return null;
}

function saveState(state: AppState) {
  try {
    const toSave = {
      scrolls: state.scrolls,
      history: state.history,
      gold: state.gold,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore
  }
}

const saved = loadState();

export const useAppStore = create<AppState>((set, get) => ({
  scrolls: saved?.scrolls || generateInitialScrolls(),
  selectedScrollId: null,
  fusionSlots: [{ scroll: null }, { scroll: null }],
  history: saved?.history || [],
  isFusing: false,
  gold: saved?.gold || 1000,
  activeTab: 'collection',

  selectScroll: (id) => set({ selectedScrollId: id }),

  setFusionSlot: (slotIndex, scroll) =>
    set((state) => {
      const newSlots: [FusionSlot, FusionSlot] = [...state.fusionSlots];
      newSlots[slotIndex] = { scroll };
      return { fusionSlots: newSlots };
    }),

  startFusion: () => {
    const state = get();
    if (state.isFusing) return null;
    if (!state.fusionSlots[0].scroll || !state.fusionSlots[1].scroll) return null;

    const m1 = state.fusionSlots[0].scroll;
    const m2 = state.fusionSlots[1].scroll;

    set({ isFusing: true });

    const result = calculateFusion(m1, m2, state.scrolls);

    const status: FusionHistoryEntry['status'] = result.success
      ? result.mutationType !== 'none' ? 'mutation' : 'success'
      : 'failure';

    const entry: FusionHistoryEntry = {
      id: uuidv4(),
      material1: { ...m1 },
      material2: { ...m2 },
      result,
      timestamp: Date.now(),
      status,
    };

    const updatedScrolls = [...state.scrolls];
    if (result.success && result.resultScroll) {
      const existing = updatedScrolls.find(
        s => s.element === result.resultScroll!.element && s.rarity === result.resultScroll!.rarity
      );
      if (existing && !existing.obtained) {
        const idx = updatedScrolls.indexOf(existing);
        updatedScrolls[idx] = { ...existing, obtained: true };
      }
    }

    const goldDelta = result.success ? 0 : -50;

    set((s) => ({
      history: [entry, ...s.history],
      scrolls: updatedScrolls,
      fusionSlots: [{ scroll: null }, { scroll: null }],
      isFusing: false,
      gold: s.gold + goldDelta,
    }));

    saveState(get());
    return result;
  },

  obtainScroll: (element, rarity) =>
    set((state) => {
      const updatedScrolls = state.scrolls.map((s) =>
        s.element === element && s.rarity === rarity && !s.obtained
          ? { ...s, obtained: true }
          : s
      );
      const result = { ...state, scrolls: updatedScrolls };
      saveState(result);
      return result;
    }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  clearHistory: () => {
    set({ history: [] });
    saveState(get());
  },
}));
