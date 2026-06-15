import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { RuneType, SpellFormula, spellFormulas } from '@/data/runes';

export interface LogEntry {
  id: string;
  runes: RuneType[];
  spellName: string | null;
  spellColor: string | null;
  timestamp: Date;
  success: boolean;
}

interface AppState {
  currentRuneSequence: RuneType[];
  activatedRunes: RuneType[];
  logs: LogEntry[];
  unlockedSpells: Set<string>;
  grimoireOpen: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  currentSpell: SpellFormula | null;
  spellActive: boolean;

  addRuneToSequence: (rune: RuneType) => void;
  clearRuneSequence: () => void;
  activateRune: (rune: RuneType) => void;
  setCurrentSpell: (spell: SpellFormula | null) => void;
  setSpellActive: (active: boolean) => void;

  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;

  unlockSpell: (spellId: string) => void;
  isSpellUnlocked: (spellId: string) => boolean;
  getUnlockedCount: () => number;
  getTotalSpells: () => number;

  toggleGrimoire: () => void;
  setGrimoireOpen: (open: boolean) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}

const MAX_LOGS = 50;

export const useAppStore = create<AppState>((set, get) => ({
  currentRuneSequence: [],
  activatedRunes: [],
  logs: [],
  unlockedSpells: new Set<string>(),
  grimoireOpen: true,
  leftPanelOpen: true,
  rightPanelOpen: true,
  currentSpell: null,
  spellActive: false,

  addRuneToSequence: (rune: RuneType) =>
    set((state) => ({
      currentRuneSequence: [...state.currentRuneSequence, rune],
    })),

  clearRuneSequence: () =>
    set({
      currentRuneSequence: [],
      activatedRunes: [],
    }),

  activateRune: (rune: RuneType) =>
    set((state) => ({
      activatedRunes: [...state.activatedRunes, rune],
    })),

  setCurrentSpell: (spell: SpellFormula | null) =>
    set({ currentSpell: spell }),

  setSpellActive: (active: boolean) =>
    set({ spellActive: active }),

  addLog: (entry) =>
    set((state) => {
      const newEntry: LogEntry = {
        ...entry,
        id: uuidv4(),
        timestamp: new Date(),
      };
      const newLogs = [newEntry, ...state.logs];
      if (newLogs.length > MAX_LOGS) {
        newLogs.length = MAX_LOGS;
      }
      return { logs: newLogs };
    }),

  clearLogs: () => set({ logs: [] }),

  unlockSpell: (spellId: string) =>
    set((state) => {
      const newUnlocked = new Set(state.unlockedSpells);
      newUnlocked.add(spellId);
      return { unlockedSpells: newUnlocked };
    }),

  isSpellUnlocked: (spellId: string) => get().unlockedSpells.has(spellId),

  getUnlockedCount: () => get().unlockedSpells.size,

  getTotalSpells: () => Object.keys(spellFormulas).length,

  toggleGrimoire: () =>
    set((state) => ({ grimoireOpen: !state.grimoireOpen })),

  setGrimoireOpen: (open: boolean) => set({ grimoireOpen: open }),

  toggleLeftPanel: () =>
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
}));
