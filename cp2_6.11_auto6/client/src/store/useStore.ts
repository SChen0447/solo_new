import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { DrawAction, StickyNoteData, UserInfo, ToolType } from '../../../shared/types';

interface TextInputState {
  active: boolean;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  value: string;
}

interface WhiteboardState {
  socket: Socket | null;
  roomId: string | null;
  userId: string | null;
  userName: string;
  users: UserInfo[];
  drawActions: DrawAction[];
  stickyNotes: StickyNoteData[];
  currentTool: ToolType;
  currentColor: string;
  strokeWidth: number;
  fontSize: number;
  isReplaying: boolean;
  originalDrawActions: DrawAction[];
  originalStickyNotes: StickyNoteData[];
  textInput: TextInputState;
  remoteCursors: Map<string, { x: number; y: number; color: string; name: string }>;
  connect: (roomId: string, userName: string) => void;
  disconnect: () => void;
  setCurrentTool: (tool: ToolType) => void;
  setCurrentColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  addDrawAction: (action: DrawAction) => void;
  addStickyNote: (note: StickyNoteData) => void;
  updateStickyNote: (note: StickyNoteData) => void;
  deleteStickyNote: (noteId: string) => void;
  setIsReplaying: (replaying: boolean) => void;
  setDrawActions: (actions: DrawAction[]) => void;
  setStickyNotes: (notes: StickyNoteData[]) => void;
  setOriginalDrawActions: (actions: DrawAction[]) => void;
  setOriginalStickyNotes: (notes: StickyNoteData[]) => void;
  setTextInput: (state: TextInputState) => void;
}

const useStore = create<WhiteboardState>((set, get) => ({
  socket: null,
  roomId: null,
  userId: null,
  userName: '',
  users: [],
  drawActions: [],
  stickyNotes: [],
  currentTool: 'pencil',
  currentColor: '#FFFFFF',
  strokeWidth: 2,
  fontSize: 16,
  isReplaying: false,
  originalDrawActions: [],
  originalStickyNotes: [],
  textInput: { active: false, x: 0, y: 0, color: '#FFFFFF', fontSize: 16, value: '' },
  remoteCursors: new Map(),

  connect: (roomId: string, userName: string) => {
    const socket = io('/', { transports: ['websocket'] });

    socket.on('connect', () => {
      set({ socket, userId: socket.id, userName, roomId });
      socket.emit('join-room', { roomId, userName });
    });

    socket.on('room-joined', (data) => {
      set({
        users: data.users || [],
        drawActions: data.history || [],
        stickyNotes: data.stickyNotes || [],
      });
    });

    socket.on('user-joined', (user: UserInfo) => {
      set((state) => ({ users: [...state.users, user] }));
    });

    socket.on('user-left', ({ userId: uid }: { userId: string }) => {
      set((state) => ({
        users: state.users.filter((u) => u.id !== uid),
      }));
      const cursors = new Map(get().remoteCursors);
      cursors.delete(uid);
      set({ remoteCursors: cursors });
    });

    socket.on('draw-action', (action: DrawAction) => {
      if (action.userId !== get().userId) {
        set((state) => ({ drawActions: [...state.drawActions, action] }));
      }
    });

    socket.on('sticky-note-add', (note: StickyNoteData) => {
      set((state) => ({ stickyNotes: [...state.stickyNotes, note] }));
    });

    socket.on('sticky-note-update', (note: StickyNoteData) => {
      set((state) => ({
        stickyNotes: state.stickyNotes.map((n) =>
          n.id === note.id ? note : n
        ),
      }));
    });

    socket.on('sticky-note-delete', ({ noteId }: { noteId: string }) => {
      set((state) => ({
        stickyNotes: state.stickyNotes.filter((n) => n.id !== noteId),
      }));
    });

    socket.on('cursor-move', (data: { userId: string; x: number; y: number; color: string; name: string }) => {
      const cursors = new Map(get().remoteCursors);
      cursors.set(data.userId, { x: data.x, y: data.y, color: data.color, name: data.name });
      set({ remoteCursors: cursors });
    });

    socket.on('snapshot-data', (data: { drawActions: DrawAction[]; stickyNotes: StickyNoteData[] }) => {
      set({ drawActions: data.drawActions, stickyNotes: data.stickyNotes });
    });

    socket.on('timeline-data', (data: { timeline: { id: string; timestamp: number; type: string }[] }) => {
      // Used by TimeSlider
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, roomId: null, userId: null, users: [], drawActions: [], stickyNotes: [] });
  },

  setCurrentTool: (tool) => set({ currentTool: tool }),
  setCurrentColor: (color) => set({ currentColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setFontSize: (size) => set({ fontSize: size }),
  setIsReplaying: (replaying) => set({ isReplaying: replaying }),
  setDrawActions: (actions) => set({ drawActions: actions }),
  setStickyNotes: (notes) => set({ stickyNotes: notes }),
  setOriginalDrawActions: (actions) => set({ originalDrawActions: actions }),
  setOriginalStickyNotes: (notes) => set({ originalStickyNotes: notes }),
  setTextInput: (state) => set({ textInput: state }),

  addDrawAction: (action) => {
    const { socket } = get();
    if (socket) {
      socket.emit('draw-action', action);
    }
    set((state) => ({ drawActions: [...state.drawActions, action] }));
  },

  addStickyNote: (note) => {
    const { socket } = get();
    if (socket) {
      socket.emit('sticky-note-add', note);
    }
    set((state) => ({ stickyNotes: [...state.stickyNotes, note] }));
  },

  updateStickyNote: (note) => {
    const { socket } = get();
    if (socket) {
      socket.emit('sticky-note-update', note);
    }
    set((state) => ({
      stickyNotes: state.stickyNotes.map((n) =>
        n.id === note.id ? note : n
      ),
    }));
  },

  deleteStickyNote: (noteId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('sticky-note-delete', { noteId });
    }
    set((state) => ({
      stickyNotes: state.stickyNotes.filter((n) => n.id !== noteId),
    }));
  },
}));

export default useStore;
