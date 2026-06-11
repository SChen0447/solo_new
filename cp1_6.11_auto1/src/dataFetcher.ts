export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function generateKlineData(count: number = 500): Candle[] {
  const data: Candle[] = [];
  const intervalMs = 60 * 60 * 1000;
  const now = Date.now();
  let price = 42000 + Math.random() * 8000;
  let trend = 0;
  let trendStrength = 0;
  let regimeChangeCounter = 0;

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * intervalMs;

    regimeChangeCounter++;
    if (regimeChangeCounter > 40 + Math.random() * 60) {
      regimeChangeCounter = 0;
      trendStrength = (Math.random() - 0.5) * 0.006;
    }
    trend = trend * 0.92 + trendStrength * 0.08;

    const volatility = 0.012 + Math.random() * 0.025;
    const drift = trend + gaussianRandom() * volatility * 0.35;

    let gapFactor = 1;
    if (Math.random() < 0.015) {
      gapFactor = 1 + (Math.random() - 0.5) * 0.035;
    }

    const open = price * gapFactor;
    const closeChange = drift + gaussianRandom() * volatility * 0.55;
    let close = open * (1 + closeChange);

    const wickUp = Math.abs(gaussianRandom()) * volatility * 0.45;
    const wickDown = Math.abs(gaussianRandom()) * volatility * 0.45;

    const high = Math.max(open, close) * (1 + wickUp);
    const low = Math.min(open, close) * (1 - wickDown);

    const baseVolume = 800000 + Math.random() * 1500000;
    const volMultiplier = 1 + Math.abs(closeChange / volatility) * 2.2;
    const volume = Math.floor(baseVolume * volMultiplier * (0.6 + Math.random() * 0.8));

    data.push({
      timestamp,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume
    });

    price = close;
  }

  return data;
}

export function calculateSMA(data: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) {
      sum -= data[i - period].close;
    }
    if (i >= period - 1) {
      result.push(sum / period);
    } else {
      result.push(null);
    }
  }
  return result;
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toFixed(4);
}

export function formatVolume(vol: number): string {
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
  return vol.toString();
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}
