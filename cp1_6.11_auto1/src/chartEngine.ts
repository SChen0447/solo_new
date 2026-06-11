import type { Candle } from './dataFetcher';
import { calculateSMA, formatPrice, formatVolume, formatTime } from './dataFetcher';

interface CrosshairInfo {
  dataIndex: number;
  x: number;
  y: number;
  price: number;
}

export class ChartEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  private data: Candle[] = [];
  private sma5: (number | null)[] = [];
  private sma20: (number | null)[] = [];

  private width: number = 0;
  private height: number = 0;

  private paddingLeft = 70;
  private paddingRight = 16;
  private paddingTop = 18;
  private paddingBottom = 52;

  private priceAreaTop = 0;
  private priceAreaBottom = 0;
  private priceAreaHeight = 0;
  private volumeAreaTop = 0;
  private volumeAreaBottom = 0;
  private volumeAreaHeight = 0;

  private viewStart: number = 0;
  private viewCount: number = 120;
  private minViewCount = 20;
  private maxViewCount = 0;

  private minPrice: number = 0;
  private maxPrice: number = 0;
  private maxVolume: number = 0;

  private candleWidth: number = 0;
  private candleGap: number = 2;

  private crosshair: CrosshairInfo | null = null;
  private hovered: boolean = false;

  private rafId: number | null = null;
  private needsRender: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
  }

  setData(data: Candle[]): void {
    this.data = data;
    this.sma5 = calculateSMA(data, 5);
    this.sma20 = calculateSMA(data, 20);
    this.viewStart = Math.max(0, data.length - this.viewCount);
    this.maxViewCount = data.length;
    this.scheduleRender();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const totalChartHeight = this.height - this.paddingTop - this.paddingBottom;
    this.priceAreaHeight = Math.floor(totalChartHeight * 0.72);
    this.volumeAreaHeight = totalChartHeight - this.priceAreaHeight - 1;

    this.priceAreaTop = this.paddingTop;
    this.priceAreaBottom = this.priceAreaTop + this.priceAreaHeight;
    this.volumeAreaTop = this.priceAreaBottom + 1;
    this.volumeAreaBottom = this.volumeAreaTop + this.volumeAreaHeight;

    this.scheduleRender();
  }

  setView(start: number, count: number): void {
    const c = Math.max(this.minViewCount, Math.min(this.maxViewCount, count));
    const s = Math.max(0, Math.min(this.data.length - c, start));
    if (s !== this.viewStart || c !== this.viewCount) {
      this.viewStart = s;
      this.viewCount = c;
      this.scheduleRender();
    }
  }

  getView(): { start: number; count: number } {
    return { start: this.viewStart, count: this.viewCount };
  }

  getDataLength(): number {
    return this.data.length;
  }

  zoomAt(dataX: number, factor: number): void {
    const newCount = Math.max(
      this.minViewCount,
      Math.min(this.maxViewCount, Math.round(this.viewCount * factor))
    );
    const ratio = (dataX - this.viewStart) / this.viewCount;
    const newStart = Math.max(
      0,
      Math.min(this.data.length - newCount, Math.round(dataX - ratio * newCount))
    );
    this.setView(newStart, newCount);
  }

  pan(offset: number): void {
    const step = Math.ceil(this.viewCount * Math.abs(offset) / (this.width - this.paddingLeft - this.paddingRight));
    const delta = offset >= 0 ? step : -step;
    this.setView(this.viewStart + delta, this.viewCount);
  }

  setCrosshair(mouseX: number, mouseY: number): void {
    if (mouseX < this.paddingLeft || mouseX > this.width - this.paddingRight) {
      if (this.crosshair) {
        this.crosshair = null;
        this.hovered = false;
        this.scheduleRender();
      }
      return;
    }
    this.hovered = true;
    const chartWidth = this.width - this.paddingLeft - this.paddingRight;
    const ratio = (mouseX - this.paddingLeft) / chartWidth;
    let idx = Math.floor(this.viewStart + ratio * this.viewCount);
    idx = Math.max(this.viewStart, Math.min(this.viewStart + this.viewCount - 1, idx));

    const x = this.indexToX(idx);
    let y = mouseY;
    let price = this.yToPrice(y);
    price = Math.max(this.minPrice, Math.min(this.maxPrice, price));
    y = this.priceToY(price);

    if (!this.crosshair ||
        this.crosshair.dataIndex !== idx ||
        Math.abs(this.crosshair.x - x) > 0.5 ||
        Math.abs(this.crosshair.price - price) > 0.5) {
      this.crosshair = { dataIndex: idx, x, y, price };
      this.scheduleRender();
    }
  }

  clearCrosshair(): void {
    if (this.crosshair) {
      this.crosshair = null;
      this.hovered = false;
      this.scheduleRender();
    }
  }

  getCrosshairCandle(): Candle | null {
    if (!this.crosshair) return null;
    return this.data[this.crosshair.dataIndex] ?? null;
  }

  startRenderLoop(): void {
    const loop = () => {
      if (this.needsRender) {
        this.render();
        this.needsRender = false;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stopRenderLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private scheduleRender(): void {
    this.needsRender = true;
  }

  private indexToX(i: number): number {
    const chartWidth = this.width - this.paddingLeft - this.paddingRight;
    const step = chartWidth / this.viewCount;
    return this.paddingLeft + (i - this.viewStart + 0.5) * step;
  }

  private priceToY(p: number): number {
    const range = this.maxPrice - this.minPrice;
    if (range === 0) return this.priceAreaTop + this.priceAreaHeight / 2;
    return this.priceAreaBottom - ((p - this.minPrice) / range) * this.priceAreaHeight;
  }

  private yToPrice(y: number): number {
    const range = this.maxPrice - this.minPrice;
    return this.minPrice + ((this.priceAreaBottom - y) / this.priceAreaHeight) * range;
  }

  private volumeToY(v: number): number {
    if (this.maxVolume === 0) return this.volumeAreaBottom;
    return this.volumeAreaBottom - (v / this.maxVolume) * (this.volumeAreaHeight - 4);
  }

  private updateVisibleRange(): void {
    const end = this.viewStart + this.viewCount;
    let minP = Infinity;
    let maxP = -Infinity;
    let maxV = 0;
    for (let i = this.viewStart; i < end; i++) {
      const c = this.data[i];
      if (!c) continue;
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
      if (this.sma5[i] !== null && this.sma5[i]! < minP) minP = this.sma5[i]!;
      if (this.sma5[i] !== null && this.sma5[i]! > maxP) maxP = this.sma5[i]!;
      if (this.sma20[i] !== null && this.sma20[i]! < minP) minP = this.sma20[i]!;
      if (this.sma20[i] !== null && this.sma20[i]! > maxP) maxP = this.sma20[i]!;
      if (c.volume > maxV) maxV = c.volume;
    }
    const padding = (maxP - minP) * 0.08;
    this.minPrice = minP - padding;
    this.maxPrice = maxP + padding;
    this.maxVolume = maxV * 1.1;

    const chartWidth = this.width - this.paddingLeft - this.paddingRight;
    const step = chartWidth / this.viewCount;
    this.candleWidth = Math.max(1, step - this.candleGap);
  }

  private render(): void {
    if (this.data.length === 0) return;
    this.updateVisibleRange();

    const ctx = this.ctx;
    ctx.fillStyle = '#0f0f1f';
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawGrid();
    this.drawVolume();
    this.drawCandles();
    this.drawMA(this.sma5, '#f97316', 'rgba(249, 115, 22, 0.12)');
    this.drawMA(this.sma20, '#3b82f6', 'rgba(59, 130, 246, 0.12)');
    this.drawDivider();
    this.drawPriceLabels();
    this.drawTimeLabels();

    if (this.crosshair && this.hovered) {
      this.drawCrosshair();
    }
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = this.priceAreaTop + (this.priceAreaHeight / steps) * i;
      ctx.moveTo(this.paddingLeft, y);
      ctx.lineTo(this.width - this.paddingRight, y);
    }

    const volSteps = 2;
    for (let i = 1; i <= volSteps; i++) {
      const y = this.volumeAreaTop + (this.volumeAreaHeight / volSteps) * i;
      ctx.moveTo(this.paddingLeft, y);
      ctx.lineTo(this.width - this.paddingRight, y);
    }

    const xSteps = 6;
    for (let i = 0; i <= xSteps; i++) {
      const x = this.paddingLeft + ((this.width - this.paddingLeft - this.paddingRight) / xSteps) * i;
      ctx.moveTo(x, this.priceAreaTop);
      ctx.lineTo(x, this.volumeAreaBottom);
    }

    ctx.stroke();
  }

  private drawCandles(): void {
    const ctx = this.ctx;
    const end = this.viewStart + this.viewCount;
    const halfW = this.candleWidth / 2;

    for (let i = this.viewStart; i < end; i++) {
      const c = this.data[i];
      if (!c) continue;
      const x = this.indexToX(i);
      const isUp = c.close >= c.open;
      const color = isUp ? '#ef4444' : '#22c55e';

      const highY = this.priceToY(c.high);
      const lowY = this.priceToY(c.low);
      const openY = this.priceToY(c.open);
      const closeY = this.priceToY(c.close);

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      const bodyTop = Math.min(openY, closeY);
      const bodyH = Math.max(1, Math.abs(closeY - openY));
      ctx.fillRect(x - halfW, bodyTop, this.candleWidth, bodyH);
    }
  }

  private drawMA(values: (number | null)[], color: string, shadowColor: string): void {
    const ctx = this.ctx;
    const end = this.viewStart + this.viewCount;
    const pts: { x: number; y: number }[] = [];

    for (let i = this.viewStart; i < end; i++) {
      const v = values[i];
      if (v === null || v === undefined) continue;
      pts.push({ x: this.indexToX(i), y: this.priceToY(v) });
    }

    if (pts.length < 2) return;

    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, this.priceAreaBottom);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(pts[pts.length - 1].x, this.priceAreaBottom);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 2; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    if (pts.length >= 2) {
      const last2 = pts[pts.length - 2];
      const last1 = pts[pts.length - 1];
      ctx.quadraticCurveTo(last2.x, last2.y, last1.x, last1.y);
    }
    ctx.stroke();
  }

  private drawVolume(): void {
    const ctx = this.ctx;
    const end = this.viewStart + this.viewCount;
    const halfW = this.candleWidth / 2;

    for (let i = this.viewStart; i < end; i++) {
      const c = this.data[i];
      if (!c) continue;
      const x = this.indexToX(i);
      const isUp = c.close >= c.open;
      ctx.fillStyle = isUp ? 'rgba(239, 68, 68, 0.7)' : 'rgba(34, 197, 94, 0.7)';
      const top = this.volumeToY(c.volume);
      ctx.fillRect(x - halfW, top, this.candleWidth, this.volumeAreaBottom - top);
    }
  }

  private drawDivider(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.paddingLeft, this.priceAreaBottom + 0.5);
    ctx.lineTo(this.width - this.paddingRight, this.priceAreaBottom + 0.5);
    ctx.stroke();
  }

  private drawPriceLabels(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const y = this.priceAreaBottom - ratio * this.priceAreaHeight;
      const price = this.minPrice + ratio * (this.maxPrice - this.minPrice);
      ctx.fillStyle = '#1e1e2f';
      ctx.fillRect(0, y - 9, this.paddingLeft - 6, 18);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(formatPrice(price), this.paddingLeft - 10, y);
    }

    if (this.maxVolume > 0) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      const volLabel = formatVolume(this.maxVolume);
      ctx.fillStyle = '#1e1e2f';
      ctx.fillRect(0, this.volumeAreaTop, this.paddingLeft - 6, 16);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(volLabel, this.paddingLeft - 10, this.volumeAreaTop + 1);
    }
  }

  private drawTimeLabels(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelCount = 6;
    for (let i = 0; i <= labelCount; i++) {
      const ratio = i / labelCount;
      const idx = Math.floor(this.viewStart + ratio * (this.viewCount - 1));
      const clamped = Math.max(this.viewStart, Math.min(this.viewStart + this.viewCount - 1, idx));
      const x = this.indexToX(clamped);
      const ts = this.data[clamped]?.timestamp ?? 0;
      ctx.fillText(formatTime(ts), x, this.volumeAreaBottom + 10);
    }
  }

  private drawCrosshair(): void {
    if (!this.crosshair) return;
    const ctx = this.ctx;
    const { x, y, price, dataIndex } = this.crosshair;
    const candle = this.data[dataIndex];

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, this.priceAreaTop);
    ctx.lineTo(x, this.volumeAreaBottom);
    ctx.stroke();

    if (y >= this.priceAreaTop && y <= this.priceAreaBottom) {
      ctx.beginPath();
      ctx.moveTo(this.paddingLeft, y);
      ctx.lineTo(this.width - this.paddingRight, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f0f1f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (y >= this.priceAreaTop && y <= this.priceAreaBottom) {
      const label = formatPrice(price);
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const textW = ctx.measureText(label).width + 14;
      let lx = this.width - this.paddingRight - textW;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      roundRect(ctx, lx, y - 10, textW, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + textW / 2, y);
    }

    const timeLabel = formatTime(candle.timestamp);
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const timeW = ctx.measureText(timeLabel).width + 14;
    let tx = x - timeW / 2;
    tx = Math.max(this.paddingLeft, Math.min(this.width - this.paddingRight - timeW, tx));
    const ty = this.volumeAreaBottom + 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.beginPath();
    roundRect(ctx, tx, ty, timeW, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeLabel, tx + timeW / 2, ty + 10);

    this.drawTooltip(candle, price);
    ctx.restore();
  }

  private drawTooltip(candle: Candle, _currentPrice: number): void {
    if (!this.crosshair) return;
    const ctx = this.ctx;
    const isUp = candle.close >= candle.open;
    const chg = candle.close - candle.open;
    const chgPct = (chg / candle.open) * 100;

    const lines = [
      { label: '时间', value: formatTime(candle.timestamp) },
      { label: '开盘', value: formatPrice(candle.open) },
      { label: '最高', value: formatPrice(candle.high), color: '#ef4444' },
      { label: '最低', value: formatPrice(candle.low), color: '#22c55e' },
      { label: '收盘', value: formatPrice(candle.close), color: isUp ? '#ef4444' : '#22c55e' },
      { label: '涨跌', value: `${chg >= 0 ? '+' : ''}${chg.toFixed(2)} (${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%)`, color: isUp ? '#ef4444' : '#22c55e' },
      { label: '成交量', value: formatVolume(candle.volume) }
    ];

    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    let maxW = 0;
    for (const l of lines) {
      const w = ctx.measureText(`${l.label}: ${l.value}`).width;
      if (w > maxW) maxW = w;
    }

    const padX = 14;
    const padY = 12;
    const lineH = 20;
    const boxW = maxW + padX * 2 + 42;
    const boxH = lines.length * lineH + padY * 2;

    let bx = this.crosshair.x + 16;
    let by = this.priceAreaTop + 10;
    if (bx + boxW > this.width - this.paddingRight) {
      bx = this.crosshair.x - boxW - 16;
    }
    if (bx < this.paddingLeft + 4) bx = this.paddingLeft + 4;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRect(ctx, bx, by, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const ly = by + padY + i * lineH + lineH / 2;
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(l.label, bx + padX, ly);
      ctx.fillStyle = l.color || '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(l.value, bx + boxW - padX, ly);
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
