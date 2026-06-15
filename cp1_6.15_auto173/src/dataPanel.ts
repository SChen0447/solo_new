import type { BuildingData, ExportData, WindParams } from './types';

type ToastType = 'success' | 'error' | 'info';

export class DataPanel {
  private heatmapCanvas: HTMLCanvasElement;
  private heatmapCtx: CanvasRenderingContext2D;
  private chartCanvas: HTMLCanvasElement;
  private chartCtx: CanvasRenderingContext2D;
  private currentSpeedEl: HTMLElement;
  private toastEl: HTMLElement;
  private toastTimer: number | null = null;

  private heatmapColors = [
    { pos: 0, r: 30, g: 58, b: 138 },
    { pos: 0.25, r: 59, g: 130, b: 246 },
    { pos: 0.5, r: 0, g: 212, b: 170 },
    { pos: 0.75, r: 245, g: 158, b: 11 },
    { pos: 1, r: 239, g: 68, b: 68 }
  ];

  private gridSize = 10;
  private minSpeed = 0;
  private maxSpeed = 15;

  constructor() {
    this.heatmapCanvas = document.getElementById('heatmap-canvas') as HTMLCanvasElement;
    this.heatmapCtx = this.heatmapCanvas.getContext('2d')!;
    this.chartCanvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
    this.chartCtx = this.chartCanvas.getContext('2d')!;
    this.currentSpeedEl = document.getElementById('current-speed')!;
    this.toastEl = document.getElementById('toast')!;

    this.setupHighDPICanvas(this.heatmapCanvas, this.heatmapCtx);
    this.setupHighDPICanvas(this.chartCanvas, this.chartCtx);

    this.bindEvents();
  }

  private setupHighDPICanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.scale(dpr, dpr);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.setupHighDPICanvas(this.heatmapCanvas, this.heatmapCtx);
      this.setupHighDPICanvas(this.chartCanvas, this.chartCtx);
    });
  }

  private getHeatmapColor(value: number): string {
    const t = Math.max(0, Math.min(1, (value - this.minSpeed) / (this.maxSpeed - this.minSpeed)));
    for (let i = 0; i < this.heatmapColors.length - 1; i++) {
      const c1 = this.heatmapColors[i];
      const c2 = this.heatmapColors[i + 1];
      if (t >= c1.pos && t <= c2.pos) {
        const range = c2.pos - c1.pos;
        const local = (t - c1.pos) / range;
        const r = Math.round(c1.r + (c2.r - c1.r) * local);
        const g = Math.round(c1.g + (c2.g - c1.g) * local);
        const b = Math.round(c1.b + (c2.b - c1.b) * local);
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
    const last = this.heatmapColors[this.heatmapColors.length - 1];
    return `rgb(${last.r}, ${last.g}, ${last.b})`;
  }

  public updateHeatmap(grid: number[][]): void {
    const rect = this.heatmapCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const ctx = this.heatmapCtx;

    ctx.clearRect(0, 0, w, h);

    const cellW = w / this.gridSize;
    const cellH = h / this.gridSize;

    const allSpeeds = grid.flat();
    const gmin = Math.min(...allSpeeds);
    const gmax = Math.max(...allSpeeds);
    this.minSpeed = Math.max(0, gmin - 0.5);
    this.maxSpeed = Math.max(this.maxSpeed, gmax + 0.5);

    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const speed = grid[i][j];
        const color = this.getHeatmapColor(speed);

        const x = j * cellW;
        const y = i * cellH;

        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cellW, cellH);
      }
    }

    ctx.strokeStyle = 'rgba(0, 212, 170, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    ctx.strokeStyle = 'rgba(0, 212, 170, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('N', w / 2 - 4, 8);
    ctx.textAlign = 'center';
    ctx.fillText('10×10 热力图', w / 2, h - 4);
  }

  public updateChart(history: number[], avg: number): void {
    const rect = this.chartCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const ctx = this.chartCtx;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, w, h);

    const padding = { top: 14, right: 14, bottom: 24, left: 32 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
    }

    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (chartW * i) / 5;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);
      ctx.stroke();
    }

    if (history.length < 2) {
      this.drawChartAxes(ctx, padding, chartW, chartH, avg * 1.5);
      return;
    }

    let maxVal = Math.max(...history, avg * 1.2, 1);
    let minVal = Math.min(...history, 0);
    maxVal = Math.ceil(maxVal * 1.1);
    const range = Math.max(1, maxVal - minVal);

    this.drawChartAxes(ctx, padding, chartW, chartH, maxVal);

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, 'rgba(0, 212, 170, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 212, 170, 0)');

    ctx.beginPath();
    history.forEach((val, idx) => {
      const x = padding.left + (chartW * idx) / (history.length - 1);
      const y = padding.top + chartH - ((val - minVal) / range) * chartH;
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = padding.left + (chartW * (idx - 1)) / (history.length - 1);
        const prevY = padding.top + chartH - ((history[idx - 1] - minVal) / range) * chartH;
        const cpx = (prevX + x) / 2;
        ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
      }
    });

    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    history.forEach((val, idx) => {
      const x = padding.left + (chartW * idx) / (history.length - 1);
      const y = padding.top + chartH - ((val - minVal) / range) * chartH;
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = padding.left + (chartW * (idx - 1)) / (history.length - 1);
        const prevY = padding.top + chartH - ((history[idx - 1] - minVal) / range) * chartH;
        const cpx = (prevX + x) / 2;
        ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
      }
    });

    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0, 212, 170, 0.5)';
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (history.length > 0) {
      const lastX = padding.left + chartW;
      const lastVal = history[history.length - 1];
      const lastY = padding.top + chartH - ((lastVal - minVal) / range) * chartH;

      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00d4aa';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const avgY = padding.top + chartH - ((avg - minVal) / range) * chartH;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, avgY);
      ctx.lineTo(padding.left + chartW, avgY);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`均值 ${avg.toFixed(1)}`, padding.left + 4, avgY - 3);
    }
  }

  private drawChartAxes(
    ctx: CanvasRenderingContext2D,
    padding: { top: number; right: number; bottom: number; left: number },
    chartW: number,
    chartH: number,
    maxVal: number
  ): void {
    ctx.strokeStyle = 'rgba(0, 212, 170, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.stroke();

    ctx.fillStyle = 'rgba(136, 136, 170, 0.9)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH * (4 - i)) / 4;
      const val = (maxVal * i) / 4;
      ctx.fillText(val.toFixed(1), padding.left - 5, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('时间', padding.left + chartW / 2, padding.top + chartH + 8);

    ctx.save();
    ctx.translate(8, padding.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(136, 136, 170, 0.9)';
    ctx.fillText('风速 (m/s)', 0, 0);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  public updateCurrentSpeed(speed: number): void {
    this.currentSpeedEl.textContent = speed.toFixed(1);
  }

  public showToast(message: string, type: ToastType = 'info', duration = 2500): void {
    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
    }

    this.toastEl.textContent = message;
    this.toastEl.className = 'show ' + type;

    this.toastTimer = window.setTimeout(() => {
      this.toastEl.className = '';
      this.toastTimer = null;
    }, duration);
  }

  public exportData(
    buildings: BuildingData[],
    windParams: WindParams,
    windGrid: number[][],
    stats: { avg: number; max: number; min: number }
  ): void {
    const data: ExportData = {
      timestamp: Date.now(),
      buildings: buildings.map((b) => ({ ...b })),
      windParams: {
        baseSpeed: windParams.baseSpeed,
        directionX: windParams.direction.x,
        directionY: windParams.direction.y,
        directionZ: windParams.direction.z
      },
      windGrid: {
        size: windGrid.length,
        cells: windGrid
      },
      statistics: {
        avgSpeed: stats.avg,
        maxSpeed: stats.max,
        minSpeed: stats.min
      }
    };

    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `wind-simulation-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast('布局数据导出成功！', 'success');
    } catch (err) {
      console.error('Export error:', err);
      this.showToast('导出失败，请重试', 'error');
    }
  }
}
