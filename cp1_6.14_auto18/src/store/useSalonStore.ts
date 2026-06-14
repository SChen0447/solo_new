import { create } from 'zustand';
import axios from 'axios';
import type { Appointment, AppointmentFormData, Statistics, FilterOptions, ServiceType, AppointmentStatus } from '../types';

interface SalonState {
  appointments: Appointment[];
  statistics: Statistics | null;
  loading: boolean;
  error: string | null;
  filters: FilterOptions;
  visibleCount: number;
  fetchAppointments: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  addAppointment: (data: AppointmentFormData) => Promise<boolean>;
  cancelAppointment: (id: string) => Promise<boolean>;
  checkConflict: (date: string, time: string, excludeId?: string) => Promise<boolean>;
  getCustomerHistory: (phone: string) => Promise<Appointment[]>;
  setFilters: (filters: Partial<FilterOptions>) => void;
  loadMore: () => void;
  getFilteredAppointments: () => Appointment[];
  getSortedAppointments: () => Appointment[];
}

const API_BASE = '/api';

export const useSalonStore = create<SalonState>((set, get) => ({
  appointments: [],
  statistics: null,
  loading: false,
  error: null,
  filters: {
    search: '',
    service: 'all',
    status: 'all'
  },
  visibleCount: 20,

  fetchAppointments: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get<Appointment[]>(`${API_BASE}/appointments`);
      set({ appointments: response.data, loading: false });
    } catch (error) {
      set({ error: '获取预约列表失败', loading: false });
    }
  },

  fetchStatistics: async () => {
    try {
      const response = await axios.get<Statistics>(`${API_BASE}/statistics`);
      set({ statistics: response.data });
    } catch (error) {
      console.error('获取统计数据失败');
    }
  },

  addAppointment: async (data: AppointmentFormData) => {
    set({ loading: true, error: null });
    try {
      await axios.post<Appointment>(`${API_BASE}/appointments`, data);
      await Promise.all([get().fetchAppointments(), get().fetchStatistics()]);
      set({ loading: false });
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || '添加预约失败';
      set({ error: message, loading: false });
      return false;
    }
  },

  cancelAppointment: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await axios.put(`${API_BASE}/appointments/${id}/cancel`);
      await Promise.all([get().fetchAppointments(), get().fetchStatistics()]);
      set({ loading: false });
      return true;
    } catch (error) {
      set({ error: '取消预约失败', loading: false });
      return false;
    }
  },

  checkConflict: async (date: string, time: string, excludeId?: string) => {
    try {
      const params: Record<string, string> = { date, time };
      if (excludeId) params.excludeId = excludeId;
      const response = await axios.get<{ conflict: boolean }>(`${API_BASE}/check-conflict`, { params });
      return response.data.conflict;
    } catch (error) {
      return false;
    }
  },

  getCustomerHistory: async (phone: string) => {
    try {
      const response = await axios.get<Appointment[]>(`${API_BASE}/appointments/customer/${phone}`);
      return response.data;
    } catch (error) {
      return [];
    }
  },

  setFilters: (filters: Partial<FilterOptions>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      visibleCount: 20
    }));
  },

  loadMore: () => {
    set((state) => ({
      visibleCount: Math.min(state.visibleCount + 20, state.appointments.length)
    }));
  },

  getFilteredAppointments: () => {
    const { appointments, filters } = get();
    return appointments.filter((apt) => {
      const matchesSearch = apt.name.toLowerCase().includes(filters.search.toLowerCase());
      const matchesService = filters.service === 'all' || apt.service === filters.service;
      const matchesStatus = filters.status === 'all' || apt.status === filters.status;
      return matchesSearch && matchesService && matchesStatus;
    });
  },

  getSortedAppointments: () => {
    const filtered = get().getFilteredAppointments();
    return filtered.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`).getTime();
      const dateB = new Date(`${b.date} ${b.time}`).getTime();
      return dateA - dateB;
    });
  }
}));
