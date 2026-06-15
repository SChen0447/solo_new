import React, { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Stock, stockData } from '../data/stockData';

export interface Position {
  code: string;
  name: string;
  shares: number;
  avgCost: number;
}

export interface TradeRecord {
  id: string;
  code: string;
  name: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  amount: number;
  timestamp: number;
}

export interface PortfolioState {
  cash: number;
  positions: Position[];
  trades: TradeRecord[];
  searchQuery: string;
  selectedStockCode: string | null;
}

type PortfolioAction =
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SELECT_STOCK'; payload: string | null }
  | { type: 'BUY_STOCK'; payload: { code: string; shares: number } }
  | { type: 'SELL_STOCK'; payload: { code: string; shares: number } };

const initialState: PortfolioState = {
  cash: 100000,
  positions: [],
  trades: [],
  searchQuery: '',
  selectedStockCode: null,
};

function getStockByCode(code: string): Stock | undefined {
  return stockData.find((s) => s.code === code);
}

function portfolioReducer(state: PortfolioState, action: PortfolioAction): PortfolioState {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'SELECT_STOCK':
      return { ...state, selectedStockCode: action.payload };

    case 'BUY_STOCK': {
      const { code, shares } = action.payload;
      const stock = getStockByCode(code);
      if (!stock || shares <= 0) return state;

      const amount = +(stock.currentPrice * shares).toFixed(2);
      if (amount > state.cash) return state;

      const existingIdx = state.positions.findIndex((p) => p.code === code);
      let newPositions: Position[];

      if (existingIdx >= 0) {
        const pos = state.positions[existingIdx];
        const totalShares = pos.shares + shares;
        const totalCost = pos.avgCost * pos.shares + amount;
        const newAvgCost = +(totalCost / totalShares).toFixed(2);
        newPositions = state.positions.map((p, i) =>
          i === existingIdx ? { ...p, shares: totalShares, avgCost: newAvgCost } : p
        );
      } else {
        newPositions = [
          ...state.positions,
          {
            code,
            name: stock.name,
            shares,
            avgCost: +(amount / shares).toFixed(2),
          },
        ];
      }

      const trade: TradeRecord = {
        id: uuidv4(),
        code,
        name: stock.name,
        type: 'buy',
        shares,
        price: stock.currentPrice,
        amount,
        timestamp: Date.now(),
      };

      return {
        ...state,
        cash: +(state.cash - amount).toFixed(2),
        positions: newPositions,
        trades: [trade, ...state.trades],
      };
    }

    case 'SELL_STOCK': {
      const { code, shares } = action.payload;
      const stock = getStockByCode(code);
      const pos = state.positions.find((p) => p.code === code);
      if (!stock || !pos || shares <= 0 || shares > pos.shares) return state;

      const amount = +(stock.currentPrice * shares).toFixed(2);
      const remainingShares = pos.shares - shares;
      let newPositions: Position[];

      if (remainingShares === 0) {
        newPositions = state.positions.filter((p) => p.code !== code);
      } else {
        newPositions = state.positions.map((p) =>
          p.code === code ? { ...p, shares: remainingShares } : p
        );
      }

      const trade: TradeRecord = {
        id: uuidv4(),
        code,
        name: stock.name,
        type: 'sell',
        shares,
        price: stock.currentPrice,
        amount,
        timestamp: Date.now(),
      };

      return {
        ...state,
        cash: +(state.cash + amount).toFixed(2),
        positions: newPositions,
        trades: [trade, ...state.trades],
      };
    }

    default:
      return state;
  }
}

interface PortfolioContextValue {
  state: PortfolioState;
  dispatch: React.Dispatch<PortfolioAction>;
  filteredStocks: Stock[];
  selectedStock: Stock | null;
  totalAssets: number;
  marketValue: number;
  dailyPnL: number;
  dailyPnLPct: number;
  totalPnL: number;
  totalPnLPct: number;
}

const PortfolioContext = createContext<PortfolioContextValue | undefined>(undefined);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(portfolioReducer, initialState);

  const value = useMemo<PortfolioContextValue>(() => {
    const q = state.searchQuery.trim().toUpperCase();
    const filteredStocks = q
      ? stockData.filter(
          (s) => s.code.includes(q) || s.name.toUpperCase().includes(q)
        )
      : [];

    const selectedStock =
      state.selectedStockCode != null
        ? getStockByCode(state.selectedStockCode) ?? null
        : null;

    let marketValue = 0;
    let dailyPnL = 0;
    let totalCost = 0;

    for (const pos of state.positions) {
      const s = getStockByCode(pos.code);
      if (!s) continue;
      const mv = s.currentPrice * pos.shares;
      marketValue += mv;
      totalCost += pos.avgCost * pos.shares;
      const todayPrice = s.priceHistory[s.priceHistory.length - 1].close;
      const yesterdayPrice =
        s.priceHistory.length > 1
          ? s.priceHistory[s.priceHistory.length - 2].close
          : todayPrice;
      dailyPnL += (todayPrice - yesterdayPrice) * pos.shares;
    }

    marketValue = +marketValue.toFixed(2);
    dailyPnL = +dailyPnL.toFixed(2);
    const totalAssets = +(state.cash + marketValue).toFixed(2);
    const yesterdayAssets = +(totalAssets - dailyPnL).toFixed(2);
    const dailyPnLPct =
      yesterdayAssets > 0 ? +((dailyPnL / yesterdayAssets) * 100).toFixed(2) : 0;
    const totalPnL = +(marketValue - totalCost).toFixed(2);
    const totalPnLPct =
      totalCost > 0 ? +((totalPnL / totalCost) * 100).toFixed(2) : 0;

    return {
      state,
      dispatch,
      filteredStocks,
      selectedStock,
      totalAssets,
      marketValue,
      dailyPnL,
      dailyPnLPct,
      totalPnL,
      totalPnLPct,
    };
  }, [state]);

  return (
    <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
}
