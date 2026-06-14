import { create } from 'zustand';

export interface Room {
  id: string;
  name: string;
  maxCapacity: number;
  defaultDuration: number;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
}

export interface Event {
  id: string;
  roomId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  memberIds: string[];
}

export interface Note {
  id: string;
  content: string;
  emotion: string;
  audio: string | null;
  createdAt: string;
}

export interface SheetBlock {
  id: string;
  instrument: string;
  startBar: number;
  endBar: number;
  chords: string;
  notes: string;
}

export interface Sheet {
  id: string;
  title: string;
  tonality: string;
  timeSignature: string;
  bpm: number;
  blocks: SheetBlock[];
}

interface OnlineMember {
  id: string;
  avatar: string;
}

interface AppState {
  rooms: Room[];
  members: Member[];
  events: Event[];
  notes: Note[];
  sheets: Sheet[];
  onlineMembers: OnlineMember[];
  currentClientId: string | null;
  currentAvatar: string | null;
  highlightedBlockId: string | null;
  
  setRooms: (rooms: Room[]) => void;
  setMembers: (members: Member[]) => void;
  setEvents: (events: Event[]) => void;
  setNotes: (notes: Note[]) => void;
  setSheets: (sheets: Sheet[]) => void;
  addEvent: (event: Event) => void;
  updateEvent: (event: Event) => void;
  deleteEvent: (id: string) => void;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  setCurrentSheet: (sheet: Sheet) => void;
  addBlock: (sheetId: string, block: SheetBlock) => void;
  updateBlock: (sheetId: string, block: SheetBlock) => void;
  deleteBlock: (sheetId: string, blockId: string) => void;
  reorderBlocks: (sheetId: string, blocks: SheetBlock[]) => void;
  setOnlineMembers: (members: OnlineMember[]) => void;
  setCurrentClient: (id: string, avatar: string) => void;
  setHighlightedBlock: (id: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  rooms: [],
  members: [],
  events: [],
  notes: [],
  sheets: [],
  onlineMembers: [],
  currentClientId: null,
  currentAvatar: null,
  highlightedBlockId: null,

  setRooms: (rooms) => set({ rooms }),
  setMembers: (members) => set({ members }),
  setEvents: (events) => set({ events }),
  setNotes: (notes) => set({ notes }),
  setSheets: (sheets) => set({ sheets }),
  
  addEvent: (event) => set((state) => ({
    events: [...state.events, event]
  })),
  
  updateEvent: (event) => set((state) => ({
    events: state.events.map(e => e.id === event.id ? event : e)
  })),
  
  deleteEvent: (id) => set((state) => ({
    events: state.events.filter(e => e.id !== id)
  })),
  
  addNote: (note) => set((state) => ({
    notes: [note, ...state.notes]
  })),
  
  updateNote: (note) => set((state) => ({
    notes: state.notes.map(n => n.id === note.id ? note : n)
  })),
  
  deleteNote: (id) => set((state) => ({
    notes: state.notes.filter(n => n.id !== id)
  })),
  
  setCurrentSheet: (sheet) => set((state) => ({
    sheets: state.sheets.map(s => s.id === sheet.id ? sheet : s)
  })),
  
  addBlock: (sheetId, block) => set((state) => ({
    sheets: state.sheets.map(s => 
      s.id === sheetId 
        ? { ...s, blocks: [...s.blocks, block] }
        : s
    )
  })),
  
  updateBlock: (sheetId, block) => set((state) => ({
    sheets: state.sheets.map(s => 
      s.id === sheetId 
        ? { ...s, blocks: s.blocks.map(b => b.id === block.id ? block : b) }
        : s
    )
  })),
  
  deleteBlock: (sheetId, blockId) => set((state) => ({
    sheets: state.sheets.map(s => 
      s.id === sheetId 
        ? { ...s, blocks: s.blocks.filter(b => b.id !== blockId) }
        : s
    )
  })),
  
  reorderBlocks: (sheetId, blocks) => set((state) => ({
    sheets: state.sheets.map(s => 
      s.id === sheetId ? { ...s, blocks } : s
    )
  })),
  
  setOnlineMembers: (members) => set({ onlineMembers: members }),
  
  setCurrentClient: (id, avatar) => set({ currentClientId: id, currentAvatar: avatar }),
  
  setHighlightedBlock: (id) => set({ highlightedBlockId: id })
}));
