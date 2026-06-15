import {
  PARTICLE_MIN_SPEED,
  PARTICLE_MAX_SPEED,
  STATS,
} from '../shared/constants';
import { StatsData } from '../shared/types';

const HISTOGRAM_BINS = STATS.HISTOGRAM_BINS;

export class FlowStatistics {
  private speedHistogram: number[] = new Array(HISTOGRAM_BINS).fill(0);
  private histogramWindow: number[][] = [];
  private windowSize = 10;
  private avgDensityEMA = 0;
  private avgSpeedEMA = 0;
  private totalParticles = 0;
  private runTimeSeconds = 0;

  reset() {
    this.speedHistogram = new Array(HISTOGRAM_BINS).fill(0);
    this.histogramWindow = [];
    this.avgDensityEMA = 0;
    this.avgSpeedEMA = 0;
    this.runTimeSeconds = 0;
  }

  updateFrame(
    dt: number,
    speeds: Float32Array,
    count: number,
    heatAvgDensity: number,
    speedMultiplier: number
  ) {
    this.runTimeSeconds += dt;
    this.totalParticles = count;

    const alpha = Math.min(1, dt * 2);
    this.avgDensityEMA = this.avgDensityEMA * (1 - alpha) + heatAvgDensity * alpha;

    let sumSpeed = 0;
    const bins = new Array(HISTOGRAM_BINS).fill(0);
    const minS = PARTICLE_MIN_SPEED * 0.5;
    const maxS = PARTICLE_MAX_SPEED * Math.max(1.5, speedMultiplier);
    const range = Math.max(0.1, maxS - minS);

    for (let i = 0; i < count; i++) {
      const s = speeds[i];
      sumSpeed += s;
      let idx = Math.floor(((s - minS) / range) * HISTOGRAM_BINS);
      idx = Math.max(0, Math.min(HISTOGRAM_BINS - 1, idx));
      bins[idx]++;
    }

    this.histogramWindow.push(bins);
    if (this.histogramWindow.length > this.windowSize) {
      this.histogramWindow.shift();
    }

    if (count > 0) {
      const avg = sumSpeed / count;
      this.avgSpeedEMA = this.avgSpeedEMA * (1 - alpha) + avg * alpha;
    }
  }

  aggregateHistogram(): number[] {
    if (this.histogramWindow.length === 0) {
      return new Array(HISTOGRAM_BINS).fill(0);
    }
    const result = new Array(HISTOGRAM_BINS).fill(0);
    for (const frame of this.histogramWindow) {
      for (let i = 0; i < HISTOGRAM_BINS; i++) {
        result[i] += frame[i];
      }
    }
    let max = 0;
    for (let i = 0; i < HISTOGRAM_BINS; i++) {
      result[i] = result[i] / this.histogramWindow.length;
      if (result[i] > max) max = result[i];
    }
    if (max > 0) {
      for (let i = 0; i < HISTOGRAM_BINS; i++) {
        result[i] = result[i] / max;
      }
    }
    return result;
  }

  getStats(): StatsData {
    return {
      avgDensity: this.avgDensityEMA,
      speedHistogram: this.aggregateHistogram(),
      avgSpeed: this.avgSpeedEMA,
      totalParticles: this.totalParticles,
      runTimeSeconds: this.runTimeSeconds,
    };
  }
}
