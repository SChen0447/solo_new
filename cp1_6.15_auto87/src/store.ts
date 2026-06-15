import { create } from 'zustand';
import { ToolType, User, CanvasElement, CursorPosition, DrawEvent, COLOR_PALETTE } from './types';

interface CanvasState {
  tool: ToolType;
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  elements: CanvasElement[];
  selectedElementId: string | null;
  scale: number;
  position: { x: number; y: number };
  currentUser: User | null;
  users: User[];
  roomId: string;
  cursors: Map<string, CursorPosition>;
  isConnected: boolean;
  textInputPosition: { x: number; y: number } | null;
  eraserTargetId: string | null;

  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  setFontSize: (size: number) => void;
  setScale: (scale: number) => void;
  setPosition: (position: { x: number; y: number }) => void;
  setCurrentUser: (user: User | null) => void;
  setUsers: (users: User[]) => void;
  setRoomId: (roomId: string) => void;
  setIsConnected: (connected: boolean) => void;
  setTextInputPosition: (pos: { x: number; y: number } | null) => void;
  setEraserTargetId: (id: string | null) => void;
  setSelectedElementId: (id: string | null) => void;

  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  loadHistory: (events: DrawEvent[]) => void;
  handleRemoteDrawEvent: (event: DrawEvent) => void;

  updateCursor: (cursor: CursorPosition) => void;
  removeCursor: (userId: string) => void;
  clearCursors: () => void;

  resetCanvas: () => void;
}

export const useStore = create<CanvasState>((set, get) => ({
  tool: 'pen',
  color: COLOR_PALETTE[5],
  strokeWidth: 3,
  opacity: 1,
  fontSize: 24,
  elements: [],
  selectedElementId: null,
  scale: 1,
  position: { x: 0, y: 0 },
  currentUser: null,
  users: [],
  roomId: '',
  cursors: new Map(),
  isConnected: false,
  textInputPosition: null,
  eraserTargetId: null,

  setTool: (tool) => set({ tool, eraserTargetId: null, selectedElementId: null }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setOpacity: (opacity) => set({ opacity }),
  setFontSize: (fontSize) => set({ fontSize }),
  setScale: (scale) => set({ scale: Math.max(0.5, Math.min(3, scale)) }),
  setPosition: (position) => set({ position }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setUsers: (users) => set({ users }),
  setRoomId: (roomId) => set({ roomId }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setTextInputPosition: (textInputPosition) => set({ textInputPosition }),
  setEraserTargetId: (eraserTargetId) => set({ eraserTargetId }),
  setSelectedElementId: (selectedElementId) => set({ selectedElementId }),

  addElement: (element) => set((state) => ({
    elements: [...state.elements, element]
  })),

  updateElement: (id, updates) => set((state) => ({
    elements: state.elements.map(el =>
      el.id === id ? { ...el, ...updates } as CanvasElement : el
    )
  })),

  deleteElement: (id) => set((state) => ({
    elements: state.elements.filter(el => el.id !== id),
    eraserTargetId: state.eraserTargetId === id ? null : state.eraserTargetId,
    selectedElementId: state.selectedElementId === id ? null : state.selectedElementId
  })),

  loadHistory: (events) => {
    const elements: CanvasElement[] = [];
    const deletedIds = new Set<string>();

    events.forEach(event => {
      if (event.type === 'delete') {
        deletedIds.add(event.data.id);
      } else {
        const element = event.data as CanvasElement;
        elements.push(element);
      }
    });

    const filteredElements = elements.filter(el => !deletedIds.has(el.id));
    set({ elements: filteredElements });
  },

  handleRemoteDrawEvent: (event) => {
    if (event.type === 'delete') {
      get().deleteElement(event.data.id);
    } else {
      const element = event.data as CanvasElement;
      const exists = get().elements.some(el => el.id === element.id);
      if (exists) {
        get().updateElement(element.id, element);
      } else {
        get().addElement(element);
      }
    }
  },

  updateCursor: (cursor) => set((state) => {
    const newCursors = new Map(state.cursors);
    newCursors.set(cursor.userId, cursor);
    return { cursors: newCursors };
  }),

  removeCursor: (userId) => set((state) => {
    const newCursors = new Map(state.cursors);
    newCursors.delete(userId);
    return { cursors: newCursors };
  }),

  clearCursors: () => set({ cursors: new Map() }),

  resetCanvas: () => set({
    elements: [],
    cursors: new Map(),
    users: [],
    currentUser: null,
    roomId: '',
    isConnected: false,
    position: { x: 0, y: 0 },
    scale: 1,
    textInputPosition: null,
    eraserTargetId: null,
    selectedElementId: null
  })
}));
