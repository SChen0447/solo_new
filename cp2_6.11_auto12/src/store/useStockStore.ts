import { create } from 'zustand';
import { Stock, DEFAULT_STOCKS } from '../types/stock';
import { createStock, updateStockData } from '../utils';

interface StockStore {
  stocks: Stock[];
  refreshInterval: number | null;
  isSidebarCollapsed: boolean;
  isLoading: boolean;
  addStock: (symbol: string) => Promise<void>;
  removeStock: (id: string) => void;
  reorderStocks: (fromIndex: number, toIndex: number) => void;
  refreshStock: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  setRefreshInterval: (interval: number | null) => void;
  toggleSidebar: () => void;
  initDefaultStocks: () => void;
}

export const useStockStore = create<StockStore>((set, get) => ({
  stocks: [],
  refreshInterval: null,
  isSidebarCollapsed: false,
  isLoading: false,

  initDefaultStocks: () => {
    set({ isLoading: true });
    const stocks = DEFAULT_STOCKS.map(symbol => createStock(symbol));
    set({ stocks, isLoading: false });
  },

  addStock: async (symbol: string) => {
    const upperSymbol = symbol.toUpperCase().trim();
    if (!upperSymbol) return;

    const { stocks } = get();
    if (stocks.some(s => s.symbol === upperSymbol)) {
      return;
    }

    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 300));
    const newStock = createStock(upperSymbol);
    set(state => ({ stocks: [...state.stocks, newStock], isLoading: false }));
  },

  removeStock: (id: string) => {
    set(state => ({
      stocks: state.stocks.filter(s => s.id !== id),
    }));
  },

  reorderStocks: (fromIndex: number, toIndex: number) => {
    set(state => {
      const newStocks = [...state.stocks];
      const [removed] = newStocks.splice(fromIndex, 1);
      newStocks.splice(toIndex, 0, removed);
      return { stocks: newStocks };
    });
  },

  refreshStock: async (id: string) => {
    set(state => ({
      stocks: state.stocks.map(s =>
        s.id === id ? updateStockData(s) : s
      ),
    }));
  },

  refreshAll: async () => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 200));
    set(state => ({
      stocks: state.stocks.map(s => updateStockData(s)),
      isLoading: false,
    }));
  },

  setRefreshInterval: (interval: number | null) => {
    set({ refreshInterval: interval });
  },

  toggleSidebar: () => {
    set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
  },
}));
