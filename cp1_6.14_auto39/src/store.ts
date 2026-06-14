import { create } from 'zustand';
import axios from 'axios';
import { HobbyFigure } from './types';

interface FigureStore {
  figures: HobbyFigure[];
  loading: boolean;
  error: string | null;
  fetchFigures: () => Promise<void>;
  addFigure: (figure: Omit<HobbyFigure, 'id'>) => Promise<void>;
  updateFigure: (id: string, figure: Partial<HobbyFigure>) => Promise<void>;
  deleteFigure: (id: string) => Promise<void>;
  getFigureById: (id: string) => HobbyFigure | undefined;
  getTotalValue: () => number;
  getTotalPurchase: () => number;
  getTotalProfit: () => number;
  getProfitRate: () => number;
  getManufacturerStats: () => { name: string; count: number; value: number }[];
  getSeriesStats: () => { name: string; value: number; count: number }[];
  getManufacturerDistribution: () => { labels: string[]; data: number[]; colors: string[] };
  getSeriesValueRanking: () => { labels: string[]; data: number[] };
}

const MANUFACTURER_COLORS: Record<string, string> = {
  'Good Smile Company': '#e94560',
  'Aniplex': '#f59e0b',
  'Kotobukiya': '#3b82f6',
  'Alter': '#10b981',
  'Bandai Namco': '#8b5cf6',
  'Megahouse': '#ec4899',
  'Phat!': '#14b8a6',
  'Native': '#f97316',
  '其他': '#6b7280'
};

const CHART_COLORS = [
  '#e94560', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

export const useFigureStore = create<FigureStore>((set, get) => ({
  figures: [],
  loading: false,
  error: null,

  fetchFigures: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get('/api/figures');
      set({ figures: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message || '加载失败', loading: false });
    }
  },

  addFigure: async (figure) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post('/api/figures', figure);
      set(state => ({ figures: [...state.figures, res.data], loading: false }));
    } catch (err: any) {
      set({ error: err.message || '添加失败', loading: false });
      throw err;
    }
  },

  updateFigure: async (id, figure) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.put(`/api/figures/${id}`, figure);
      set(state => ({
        figures: state.figures.map(f => f.id === id ? res.data : f),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message || '更新失败', loading: false });
      throw err;
    }
  },

  deleteFigure: async (id) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`/api/figures/${id}`);
      set(state => ({
        figures: state.figures.filter(f => f.id !== id),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message || '删除失败', loading: false });
      throw err;
    }
  },

  getFigureById: (id) => {
    return get().figures.find(f => f.id === id);
  },

  getTotalValue: () => {
    return get().figures.reduce((sum, f) => sum + f.currentValue, 0);
  },

  getTotalPurchase: () => {
    return get().figures.reduce((sum, f) => sum + f.purchasePrice, 0);
  },

  getTotalProfit: () => {
    return get().getTotalValue() - get().getTotalPurchase();
  },

  getProfitRate: () => {
    const purchase = get().getTotalPurchase();
    if (purchase === 0) return 0;
    return (get().getTotalProfit() / purchase) * 100;
  },

  getManufacturerStats: () => {
    const map = new Map<string, { count: number; value: number }>();
    get().figures.forEach(f => {
      const existing = map.get(f.manufacturer) || { count: 0, value: 0 };
      map.set(f.manufacturer, {
        count: existing.count + 1,
        value: existing.value + f.currentValue
      });
    });
    return Array.from(map.entries()).map(([name, stats]) => ({
      name,
      count: stats.count,
      value: stats.value
    }));
  },

  getSeriesStats: () => {
    const map = new Map<string, { value: number; count: number }>();
    get().figures.forEach(f => {
      const existing = map.get(f.series) || { value: 0, count: 0 };
      map.set(f.series, {
        value: existing.value + f.currentValue,
        count: existing.count + 1
      });
    });
    return Array.from(map.entries()).map(([name, stats]) => ({
      name,
      value: stats.value,
      count: stats.count
    }));
  },

  getManufacturerDistribution: () => {
    const stats = get().getManufacturerStats();
    const labels = stats.map(s => s.name);
    const data = stats.map(s => s.count);
    const colors = stats.map(s => MANUFACTURER_COLORS[s.name] || CHART_COLORS[labels.indexOf(s.name) % CHART_COLORS.length]);
    return { labels, data, colors };
  },

  getSeriesValueRanking: () => {
    const stats = get().getSeriesStats()
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    return {
      labels: stats.map(s => s.name),
      data: stats.map(s => s.value)
    };
  }
}));
