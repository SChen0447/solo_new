import { create } from 'zustand';
import type { RoomElement, ElementType } from '../../types';

interface EditorState {
  cols: number;
  rows: number;
  elements: RoomElement[];
  selectedElementId: string | null;
  currentTool: ElementType | 'select';
  cellSize: number;

  setCols: (cols: number) => void;
  setRows: (rows: number) => void;
  setCellSize: (size: number) => void;
  addElement: (type: ElementType, x: number, y: number) => void;
  moveElement: (id: string, x: number, y: number) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  setCurrentTool: (tool: ElementType | 'select') => void;
  resizeRoom: (cols: number, rows: number) => void;
  getElementAt: (x: number, y: number) => RoomElement | undefined;
  getEntrance: () => RoomElement | undefined;
  getExit: () => RoomElement | undefined;
}

let elementIdCounter = 0;
const generateId = () => `element_${++elementIdCounter}`;

export const useEditorState = create<EditorState>((set, get) => ({
  cols: 12,
  rows: 8,
  elements: [],
  selectedElementId: null,
  currentTool: 'select',
  cellSize: 50,

  setCols: (cols) => set({ cols }),
  setRows: (rows) => set({ rows }),
  setCellSize: (cellSize) => set({ cellSize }),

  addElement: (type, x, y) => {
    const { elements } = get();
    if (type === 'entrance') {
      const existing = elements.find((e) => e.type === 'entrance');
      if (existing) {
        set({
          elements: elements.map((e) =>
            e.id === existing.id ? { ...e, x, y } : e
          ),
        });
        return;
      }
    }
    if (type === 'exit') {
      const existing = elements.find((e) => e.type === 'exit');
      if (existing) {
        set({
          elements: elements.map((e) =>
            e.id === existing.id ? { ...e, x, y } : e
          ),
        });
        return;
      }
    }
    const newElement: RoomElement = {
      id: generateId(),
      type,
      x,
      y,
    };
    set({ elements: [...elements, newElement] });
  },

  moveElement: (id, x, y) => {
    const { elements, cols, rows } = get();
    const clampedX = Math.max(0, Math.min(cols - 1, Math.round(x)));
    const clampedY = Math.max(0, Math.min(rows - 1, Math.round(y)));
    set({
      elements: elements.map((e) =>
        e.id === id ? { ...e, x: clampedX, y: clampedY } : e
      ),
    });
  },

  deleteElement: (id) => {
    const { elements } = get();
    set({
      elements: elements.filter((e) => e.id !== id),
      selectedElementId: get().selectedElementId === id ? null : get().selectedElementId,
    });
  },

  selectElement: (id) => set({ selectedElementId: id }),

  setCurrentTool: (tool) => set({ currentTool: tool }),

  resizeRoom: (newCols, newRows) => {
    const { cols, rows, elements } = get();
    const scaleX = newCols / cols;
    const scaleY = newRows / rows;
    const resizedElements = elements.map((e) => ({
      ...e,
      x: Math.floor(e.x * scaleX),
      y: Math.floor(e.y * scaleY),
    }));
    set({
      cols: newCols,
      rows: newRows,
      elements: resizedElements,
    });
  },

  getElementAt: (x, y) => {
    const { elements } = get();
    return elements.find((e) => e.x === x && e.y === y);
  },

  getEntrance: () => {
    const { elements } = get();
    return elements.find((e) => e.type === 'entrance');
  },

  getExit: () => {
    const { elements } = get();
    return elements.find((e) => e.type === 'exit');
  },
}));
