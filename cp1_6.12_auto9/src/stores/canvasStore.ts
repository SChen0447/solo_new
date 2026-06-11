import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Block,
  BlockType,
  CanvasStateData,
  StickyNoteBlock,
  ImageBlockData,
  Viewport,
} from '../utils/constants';
import {
  DEFAULT_STICKY_SIZE,
  DEFAULT_IMAGE_SIZE,
  getRandomStickyColor,
  MIN_SCALE,
  MAX_SCALE,
} from '../utils/constants';

const STORAGE_KEY = 'inspiration-canvas-v1';
const MAX_HISTORY = 50;

function loadFromStorage(): Partial<CanvasStateData> | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // ignore
  }
  return null;
}

function saveToStorage(state: CanvasStateData) {
  try {
    const { history, ...persistData } = state;
    void history;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistData));
  } catch {
    // ignore
  }
}

const saved = loadFromStorage();

interface CanvasStore extends CanvasStateData {
  createStickyNote: (x: number, y: number, content?: string) => string;
  createImageBlock: (
    x: number,
    y: number,
    src: string,
    originalWidth: number,
    originalHeight: number,
    width?: number,
    height?: number
  ) => string;
  deleteBlock: (id: string) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  updateBlockPosition: (id: string, x: number, y: number) => void;
  updateBlockRotation: (id: string, rotation: number) => void;
  updateBlockSize: (id: string, width: number, height: number) => void;
  bringToFront: (id: string) => void;
  setSelectedBlock: (id: string | null) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  zoomAt: (clientX: number, clientY: number, deltaScale: number) => void;
  undo: () => void;
  redo: () => void;
  setSearchQuery: (query: string) => void;
  setFilterType: (type: BlockType | 'all') => void;
  exportJSON: () => string;
  clearAll: () => void;
  getFilteredBlocks: () => Block[];
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  blocks: saved?.blocks ?? [],
  viewport: saved?.viewport ?? { offsetX: 0, offsetY: 0, scale: 1 },
  history: { past: [], future: [] },
  selectedBlockId: null,
  searchQuery: '',
  filterType: 'all',

  _commitHistory() {
    const state = get();
    const past = [...state.history.past, state.blocks];
    if (past.length > MAX_HISTORY) past.shift();
    set({ history: { past, future: [] } });
  },

  createStickyNote: (x: number, y: number, content?: string) => {
    get()._commitHistory();
    const id = uuidv4();
    const maxZ = get().blocks.reduce((m, b) => Math.max(m, b.zIndex), 0);
    const block: StickyNoteBlock = {
      id,
      type: 'sticky',
      x,
      y,
      width: DEFAULT_STICKY_SIZE.width,
      height: DEFAULT_STICKY_SIZE.height,
      rotation: 0,
      zIndex: maxZ + 1,
      content: content ?? '',
      backgroundColor: getRandomStickyColor(),
    };
    set((s) => {
      const newState = { blocks: [...s.blocks, block], selectedBlockId: id };
      saveToStorage({ ...s, ...newState } as CanvasStateData);
      return newState;
    });
    return id;
  },

  createImageBlock: (x, y, src, originalWidth, originalHeight, width, height) => {
    get()._commitHistory();
    const id = uuidv4();
    const maxZ = get().blocks.reduce((m, b) => Math.max(m, b.zIndex), 0);
    let w = width ?? DEFAULT_IMAGE_SIZE.width;
    let h = height ?? DEFAULT_IMAGE_SIZE.height;
    const ratio = originalWidth / originalHeight;
    if (ratio > w / h) {
      h = Math.round(w / ratio);
    } else {
      w = Math.round(h * ratio);
    }
    const block: ImageBlockData = {
      id,
      type: 'image',
      x,
      y,
      width: w,
      height: h,
      rotation: 0,
      zIndex: maxZ + 1,
      src,
      originalWidth,
      originalHeight,
    };
    set((s) => {
      const newState = { blocks: [...s.blocks, block], selectedBlockId: id };
      saveToStorage({ ...s, ...newState } as CanvasStateData);
      return newState;
    });
    return id;
  },

  deleteBlock: (id) => {
    get()._commitHistory();
    set((s) => {
      const newState = {
        blocks: s.blocks.filter((b) => b.id !== id),
        selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
      };
      saveToStorage({ ...s, ...newState } as CanvasStateData);
      return newState;
    });
  },

  updateBlock: (id, updates) => {
    set((s) => {
      const newBlocks = s.blocks.map((b) =>
        b.id === id ? ({ ...b, ...updates } as Block) : b
      );
      const newState = { blocks: newBlocks };
      saveToStorage({ ...s, ...newState } as CanvasStateData);
      return newState;
    });
  },

  updateBlockPosition: (id, x, y) => {
    set((s) => {
      const newBlocks = s.blocks.map((b) =>
        b.id === id ? { ...b, x, y } : b
      );
      return { blocks: newBlocks };
    });
  },

  updateBlockRotation: (id, rotation) => {
    set((s) => {
      const newBlocks = s.blocks.map((b) =>
        b.id === id ? { ...b, rotation } : b
      );
      return { blocks: newBlocks };
    });
  },

  updateBlockSize: (id, width, height) => {
    set((s) => {
      const newBlocks = s.blocks.map((b) =>
        b.id === id ? { ...b, width, height } : b
      );
      return { blocks: newBlocks };
    });
  },

  bringToFront: (id) => {
    const state = get();
    const maxZ = state.blocks.reduce((m, b) => Math.max(m, b.zIndex), 0);
    const current = state.blocks.find((b) => b.id === id);
    if (!current || current.zIndex === maxZ) return;
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === id ? { ...b, zIndex: maxZ + 1 } : b
      ),
    }));
  },

  setSelectedBlock: (id) => {
    set({ selectedBlockId: id });
  },

  setViewport: (viewport) => {
    set((s) => {
      const newState = {
        viewport: { ...s.viewport, ...viewport },
      };
      saveToStorage({ ...s, ...newState } as CanvasStateData);
      return newState;
    });
  },

  zoomAt: (clientX, clientY, deltaScale) => {
    const state = get();
    const { viewport } = state;
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, viewport.scale * deltaScale)
    );
    if (newScale === viewport.scale) return;
    const actualDelta = newScale / viewport.scale;
    const newOffsetX = clientX - (clientX - viewport.offsetX) * actualDelta;
    const newOffsetY = clientY - (clientY - viewport.offsetY) * actualDelta;
    set((s) => {
      const newState = {
        viewport: {
          offsetX: newOffsetX,
          offsetY: newOffsetY,
          scale: newScale,
        },
      };
      saveToStorage({ ...s, ...newState } as CanvasStateData);
      return newState;
    });
  },

  undo: () => {
    const state = get();
    if (state.history.past.length === 0) return;
    const past = [...state.history.past];
    const previous = past.pop()!;
    const future = [state.blocks, ...state.history.future];
    set({ blocks: previous, history: { past, future } });
    saveToStorage({ ...get() } as CanvasStateData);
  },

  redo: () => {
    const state = get();
    if (state.history.future.length === 0) return;
    const future = [...state.history.future];
    const next = future.shift()!;
    const past = [...state.history.past, state.blocks];
    set({ blocks: next, history: { past, future } });
    saveToStorage({ ...get() } as CanvasStateData);
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setFilterType: (type) => set({ filterType: type }),

  exportJSON: () => {
    const state = get();
    const { history, ...data } = state;
    void history;
    return JSON.stringify(data, null, 2);
  },

  clearAll: () => {
    get()._commitHistory();
    set({ blocks: [], selectedBlockId: null });
    saveToStorage(get() as CanvasStateData);
  },

  getFilteredBlocks: () => {
    const state = get();
    let result = state.blocks;
    if (state.filterType !== 'all') {
      result = result.filter((b) => b.type === state.filterType);
    }
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      result = result.filter((b) => {
        if (b.type === 'sticky') {
          return b.content.toLowerCase().includes(query);
        }
        return b.id.toLowerCase().includes(query);
      });
    }
    return result;
  },
}));
