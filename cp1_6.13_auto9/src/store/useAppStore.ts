import { create } from 'zustand';
import type { Stroke, Note } from '@/types';
import { MAX_UNDO_STEPS } from '@/types';

interface AppStore {
  strokes: Stroke[];
  undoStack: Stroke[][];
  redoStack: Stroke[][];
  currentColor: string;
  currentWidth: number;
  isEraser: boolean;
  eraserSize: number;
  notes: Note[];
  activeNoteId: string | null;
  isDrawing: boolean;

  addStroke: (stroke: Stroke) => void;
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  setColor: (color: string) => void;
  setWidth: (width: number) => void;
  setEraser: (isEraser: boolean) => void;
  setEraserSize: (size: number) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  saveNote: (name: string, thumbnail: string) => void;
  loadNote: (id: string) => void;
  deleteNote: (id: string) => void;
}

function loadNotesFromStorage(): Note[] {
  try {
    const data = localStorage.getItem('smart-handwriting-notes');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveNotesToStorage(notes: Note[]) {
  try {
    localStorage.setItem('smart-handwriting-notes', JSON.stringify(notes));
  } catch {
    // storage full or unavailable
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  strokes: [],
  undoStack: [],
  redoStack: [],
  currentColor: '#333333',
  currentWidth: 3,
  isEraser: false,
  eraserSize: 40,
  notes: loadNotesFromStorage(),
  activeNoteId: null,
  isDrawing: false,

  addStroke: (stroke: Stroke) => {
    const { strokes, undoStack } = get();
    const newUndoStack = [...undoStack, strokes].slice(-MAX_UNDO_STEPS);
    set({
      strokes: [...strokes, stroke],
      undoStack: newUndoStack,
      redoStack: [],
    });
  },

  undo: () => {
    const { strokes, undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const previousStrokes = undoStack[undoStack.length - 1];
    set({
      strokes: previousStrokes,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, strokes],
    });
  },

  redo: () => {
    const { strokes, undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const nextStrokes = redoStack[redoStack.length - 1];
    set({
      strokes: nextStrokes,
      undoStack: [...undoStack, strokes].slice(-MAX_UNDO_STEPS),
      redoStack: redoStack.slice(0, -1),
    });
  },

  clearCanvas: () => {
    const { strokes, undoStack } = get();
    if (strokes.length === 0) return;
    set({
      strokes: [],
      undoStack: [...undoStack, strokes].slice(-MAX_UNDO_STEPS),
      redoStack: [],
    });
  },

  setColor: (color: string) => set({ currentColor: color, isEraser: false }),
  setWidth: (width: number) => set({ currentWidth: width }),
  setEraser: (isEraser: boolean) => set({ isEraser }),
  setEraserSize: (size: number) => set({ eraserSize: size }),
  setIsDrawing: (isDrawing: boolean) => set({ isDrawing }),

  saveNote: (name: string, thumbnail: string) => {
    const { strokes, notes, activeNoteId } = get();
    const now = Date.now();
    let updatedNotes: Note[];

    if (activeNoteId) {
      updatedNotes = notes.map((n) =>
        n.id === activeNoteId
          ? { ...n, name, thumbnail, canvasData: strokes, updatedAt: now }
          : n
      );
    } else {
      const newNote: Note = {
        id: `note-${now}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        thumbnail,
        canvasData: strokes,
        createdAt: now,
        updatedAt: now,
      };
      updatedNotes = [newNote, ...notes];
      set({ activeNoteId: newNote.id });
    }

    set({ notes: updatedNotes });
    saveNotesToStorage(updatedNotes);
  },

  loadNote: (id: string) => {
    const { notes } = get();
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    set({
      strokes: note.canvasData,
      undoStack: [],
      redoStack: [],
      activeNoteId: id,
    });
  },

  deleteNote: (id: string) => {
    const { activeNoteId, notes } = get();
    const updatedNotes = notes.filter((n) => n.id !== id);
    set({
      notes: updatedNotes,
      activeNoteId: activeNoteId === id ? null : activeNoteId,
    });
    saveNotesToStorage(updatedNotes);
  },
}));
