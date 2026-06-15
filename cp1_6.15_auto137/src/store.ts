import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { PortfolioStore, Portfolio, Stock, PricePoint } from './types';
import { simulateNextPrice, generateId } from './utils/simulation';

function createStock(entry: { code: string; buyPrice: number; quantity: number }): Stock {
  return {
    id: generateId(),
    code: entry.code.toUpperCase(),
    buyPrice: entry.buyPrice,
    quantity: entry.quantity,
    currentPrice: entry.buyPrice,
    priceHistory: [entry.buyPrice],
    volumeHistory: [Math.floor(Math.random() * 5000) + 1000],
  };
}

function calcPortfolioTotalValue(stocks: Stock[]): number {
  return stocks.reduce((sum, s) => sum + s.currentPrice * s.quantity, 0);
}

export const useStore = create<PortfolioStore>()(
  immer((set) => ({
    portfolios: [],
    activePortfolioId: null,
    highlightedPortfolioId: null,

    addPortfolio: (name, stockEntries) => {
      const stocks = stockEntries.map(createStock);
      const now = Date.now();
      const totalValue = calcPortfolioTotalValue(stocks);
      const portfolio: Portfolio = {
        id: generateId(),
        name,
        stocks,
        priceHistory: [{ timestamp: now, totalValue }],
        createdAt: now,
      };
      set((state) => {
        state.portfolios.push(portfolio);
      });
    },

    removePortfolio: (id) => {
      set((state) => {
        state.portfolios = state.portfolios.filter((p) => p.id !== id);
        if (state.activePortfolioId === id) state.activePortfolioId = null;
        if (state.highlightedPortfolioId === id) state.highlightedPortfolioId = null;
      });
    },

    setActivePortfolio: (id) => {
      set((state) => {
        state.activePortfolioId = id;
      });
    },

    setHighlightedPortfolio: (id) => {
      set((state) => {
        state.highlightedPortfolioId = id;
      });
    },

    simulatePrice: () => {
      set((state) => {
        const now = Date.now();
        for (const portfolio of state.portfolios) {
          for (const stock of portfolio.stocks) {
            const result = simulateNextPrice(stock.currentPrice);
            stock.currentPrice = result.price;
            stock.priceHistory.push(result.price);
            stock.volumeHistory.push(result.volume);
            if (stock.priceHistory.length > 200) {
              stock.priceHistory.splice(0, stock.priceHistory.length - 200);
            }
            if (stock.volumeHistory.length > 200) {
              stock.volumeHistory.splice(0, stock.volumeHistory.length - 200);
            }
          }
          const totalValue = calcPortfolioTotalValue(portfolio.stocks);
          portfolio.priceHistory.push({ timestamp: now, totalValue });
          if (portfolio.priceHistory.length > 200) {
            portfolio.priceHistory.splice(0, portfolio.priceHistory.length - 200);
          }
        }
      });
    },
  }))
);

export function getPortfolioValue(portfolio: Portfolio): number {
  return calcPortfolioTotalValue(portfolio.stocks);
}

export function getPortfolioCost(portfolio: Portfolio): number {
  return portfolio.stocks.reduce((sum, s) => sum + s.buyPrice * s.quantity, 0);
}

export function getPortfolioPnL(portfolio: Portfolio): { value: number; percent: number } {
  const cost = getPortfolioCost(portfolio);
  const current = getPortfolioValue(portfolio);
  const value = current - cost;
  const percent = cost > 0 ? (value / cost) * 100 : 0;
  return { value: Math.round(value * 100) / 100, percent: Math.round(percent * 100) / 100 };
}

export function getPortfolioPriceArray(portfolio: Portfolio): number[] {
  return portfolio.priceHistory.map((p: PricePoint) => p.totalValue);
}
