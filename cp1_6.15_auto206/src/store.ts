import { create } from 'zustand';
import axios from 'axios';
import type {
  Workspace,
  Visitor,
  Device,
  DeviceReservation,
  Member,
  DashboardData,
  Notification,
} from './types';

interface AppState {
  workspaces: Workspace[];
  visitors: Visitor[];
  devices: Device[];
  deviceReservations: DeviceReservation[];
  members: Member[];
  dashboardData: DashboardData | null;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;

  fetchWorkspaces: () => Promise<void>;
  reserveWorkspace: (data: {
    workspaceId: string;
    date: string;
    startTime: string;
    duration: number;
    memberName: string;
  }) => Promise<{ success: boolean; error?: string }>;

  fetchMembers: () => Promise<void>;

  fetchVisitors: () => Promise<void>;
  createVisitor: (data: {
    name: string;
    company: string;
    phone: string;
    expectedTime: string;
    memberId: string;
  }) => Promise<{ success: boolean; error?: string; qrCode?: string }>;
  checkinVisitor: (visitorId: string) => Promise<{ success: boolean; error?: string }>;

  fetchDevices: (date?: string) => Promise<void>;
  reserveDevice: (data: {
    deviceId: string;
    date: string;
    startTime: string;
    endTime: string;
    memberName: string;
  }) => Promise<{ success: boolean; error?: string }>;

  fetchDashboard: () => Promise<void>;

  fetchNotifications: (memberId: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;

  startPolling: () => void;
  stopPolling: () => void;
}

const POLL_INTERVAL = 10000;
let pollTimer: ReturnType<typeof setInterval> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  workspaces: [],
  visitors: [],
  devices: [],
  deviceReservations: [],
  members: [],
  dashboardData: null,
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchWorkspaces: async () => {
    try {
      set({ loading: true });
      const res = await axios.get('/api/workspaces');
      if (res.data.success) {
        set({ workspaces: res.data.data });
      }
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  reserveWorkspace: async (data) => {
    try {
      const res = await axios.post('/api/workspaces/reserve', data);
      if (res.data.success) {
        await get().fetchWorkspaces();
        return { success: true };
      }
      return { success: false, error: res.data.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  fetchMembers: async () => {
    try {
      const res = await axios.get('/api/members');
      if (res.data.success) {
        set({ members: res.data.data });
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchVisitors: async () => {
    try {
      const res = await axios.get('/api/visitors');
      if (res.data.success) {
        set({ visitors: res.data.data });
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createVisitor: async (data) => {
    try {
      const res = await axios.post('/api/visitors', data);
      if (res.data.success) {
        await get().fetchVisitors();
        return { success: true, qrCode: res.data.data.qrCode };
      }
      return { success: false, error: res.data.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  checkinVisitor: async (visitorId) => {
    try {
      const res = await axios.post('/api/visitors/checkin', { visitorId });
      if (res.data.success) {
        await get().fetchVisitors();
        return { success: true };
      }
      return { success: false, error: res.data.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  fetchDevices: async (date) => {
    try {
      const params = date ? { date } : {};
      const res = await axios.get('/api/devices', { params });
      if (res.data.success) {
        set({
          devices: res.data.data.devices,
          deviceReservations: res.data.data.reservations,
        });
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  reserveDevice: async (data) => {
    try {
      const res = await axios.post('/api/devices/reserve', data);
      if (res.data.success) {
        await get().fetchDevices(data.date);
        return { success: true };
      }
      return { success: false, error: res.data.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  fetchDashboard: async () => {
    try {
      const res = await axios.get('/api/dashboard');
      if (res.data.success) {
        set({ dashboardData: res.data.data });
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchNotifications: async (memberId) => {
    try {
      const res = await axios.get(`/api/notifications/${memberId}`);
      if (res.data.success) {
        set({
          notifications: res.data.data.notifications,
          unreadCount: res.data.data.unreadCount,
        });
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  markNotificationRead: async (id) => {
    try {
      await axios.post(`/api/notifications/read/${id}`);
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  startPolling: () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      const { fetchWorkspaces, fetchVisitors, fetchDashboard, fetchDevices } = get();
      fetchWorkspaces();
      fetchVisitors();
      fetchDashboard();
      fetchDevices();
    }, POLL_INTERVAL);
  },

  stopPolling: () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  },
}));
