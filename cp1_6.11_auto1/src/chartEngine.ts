import type { Candle } from './dataFetcher';
import { calculateSMA, smoothMA, formatPrice, formatVolume, formatTime } from './dataFetcher';

interface CrosshairInfo {
  dataIndex: number;
  x: number;
  y: number;
  price: number;
}

interface Pt {
  x: number;
  y: number;
}

export class ChartEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  private bgCanvas: HTMLCanvasElement | null = null;
  private bgCtx: CanvasRenderingContext2D | null = null;

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

  private targetMinPrice: number = 0;
  private targetMaxPrice: number = 0;
  private minPrice: number = 0;
  private maxPrice: number = 0;
  private maxVolume: number = 0;

  private candleWidth: number = 0;
  private candleGap: number = 2;

  private crosshair: CrosshairInfo | null = null;
  private hovered: boolean = false;

  private rafId: number | null = null;
  private needsStatic: boolean = true;
  private needsOverlay: boolean = true;
  private lastFrameTs: number = 0;

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
    this.invalidateAll();
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

    if (!this.bgCanvas) {
      this.bgCanvas = document.createElement('canvas');
      const bg = this.bgCanvas.getContext('2d', { alpha: false });
      if (bg) this.bgCtx = bg;
    }
    if (this.bgCanvas && this.bgCtx) {
      this.bgCanvas.width = Math.floor(this.width * this.dpr);
      this.bgCanvas.height = Math.floor(this.height * this.dpr);
      this.bgCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    this.invalidateAll();
  }

  setView(start: number, count: number): void {
    const c = Math.max(this.minViewCount, Math.min(this.maxViewCount, count));
    const s = Math.max(0, Math.min(this.data.length - c, start));
    if (s !== this.viewStart || c !== this.viewCount) {
      this.viewStart = s;
      this.viewCount = c;
      this.invalidateAll();
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
        this.needsOverlay = true;
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
      this.needsOverlay = true;
    }
  }

  clearCrosshair(): void {
    if (this.crosshair) {
      this.crosshair = null;
      this.hovered = false;
      this.needsOverlay = true;
    }
  }

  getCrosshairCandle(): Candle | null {
    if (!this.crosshair) return null;
    return this.data[this.crosshair.dataIndex] ?? null;
  }

  startRenderLoop(): void {
    const loop = (ts: number) => {
      const delta = ts - this.lastFrameTs;
      this.lastFrameTs = ts;

      const rangeUpdated = this.easePriceRange(delta);
      if (rangeUpdated) this.needsStatic = true;

      if (this.needsStatic && this.bgCtx) {
        this.renderStaticTo(this.bgCtx);
        this.needsStatic = false;
        this.needsOverlay = true;
      }

      if (this.needsOverlay) {
        this.renderComposite();
        this.needsOverlay = false;
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

  private invalidateAll(): void {
    this.updateTargetRange();
    this.minPrice = this.targetMinPrice;
    this.maxPrice = this.targetMaxPrice;
    this.needsStatic = true;
    this.needsOverlay = true;
  }

  private indexToX(i: number): number {
    const chartWidth = this.width - this.paddingLeft - this.paddingRight;
    const step = chartWidth / this.viewCount;
    return this.paddingLeft + (i - this.viewStart + 0.5) * step;
  }

  private priceToY(p: number): number {
    const range = this.maxPrice - this.minPrice;
    if (!isFinite(range) || range === 0) return this.priceAreaTop + this.priceAreaHeight / 2;
    return this.priceAreaBottom - ((p - this.minPrice) / range) * this.priceAreaHeight;
  }

  private yToPrice(y: number): number {
    const range = this.maxPrice - this.minPrice;
    if (!isFinite(range) || range === 0) return this.minPrice;
    return this.minPrice + ((this.priceAreaBottom - y) / this.priceAreaHeight) * range;
  }

  private volumeToY(v: number): number {
    if (!isFinite(v) || this.maxVolume === 0) return this.volumeAreaBottom;
    return this.volumeAreaBottom - (v / this.maxVolume) * (this.volumeAreaHeight - 4);
  }

  private updateTargetRange(): void {
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
    if (!isFinite(minP) || !isFinite(maxP)) return;
    const padding = (maxP - minP) * 0.08;
    this.targetMinPrice = minP - padding;
    this.targetMaxPrice = maxP + padding;
    this.maxVolume = maxV * 1.1;

    const chartWidth = this.width - this.paddingLeft - this.paddingRight;
    const step = chartWidth / this.viewCount;
    this.candleWidth = Math.max(1, step - this.candleGap);
  }

  private easePriceRange(deltaMs: number): boolean {
    if (this.targetMinPrice === this.minPrice && this.targetMaxPrice === this.maxPrice) return false;
    const t = Math.min(1, deltaMs / 220);
    const alpha = 1 - Math.pow(1 - t, 3);
    const newMin = this.minPrice + (this.targetMinPrice - this.minPrice) * alpha;
    const newMax = this.maxPrice + (this.targetMaxPrice - this.maxPrice) * alpha;
    const eps = Math.abs(this.targetMaxPrice - this.targetMinPrice) * 1e-4;
    if (Math.abs(newMin - this.targetMinPrice) < eps && Math.abs(newMax - this.targetMaxPrice) < eps) {
      this.minPrice = this.targetMinPrice;
      this.maxPrice = this.targetMaxPrice;
    } else {
      this.minPrice = newMin;
      this.maxPrice = newMax;
    }
    return true;
  }

  private renderComposite(): void {
    const ctx = this.ctx;
    if (this.bgCanvas) {
      ctx.drawImage(this.bgCanvas, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = '#0f0f1f';
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (this.crosshair && this.hovered) {
      this.drawCrosshair(ctx);
    }
  }

  private renderStaticTo(ctx: CanvasRenderingContext2D): void {
    if (this.data.length === 0) return;

    ctx.fillStyle = '#0f0f1f';
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawGrid(ctx);
    this.drawVolume(ctx);
    this.drawCandles(ctx);
    this.drawMA(ctx, this.sma5, '#f97316', 'rgba(249, 115, 22, 0.12)');
    this.drawMA(ctx, this.sma20, '#3b82f6', 'rgba(59, 130, 246, 0.12)');
    this.drawDivider(ctx);
    this.drawPriceLabels(ctx);
    this.drawTimeLabels(ctx);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
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

  private drawCandles(ctx: CanvasRenderingContext2D): void {
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

  private buildSmoothedCurve(values: (number | null)[]): Pt[] {
    const smoothed = smoothMA(values, this.viewStart, this.viewCount, 2);
    if (smoothed.length < 2) return [];
    const pts: Pt[] = smoothed.map(s => ({ x: this.indexToX(s.x), y: this.priceToY(s.y) }));
    return pts;
  }

  private drawMA(ctx: CanvasRenderingContext2D, values: (number | null)[], color: string, shadowColor: string): void {
    const pts = this.buildSmoothedCurve(values);
    if (pts.length < 2) return;

    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, this.priceAreaBottom);
    ctx.lineTo(pts[0].x, pts[0].y);
    this.strokeCurvePath(ctx, pts);
    ctx.lineTo(pts[pts.length - 1].x, this.priceAreaBottom);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    this.strokeCurvePath(ctx, pts);
    ctx.stroke();
  }

  private strokeCurvePath(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
    if (pts.length < 2) return;
    if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y);
      return;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  private drawVolume(ctx: CanvasRenderingContext2D): void {
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

  private drawDivider(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.paddingLeft, this.priceAreaBottom + 0.5);
    ctx.lineTo(this.width - this.paddingRight, this.priceAreaBottom + 0.5);
    ctx.stroke();
  }

  private drawPriceLabels(ctx: CanvasRenderingContext2D): void {
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

  private drawTimeLabels(ctx: CanvasRenderingContext2D): void {
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

  private drawCrosshair(ctx: CanvasRenderingContext2D): void {
    if (!this.crosshair) return;
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
      let ly = y - 10;
      ly = Math.max(this.priceAreaTop, Math.min(this.priceAreaBottom - 20, ly));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      roundRect(ctx, lx, ly, textW, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + textW / 2, ly + 10);
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

    this.drawTooltip(ctx, candle);
    ctx.restore();
  }

  private drawTooltip(ctx: CanvasRenderingContext2D, candle: Candle): void {
    if (!this.crosshair) return;
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
    const gap = 14;

    let bx = this.crosshair.x + gap;
    let by = this.crosshair.y + gap;

    const minX = this.paddingLeft + 4;
    const maxX = this.width - this.paddingRight - 4;
    const minY = this.priceAreaTop + 4;
    const maxY = this.priceAreaBottom - 4;

    if (bx + boxW > maxX) {
      bx = this.crosshair.x - boxW - gap;
    }
    if (bx < minX) bx = minX;
    if (bx + boxW > maxX) bx = maxX - boxW;

    if (by + boxH > maxY) {
      by = this.crosshair.y - boxH - gap;
    }
    if (by < minY) by = minY;
    if (by + boxH > maxY) by = maxY - boxH;

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
