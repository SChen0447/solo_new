import { GAME_CONFIG } from '../utils/constants';

export interface PerformanceMetrics {
  fps: number;
  averageFps: number;
  inputLatency: number;
  frameTime: number;
}

export type PerformanceCallback = (metrics: PerformanceMetrics, needsOptimization: boolean) => void;

export class PerformanceMonitor {
  private fps: number = 60;
  private averageFps: number = 60;
  private frameTime: number = 0;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private fpsUpdateInterval: number = 1000;
  private fpsHistory: number[] = [];
  private maxHistorySize: number = 60;
  private inputLatency: number = 0;
  private lastInputTime: number = 0;
  private checkInterval: number = GAME_CONFIG.fpsCheckInterval;
  private lastCheckTime: number = 0;
  private fpsThreshold: number = GAME_CONFIG.fpsThreshold;
  private isOptimized: boolean = false;
  private callback: PerformanceCallback | null = null;
  private showHintTime: number = 0;
  private hintDuration: number = 1000;

  constructor() {}

  setCallback(callback: PerformanceCallback): void {
    this.callback = callback;
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = performance.now();
    this.lastCheckTime = performance.now();
    this.frameCount = 0;
    this.fpsHistory = [];
    this.isOptimized = false;
    this.showHintTime = 0;
  }

  stop(): void {
    this.callback = null;
  }

  tick(currentTime: number): void {
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = currentTime;
      this.fpsUpdateTime = currentTime;
      this.lastCheckTime = currentTime;
      return;
    }

    this.frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.frameCount++;

    if (currentTime - this.fpsUpdateTime >= this.fpsUpdateInterval) {
      this.fps = this.frameCount * (1000 / this.fpsUpdateInterval);
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;

      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > this.maxHistorySize) {
        this.fpsHistory.shift();
      }

      this.averageFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    }

    if (currentTime - this.lastCheckTime >= this.checkInterval) {
      this.checkPerformance(currentTime);
      this.lastCheckTime = currentTime;
    }
  }

  private checkPerformance(currentTime: number): void {
    const needsOptimization = this.averageFps < this.fpsThreshold;

    if (needsOptimization && !this.isOptimized) {
      this.isOptimized = true;
      this.showHintTime = currentTime;
      this.notifyCallback();
    } else if (!needsOptimization && this.isOptimized) {
      this.isOptimized = false;
      this.notifyCallback();
    }
  }

  private notifyCallback(): void {
    if (this.callback) {
      this.callback(
        {
          fps: this.fps,
          averageFps: this.averageFps,
          inputLatency: this.inputLatency,
          frameTime: this.frameTime,
        },
        this.isOptimized
      );
    }
  }

  recordInput(): void {
    this.lastInputTime = performance.now();
  }

  recordInputProcessed(): void {
    if (this.lastInputTime > 0) {
      this.inputLatency = performance.now() - this.lastInputTime;
    }
  }

  getFps(): number {
    return this.fps;
  }

  getAverageFps(): number {
    return this.averageFps;
  }

  getFrameTime(): number {
    return this.frameTime;
  }

  getInputLatency(): number {
    return this.inputLatency;
  }

  isOptimizationEnabled(): boolean {
    return this.isOptimized;
  }

  shouldShowHint(currentTime: number): boolean {
    return this.showHintTime > 0 && currentTime - this.showHintTime < this.hintDuration;
  }

  getHintOpacity(currentTime: number): number {
    if (!this.shouldShowHint(currentTime)) return 0;
    const elapsed = currentTime - this.showHintTime;
    return 1 - elapsed / this.hintDuration;
  }

  getTrailCount(): number {
    return this.isOptimized ? GAME_CONFIG.lowTrailCount : GAME_CONFIG.trailCount;
  }

  getParticleCount(): number {
    return this.isOptimized ? GAME_CONFIG.lowParticleCount : GAME_CONFIG.particleCount;
  }

  reset(): void {
    this.fps = 60;
    this.averageFps = 60;
    this.frameTime = 0;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    this.fpsHistory = [];
    this.inputLatency = 0;
    this.lastInputTime = 0;
    this.lastCheckTime = 0;
    this.isOptimized = false;
    this.showHintTime = 0;
  }
}
