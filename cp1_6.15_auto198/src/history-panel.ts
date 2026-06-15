import { PlantDataPoint, drawWaveformChart, calculateStats } from './utils';

const MAX_DATA_POINTS = 7200;

export class HistoryPanel {
  private potentialCanvas: HTMLCanvasElement;
  private stomatalCanvas: HTMLCanvasElement;
  private calciumCanvas: HTMLCanvasElement;

  private potentialData: number[] = [];
  private stomatalData: number[] = [];
  private calciumData: number[] = [];
  private timestamps: number[] = [];

  private timeRange: number = 60;

  private statPotentialMax: HTMLElement;
  private statPotentialMin: HTMLElement;
  private statPotentialAvg: HTMLElement;
  private statStomatalMax: HTMLElement;
  private statStomatalMin: HTMLElement;
  private statStomatalAvg: HTMLElement;
  private statCalciumMax: HTMLElement;
  private statCalciumMin: HTMLElement;
  private statCalciumAvg: HTMLElement;

  private timeRangeSlider: HTMLInputElement;
  private timeRangeValue: HTMLElement;

  private animationFrameId: number | null = null;

  constructor() {
    this.potentialCanvas = document.getElementById('chart-potential') as HTMLCanvasElement;
    this.stomatalCanvas = document.getElementById('chart-stomatal') as HTMLCanvasElement;
    this.calciumCanvas = document.getElementById('chart-calcium') as HTMLCanvasElement;

    this.statPotentialMax = document.getElementById('stat-potential-max') as HTMLElement;
    this.statPotentialMin = document.getElementById('stat-potential-min') as HTMLElement;
    this.statPotentialAvg = document.getElementById('stat-potential-avg') as HTMLElement;
    this.statStomatalMax = document.getElementById('stat-stomatal-max') as HTMLElement;
    this.statStomatalMin = document.getElementById('stat-stomatal-min') as HTMLElement;
    this.statStomatalAvg = document.getElementById('stat-stomatal-avg') as HTMLElement;
    this.statCalciumMax = document.getElementById('stat-calcium-max') as HTMLElement;
    this.statCalciumMin = document.getElementById('stat-calcium-min') as HTMLElement;
    this.statCalciumAvg = document.getElementById('stat-calcium-avg') as HTMLElement;

    this.timeRangeSlider = document.getElementById('time-range-slider') as HTMLInputElement;
    this.timeRangeValue = document.getElementById('time-range-value') as HTMLElement;

    this.setupCanvasSizes();
    this.bindEvents();
    this.startRenderLoop();
  }

  private setupCanvasSizes(): void {
    const dpr = window.devicePixelRatio || 1;
    const canvases = [this.potentialCanvas, this.stomatalCanvas, this.calciumCanvas];

    canvases.forEach((canvas) => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    });
  }

  private bindEvents(): void {
    this.timeRangeSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      this.setTimeRange(value);
    });

    window.addEventListener('resize', () => {
      this.setupCanvasSizes();
    });
  }

  public addDataPoint(data: PlantDataPoint): void {
    this.timestamps.push(data.timestamp);
    this.potentialData.push(data.rootPotential);
    this.stomatalData.push(data.stomatalOpening);
    this.calciumData.push(data.calciumOscillation);

    if (this.timestamps.length > MAX_DATA_POINTS) {
      this.timestamps.shift();
      this.potentialData.shift();
      this.stomatalData.shift();
      this.calciumData.shift();
    }

    this.updateStats();
  }

  public setTimeRange(seconds: number): void {
    this.timeRange = seconds;

    if (seconds < 60) {
      this.timeRangeValue.textContent = `${seconds}秒`;
    } else if (seconds < 3600) {
      this.timeRangeValue.textContent = `${(seconds / 60).toFixed(1)}分钟`;
    } else {
      this.timeRangeValue.textContent = `${(seconds / 3600).toFixed(1)}小时`;
    }
  }

  private getVisibleData(): {
    potential: number[];
    stomatal: number[];
    calcium: number[];
    timestamps: number[];
  } {
    if (this.timestamps.length === 0) {
      return { potential: [], stomatal: [], calcium: [], timestamps: [] };
    }

    const now = this.timestamps[this.timestamps.length - 1];
    const startTime = now - this.timeRange * 1000;

    let startIndex = 0;
    for (let i = 0; i < this.timestamps.length; i++) {
      if (this.timestamps[i] >= startTime) {
        startIndex = i;
        break;
      }
    }

    return {
      potential: this.potentialData.slice(startIndex),
      stomatal: this.stomatalData.slice(startIndex),
      calcium: this.calciumData.slice(startIndex),
      timestamps: this.timestamps.slice(startIndex),
    };
  }

  private updateStats(): void {
    const visibleData = this.getVisibleData();

    if (visibleData.potential.length === 0) return;

    const potentialStats = calculateStats(visibleData.potential);
    const stomatalStats = calculateStats(visibleData.stomatal);
    const calciumStats = calculateStats(visibleData.calcium);

    this.statPotentialMax.textContent = potentialStats.max.toFixed(1);
    this.statPotentialMin.textContent = potentialStats.min.toFixed(1);
    this.statPotentialAvg.textContent = potentialStats.avg.toFixed(1);

    this.statStomatalMax.textContent = stomatalStats.max.toFixed(1);
    this.statStomatalMin.textContent = stomatalStats.min.toFixed(1);
    this.statStomatalAvg.textContent = stomatalStats.avg.toFixed(1);

    this.statCalciumMax.textContent = calciumStats.max.toFixed(2);
    this.statCalciumMin.textContent = calciumStats.min.toFixed(2);
    this.statCalciumAvg.textContent = calciumStats.avg.toFixed(2);
  }

  private renderCharts(): void {
    const visibleData = this.getVisibleData();

    if (visibleData.timestamps.length < 2) return;

    drawWaveformChart({
      canvas: this.potentialCanvas,
      data: visibleData.potential,
      timestamps: visibleData.timestamps,
      color: '#00d4ff',
      lineWidth: 2,
      yMin: -120,
      yMax: -80,
      timeWindow: this.timeRange,
    });

    drawWaveformChart({
      canvas: this.stomatalCanvas,
      data: visibleData.stomatal,
      timestamps: visibleData.timestamps,
      color: '#00d4ff',
      lineWidth: 2,
      yMin: 0,
      yMax: 100,
      timeWindow: this.timeRange,
    });

    drawWaveformChart({
      canvas: this.calciumCanvas,
      data: visibleData.calcium,
      timestamps: visibleData.timestamps,
      color: '#00d4ff',
      lineWidth: 2,
      yMin: 0.5,
      yMax: 2,
      timeWindow: this.timeRange,
    });
  }

  private startRenderLoop(): void {
    const render = () => {
      this.renderCharts();
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
