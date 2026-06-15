import { create } from 'zustand';
import { Note, NoteType } from './types';

interface SheetMusicState {
  notes: Note[];
  selectedNoteId: string | null;
  currentPlayIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  bpm: number;
  currentTime: number;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;

  addNote: (type: NoteType, beatIndex: number, pitch: string) => void;
  removeNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  selectNote: (id: string | null) => void;
  setCurrentPlayIndex: (index: number) => void;
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  setBpm: (bpm: number) => void;
  setCurrentTime: (time: number) => void;
  setNotes: (notes: Note[]) => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideNotification: () => void;
  clearNotes: () => void;
}

let noteIdCounter = 0;
const generateId = () => `note-${++noteIdCounter}-${Date.now()}`;

export const useSheetMusicStore = create<SheetMusicState>((set, get) => ({
  notes: [],
  selectedNoteId: null,
  currentPlayIndex: -1,
  isPlaying: false,
  isPaused: false,
  bpm: 120,
  currentTime: 0,
  notification: null,

  addNote: (type: NoteType, beatIndex: number, pitch: string) => {
    const { notes } = get();
    
    let adjustedBeatIndex = beatIndex;
    const beatOccupied = notes.some(n => n.beatIndex === adjustedBeatIndex);
    if (beatOccupied) {
      adjustedBeatIndex = beatIndex + 0.5;
    }

    const newNote: Note = {
      id: generateId(),
      type,
      pitch,
      beatIndex: adjustedBeatIndex,
      dotted: false,
    };

    set(state => ({
      notes: [...state.notes, newNote].sort((a, b) => a.beatIndex - b.beatIndex),
      selectedNoteId: newNote.id,
    }));
  },

  removeNote: (id: string) => {
    set(state => ({
      notes: state.notes.filter(n => n.id !== id),
      selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
    }));
  },

  updateNote: (id: string, updates: Partial<Note>) => {
    set(state => ({
      notes: state.notes.map(n => (n.id === id ? { ...n, ...updates } : n)),
    }));
  },

  selectNote: (id: string | null) => {
    set({ selectedNoteId: id });
  },

  setCurrentPlayIndex: (index: number) => {
    set({ currentPlayIndex: index });
  },

  setPlaying: (playing: boolean) => {
    set({ isPlaying: playing, isPaused: false });
  },

  setPaused: (paused: boolean) => {
    set({ isPaused: paused });
  },

  setBpm: (bpm: number) => {
    set({ bpm });
  },

  setCurrentTime: (time: number) => {
    set({ currentTime: time });
  },

  setNotes: (notes: Note[]) => {
    set({ notes: [...notes].sort((a, b) => a.beatIndex - b.beatIndex) });
    noteIdCounter = notes.length;
  },

  showNotification: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    set({ notification: { message, type } });
    setTimeout(() => {
      get().hideNotification();
    }, 2000);
  },

  hideNotification: () => {
    set({ notification: null });
  },

  clearNotes: () => {
    set({ notes: [], selectedNoteId: null });
  },
}));
