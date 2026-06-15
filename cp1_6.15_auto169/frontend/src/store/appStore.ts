import { create } from 'zustand';
import type { Tool, Reservation, User, Notification } from '@/types';
import { toolApi, reservationApi, adminApi } from '@/services/api';

interface AppState {
  currentUser: string;
  user: User | null;
  isAdmin: boolean;
  tools: Tool[];
  toolsLoading: boolean;
  reservations: Reservation[];
  notifications: Notification[];
  
  setCurrentUser: (name: string) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  fetchTools: (category?: string, search?: string) => Promise<void>;
  fetchToolById: (id: string) => Promise<Tool | undefined>;
  addTool: (tool: Partial<Tool>) => Promise<Tool>;
  updateTool: (id: string, tool: Partial<Tool>) => Promise<void>;
  deleteTool: (id: string) => Promise<void>;
  
  fetchReservations: (userName?: string) => Promise<void>;
  createReservation: (data: { tool_id: string; user_name: string; date: string; time_slot: string }) => Promise<Reservation>;
  
  addNotification: (message: string, type?: Notification['type']) => void;
  removeNotification: (id: string) => void;
  checkUpcomingReservations: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: '游客',
  user: null,
  isAdmin: false,
  tools: [],
  toolsLoading: false,
  reservations: [],
  notifications: [],

  setCurrentUser: (name) => set({ currentUser: name }),

  login: async (username, password) => {
    try {
      const user = await adminApi.login(username, password);
      set({ user, isAdmin: user.role === 'admin', currentUser: username });
      return true;
    } catch {
      return false;
    }
  },

  logout: () => set({ user: null, isAdmin: false }),

  fetchTools: async (category, search) => {
    set({ toolsLoading: true });
    try {
      const tools = await toolApi.getAll(category, search);
      set({ tools, toolsLoading: false });
    } catch {
      set({ toolsLoading: false });
    }
  },

  fetchToolById: async (id) => {
    try {
      return await toolApi.getById(id);
    } catch {
      return undefined;
    }
  },

  addTool: async (tool) => {
    const newTool = await toolApi.create(tool);
    set((state) => ({ tools: [...state.tools, newTool] }));
    return newTool;
  },

  updateTool: async (id, tool) => {
    await toolApi.update(id, tool);
    set((state) => ({
      tools: state.tools.map((t) => (t.id === id ? { ...t, ...tool } : t))
    }));
  },

  deleteTool: async (id) => {
    await toolApi.delete(id);
    set((state) => ({
      tools: state.tools.filter((t) => t.id !== id)
    }));
  },

  fetchReservations: async (userName) => {
    const reservations = await reservationApi.getAll(undefined, userName);
    set({ reservations });
  },

  createReservation: async (data) => {
    const reservation = await reservationApi.create(data);
    set((state) => ({
      reservations: [...state.reservations, reservation],
      tools: state.tools.map((t) =>
        t.id === data.tool_id
          ? { ...t, reservations: [...(t.reservations || []), reservation] }
          : t
      )
    }));
    return reservation;
  },

  addNotification: (message, type = 'info') => {
    const id = Date.now().toString();
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }]
    }));
    setTimeout(() => get().removeNotification(id), 5000);
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  },

  checkUpcomingReservations: async () => {
    const { currentUser, addNotification } = get();
    if (currentUser === '游客') return;
    
    try {
      const upcoming = await reservationApi.getUpcoming(currentUser);
      upcoming.forEach((r) => {
        addNotification(
          `您的工具「${r.tool_name}」预约将在30分钟后开始，请按时到站借用`,
          'warning'
        );
      });
    } catch {
      // 忽略轮询错误
    }
  }
}));
