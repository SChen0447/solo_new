export interface PlantDataPoint {
  timestamp: number;
  rootPotential: number;
  stomatalOpening: number;
  calciumOscillation: number;
  waterFlow: number;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function lerpColor(color1Hex: string, color2Hex: string, t: number): string {
  const c1 = hexToRgb(color1Hex);
  const c2 = hexToRgb(color2Hex);
  const clampedT = Math.max(0, Math.min(1, t));
  return rgbToHex(
    c1.r + (c2.r - c1.r) * clampedT,
    c1.g + (c2.g - c1.g) * clampedT,
    c1.b + (c2.b - c1.b) * clampedT
  );
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMax === inMin) return outMin;
  return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface WaveformChartOptions {
  canvas: HTMLCanvasElement;
  data: number[];
  timestamps: number[];
  color: string;
  lineWidth: number;
  yMin?: number;
  yMax?: number;
  timeWindow: number;
}

export function drawWaveformChart(options: WaveformChartOptions): void {
  const { canvas, data, timestamps, color, lineWidth, yMin, yMax, timeWindow } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx || data.length < 2) return;

  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  const now = timestamps[timestamps.length - 1];
  const startTime = now - timeWindow * 1000;

  const visibleData: number[] = [];
  const visibleTimes: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (timestamps[i] >= startTime) {
      visibleData.push(data[i]);
      visibleTimes.push(timestamps[i]);
    }
  }

  if (visibleData.length < 2) return;

  let minVal = yMin !== undefined ? yMin : Math.min(...visibleData);
  let maxVal = yMax !== undefined ? yMax : Math.max(...visibleData);

  if (minVal === maxVal) {
    minVal -= 1;
    maxVal += 1;
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;

  const numYTicks = 4;
  for (let i = 0; i <= numYTicks; i++) {
    const y = padding.top + (chartHeight / numYTicks) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const value = maxVal - ((maxVal - minVal) / numYTicks) * i;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(value.toFixed(1), padding.left - 5, y + 3);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  for (let i = 0; i < visibleData.length; i++) {
    const x = padding.left + ((visibleTimes[i] - startTime) / (timeWindow * 1000)) * chartWidth;
    const y = padding.top + chartHeight - ((visibleData[i] - minVal) / (maxVal - minVal)) * chartHeight;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, color + '40');
  gradient.addColorStop(1, color + '00');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  for (let i = 0; i < visibleData.length; i++) {
    const x = padding.left + ((visibleTimes[i] - startTime) / (timeWindow * 1000)) * chartWidth;
    const y = padding.top + chartHeight - ((visibleData[i] - minVal) / (maxVal - minVal)) * chartHeight;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.closePath();
  ctx.fill();

  const numXTicks = 4;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i <= numXTicks; i++) {
    const x = padding.left + (chartWidth / numXTicks) * i;
    const secondsAgo = Math.round((timeWindow / numXTicks) * (numXTicks - i));
    const label = secondsAgo >= 60 ? `${(secondsAgo / 60).toFixed(0)}m` : `${secondsAgo}s`;
    ctx.fillText(label, x, height - 5);
  }
}

export function calculateStats(data: number[]): { max: number; min: number; avg: number } {
  if (data.length === 0) {
    return { max: 0, min: 0, avg: 0 };
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const avg = data.reduce((sum, val) => sum + val, 0) / data.length;

  return { max, min, avg };
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
