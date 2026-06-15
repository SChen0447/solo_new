import { create } from 'zustand';
import axios from 'axios';

export interface TimeSlot {
  id: string;
  date: string;
  time_start: string;
  time_end: string;
  capacity: number;
  booked_count: number;
}

export interface Order {
  id: string;
  customer_name: string;
  phone: string;
  project_type: string;
  description: string | null;
  time_slot: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}

export interface BookingInfo {
  date: string;
  timeSlot: TimeSlot | null;
  projectType: string;
  description: string;
  customerName: string;
  phone: string;
}

export interface Stats {
  todayCount: number;
  pendingCount: number;
  completedThisMonth: number;
  projectStats: Array<{ project_type: string; count: number }>;
}

interface BookingState {
  timeSlots: TimeSlot[];
  orders: Order[];
  selectedDate: string;
  bookingInfo: BookingInfo;
  isLoadingSlots: boolean;
  isLoadingOrders: boolean;
  isSubmitting: boolean;
  stats: Stats | null;
  fetchTimeSlots: (date: string) => Promise<void>;
  submitBooking: (data: {
    customer_name: string;
    phone: string;
    project_type: string;
    description?: string;
    time_slot: string;
  }) => Promise<{ success: boolean; error?: string }>;
  fetchOrders: (status?: string) => Promise<void>;
  updateOrderStatus: (id: string, status: string) => Promise<boolean>;
  fetchStats: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  setSelectedTimeSlot: (slot: TimeSlot | null) => void;
}

const initialBookingInfo: BookingInfo = {
  date: '',
  timeSlot: null,
  projectType: '',
  description: '',
  customerName: '',
  phone: '',
};

export const useBookingStore = create<BookingState>((set, get) => ({
  timeSlots: [],
  orders: [],
  selectedDate: new Date().toISOString().split('T')[0],
  bookingInfo: initialBookingInfo,
  isLoadingSlots: false,
  isLoadingOrders: false,
  isSubmitting: false,
  stats: null,

  fetchTimeSlots: async (date: string) => {
    set({ isLoadingSlots: true });
    try {
      const response = await axios.get(`/api/time-slots?date=${date}`);
      set({ timeSlots: response.data, selectedDate: date, isLoadingSlots: false });
    } catch (error) {
      console.error('获取时段失败:', error);
      set({ isLoadingSlots: false });
    }
  },

  submitBooking: async (data) => {
    set({ isSubmitting: true });
    try {
      await axios.post('/api/orders', data);
      const { selectedDate } = get();
      await get().fetchTimeSlots(selectedDate);
      set({ isSubmitting: false });
      return { success: true };
    } catch (error: any) {
      set({ isSubmitting: false });
      const errorMsg = error.response?.data?.error || '提交失败，请重试';
      return { success: false, error: errorMsg };
    }
  },

  fetchOrders: async (status) => {
    set({ isLoadingOrders: true });
    try {
      const url = status ? `/api/orders?status=${status}` : '/api/orders';
      const response = await axios.get(url);
      set({ orders: response.data, isLoadingOrders: false });
    } catch (error) {
      console.error('获取订单失败:', error);
      set({ isLoadingOrders: false });
    }
  },

  updateOrderStatus: async (id, status) => {
    try {
      await axios.put(`/api/orders/${id}/status`, { status });
      await get().fetchOrders();
      await get().fetchStats();
      return true;
    } catch (error) {
      console.error('更新订单状态失败:', error);
      return false;
    }
  },

  fetchStats: async () => {
    try {
      const response = await axios.get('/api/stats');
      set({ stats: response.data });
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  },

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
  },

  setSelectedTimeSlot: (slot: TimeSlot | null) => {
    set((state) => ({
      bookingInfo: { ...state.bookingInfo, timeSlot: slot },
    }));
  },
}));
