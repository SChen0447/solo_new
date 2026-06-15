export interface Stock {
  id: string;
  code: string;
  buyPrice: number;
  quantity: number;
  currentPrice: number;
  priceHistory: number[];
  volumeHistory: number[];
}

export interface PricePoint {
  timestamp: number;
  totalValue: number;
}

export interface Portfolio {
  id: string;
  name: string;
  stocks: Stock[];
  priceHistory: PricePoint[];
  createdAt: number;
}

export interface PortfolioStore {
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  highlightedPortfolioId: string | null;
  addPortfolio: (name: string, stockEntries: { code: string; buyPrice: number; quantity: number }[]) => void;
  removePortfolio: (id: string) => void;
  setActivePortfolio: (id: string | null) => void;
  setHighlightedPortfolio: (id: string | null) => void;
  simulatePrice: () => void;
}
