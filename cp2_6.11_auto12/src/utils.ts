import { StockData, Stock } from './types/stock';

const STOCK_NAMES: Record<string, string> = {
  AAPL: 'Apple Inc.',
  GOOGL: 'Alphabet Inc.',
  MSFT: 'Microsoft Corp.',
  AMZN: 'Amazon.com Inc.',
  TSLA: 'Tesla Inc.',
  META: 'Meta Platforms',
  NVDA: 'NVIDIA Corp.',
  NFLX: 'Netflix Inc.',
};

export function generateStockData(symbol: string, days: number = 30): StockData[] {
  const data: StockData[] = [];
  const basePrice = getBasePrice(symbol);
  let currentPrice = basePrice;
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const volatility = basePrice * 0.02;
    const change = (Math.random() - 0.5) * volatility * 2;
    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 50000000) + 10000000;

    data.push({
      date: formatDate(date),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
  }

  return data;
}

export function createStock(symbol: string): Stock {
  const upperSymbol = symbol.toUpperCase();
  const data = generateStockData(upperSymbol);
  const latestData = data[data.length - 1];
  const previousData = data[data.length - 2];
  const currentPrice = latestData.close;
  const change = currentPrice - previousData.close;
  const changePercent = (change / previousData.close) * 100;
  const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);

  return {
    id: `${upperSymbol}-${Date.now()}`,
    symbol: upperSymbol,
    name: STOCK_NAMES[upperSymbol] || upperSymbol,
    data,
    currentPrice,
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    totalVolume,
    ma5: calculateMA(data, 5),
    ma10: calculateMA(data, 10),
    ma20: calculateMA(data, 20),
  };
}

export function calculateMA(data: StockData[], period: number): number[] {
  const ma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
      ma.push(parseFloat((sum / period).toFixed(2)));
    }
  }
  return ma;
}

export function updateStockData(stock: Stock): Stock {
  const data = [...stock.data];
  const lastData = data[data.length - 1];
  const volatility = stock.currentPrice * 0.01;
  const change = (Math.random() - 0.5) * volatility * 2;
  const newClose = parseFloat((lastData.close + change).toFixed(2));
  const newHigh = parseFloat((Math.max(lastData.close, newClose) + Math.random() * volatility * 0.3).toFixed(2));
  const newLow = parseFloat((Math.min(lastData.close, newClose) - Math.random() * volatility * 0.3).toFixed(2));
  const newVolume = Math.floor(Math.random() * 50000000) + 10000000;

  const today = formatDate(new Date());
  if (lastData.date === today) {
    data[data.length - 1] = {
      ...lastData,
      close: newClose,
      high: Math.max(lastData.high, newHigh),
      low: Math.min(lastData.low, newLow),
      volume: lastData.volume + Math.floor(newVolume * 0.1),
    };
  } else {
    data.push({
      date: today,
      open: lastData.close,
      high: newHigh,
      low: newLow,
      close: newClose,
      volume: newVolume,
    });
    if (data.length > 60) {
      data.shift();
    }
  }

  const previousClose = data.length >= 2 ? data[data.length - 2].close : newClose;
  const priceChange = newClose - previousClose;
  const changePercent = (priceChange / previousClose) * 100;

  return {
    ...stock,
    data,
    currentPrice: newClose,
    change: parseFloat(priceChange.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    totalVolume: data.reduce((sum, d) => sum + d.volume, 0),
    ma5: calculateMA(data, 5),
    ma10: calculateMA(data, 10),
    ma20: calculateMA(data, 20),
  };
}

export function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatVolume(volume: number): string {
  if (volume >= 1000000000) {
    return (volume / 1000000000).toFixed(2) + 'B';
  } else if (volume >= 1000000) {
    return (volume / 1000000).toFixed(2) + 'M';
  } else if (volume >= 1000) {
    return (volume / 1000).toFixed(2) + 'K';
  }
  return volume.toString();
}

export function formatChangePercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

function getBasePrice(symbol: string): number {
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 50 + (hash % 300);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
