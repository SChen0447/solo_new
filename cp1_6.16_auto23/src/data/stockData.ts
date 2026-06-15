export interface DailyPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Stock {
  code: string;
  name: string;
  currentPrice: number;
  change: number;
  priceHistory: DailyPrice[];
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function generateDailyPrices(
  basePrice: number,
  days: number = 30,
  volatility: number = 0.025
): DailyPrice[] {
  const result: DailyPrice[] = [];
  let price = basePrice * (1 - Math.random() * 0.15);
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    if (weekend && i > 0) continue;

    const drift = (Math.random() - 0.48) * volatility;
    const open = price;
    const close = Math.max(1, open * (1 + drift));
    const range = Math.abs(close - open) + open * volatility * Math.random();
    const high = Math.max(open, close) + range * Math.random();
    const low = Math.min(open, close) - range * Math.random();
    const volume = Math.floor(1_000_000 + Math.random() * 9_000_000);

    result.push({
      date: formatDate(d),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +Math.max(0.01, low).toFixed(2),
      close: +close.toFixed(2),
      volume,
    });

    price = close;
  }

  while (result.length < days) {
    const last = result[result.length - 1] || { date: formatDate(today), close: price };
    const d = new Date(last.date);
    d.setDate(d.getDate() + 1);
    const drift = (Math.random() - 0.48) * volatility;
    const open = last.close;
    const close = Math.max(1, open * (1 + drift));
    const range = Math.abs(close - open) + open * volatility * Math.random();
    result.push({
      date: formatDate(d),
      open: +open.toFixed(2),
      high: +(Math.max(open, close) + range * Math.random()).toFixed(2),
      low: +Math.max(0.01, Math.min(open, close) - range * Math.random()).toFixed(2),
      close: +close.toFixed(2),
      volume: Math.floor(1_000_000 + Math.random() * 9_000_000),
    });
  }

  return result.slice(-days);
}

function makeStock(
  code: string,
  name: string,
  basePrice: number
): Stock {
  const history = generateDailyPrices(basePrice, 30);
  const currentPrice = history[history.length - 1].close;
  const prevClose = history.length > 1 ? history[history.length - 2].close : currentPrice;
  const change = +(((currentPrice - prevClose) / prevClose) * 100).toFixed(2);
  return { code, name, currentPrice, change, priceHistory: history };
}

export const stockData: Stock[] = [
  makeStock('AAPL', '苹果公司', 185),
  makeStock('TSLA', '特斯拉', 245),
  makeStock('MSFT', '微软', 420),
  makeStock('GOOGL', '谷歌', 175),
  makeStock('AMZN', '亚马逊', 185),
  makeStock('META', 'Meta平台', 505),
  makeStock('NVDA', '英伟达', 125),
  makeStock('AMD', '超威半导体', 165),
  makeStock('NFLX', '奈飞', 650),
  makeStock('DIS', '迪士尼', 105),
  makeStock('BABA', '阿里巴巴', 85),
  makeStock('JD', '京东', 28),
  makeStock('PDD', '拼多多', 145),
  makeStock('BIDU', '百度', 95),
  makeStock('KO', '可口可乐', 62),
];
