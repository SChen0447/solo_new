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
  const longTermMean = price;

  let mu = 0;
  let sigma = 0.012;
  let sigmaSq = sigma * sigma;

  const garchOmega = 1.5e-6;
  const garchAlpha = 0.12;
  const garchBeta = 0.82;

  const ouTheta = 0.018;
  const regimeLenMin = 35;
  const regimeLenMax = 95;
  let regimeCounter = 0;
  let regimeLen = regimeLenMin + Math.floor(Math.random() * (regimeLenMax - regimeLenMin));
  let regimeDrift = (Math.random() - 0.5) * 0.004;

  let prevReturn = 0;

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * intervalMs;

    regimeCounter++;
    if (regimeCounter >= regimeLen) {
      regimeCounter = 0;
      regimeLen = regimeLenMin + Math.floor(Math.random() * (regimeLenMax - regimeLenMin));
      regimeDrift = (Math.random() - 0.5) * 0.006;
    }

    mu = mu * 0.94 + regimeDrift * 0.06;

    const innovation = gaussianRandom();
    const shock = innovation * sigma;
    sigmaSq = garchOmega + garchAlpha * prevReturn * prevReturn + garchBeta * sigmaSq;
    sigma = Math.sqrt(sigmaSq);

    const ouPull = ouTheta * (longTermMean - price) / price;

    const dt = 1;
    const drift = (mu + ouPull - 0.5 * sigmaSq) * dt;
    const ret = drift + shock;

    prevReturn = ret;

    let gapFactor = 1;
    const gapProb = Math.random();
    if (gapProb < 0.008) {
      gapFactor = 1 + (Math.random() - 0.5) * 0.025;
    } else if (gapProb < 0.012) {
      gapFactor = 1 + (Math.random() - 0.5) * 0.05;
    }

    const open = price * gapFactor;
    let close = open * (1 + ret);
    if (close <= 0) close = open * 0.95;

    const wickUp = Math.abs(gaussianRandom()) * sigma * 0.65;
    const wickDown = Math.abs(gaussianRandom()) * sigma * 0.65;

    const high = Math.max(open, close) * (1 + Math.max(0, wickUp + ret * 0.3));
    const low = Math.min(open, close) * (1 - Math.max(0, wickDown - ret * 0.3));

    const baseVolume = 600000 + Math.random() * 1200000;
    const volMultiplier = 1 + Math.abs(ret) / sigma * 2.5;
    const volRegimeMod = 0.8 + Math.abs(regimeDrift) * 120;
    const volume = Math.floor(baseVolume * volMultiplier * volRegimeMod * (0.55 + Math.random() * 0.9));

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

export function smoothMA(
  values: (number | null)[],
  viewStart: number,
  viewCount: number,
  passes: number = 2
): { x: number; y: number }[] {
  const raw: { idx: number; v: number }[] = [];
  const end = viewStart + viewCount;
  for (let i = viewStart; i < end; i++) {
    const v = values[i];
    if (v !== null && v !== undefined) raw.push({ idx: i, v });
  }
  if (raw.length < 2) return [];

  let ys = raw.map(r => r.v);
  for (let pass = 0; pass < passes; pass++) {
    const next = new Array(ys.length);
    next[0] = ys[0];
    next[ys.length - 1] = ys[ys.length - 1];
    for (let i = 1; i < ys.length - 1; i++) {
      next[i] = (ys[i - 1] + 2 * ys[i] + ys[i + 1]) / 4;
    }
    ys = next;
  }

  return raw.map((r, i) => ({ x: r.idx, y: ys[i] }));
}

export function formatPrice(price: number): string {
  if (!isFinite(price)) return '0.00';
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toFixed(4);
}

export function formatVolume(vol: number): string {
  if (!isFinite(vol)) return '0';
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
