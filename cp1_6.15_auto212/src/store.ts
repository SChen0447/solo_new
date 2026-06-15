import { create } from 'zustand';
import axios from 'axios';
import type { User, Shelf, Book, Reservation, ChatMessage } from './types';

interface AppState {
  user: User | null;
  setUser: (u: User | null) => void;

  myShelves: Shelf[];
  loadMyShelves: () => Promise<void>;

  city: string;
  setCity: (c: string) => void;

  shelves: Shelf[];
  loadShelves: (city?: string) => Promise<void>;

  reservations: Reservation[];
  loadReservations: () => Promise<void>;

  messages: Record<string, ChatMessage[]>;
  loadMessages: (reservationId: string) => Promise<void>;
  addMessage: (reservationId: string, msg: ChatMessage) => void;

  notifications: string[];
  addNotification: (m: string) => void;
  removeNotification: (idx: number) => void;

  wsConnected: boolean;
  connectWs: (userId: string) => void;
  disconnectWs: () => void;
}

let ws: WebSocket | null = null;

export const useStore = create<AppState>((set, get) => ({
  user: null,
  setUser: (u) => set({ user: u }),

  myShelves: [],
  loadMyShelves: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const r = await axios.get(`/api/shelves/user/${user.id}`);
      set({ myShelves: r.data });
    } catch (e) { console.error(e); }
  },

  city: '北京',
  setCity: (c) => set({ city: c }),

  shelves: [],
  loadShelves: async (city) => {
    const c = city || get().city;
    const startTime = performance.now();
    try {
      const r = await axios.get(`/api/shelves?city=${encodeURIComponent(c)}`);
      set({ shelves: r.data, city: c });
      const elapsed = performance.now() - startTime;
      if (elapsed > 400) console.warn(`书架加载耗时: ${elapsed.toFixed(0)}ms (超过400ms)`);
    } catch (e) { console.error(e); }
  },

  reservations: [],
  loadReservations: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const r = await axios.get(`/api/reservations?userId=${user.id}`);
      set({ reservations: r.data });
    } catch (e) { console.error(e); }
  },

  messages: {},
  loadMessages: async (reservationId) => {
    try {
      const r = await axios.get(`/api/messages/${reservationId}`);
      set(s => ({ messages: { ...s.messages, [reservationId]: r.data } }));
    } catch (e) { console.error(e); }
  },
  addMessage: (reservationId, msg) => set(s => {
    const arr = s.messages[reservationId] || [];
    if (arr.find(m => m.id === msg.id)) return s;
    return { messages: { ...s.messages, [reservationId]: [...arr, msg] } };
  }),

  notifications: [],
  addNotification: (m) => set(s => ({ notifications: [...s.notifications, m] })),
  removeNotification: (idx) => set(s => ({ notifications: s.notifications.filter((_, i) => i !== idx) })),

  wsConnected: false,
  connectWs: (userId) => {
    if (ws) { try { ws.close(); } catch (e) { /* ignore */ } ws = null; }
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      ws.onopen = () => {
        set({ wsConnected: true });
        ws?.send(JSON.stringify({ type: 'join', userId }));
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'newReservation') {
            get().loadReservations();
          } else if (data.type === 'reservationUpdated') {
            get().loadReservations();
          } else if (data.type === 'newMessage') {
            get().addMessage(data.message.reservationId, data.message);
          } else if (data.type === 'notification') {
            get().addNotification(data.message);
            setTimeout(() => {
              const idx = get().notifications.indexOf(data.message);
              if (idx >= 0) get().removeNotification(idx);
            }, 3000);
          }
        } catch (e) { /* ignore */ }
      };
      ws.onclose = () => set({ wsConnected: false });
    } catch (e) { set({ wsConnected: false }); }
  },
  disconnectWs: () => {
    if (ws) { try { ws.close(); } catch (e) { /* ignore */ } ws = null; }
    set({ wsConnected: false });
  },
}));

export function getWs() { return ws; }
