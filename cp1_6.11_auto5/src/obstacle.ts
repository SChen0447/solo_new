export type ObstacleType = 'spike' | 'icicle';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  fallSpeed: number;
  isWarning: boolean;
  warningTimer: number;
  warningDuration: number;
  isActive: boolean;
  rotation: number;
  wobble: number;
}

export interface ObstacleManagerConfig {
  canvasWidth: number;
  canvasHeight: number;
  groundY: number;
  baseSpeed: number;
}

export class ObstacleManager {
  private config: ObstacleManagerConfig;
  private obstacles: Obstacle[] = [];
  private nextId: number = 0;
  private spawnTimer: number = 0;
  private spawnInterval: number = 1.5;
  private minSpawnInterval: number = 0.6;
  private lastSpawnX: number = 0;
  private lastSpawnType: ObstacleType | null = null;
  private safeZoneWidth: number = 100;
  private difficultyTimer: number = 0;

  constructor(config: ObstacleManagerConfig) {
    this.config = config;
    this.lastSpawnX = -this.safeZoneWidth;
  }

  update(deltaTime: number, forwardSpeed: number, isFrozen: boolean): void {
    if (isFrozen) {
      for (const obs of this.obstacles) {
        if (obs.isWarning) {
          obs.warningTimer -= deltaTime;
          if (obs.warningTimer <= 0) {
            obs.isWarning = false;
            obs.isActive = true;
          }
        }
      }
      return;
    }

    this.difficultyTimer += deltaTime;
    const difficultyFactor = Math.min(1, this.difficultyTimer / 60);
    this.spawnInterval = 1.5 - difficultyFactor * 0.9;
    if (this.spawnInterval < this.minSpawnInterval) {
      this.spawnInterval = this.minSpawnInterval;
    }

    this.spawnTimer += deltaTime;
    const minGap = this.safeZoneWidth + forwardSpeed * this.spawnInterval * 0.3;
    if (this.spawnTimer >= this.spawnInterval && 
        this.lastSpawnX < this.config.canvasWidth - minGap) {
      this.spawnTimer = 0;
      this.spawnObstacle(forwardSpeed);
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      if (obs.isWarning) {
        obs.warningTimer -= deltaTime;
        if (obs.warningTimer <= 0) {
          obs.isWarning = false;
          obs.isActive = true;
        }
      }

      if (obs.isActive || obs.isWarning) {
        obs.x -= obs.speed * deltaTime;
      }

      if (obs.type === 'icicle' && obs.isActive) {
        obs.y += obs.fallSpeed * deltaTime;
        obs.wobble += deltaTime * 3;
      }

      if (obs.x + obs.width < -100 || obs.y > this.config.canvasHeight + 100) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private spawnObstacle(forwardSpeed: number): void {
    const rand = Math.random();
    let type: ObstacleType;
    if (rand < 0.6) {
      type = 'spike';
    } else {
      type = 'icicle';
    }

    if (this.lastSpawnType === type && Math.random() < 0.4) {
      type = type === 'spike' ? 'icicle' : 'spike';
    }

    if (type === 'spike') {
      const difficultyFactor = Math.min(1, this.difficultyTimer / 60);
      const maxCount = difficultyFactor > 0.5 ? 3 : 2;
      const count = Math.random() < 0.25 ? Math.min(2, maxCount) : 1;
      const spacing = 55 + Math.random() * 25;
      const startXOffset = Math.random() * 60;

      const totalWidth = count * spacing;
      const gapStart = Math.random() * (this.config.canvasWidth - totalWidth - this.safeZoneWidth * 2) + this.safeZoneWidth;
      
      for (let i = 0; i < count; i++) {
        const spike = this.createSpike(gapStart + startXOffset + i * spacing + this.config.canvasWidth * 0.3, forwardSpeed);
        this.obstacles.push(spike);
        if (i === count - 1) {
          this.lastSpawnX = gapStart + startXOffset + i * spacing + spike.width + this.config.canvasWidth * 0.3;
        }
      }

      if (count >= 2) {
        this.ensureSafePath(count);
      }
    } else {
      const xOffset = Math.random() * (this.config.canvasWidth - this.safeZoneWidth * 2) + this.safeZoneWidth;
      const icicle = this.createIcicle(xOffset, forwardSpeed);
      this.obstacles.push(icicle);
      this.lastSpawnX = xOffset + icicle.width;
    }

    this.lastSpawnType = type;
  }

  private ensureSafePath(count: number): void {
    const hasSafeGap = Math.random() < 0.7;
    if (hasSafeGap && count >= 2) {
      const skipIndex = Math.floor(Math.random() * count);
      const toRemove: number[] = [];
      
      for (let i = this.obstacles.length - count; i < this.obstacles.length; i++) {
        const idxInGroup = i - (this.obstacles.length - count);
        if (idxInGroup === skipIndex) {
          toRemove.push(i);
        }
      }
      
      for (const idx of toRemove.reverse()) {
        if (idx >= 0 && idx < this.obstacles.length) {
          this.obstacles.splice(idx, 1);
        }
      }
    }
  }

  private createSpike(x: number, forwardSpeed: number): Obstacle {
    const width = 30 + Math.random() * 20;
    const height = 40 + Math.random() * 30;

    return {
      id: this.nextId++,
      type: 'spike',
      x,
      y: this.config.groundY - height,
      width,
      height,
      speed: forwardSpeed,
      fallSpeed: 0,
      isWarning: true,
      warningTimer: 0.8,
      warningDuration: 0.8,
      isActive: false,
      rotation: 0,
      wobble: 0
    };
  }

  private createIcicle(x: number, forwardSpeed: number): Obstacle {
    const width = 20 + Math.random() * 15;
    const height = 60 + Math.random() * 40;
    const y = -height - Math.random() * 80;

    return {
      id: this.nextId++,
      type: 'icicle',
      x,
      y,
      width,
      height,
      speed: forwardSpeed * 0.5,
      fallSpeed: 120 + Math.random() * 80,
      isWarning: true,
      warningTimer: 1.0,
      warningDuration: 1.0,
      isActive: false,
      rotation: 0,
      wobble: Math.random() * Math.PI * 2
    };
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  getActiveObstacles(): Obstacle[] {
    return this.obstacles.filter(o => o.isActive);
  }

  checkCollision(hitbox: { x: number; y: number; radius: number }): boolean {
    for (const obs of this.obstacles) {
      if (!obs.isActive) continue;

      if (obs.type === 'spike') {
        if (this.checkSpikeCollision(obs, hitbox)) {
          return true;
        }
      } else {
        if (this.checkIcicleCollision(obs, hitbox)) {
          return true;
        }
      }
    }
    return false;
  }

  private checkSpikeCollision(spike: Obstacle, hitbox: { x: number; y: number; radius: number }): boolean {
    const closestX = Math.max(spike.x, Math.min(hitbox.x, spike.x + spike.width));
    const closestY = Math.max(spike.y, Math.min(hitbox.y, spike.y + spike.height));
    const distanceX = hitbox.x - closestX;
    const distanceY = hitbox.y - closestY;
    return (distanceX * distanceX + distanceY * distanceY) < (hitbox.radius * hitbox.radius * 0.8);
  }

  private checkIcicleCollision(icicle: Obstacle, hitbox: { x: number; y: number; radius: number }): boolean {
    const closestX = Math.max(icicle.x, Math.min(hitbox.x, icicle.x + icicle.width));
    const closestY = Math.max(icicle.y, Math.min(hitbox.y, icicle.y + icicle.height));
    const distanceX = hitbox.x - closestX;
    const distanceY = hitbox.y - closestY;
    return (distanceX * distanceX + distanceY * distanceY) < (hitbox.radius * hitbox.radius * 0.8);
  }

  reset(): void {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1.5;
    this.difficultyTimer = 0;
    this.lastSpawnType = null;
    this.lastSpawnX = -this.safeZoneWidth;
    this.nextId = 0;
  }

  resize(width: number, height: number, groundY: number): void {
    this.config.canvasWidth = width;
    this.config.canvasHeight = height;
    this.config.groundY = groundY;
  }
}
