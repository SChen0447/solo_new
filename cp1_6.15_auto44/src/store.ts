import { create } from 'zustand';

export interface ImageFeature {
  id: string;
  filename: string;
  url: string;
  width: number;
  height: number;
  visualCenter: { x: number; y: number };
  subjectRatio: number;
}

export interface CellLayout {
  imageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutCandidate {
  id: string;
  strategy: 'waterfall' | 'grid';
  cells: CellLayout[];
  score: number;
}

export interface Annotation {
  id: string;
  cellIndex: number;
  content: string;
  author: string;
  color: string;
  position: { x: number; y: number };
  arrowTarget?: { x: number; y: number };
  width: number;
  height: number;
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
}

interface AppState {
  images: ImageFeature[];
  cells: CellLayout[];
  selectedIndex: number | null;
  layoutCandidates: LayoutCandidate[];
  annotations: Annotation[];
  collaborators: Collaborator[];
  inviteCode: string;
  history: CellLayout[][];
  historyIndex: number;

  addImages: (images: ImageFeature[]) => void;
  setCells: (cells: CellLayout[]) => void;
  selectCell: (index: number | null) => void;
  updateCell: (index: number, patch: Partial<CellLayout>) => void;
  setLayoutCandidates: (candidates: LayoutCandidate[]) => void;
  applyLayout: (candidate: LayoutCandidate) => void;
  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  setInviteCode: (code: string) => void;
  addCollaborator: (collab: Collaborator) => void;
  removeCollaborator: (id: string) => void;
  updateCursor: (id: string, cursor: { x: number; y: number }) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  images: [],
  cells: [],
  selectedIndex: null,
  layoutCandidates: [],
  annotations: [],
  collaborators: [],
  inviteCode: '',
  history: [],
  historyIndex: -1,

  addImages: (images) =>
    set((state) => {
      const allImages = [...state.images, ...images].slice(0, 12);
      const cols = Math.min(allImages.length, 4);
      const rows = Math.ceil(allImages.length / cols);
      const cellW = 240;
      const cellH = 180;
      const gap = 12;
      const cells: CellLayout[] = allImages.map((img, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
          imageId: img.id,
          x: col * (cellW + gap) + 24,
          y: row * (cellH + gap) + 24,
          width: cellW,
          height: cellH,
        };
      });
      return { images: allImages, cells };
    }),

  setCells: (cells) => set({ cells }),

  selectCell: (index) => set({ selectedIndex: index }),

  updateCell: (index, patch) =>
    set((state) => ({
      cells: state.cells.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    })),

  setLayoutCandidates: (candidates) => set({ layoutCandidates: candidates }),

  applyLayout: (candidate) =>
    set((state) => {
      const newCells = candidate.cells;
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(state.cells);
      return {
        cells: newCells,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        layoutCandidates: [],
      };
    }),

  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation] })),

  removeAnnotation: (id) =>
    set((state) => ({ annotations: state.annotations.filter((a) => a.id !== id) })),

  updateAnnotation: (id, patch) =>
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  setInviteCode: (code) => set({ inviteCode: code }),

  addCollaborator: (collab) =>
    set((state) => ({ collaborators: [...state.collaborators, collab] })),

  removeCollaborator: (id) =>
    set((state) => ({ collaborators: state.collaborators.filter((c) => c.id !== id) })),

  updateCursor: (id, cursor) =>
    set((state) => ({
      collaborators: state.collaborators.map((c) => (c.id === id ? { ...c, cursor } : c)),
    })),

  pushHistory: () =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push([...state.cells]);
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex < 0) return state;
      const prevCells = state.history[state.historyIndex];
      const newHistory = state.history.slice(0, state.historyIndex);
      return {
        cells: prevCells,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }),

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;
    const nextIndex = state.historyIndex + 1;
    set({
      cells: state.history[nextIndex],
      historyIndex: nextIndex,
    });
  },
}));
