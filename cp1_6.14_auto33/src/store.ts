import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Storyboard, Scene, PreviewState } from './types';
import { PRESET_COLORS } from './types';
import * as api from './services/api';

interface StoryboardStore {
  storyboards: Storyboard[];
  currentStoryboard: Storyboard | null;
  editingScene: Scene | null;
  preview: PreviewState;
  searchQuery: string;
  sortBy: 'createdAt' | 'updatedAt';
  isLoading: boolean;

  loadStoryboards: () => Promise<void>;
  createStoryboard: (name: string) => Promise<void>;
  loadStoryboard: (id: string) => Promise<void>;
  saveCurrentStoryboard: () => Promise<void>;
  deleteStoryboard: (id: string) => Promise<void>;
  setCurrentStoryboard: (sb: Storyboard | null) => void;

  addScene: () => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  deleteScene: (id: string) => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  setEditingScene: (scene: Scene | null) => void;

  startPreview: () => void;
  pausePreview: () => void;
  resumePreview: () => void;
  setPreviewProgress: (index: number, progress: number) => void;
  finishPreview: () => void;
  jumpToScene: (index: number) => void;
  resetPreview: () => void;

  setSearchQuery: (q: string) => void;
  setSortBy: (sort: 'createdAt' | 'updatedAt') => void;
}

const createEmptyStoryboard = (name: string): Storyboard => ({
  id: uuidv4(),
  name,
  scenes: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useStoryboardStore = create<StoryboardStore>((set, get) => ({
  storyboards: [],
  currentStoryboard: null,
  editingScene: null,
  preview: {
    isPlaying: false,
    isPaused: false,
    currentIndex: 0,
    progress: 0,
    isFinished: false,
  },
  searchQuery: '',
  sortBy: 'updatedAt',
  isLoading: false,

  loadStoryboards: async () => {
    set({ isLoading: true });
    try {
      const list = await api.getAllStoryboards();
      set({ storyboards: list, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createStoryboard: async (name: string) => {
    const sb = createEmptyStoryboard(name);
    await api.createStoryboard(name);
    set((s) => ({ storyboards: [...s.storyboards, sb], currentStoryboard: sb }));
  },

  loadStoryboard: async (id: string) => {
    set({ isLoading: true });
    try {
      const sb = await api.getStoryboard(id);
      set({ currentStoryboard: sb, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  saveCurrentStoryboard: async () => {
    const { currentStoryboard } = get();
    if (!currentStoryboard) return;
    const updated = { ...currentStoryboard, updatedAt: new Date().toISOString() };
    await api.saveStoryboard(updated);
    set((s) => ({
      currentStoryboard: updated,
      storyboards: s.storyboards.map((sb) => (sb.id === updated.id ? updated : sb)),
    }));
  },

  deleteStoryboard: async (id: string) => {
    await api.deleteStoryboard(id);
    set((s) => ({
      storyboards: s.storyboards.filter((sb) => sb.id !== id),
      currentStoryboard: s.currentStoryboard?.id === id ? null : s.currentStoryboard,
    }));
  },

  setCurrentStoryboard: (sb) => set({ currentStoryboard: sb }),

  addScene: () => {
    const { currentStoryboard } = get();
    if (!currentStoryboard) return;
    const newScene: Scene = {
      id: uuidv4(),
      name: '',
      description: '',
      color: PRESET_COLORS[currentStoryboard.scenes.length % PRESET_COLORS.length],
      duration: 2,
      order: currentStoryboard.scenes.length,
    };
    set({
      currentStoryboard: {
        ...currentStoryboard,
        scenes: [...currentStoryboard.scenes, newScene],
        updatedAt: new Date().toISOString(),
      },
      editingScene: newScene,
    });
  },

  updateScene: (id, updates) => {
    const { currentStoryboard } = get();
    if (!currentStoryboard) return;
    set({
      currentStoryboard: {
        ...currentStoryboard,
        scenes: currentStoryboard.scenes.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        updatedAt: new Date().toISOString(),
      },
      editingScene: get().editingScene?.id === id ? { ...get().editingScene!, ...updates } : get().editingScene,
    });
  },

  deleteScene: (id) => {
    const { currentStoryboard } = get();
    if (!currentStoryboard) return;
    const filtered = currentStoryboard.scenes
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i }));
    set({
      currentStoryboard: {
        ...currentStoryboard,
        scenes: filtered,
        updatedAt: new Date().toISOString(),
      },
      editingScene: get().editingScene?.id === id ? null : get().editingScene,
    });
  },

  reorderScenes: (fromIndex, toIndex) => {
    const { currentStoryboard } = get();
    if (!currentStoryboard) return;
    const scenes = [...currentStoryboard.scenes];
    const [moved] = scenes.splice(fromIndex, 1);
    scenes.splice(toIndex, 0, moved);
    const reordered = scenes.map((s, i) => ({ ...s, order: i }));
    set({
      currentStoryboard: { ...currentStoryboard, scenes: reordered, updatedAt: new Date().toISOString() },
    });
  },

  setEditingScene: (scene) => set({ editingScene: scene }),

  startPreview: () => {
    set({
      preview: { isPlaying: true, isPaused: false, currentIndex: 0, progress: 0, isFinished: false },
    });
  },

  pausePreview: () => {
    set((s) => ({ preview: { ...s.preview, isPaused: true } }));
  },

  resumePreview: () => {
    set((s) => ({ preview: { ...s.preview, isPaused: false } }));
  },

  setPreviewProgress: (index, progress) => {
    set((s) => ({ preview: { ...s.preview, currentIndex: index, progress } }));
  },

  finishPreview: () => {
    set((s) => ({ preview: { ...s.preview, isFinished: true, isPlaying: false } }));
  },

  jumpToScene: (index) => {
    set((s) => ({
      preview: { ...s.preview, currentIndex: index, progress: 0, isPaused: false, isFinished: false },
    }));
  },

  resetPreview: () => {
    set({
      preview: { isPlaying: false, isPaused: false, currentIndex: 0, progress: 0, isFinished: false },
    });
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSortBy: (sort) => set({ sortBy: sort }),
}));
