import { create } from 'zustand';
import axios from 'axios';
import type { Vendor, SearchFilters, VendorCategory, VendorStatus } from '@/types';

interface VendorState {
  vendors: Vendor[];
  filteredVendors: Vendor[];
  loading: boolean;
  error: string | null;
  filters: SearchFilters;
  selectedVendor: Vendor | null;

  fetchVendors: () => Promise<void>;
  addVendor: (data: Partial<Vendor>) => Promise<Vendor>;
  updateVendor: (id: string, data: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  getExpiringVendors: (days?: number) => Promise<Vendor[]>;
  getVendorById: (id: string) => Vendor | undefined;

  setFilters: (filters: Partial<SearchFilters>) => void;
  clearFilters: () => void;
  setSelectedVendor: (vendor: Vendor | null) => void;
  applyFilters: () => void;
}

const initialFilters: SearchFilters = {
  keyword: '',
  category: '',
  status: '',
  stallNumber: '',
};

export const useVendorStore = create<VendorState>((set, get) => ({
  vendors: [],
  filteredVendors: [],
  loading: false,
  error: null,
  filters: initialFilters,
  selectedVendor: null,

  fetchVendors: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params: Record<string, string> = {};
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.stallNumber) params.stallNumber = filters.stallNumber;

      const res = await axios.get('/api/vendors', { params });
      set({ vendors: res.data, filteredVendors: res.data, loading: false });
    } catch (err) {
      set({ error: '加载摊贩数据失败', loading: false });
    }
  },

  addVendor: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post('/api/vendors', data);
      const newVendor = res.data as Vendor;
      const { vendors } = get();
      const updated = [newVendor, ...vendors];
      set({ vendors: updated, loading: false });
      get().applyFilters();
      return newVendor;
    } catch (err) {
      set({ error: '添加摊贩失败', loading: false });
      throw err;
    }
  },

  updateVendor: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.put(`/api/vendors/${id}`, data);
      const updatedVendor = res.data as Vendor;
      const { vendors } = get();
      const updated = vendors.map(v => (v.id === id ? updatedVendor : v));
      set({ vendors: updated, loading: false });
      get().applyFilters();
    } catch (err) {
      set({ error: '更新摊贩信息失败', loading: false });
      throw err;
    }
  },

  deleteVendor: async (id) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`/api/vendors/${id}`);
      const { vendors } = get();
      const updated = vendors.filter(v => v.id !== id);
      set({ vendors: updated, loading: false });
      get().applyFilters();
    } catch (err) {
      set({ error: '删除摊贩失败', loading: false });
      throw err;
    }
  },

  getExpiringVendors: async (days = 7) => {
    try {
      const res = await axios.get(`/api/vendors/expiring/${days}`);
      return res.data as Vendor[];
    } catch {
      return [];
    }
  },

  getVendorById: (id) => {
    return get().vendors.find(v => v.id === id);
  },

  setFilters: (filters) => {
    set(state => ({ filters: { ...state.filters, ...filters } }));
    get().applyFilters();
  },

  clearFilters: () => {
    set({ filters: initialFilters });
    get().applyFilters();
  },

  setSelectedVendor: (vendor) => {
    set({ selectedVendor: vendor });
  },

  applyFilters: () => {
    const { vendors, filters } = get();
    let result = [...vendors];

    if (filters.keyword.trim()) {
      const kw = filters.keyword.toLowerCase().trim();
      result = result.filter(v =>
        v.name.toLowerCase().includes(kw) ||
        v.idCard.includes(kw) ||
        v.phone.includes(kw) ||
        v.stallNumber.toLowerCase().includes(kw)
      );
    }

    if (filters.category) {
      result = result.filter(v => v.category === filters.category);
    }

    if (filters.status) {
      result = result.filter(v => v.status === filters.status);
    }

    if (filters.stallNumber.trim()) {
      result = result.filter(v =>
        v.stallNumber.toLowerCase().includes(filters.stallNumber.toLowerCase().trim())
      );
    }

    set({ filteredVendors: result });
  },
}));
