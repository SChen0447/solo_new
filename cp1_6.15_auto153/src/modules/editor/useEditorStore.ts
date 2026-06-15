import { create } from 'zustand';
import { EditorState, SvgElement, ToolType } from './types';
import {
  createInitialState,
  saveHistory,
  undo as coreUndo,
  redo as coreRedo,
  createElement,
  updateElementDuringCreate,
  addElement as coreAddElement,
  updateElement,
  updateElementAndSave,
  selectElement as coreSelectElement,
  deleteSelected as coreDeleteSelected,
  setTool as coreSetTool,
  setZoom as coreSetZoom,
  setPan as coreSetPan,
  getSelectedElement,
  moveElement as coreMoveElement,
  loadElements as coreLoadElements,
  flashElement as coreFlashElement,
  clearFlash as coreClearFlash,
  snapToGrid,
} from './EditorCore';

interface EditorStore extends EditorState {
  undo: () => void;
  redo: () => void;
  startCreate: (x: number, y: number) => void;
  updateCreate: (x: number, y: number) => void;
  finishCreate: () => void;
  startDrag: (x: number, y: number) => void;
  updateDrag: (deltaX: number, deltaY: number) => void;
  finishDrag: () => void;
  selectElement: (id: string | null) => void;
  updateSelected: (updates: Partial<SvgElement>) => void;
  deleteSelected: () => void;
  setTool: (tool: ToolType) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  getSelectedElement: () => SvgElement | null;
  loadElements: (elements: SvgElement[], centerX: number, centerY: number) => void;
  flashElement: (id: string) => void;
  clearFlash: () => void;
  snapValue: (value: number) => number;
  setSnapToGrid: (enabled: boolean) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...createInitialState(),

  undo: () => {
    set((state) => coreUndo(state));
  },

  redo: () => {
    set((state) => coreRedo(state));
  },

  startCreate: (x: number, y: number) => {
    const state = get();
    const element = createElement(state.currentTool, x, y);
    if (element) {
      set({ isCreating: true, previewElement: element, dragStartX: x, dragStartY: y });
    }
  },

  updateCreate: (x: number, y: number) => {
    const state = get();
    if (!state.isCreating || !state.previewElement) return;
    
    const snappedX = snapToGrid(x, state.gridSize, state.snapDistance, state.snapToGrid);
    const snappedY = snapToGrid(y, state.gridSize, state.snapDistance, state.snapToGrid);
    
    const updated = updateElementDuringCreate(
      state.previewElement,
      state.dragStartX,
      state.dragStartY,
      snappedX,
      snappedY
    );
    set({ previewElement: updated });
  },

  finishCreate: () => {
    const state = get();
    if (!state.isCreating || !state.previewElement) return;
    
    const el = state.previewElement;
    const isValid = el.width > 5 || el.height > 5 || el.type === 'text' || el.type === 'line';
    
    if (isValid) {
      set((s) => coreAddElement(s, s.previewElement!));
    } else {
      set({ previewElement: null, isCreating: false });
    }
  },

  startDrag: (x: number, y: number) => {
    set({ isDragging: true, dragStartX: x, dragStartY: y });
  },

  updateDrag: (deltaX: number, deltaY: number) => {
    const state = get();
    if (!state.isDragging || !state.selectedId) return;
    set((s) => coreMoveElement(s, s.selectedId!, deltaX, deltaY));
  },

  finishDrag: () => {
    const state = get();
    if (state.isDragging && state.selectedId) {
      set((s) => saveHistory(s));
    }
    set({ isDragging: false });
  },

  selectElement: (id: string | null) => {
    set((state) => coreSelectElement(state, id));
  },

  updateSelected: (updates: Partial<SvgElement>) => {
    const state = get();
    if (!state.selectedId) return;
    set((s) => updateElementAndSave(s, s.selectedId!, updates));
  },

  deleteSelected: () => {
    set((state) => coreDeleteSelected(state));
  },

  setTool: (tool: ToolType) => {
    set((state) => coreSetTool(state, tool));
  },

  setZoom: (zoom: number) => {
    set((state) => coreSetZoom(state, zoom));
  },

  setPan: (x: number, y: number) => {
    set((state) => coreSetPan(state, x, y));
  },

  getSelectedElement: () => {
    return getSelectedElement(get());
  },

  loadElements: (elements: SvgElement[], centerX: number, centerY: number) => {
    set((state) => coreLoadElements(state, elements, centerX, centerY));
  },

  flashElement: (id: string) => {
    set((state) => coreFlashElement(state, id));
  },

  clearFlash: () => {
    set((state) => coreClearFlash(state));
  },

  snapValue: (value: number) => {
    const state = get();
    return snapToGrid(value, state.gridSize, state.snapDistance, state.snapToGrid);
  },

  setSnapToGrid: (enabled: boolean) => {
    set({ snapToGrid: enabled });
  },
}));
