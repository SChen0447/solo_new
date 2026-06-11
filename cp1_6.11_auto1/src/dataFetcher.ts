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

function poissonRandom(lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda < 30) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  } else {
    return Math.max(0, Math.floor(lambda + gaussianRandom() * Math.sqrt(lambda)));
  }
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

  const jumpLambda = 0.035;
  const jumpMu = 0;
  const jumpSigma = 0.045;
  const jumpK = Math.exp(jumpMu + jumpSigma * jumpSigma / 2) - 1;
  const jumpCompensation = jumpLambda * jumpK;

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

    const jumpCount = poissonRandom(jumpLambda);
    let jumpTerm = 0;
    for (let j = 0; j < jumpCount; j++) {
      jumpTerm += Math.exp(jumpMu + jumpSigma * gaussianRandom()) - 1;
    }

    const dt = 1;
    const drift = (mu + ouPull - jumpCompensation - 0.5 * sigmaSq) * dt;
    const ret = drift + shock + jumpTerm;

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

    const wickUp = Math.abs(gaussianRandom()) * sigma * 0.65 + Math.max(0, jumpTerm) * 0.4;
    const wickDown = Math.abs(gaussianRandom()) * sigma * 0.65 + Math.max(0, -jumpTerm) * 0.4;

    const high = Math.max(open, close) * (1 + Math.max(0, wickUp + ret * 0.3));
    const low = Math.min(open, close) * (1 - Math.max(0, wickDown - ret * 0.3));

    const baseVolume = 600000 + Math.random() * 1200000;
    const volMultiplier = 1 + Math.abs(ret) / sigma * 2.5 + jumpCount * 4;
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

function savitzkyGolay5Quad(ys: number[]): number[] {
  const n = ys.length;
  if (n < 5) return ys.slice();
  const out = new Array(n);
  out[0] = ys[0];
  out[1] = ys[1];
  out[n - 2] = ys[n - 2];
  out[n - 1] = ys[n - 1];
  for (let i = 2; i < n - 2; i++) {
    out[i] = (-3 * ys[i - 2] + 12 * ys[i - 1] + 17 * ys[i] + 12 * ys[i + 1] - 3 * ys[i + 2]) / 35;
  }
  return out;
}

export function smoothMA(
  values: (number | null)[],
  viewStart: number,
  viewCount: number,
  passes: number = 4
): { x: number; y: number }[] {
  const raw: { idx: number; v: number }[] = [];
  const end = viewStart + viewCount;
  for (let i = viewStart; i < end; i++) {
    const v = values[i];
    if (v !== null && v !== undefined) raw.push({ idx: i, v });
  }
  if (raw.length < 5) {
    if (raw.length < 2) return [];
    return raw.map(r => ({ x: r.idx, y: r.v }));
  }

  let ys = raw.map(r => r.v);
  for (let pass = 0; pass < passes; pass++) {
    ys = savitzkyGolay5Quad(ys);
  }

  return raw.map((r, i) => ({ x: r.idx, y: ys[i] }));
}

export function computeRollingStd(
  data: Candle[],
  start: number,
  end: number
): number {
  const n = end - start;
  if (n < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = start; i < end; i++) {
    const c = data[i];
    if (!c) continue;
    const ret = Math.log(Math.max(c.close, 1e-9) / Math.max(c.open, 1e-9));
    sum += ret;
    sumSq += ret * ret;
    count++;
  }
  if (count < 2) return 0;
  const mean = sum / count;
  const variance = (sumSq - count * mean * mean) / (count - 1);
  if (!isFinite(variance) || variance < 0) return 0;
  return Math.sqrt(variance);
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
