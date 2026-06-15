import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type ToolType = 'brush' | 'rectangle' | 'circle' | 'note' | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  createdAt: number;
}

export interface BrushElement extends BaseElement {
  type: 'brush';
  points: Point[];
  color: string;
  size: number;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
  strokeColor: string;
  strokeWidth: number;
}

export interface NoteElement extends BaseElement {
  type: 'note';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  bgColor: string;
}

export type CanvasElement =
  | BrushElement
  | RectangleElement
  | CircleElement
  | NoteElement;

interface CanvasState {
  elements: CanvasElement[];
  past: CanvasElement[][];
  future: CanvasElement[][];
  currentTool: ToolType;
  brushSize: number;
  brushColor: string;
  zoom: number;
  panOffset: Point;
  targetZoom: number;
  targetPanOffset: Point;
  userId: string;
  userName: string;
  userColor: string;
  selectedNoteId: string | null;
  tempNoteInput: { x: number; y: number } | null;

  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  clearElements: () => void;
  syncElements: (elements: CanvasElement[]) => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: ToolType) => void;
  setBrushSize: (size: number) => void;
  setBrushColor: (color: string) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point) => void;
  animateStep: () => boolean;
  setUser: (name: string) => void;
  setSelectedNoteId: (id: string | null) => void;
  setTempNoteInput: (pos: { x: number; y: number } | null) => void;
  commitNote: (x: number, y: number, text: string) => void;
}

const USER_COLORS = [
  '#4fc3f7',
  '#ef5350',
  '#66bb6a',
  '#ffa726',
  '#ab47bc',
  '#26c6da',
  '#ec407a',
  '#8d6e63',
];

function generateUserColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  past: [],
  future: [],
  currentTool: 'brush',
  brushSize: 2,
  brushColor: '#4fc3f7',
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  targetZoom: 1,
  targetPanOffset: { x: 0, y: 0 },
  userId: uuidv4(),
  userName: '',
  userColor: generateUserColor(),
  selectedNoteId: null,
  tempNoteInput: null,

  addElement: (element) =>
    set((state) => {
      const newElements = [...state.elements, element];
      return {
        elements: newElements,
        past: [...state.past, state.elements],
        future: [],
      };
    }),

  updateElement: (id, updates) =>
    set((state) => {
      const prevElements = state.elements;
      const newElements = prevElements.map((el) =>
        el.id === id ? ({ ...el, ...updates } as CanvasElement) : el
      );
      return {
        elements: newElements,
        past: [...state.past, prevElements],
        future: [],
      };
    }),

  deleteElement: (id) =>
    set((state) => {
      const prevElements = state.elements;
      const newElements = prevElements.filter((el) => el.id !== id);
      return {
        elements: newElements,
        past: [...state.past, prevElements],
        future: [],
        selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
      };
    }),

  clearElements: () =>
    set((state) => ({
      elements: [],
      past: [...state.past, state.elements],
      future: [],
    })),

  syncElements: (elements) =>
    set(() => ({
      elements,
    })),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        elements: previous,
        past: newPast,
        future: [state.elements, ...state.future],
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        elements: next,
        past: [...state.past, state.elements],
        future: newFuture,
      };
    }),

  setTool: (tool) => set({ currentTool: tool, selectedNoteId: null, tempNoteInput: null }),
  setBrushSize: (size) => set({ brushSize: size }),
  setBrushColor: (color) => set({ brushColor: color }),

  setZoom: (zoom) =>
    set({
      targetZoom: Math.max(0.5, Math.min(2, zoom)),
    }),

  setPanOffset: (offset) =>
    set({
      targetPanOffset: offset,
    }),

  animateStep: () => {
    const state = get();
    const EASING = 0.15;
    let changed = false;

    let newZoom = state.zoom;
    let newPanX = state.panOffset.x;
    let newPanY = state.panOffset.y;

    if (Math.abs(state.zoom - state.targetZoom) > 0.001) {
      newZoom = state.zoom + (state.targetZoom - state.zoom) * EASING;
      changed = true;
    }

    if (Math.abs(state.panOffset.x - state.targetPanOffset.x) > 0.5) {
      newPanX = state.panOffset.x + (state.targetPanOffset.x - state.panOffset.x) * EASING;
      changed = true;
    }

    if (Math.abs(state.panOffset.y - state.targetPanOffset.y) > 0.5) {
      newPanY = state.panOffset.y + (state.targetPanOffset.y - state.panOffset.y) * EASING;
      changed = true;
    }

    if (changed) {
      set({
        zoom: newZoom,
        panOffset: { x: newPanX, y: newPanY },
      });
    }

    return changed;
  },

  setUser: (name) =>
    set({
      userName: name,
      userColor: generateUserColor(),
    }),

  setSelectedNoteId: (id) => set({ selectedNoteId: id }),

  setTempNoteInput: (pos) => set({ tempNoteInput: pos }),

  commitNote: (x, y, text) => {
    if (!text.trim()) return;
    const state = get();
    const note: NoteElement = {
      id: uuidv4(),
      type: 'note',
      userId: state.userId,
      userName: state.userName,
      userColor: state.userColor,
      createdAt: Date.now(),
      x,
      y,
      width: 180,
      height: 100,
      text: text.trim(),
      bgColor: '#fff9c4',
    };
    state.addElement(note);
  },
}));
