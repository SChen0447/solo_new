import { create } from 'zustand';
import { computeDiff } from '../diffEngine/module';
import { autoMerge, resolveConflict, buildMergedDocument } from '../conflictResolver/module';
import type { ParagraphDiff, ConflictResolution, HistoryState } from '../types';

interface AppState {
  textA: string;
  textB: string;
  diffs: ParagraphDiff[];
  resolutions: Record<string, ConflictResolution>;
  isCompared: boolean;
  showPreview: boolean;
  history: HistoryState[];
  historyIndex: number;
  toast: string | null;

  setTextA: (text: string) => void;
  setTextB: (text: string) => void;
  runComparison: () => void;
  selectVersion: (conflictId: string, version: 'A' | 'B') => void;
  editManual: (conflictId: string, content: string) => void;
  togglePreview: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getMergedDocument: () => string;
  setToast: (message: string | null) => void;
}

function pushHistory(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  description: string
) {
  const state = get();
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push({
    resolutions: cloneResolutions(state.resolutions),
    description,
  });
  set({
    history: newHistory,
    historyIndex: newHistory.length - 1,
  });
}

function cloneResolutions(
  resolutions: Record<string, ConflictResolution>
): Record<string, ConflictResolution> {
  const cloned: Record<string, ConflictResolution> = {};
  for (const key in resolutions) {
    cloned[key] = { ...resolutions[key] };
  }
  return cloned;
}

export const useAppStore = create<AppState>((set, get) => ({
  textA: '',
  textB: '',
  diffs: [],
  resolutions: {},
  isCompared: false,
  showPreview: false,
  history: [],
  historyIndex: -1,
  toast: null,

  setTextA: (text) => set({ textA: text }),
  setTextB: (text) => set({ textB: text }),

  runComparison: () => {
    const { textA, textB } = get();
    const diffs = computeDiff(textA, textB);
    const resolutions = autoMerge(diffs);
    const initialHistory: HistoryState = {
      resolutions: cloneResolutions(resolutions),
      description: '初始自动合并',
    };
    set({
      diffs,
      resolutions,
      isCompared: true,
      showPreview: false,
      history: [initialHistory],
      historyIndex: 0,
    });
  },

  selectVersion: (conflictId, version) => {
    const state = get();
    const diff = state.diffs.find((d) => d.id === conflictId);
    if (!diff) return;

    const resolution = resolveConflict(diff, version);
    const newResolutions = { ...state.resolutions, [conflictId]: resolution };

    set({ resolutions: newResolutions });
    pushHistory(get, set, `选择${version === 'A' ? 'A' : 'B'}版本`);
  },

  editManual: (conflictId, content) => {
    const state = get();
    const diff = state.diffs.find((d) => d.id === conflictId);
    if (!diff) return;

    const resolution = resolveConflict(diff, 'manual', content);
    const newResolutions = { ...state.resolutions, [conflictId]: resolution };

    set({ resolutions: newResolutions });
    pushHistory(get, set, '手动编辑');
  },

  togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;

    const newIndex = state.historyIndex - 1;
    const historyState = state.history[newIndex];
    set({
      resolutions: cloneResolutions(historyState.resolutions),
      historyIndex: newIndex,
    });
    get().setToast(`撤销：${state.history[state.historyIndex].description}`);
    setTimeout(() => get().setToast(null), 1500);
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    const newIndex = state.historyIndex + 1;
    const historyState = state.history[newIndex];
    set({
      resolutions: cloneResolutions(historyState.resolutions),
      historyIndex: newIndex,
    });
    get().setToast(`重做：${historyState.description}`);
    setTimeout(() => get().setToast(null), 1500);
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  getMergedDocument: () => {
    const { diffs, resolutions } = get();
    return buildMergedDocument(diffs, resolutions);
  },

  setToast: (message) => set({ toast: message }),
}));
