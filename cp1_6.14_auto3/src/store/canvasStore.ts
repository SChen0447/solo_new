import { create } from 'zustand';

export type ToolType = 'pen' | 'rect' | 'ellipse' | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: ToolType;
  color: string;
  lineWidth: number;
  userId: string;
}

export interface PenElement extends BaseElement {
  type: 'pen';
  points: Point[];
}

export interface RectElement extends BaseElement {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export type CanvasElement = PenElement | RectElement | EllipseElement | TextElement;

export interface UserCursor {
  id: string;
  color: string;
  name: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface UserInfo {
  id: string;
  color: string;
  name: string;
}

interface CanvasState {
  elements: CanvasElement[];
  currentTool: ToolType;
  currentColor: string;
  currentLineWidth: number;
  currentFontSize: number;
  history: CanvasElement[][];
  historyIndex: number;
  maxHistory: number;
  cursors: Map<string, UserCursor>;
  users: Map<string, UserInfo>;
  currentUserId: string | null;
  currentUserColor: string;
  currentUserName: string;
  offsetX: number;
  offsetY: number;
  scale: number;
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setLineWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  addElement: (element: CanvasElement, sync?: boolean) => void;
  updateElement: (element: CanvasElement, sync?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  updateCursor: (cursor: UserCursor) => void;
  addUser: (user: UserInfo) => void;
  removeUser: (userId: string) => void;
  setCurrentUser: (id: string, color: string, name: string) => void;
  clearCanvas: (sync?: boolean) => void;
  setOffset: (x: number, y: number) => void;
  setScale: (scale: number) => void;
}

const generateId = () => `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  currentTool: 'pen',
  currentColor: '#ffffff',
  currentLineWidth: 3,
  currentFontSize: 16,
  history: [[]],
  historyIndex: 0,
  maxHistory: 50,
  cursors: new Map(),
  users: new Map(),
  currentUserId: null,
  currentUserColor: '#3a86ff',
  currentUserName: '用户',
  offsetX: 0,
  offsetY: 0,
  scale: 1,

  setTool: (tool) => set({ currentTool: tool }),
  setColor: (color) => set({ currentColor: color }),
  setLineWidth: (width) => set({ currentLineWidth: width }),
  setFontSize: (size) => set({ currentFontSize: size }),

  addElement: (element, sync = true) => {
    const state = get();
    const newElements = [...state.elements, { ...element, id: element.id || generateId() }];
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newElements);
    
    if (newHistory.length > state.maxHistory + 1) {
      newHistory.shift();
    }
    
    set({
      elements: newElements,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });

    if (sync) {
      const ws = (window as any).__ws;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'draw',
          element: newElements[newElements.length - 1],
        }));
      }
    }
  },

  updateElement: (element, sync = true) => {
    const state = get();
    const newElements = state.elements.map(el =>
      el.id === element.id ? element : el
    );
    set({ elements: newElements });

    if (sync) {
      const ws = (window as any).__ws;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'updateElement',
          element,
        }));
      }
    }
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      set({
        elements: state.history[newIndex],
        historyIndex: newIndex,
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      set({
        elements: state.history[newIndex],
        historyIndex: newIndex,
      });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  updateCursor: (cursor) => {
    const state = get();
    const newCursors = new Map(state.cursors);
    newCursors.set(cursor.id, cursor);
    set({ cursors: newCursors });
  },

  addUser: (user) => {
    const state = get();
    const newUsers = new Map(state.users);
    newUsers.set(user.id, user);
    set({ users: newUsers });
  },

  removeUser: (userId) => {
    const state = get();
    const newUsers = new Map(state.users);
    newUsers.delete(userId);
    const newCursors = new Map(state.cursors);
    newCursors.delete(userId);
    set({ users: newUsers, cursors: newCursors });
  },

  setCurrentUser: (id, color, name) => {
    set({
      currentUserId: id,
      currentUserColor: color,
      currentUserName: name,
    });
  },

  clearCanvas: (sync = true) => {
    const state = get();
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push([]);
    
    if (newHistory.length > state.maxHistory + 1) {
      newHistory.shift();
    }
    
    set({
      elements: [],
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });

    if (sync) {
      const ws = (window as any).__ws;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'clear' }));
      }
    }
  },

  setOffset: (x, y) => set({ offsetX: x, offsetY: y }),
  setScale: (scale) => set({ scale }),
}));

export { generateId };
