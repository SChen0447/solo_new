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
  private safeZoneWidth: number = 80;
  private difficultyTimer: number = 0;
  private laneCount: number = 5;

  constructor(config: ObstacleManagerConfig) {
    this.config = config;
    this.lastSpawnX = -this.safeZoneWidth;
  }

  update(deltaTime: number, forwardSpeed: number, isFrozen: boolean): void {
    if (isFrozen) {
      for (const obs of this.obstacles) {
        if (obs.type === 'icicle' && obs.isActive) {
          obs.wobble += deltaTime * 1;
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
    const difficultyFactor = Math.min(1, this.difficultyTimer / 60);

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

    const playAreaLeft = this.safeZoneWidth;
    const playAreaRight = this.config.canvasWidth - this.safeZoneWidth;
    const playWidth = playAreaRight - playAreaLeft;
    const laneWidth = playWidth / this.laneCount;

    const minOccupied = Math.min(this.laneCount - 1, Math.floor(2 + difficultyFactor * 2));
    const maxOccupied = Math.min(this.laneCount - 1, Math.floor(3 + difficultyFactor * 2));
    const occupiedCount = Math.floor(minOccupied + Math.random() * (maxOccupied - minOccupied + 1));

    const laneIndices: number[] = [];
    for (let i = 0; i < this.laneCount; i++) {
      laneIndices.push(i);
    }

    for (let i = laneIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [laneIndices[i], laneIndices[j]] = [laneIndices[j], laneIndices[i]];
    }

    const occupiedLanes = laneIndices.slice(0, occupiedCount).sort((a, b) => a - b);

    if (type === 'spike') {
      this.spawnSpikeInLanes(forwardSpeed, occupiedLanes, laneWidth, playAreaLeft);
    } else {
      this.spawnIcicleInLanes(forwardSpeed, occupiedLanes, laneWidth, playAreaLeft);
    }

    this.lastSpawnType = type;
  }

  private spawnSpikeInLanes(
    forwardSpeed: number,
    occupiedLanes: number[],
    laneWidth: number,
    playAreaLeft: number
  ): void {
    const spawnX = this.config.canvasWidth + 60;
    const spikeWidth = 35 + Math.random() * 15;
    let maxX = spawnX;

    for (const laneIdx of occupiedLanes) {
      const laneCenter = playAreaLeft + laneWidth * (laneIdx + 0.5);
      const spikeX = spawnX + laneCenter - spikeWidth / 2;
      const spike = this.createSpike(spikeX, forwardSpeed);
      this.obstacles.push(spike);
      maxX = Math.max(maxX, spikeX + spikeWidth);
    }

    this.lastSpawnX = maxX;
  }

  private spawnIcicleInLanes(
    forwardSpeed: number,
    occupiedLanes: number[],
    laneWidth: number,
    playAreaLeft: number
  ): void {
    const spawnX = this.config.canvasWidth + 40;
    let maxX = spawnX;

    for (const laneIdx of occupiedLanes) {
      const laneCenter = playAreaLeft + laneWidth * (laneIdx + 0.5);
      const icicleWidth = 22 + Math.random() * 12;
      const icicleX = spawnX + laneCenter - icicleWidth / 2;
      const icicle = this.createIcicle(icicleX, forwardSpeed);
      this.obstacles.push(icicle);
      maxX = Math.max(maxX, icicleX + icicleWidth);
    }

    this.lastSpawnX = maxX;
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
