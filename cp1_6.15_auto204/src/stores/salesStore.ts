import { create } from 'zustand';
import apiClient from '../utils/apiClient';
import { InventoryItem } from './inventoryStore';

export interface MaterialConsumption {
  inventoryId: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  materials: string;
  created_at: string;
}

export interface ProductConsumption {
  id: string;
  inventory_id: string;
  product_id: string;
  quantity_consumed: number;
  consumed_at: string;
  material_name?: string;
  unit_cost?: number;
  unit?: string;
}

export interface ReportData {
  products: Product[];
  consumptions: ProductConsumption[];
  weeklySales: { week: string; total_sales: number; count: number }[];
  materialConsumption: { inventory_id: string; material_name: string; unit: string; total_consumed: number }[];
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  topProducts: { name: string; price: number; sales_count: number; consumption_data: string }[];
}

interface SalesState {
  products: Product[];
  consumptions: ProductConsumption[];
  reportData: ReportData | null;
  loading: boolean;
  error: string | null;
  dateFilter: { startDate: string; endDate: string };
  fetchProducts: (startDate?: string, endDate?: string) => Promise<void>;
  createProduct: (name: string, price: number, materials: MaterialConsumption[]) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  fetchReport: (month?: string, startDate?: string, endDate?: string) => Promise<void>;
  setDateFilter: (filter: { startDate: string; endDate: string }) => void;
  getProductMaterials: (product: Product) => { material: InventoryItem; quantity: number }[];
}

export const useSalesStore = create<SalesState>((set, get) => ({
  products: [],
  consumptions: [],
  reportData: null,
  loading: false,
  error: null,
  dateFilter: { startDate: '', endDate: '' },

  fetchProducts: async (startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await apiClient.get('/products', { params });
      set({
        products: res.data.products,
        consumptions: res.data.consumptions,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createProduct: async (name, price, materials) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/products', { name, price, materials });
      const newProduct = res.data;
      set((state) => ({
        products: [newProduct, ...state.products],
        loading: false,
      }));
      return newProduct;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/products/${id}`);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  fetchReport: async (month, startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const params: Record<string, string> = { type: 'report' };
      if (month) params.month = month;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await apiClient.get('/products', { params });
      set({ reportData: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  setDateFilter: (filter) => set({ dateFilter: filter }),

  getProductMaterials: (product) => {
    try {
      const materials = JSON.parse(product.materials) as MaterialConsumption[];
      return materials.map((m) => ({
        material: { id: m.inventoryId } as InventoryItem,
        quantity: m.quantity,
      }));
    } catch {
      return [];
    }
  },
}));
