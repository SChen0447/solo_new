import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { NetworkClient } from '../utils/network';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: string;
  x: number;
  y: number;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PenElement extends BaseElement {
  type: 'pen';
  points: Point[];
  color: string;
  thickness: number;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  width: number;
  height: number;
  color: string;
  thickness: number;
  fill?: string;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  width: number;
  height: number;
  color: string;
  thickness: number;
  fill?: string;
}

export interface LineElement extends BaseElement {
  type: 'line';
  x2: number;
  y2: number;
  color: string;
  thickness: number;
}

export interface NoteElement extends BaseElement {
  type: 'note';
  width: number;
  height: number;
  text: string;
  bgColor: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  width: number;
  height: number;
  src: string;
}

export type WhiteboardElement =
  | PenElement
  | RectElement
  | CircleElement
  | LineElement
  | NoteElement
  | ImageElement;

export interface User {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
}

export type ToolType = 'pen' | 'rect' | 'circle' | 'line' | 'note' | 'image' | 'select';

interface WhiteboardState {
  sessionId: string | null;
  currentUserId: string | null;
  currentUserColor: string;
  currentUserName: string;
  isHost: boolean;

  elements: WhiteboardElement[];
  users: User[];
  selectedElementId: string | null;

  currentTool: ToolType;
  penColor: string;
  penThickness: number;

  network: NetworkClient | null;

  setCurrentTool: (tool: ToolType) => void;
  setPenColor: (color: string) => void;
  setPenThickness: (thickness: number) => void;
  setSelectedElement: (id: string | null) => void;

  joinSession: (sessionId: string, userName: string, hostId?: string) => void;
  createNewSession: (sessionId: string, userName: string, hostId: string) => void;

  addElement: (element: Omit<WhiteboardElement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  updateElement: (id: string, updates: Partial<WhiteboardElement>) => void;
  deleteElement: (id: string) => void;
  clearCanvas: () => void;

  restoreSnapshot: (snapshotId: string) => void;
  kickUser: (userId: string) => void;
}

const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  sessionId: null,
  currentUserId: null,
  currentUserColor: '#00d2ff',
  currentUserName: '',
  isHost: false,

  elements: [],
  users: [],
  selectedElementId: null,

  currentTool: 'pen',
  penColor: '#00d2ff',
  penThickness: 3,

  network: null,

  setCurrentTool: (tool) => set({ currentTool: tool }),
  setPenColor: (color) => set({ penColor: color }),
  setPenThickness: (thickness) => set({ penThickness: thickness }),
  setSelectedElement: (id) => set({ selectedElementId: id }),

  joinSession: (sessionId, userName, hostId) => {
    const network = new NetworkClient();
    set({ currentUserName: userName, network });

    network.onJoined = (data) => {
      set({
        sessionId,
        currentUserId: data.userId,
        currentUserColor: data.userColor,
        isHost: data.isHost,
        elements: data.elements,
        users: data.users
      });
    };

    network.onUserJoined = (user) => {
      const users = [...get().users.filter((u) => u.id !== user.id), user];
      set({ users });
    };

    network.onUserLeft = (data) => {
      set({ users: get().users.filter((u) => u.id !== data.userId) });
    };

    network.onAction = (action) => {
      const { type, payload } = action;
      switch (type) {
        case 'element:add':
          set({ elements: [...get().elements, payload] });
          break;
        case 'element:update': {
          const elements = get().elements.map((e) =>
            e.id === payload.id ? { ...e, ...payload } : e
          );
          set({ elements });
          break;
        }
        case 'element:delete':
          set({ elements: get().elements.filter((e) => e.id !== payload.id) });
          break;
        case 'canvas:clear':
          set({ elements: [] });
          break;
        case 'snapshot:restored':
          set({ elements: payload.elements });
          break;
      }
    };

    network.onKicked = () => {
      alert('你已被踢出此会话');
      window.location.reload();
    };

    network.connect();
    network.join(sessionId, userName, hostId);
  },

  createNewSession: (sessionId, userName, hostId) => {
    get().joinSession(sessionId, userName, hostId);
  },

  addElement: (element) => {
    const id = uuidv4();
    const newElement = {
      ...element,
      id,
      userId: get().currentUserId || uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    } as WhiteboardElement;
    set({ elements: [...get().elements, newElement] });
    get().network?.sendAction('element:add', newElement);
  },

  updateElement: (id, updates) => {
    const elements = get().elements.map((e) =>
      e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
    );
    set({ elements });
    get().network?.sendAction('element:update', { id, ...updates });
  },

  deleteElement: (id) => {
    set({
      elements: get().elements.filter((e) => e.id !== id),
      selectedElementId: get().selectedElementId === id ? null : get().selectedElementId
    });
    get().network?.sendAction('element:delete', { id });
  },

  clearCanvas: () => {
    set({ elements: [], selectedElementId: null });
    get().network?.sendAction('canvas:clear', {});
  },

  restoreSnapshot: (snapshotId) => {
    get().network?.sendAction('snapshot:restore', { snapshotId });
  },

  kickUser: (userId) => {
    get().network?.sendAction('user:kick', { userId });
  }
}));

export default useWhiteboardStore;
