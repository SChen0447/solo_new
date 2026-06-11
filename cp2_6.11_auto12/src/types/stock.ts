export interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  data: StockData[];
  currentPrice: number;
  change: number;
  changePercent: number;
  totalVolume: number;
  ma5: number[];
  ma10: number[];
  ma20: number[];
}

export interface ChartViewport {
  startIndex: number;
  endIndex: number;
}

export interface RefreshOption {
  label: string;
  value: number | null;
}

export const REFRESH_OPTIONS: RefreshOption[] = [
  { label: '关闭', value: null },
  { label: '5秒', value: 5000 },
  { label: '10秒', value: 10000 },
  { label: '30秒', value: 30000 },
];

export const DEFAULT_STOCKS = ['AAPL', 'GOOGL', 'MSFT'];
