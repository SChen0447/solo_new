import { CityGenerator, BuildingData } from '../core/CityGenerator';
import { CityRenderer } from './CityRenderer';

export type MilestoneCallback = (progress: number) => void;

export class AnimationController {
  private cityGenerator: CityGenerator | null = null;
  private cityRenderer: CityRenderer;
  private growthProgress = 0;
  private growthSpeed = 1.0;
  private lastTime = 0;
  private animFrameId: number | null = null;
  private running = false;
  private fpsCounter = 0;
  private fpsTime = 0;
  private currentFps = 60;
  private onProgressUpdate: ((t: number) => void) | null = null;
  private onFpsUpdate: ((fps: number) => void) | null = null;
  private milestoneCallback: MilestoneCallback | null = null;
  private reachedMilestones = new Set<number>();
  private lastBuildingCount = 0;

  constructor(renderer: CityRenderer) {
    this.cityRenderer = renderer;
  }

  setCityGenerator(generator: CityGenerator): void {
    this.cityGenerator = generator;
    this.growthProgress = 0;
    this.lastBuildingCount = 0;
    this.reachedMilestones.clear();
    this.cityRenderer.clearScene();
  }

  setGrowthSpeed(speed: number): void {
    this.growthSpeed = speed;
  }

  setOnProgressUpdate(cb: (t: number) => void): void {
    this.onProgressUpdate = cb;
  }

  setOnFpsUpdate(cb: (fps: number) => void): void {
    this.onFpsUpdate = cb;
  }

  setMilestoneCallback(cb: MilestoneCallback): void {
    this.milestoneCallback = cb;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.fpsCounter = 0;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  reset(): void {
    this.growthProgress = 0;
    this.lastBuildingCount = 0;
    this.reachedMilestones.clear();
    this.cityRenderer.clearScene();
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.fpsCounter++;
    if (now - this.fpsTime >= 1000) {
      this.currentFps = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTime = now;
      if (this.onFpsUpdate) {
        this.onFpsUpdate(this.currentFps);
      }
    }

    if (this.growthProgress < 1 && this.cityGenerator) {
      const increment = delta * this.growthSpeed * 0.3;
      this.growthProgress = Math.min(1, this.growthProgress + increment);

      if (this.onProgressUpdate) {
        this.onProgressUpdate(this.growthProgress);
      }

      const buildings = this.cityGenerator.getBuildingsAtProgress(this.growthProgress);

      if (buildings.length !== this.lastBuildingCount) {
        this.cityRenderer.updateBuildings(buildings, now);
        this.lastBuildingCount = buildings.length;
      }

      this.checkMilestones();
    }

    this.cityRenderer.updateAnimations(now);
    this.cityRenderer.updateLightTransition(delta);
    this.cityRenderer.updateFollowCamera();
    this.cityRenderer.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private checkMilestones(): void {
    const milestones = [0.25, 0.5, 0.75, 1.0];
    for (const m of milestones) {
      if (this.growthProgress >= m && !this.reachedMilestones.has(m)) {
        this.reachedMilestones.add(m);
        if (this.milestoneCallback) {
          this.milestoneCallback(m);
        }
      }
    }
  }

  getProgress(): number {
    return this.growthProgress;
  }

  getFps(): number {
    return this.currentFps;
  }

  getTallestBuilding(): BuildingData | null {
    if (!this.cityGenerator) return null;
    return this.cityGenerator.getTallestBuilding();
  }

  dispose(): void {
    this.stop();
  }
}
