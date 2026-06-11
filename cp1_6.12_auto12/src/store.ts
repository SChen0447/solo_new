import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { StickyNote, Viewport, NoteType, TextNote, VoteNote, AnnotationNote, FontSize } from './types';
import { NOTE_COLORS, DEFAULT_NOTE_SIZES } from './types';

const STORAGE_KEY = 'brainstorm-canvas-state';

interface SyncMessage {
  type: 'note_add' | 'note_move' | 'note_update' | 'note_vote' | 'note_delete' | 'canvas_clear';
  payload: unknown;
}

interface BrainstormStore {
  notes: StickyNote[];
  viewport: Viewport;
  selectedNoteId: string | null;
  userId: string;

  addNote: (type: NoteType) => void;
  moveNote: (id: string, x: number, y: number) => void;
  updateNote: (id: string, updates: Partial<StickyNote>) => void;
  deleteNote: (id: string) => void;
  voteNote: (id: string) => void;
  clearCanvas: () => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setSelectedNoteId: (id: string | null) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
  broadcastSync: (message: SyncMessage) => void;
}

let channel: BroadcastChannel | null = null;

try {
  channel = new BroadcastChannel('brainstorm-sync');
} catch {
  // BroadcastChannel not supported
}

const userId = uuidv4();

function loadState(): { notes: StickyNote[]; viewport: Viewport } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        notes: parsed.notes || [],
        viewport: parsed.viewport || { x: 0, y: 0, scale: 1 },
      };
    }
  } catch {
    // ignore parse errors
  }
  return { notes: [], viewport: { x: 0, y: 0, scale: 1 } };
}

function saveState(notes: StickyNote[], viewport: Viewport) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, viewport }));
  } catch {
    // ignore storage errors
  }
}

const initialState = loadState();

export const useBrainstormStore = create<BrainstormStore>((set, get) => ({
  notes: initialState.notes,
  viewport: initialState.viewport,
  selectedNoteId: null,
  userId,

  addNote: (type: NoteType) => {
    const { viewport, notes } = get();
    const colors = NOTE_COLORS[type];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const sizes = DEFAULT_NOTE_SIZES[type];
    const centerX = (window.innerWidth / 2 - viewport.x) / viewport.scale - sizes.width / 2;
    const centerY = (window.innerHeight / 2 - viewport.y) / viewport.scale - sizes.height / 2;
    const offsetX = (Math.random() - 0.5) * 100;
    const offsetY = (Math.random() - 0.5) * 100;

    let note: StickyNote;

    const base = {
      id: uuidv4(),
      type,
      x: centerX + offsetX,
      y: centerY + offsetY,
      width: sizes.width,
      height: sizes.height,
      color,
      createdAt: Date.now(),
    };

    if (type === 'text') {
      note = { ...base, type: 'text', content: '', fontSize: 'medium' as FontSize } as TextNote;
    } else if (type === 'vote') {
      note = { ...base, type: 'vote', content: '', votes: [] } as VoteNote;
    } else {
      note = {
        ...base,
        type: 'annotation',
        content: '',
        regionWidth: sizes.width,
        regionHeight: sizes.height,
      } as AnnotationNote;
    }

    const newNotes = [...notes, note];
    set({ notes: newNotes });
    saveState(newNotes, get().viewport);
    get().broadcastSync({ type: 'note_add', payload: note });
  },

  moveNote: (id: string, x: number, y: number) => {
    const { notes, viewport } = get();
    const newNotes = notes.map((n) => (n.id === id ? { ...n, x, y } : n));
    set({ notes: newNotes });
    saveState(newNotes, viewport);
    get().broadcastSync({ type: 'note_move', payload: { id, x, y } });
  },

  updateNote: (id: string, updates: Partial<StickyNote>) => {
    const { notes, viewport } = get();
    const newNotes = notes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    set({ notes: newNotes });
    saveState(newNotes, viewport);
    get().broadcastSync({ type: 'note_update', payload: { id, updates } });
  },

  deleteNote: (id: string) => {
    const { notes, viewport } = get();
    const newNotes = notes.filter((n) => n.id !== id);
    set({ notes: newNotes, selectedNoteId: null });
    saveState(newNotes, viewport);
    get().broadcastSync({ type: 'note_delete', payload: { id } });
  },

  voteNote: (id: string) => {
    const { notes, viewport, userId } = get();
    const newNotes: StickyNote[] = notes.map((n) => {
      if (n.id === id && n.type === 'vote') {
        const voteNote = n as VoteNote;
        const hasVoted = voteNote.votes.includes(userId);
        const updated: VoteNote = {
          ...voteNote,
          type: 'vote',
          votes: hasVoted
            ? voteNote.votes.filter((v) => v !== userId)
            : [...voteNote.votes, userId],
        };
        return updated;
      }
      return n;
    });
    set({ notes: newNotes });
    saveState(newNotes, viewport);
    get().broadcastSync({ type: 'note_vote', payload: { id, userId } });
  },

  clearCanvas: () => {
    set({ notes: [], selectedNoteId: null });
    saveState([], get().viewport);
    get().broadcastSync({ type: 'canvas_clear', payload: null });
  },

  setViewport: (viewport: Partial<Viewport>) => {
    const newViewport = { ...get().viewport, ...viewport };
    set({ viewport: newViewport });
    saveState(get().notes, newViewport);
  },

  setSelectedNoteId: (id: string | null) => {
    set({ selectedNoteId: id });
  },

  loadFromStorage: () => {
    const state = loadState();
    set({ notes: state.notes, viewport: state.viewport });
  },

  saveToStorage: () => {
    saveState(get().notes, get().viewport);
  },

  broadcastSync: (message: SyncMessage) => {
    try {
      channel?.postMessage(message);
    } catch {
      // ignore broadcast errors
    }
  },
}));

if (channel) {
  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    const msg = event.data;
    const store = useBrainstormStore.getState();

    switch (msg.type) {
      case 'note_add': {
        const note = msg.payload as StickyNote;
        if (!store.notes.find((n) => n.id === note.id)) {
          const newNotes = [...store.notes, note];
          useBrainstormStore.setState({ notes: newNotes });
          saveState(newNotes, store.viewport);
        }
        break;
      }
      case 'note_move': {
        const { id, x, y } = msg.payload as { id: string; x: number; y: number };
        const newNotes = store.notes.map((n) => (n.id === id ? { ...n, x, y } : n));
        useBrainstormStore.setState({ notes: newNotes });
        saveState(newNotes, store.viewport);
        break;
      }
      case 'note_update': {
        const { id, updates } = msg.payload as { id: string; updates: Partial<StickyNote> };
        const newNotes = store.notes.map((n) => (n.id === id ? { ...n, ...updates } : n));
        useBrainstormStore.setState({ notes: newNotes });
        saveState(newNotes, store.viewport);
        break;
      }
      case 'note_vote': {
        const { id, userId: voterId } = msg.payload as { id: string; userId: string };
        const newNotes = store.notes.map((n) => {
          if (n.id === id && n.type === 'vote') {
            const voteNote = n as VoteNote;
            const hasVoted = voteNote.votes.includes(voterId);
            return {
              ...voteNote,
              votes: hasVoted
                ? voteNote.votes.filter((v) => v !== voterId)
                : [...voteNote.votes, voterId],
            };
          }
          return n;
        });
        useBrainstormStore.setState({ notes: newNotes });
        saveState(newNotes, store.viewport);
        break;
      }
      case 'note_delete': {
        const { id } = msg.payload as { id: string };
        const newNotes = store.notes.filter((n) => n.id !== id);
        useBrainstormStore.setState({ notes: newNotes });
        saveState(newNotes, store.viewport);
        break;
      }
      case 'canvas_clear': {
        useBrainstormStore.setState({ notes: [], selectedNoteId: null });
        saveState([], store.viewport);
        break;
      }
    }
  };
}
