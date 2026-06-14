import { create } from 'zustand';
import type { Venue, TimeSlot, Equipment, Reservation } from '../types';
import { venueApi, equipmentApi, reservationApi } from '../services/api';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  user: { id: string; name: string };
  venues: Venue[];
  loading: boolean;
  slots: TimeSlot[];
  equipment: Equipment[];
  reservations: Reservation[];
  toasts: Toast[];
  filterType: string;
  searchQuery: string;
  
  setFilterType: (type: string) => void;
  setSearchQuery: (query: string) => void;
  fetchVenues: () => Promise<void>;
  fetchSlots: (venueId: string, date: string) => Promise<void>;
  fetchEquipment: () => Promise<void>;
  fetchReservations: () => Promise<void>;
  createReservation: (data: any) => Promise<{ success: boolean; error?: string }>;
  cancelReservation: (id: string) => Promise<{ success: boolean; error?: string }>;
  submitReview: (id: string, rating: number, comment: string) => Promise<{ success: boolean; error?: string }>;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const MOCK_USER = { id: 'user_001', name: '张三' };

export const useAppStore = create<AppState>((set, get) => ({
  user: MOCK_USER,
  venues: [],
  loading: false,
  slots: [],
  equipment: [],
  reservations: [],
  toasts: [],
  filterType: 'all',
  searchQuery: '',
  
  setFilterType: (type) => set({ filterType: type }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  fetchVenues: async () => {
    set({ loading: true });
    try {
      const { filterType, searchQuery } = get();
      const venues = await venueApi.getVenues(filterType, searchQuery);
      set({ venues });
    } catch (error) {
      get().addToast('加载场地列表失败', 'error');
    } finally {
      set({ loading: false });
    }
  },
  
  fetchSlots: async (venueId, date) => {
    set({ loading: true });
    try {
      const slots = await venueApi.getSlots(venueId, date);
      set({ slots });
    } catch (error) {
      get().addToast('加载时段失败', 'error');
    } finally {
      set({ loading: false });
    }
  },
  
  fetchEquipment: async () => {
    try {
      const equipment = await equipmentApi.getEquipment();
      set({ equipment });
    } catch (error) {
      get().addToast('加载器材列表失败', 'error');
    }
  },
  
  fetchReservations: async () => {
    set({ loading: true });
    try {
      const { user } = get();
      const reservations = await reservationApi.getUserReservations(user.id);
      set({ reservations });
    } catch (error) {
      get().addToast('加载预约记录失败', 'error');
    } finally {
      set({ loading: false });
    }
  },
  
  createReservation: async (data) => {
    try {
      const { user } = get();
      await reservationApi.createReservation({ ...data, userId: user.id });
      get().addToast('预约成功！', 'success');
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.error || '预约失败，请重试';
      get().addToast(message, 'error');
      return { success: false, error: message };
    }
  },
  
  cancelReservation: async (id) => {
    try {
      await reservationApi.cancelReservation(id);
      get().addToast('预约已取消', 'success');
      get().fetchReservations();
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.error || '取消失败，请重试';
      get().addToast(message, 'error');
      return { success: false, error: message };
    }
  },
  
  submitReview: async (id, rating, comment) => {
    try {
      await reservationApi.submitReview(id, { rating, comment });
      get().addToast('评价提交成功', 'success');
      get().fetchReservations();
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.error || '评价失败，请重试';
      get().addToast(message, 'error');
      return { success: false, error: message };
    }
  },
  
  addToast: (message, type) => {
    const id = Date.now().toString();
    set(state => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },
  
  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }));
  }
}));
