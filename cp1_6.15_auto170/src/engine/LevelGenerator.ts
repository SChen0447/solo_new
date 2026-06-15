import type { Entity, MovingPlatform, Platform } from '../types';
import { PhysicsEngine } from './PhysicsEngine';

export interface LayerData {
  y: number;
  platforms: Entity[];
}

export class LevelGenerator {
  private canvasWidth: number;
  private layerHeight: number = 80;
  private entities: Entity[] = [];
  private layers: LayerData[] = [];
  private highestGeneratedY: number = 0;

  constructor(canvasWidth: number) {
    this.canvasWidth = canvasWidth;
  }

  public reset(): void {
    this.entities = [];
    this.layers = [];
    this.highestGeneratedY = 0;
  }

  public getEntities(): Entity[] {
    return this.entities;
  }

  public generateInitial(startY: number, count: number = 15): void {
    for (let i = 0; i < count; i++) {
      const layerY = startY - i * this.layerHeight;
      this.generateLayer(layerY, i === 0);
    }
  }

  public update(cameraY: number, viewportHeight: number): void {
    const generateAbove = cameraY - viewportHeight;
    while (this.highestGeneratedY > generateAbove) {
      this.generateLayer(this.highestGeneratedY - this.layerHeight, false);
    }

    const cleanupBelow = cameraY + viewportHeight * 2;
    this.entities = this.entities.filter((e) => e.y < cleanupBelow);
    this.layers = this.layers.filter((l) => l.y < cleanupBelow);
  }

  private generateLayer(y: number, isFirst: boolean): void {
    const layer: LayerData = { y, platforms: [] };
    const platformCount = isFirst ? 1 : 1 + Math.floor(Math.random() * 2);
    const usedRanges: { start: number; end: number }[] = [];

    for (let i = 0; i < platformCount; i++) {
      const isMoving = !isFirst && i === 0;
      const width = 30 + Math.random() * 50;
      const minX = 20;
      const maxX = this.canvasWidth - width - 20;
      let x = minX + Math.random() * (maxX - minX);
      let attempts = 0;
      while (attempts < 5) {
        let overlaps = false;
        for (const range of usedRanges) {
          if (x < range.end + 30 && x + width > range.start - 30) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) break;
        x = minX + Math.random() * (maxX - minX);
        attempts++;
      }
      usedRanges.push({ start: x, end: x + width });

      let platform: Platform | MovingPlatform;
      if (isMoving) {
        const moveRange = 60;
        const safeBaseX = Math.max(
          20 + moveRange,
          Math.min(this.canvasWidth - width - 20 - moveRange, x)
        );
        platform = PhysicsEngine.createMovingPlatform(
          safeBaseX,
          y,
          width,
          moveRange,
          0.5 + Math.random() * 0.5
        );
      } else {
        platform = PhysicsEngine.createPlatform(x, y, width);
      }
      layer.platforms.push(platform);
      this.entities.push(platform);
    }

    if (!isFirst && Math.random() < 0.35) {
      let gapStart = 20;
      const gapEnd = this.canvasWidth - 40;
      for (const range of usedRanges) {
        if (range.start > gapStart + 25) {
          if (Math.random() < 0.5) {
            const spikeX = gapStart + Math.random() * (range.start - gapStart - 20);
            const spike = PhysicsEngine.createSpike(spikeX, y - 4);
            this.entities.push(spike);
          }
        }
        gapStart = range.end;
      }
      if (gapEnd > gapStart + 25 && Math.random() < 0.5) {
        const spikeX = gapStart + Math.random() * (gapEnd - gapStart - 20);
        const spike = PhysicsEngine.createSpike(spikeX, y - 4);
        this.entities.push(spike);
      }
    }

    if (!isFirst && Math.random() < 0.25) {
      const platform = layer.platforms[Math.floor(Math.random() * layer.platforms.length)];
      if (platform) {
        const springX = platform.x + platform.width / 2 - 14;
        const spring = PhysicsEngine.createSpring(springX, platform.y - 14);
        this.entities.push(spring);
      }
    }

    if (!isFirst && Math.random() < 0.6) {
      const platform = layer.platforms[Math.floor(Math.random() * layer.platforms.length)];
      if (platform) {
        const starX = platform.x + platform.width / 2;
        const starY = y - 30;
        const star = PhysicsEngine.createStar(starX, starY);
        this.entities.push(star);
      }
    }

    this.layers.push(layer);
    if (y < this.highestGeneratedY || this.highestGeneratedY === 0) {
      this.highestGeneratedY = y;
    }
  }

  public getLayerCountBelow(y: number): number {
    let count = 0;
    for (const layer of this.layers) {
      if (layer.y > y) count++;
    }
    return count;
  }
}
