import type { Rect } from './Player';

export interface Platform extends Rect {
  type: 'normal' | 'goal';
}

export interface Gem {
  x: number;
  y: number;
  width: number;
  height: number;
  color: 'blue' | 'red' | 'yellow';
  collected: boolean;
  scale: number;
  collectAnim: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface LevelData {
  platforms: Platform[];
  gems: Gem[];
  particles: Particle[];
  goalX: number;
  goalY: number;
  spawnX: number;
  spawnY: number;
  levelWidth: number;
  levelHeight: number;
}

export class Level {
  private platforms: Platform[] = [];
  private gems: Gem[] = [];
  private particles: Particle[] = [];
  private goalX: number = 0;
  private goalY: number = 0;
  private spawnX: number = 100;
  private spawnY: number = 400;
  public levelWidth: number = 4000;
  public levelHeight: number = 900;

  private seed: number = 0;
  private readonly GEM_COLORS: ('blue' | 'red' | 'yellow')[] = ['blue', 'red', 'yellow'];
  private readonly PARTICLE_POOL_SIZE: number = 50;
  private particlePool: Particle[] = [];

  constructor() {
    this.initParticlePool();
  }

  private initParticlePool(): void {
    for (let i = 0; i < this.PARTICLE_POOL_SIZE; i++) {
      this.particlePool.push({
        x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff', size: 4
      });
    }
  }

  public generate(seed?: number): void {
    this.seed = seed ?? Math.floor(Math.random() * 1000000);
    this.platforms = [];
    this.gems = [];
    this.particles = [];

    const groundY = this.levelHeight - 80;
    let currentX = 0;

    this.platforms.push({
      x: 0, y: groundY, width: 200, height: 80, type: 'normal'
    });
    this.spawnX = 80;
    this.spawnY = groundY - 40;

    const platformCount = 18 + Math.floor(this.nextRand() * 5);
    let lastY = groundY;
    currentX = 200;

    for (let i = 0; i < platformCount; i++) {
      const gap = 100 + Math.floor(this.nextRand() * 140);
      const width = 100 + Math.floor(this.nextRand() * 180);
      const heightVariation = (this.nextRand() - 0.5) * 250;
      let newY = lastY + heightVariation;
      newY = Math.max(200, Math.min(groundY, newY));

      const maxJumpUp = 200;
      const maxJumpDown = 280;
      if (lastY - newY > maxJumpUp) {
        newY = lastY - maxJumpUp;
      }
      if (newY - lastY > maxJumpDown) {
        newY = lastY + maxJumpDown;
      }

      currentX += gap;
      this.platforms.push({
        x: currentX, y: newY, width: width, height: 32, type: 'normal'
      });

      if (this.nextRand() > 0.35 && this.gems.length < 5) {
        const gemX = currentX + width / 2 - 12;
        const gemY = newY - 50 - Math.floor(this.nextRand() * 60);
        const color = this.GEM_COLORS[Math.floor(this.nextRand() * this.GEM_COLORS.length)];
        this.gems.push({
          x: gemX, y: gemY, width: 24, height: 24,
          color: color, collected: false, scale: 1, collectAnim: 0
        });
      }

      lastY = newY;
      currentX += width;
    }

    while (this.gems.length < 3) {
      const platformIndex = 2 + Math.floor(this.nextRand() * (this.platforms.length - 4));
      const p = this.platforms[platformIndex];
      if (p) {
        const gemX = p.x + p.width / 2 - 12;
        const gemY = p.y - 50;
        const color = this.GEM_COLORS[Math.floor(this.nextRand() * this.GEM_COLORS.length)];
        const exists = this.gems.some(g => Math.abs(g.x - gemX) < 50);
        if (!exists) {
          this.gems.push({
            x: gemX, y: gemY, width: 24, height: 24,
            color: color, collected: false, scale: 1, collectAnim: 0
          });
        }
      }
    }

    const lastPlatform = this.platforms[this.platforms.length - 1];
    if (lastPlatform) {
      this.goalX = lastPlatform.x + lastPlatform.width / 2 - 20;
      this.goalY = lastPlatform.y - 80;
      this.levelWidth = lastPlatform.x + lastPlatform.width + 300;
    }

    this.platforms.push({
      x: this.levelWidth - 200, y: groundY, width: 200, height: 80, type: 'normal'
    });
  }

  private nextRand(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  public update(dt: number, time: number): void {
    for (let i = 0; i < this.gems.length; i++) {
      const gem = this.gems[i];
      if (!gem.collected) {
        gem.scale = 0.85 + Math.sin(time * 3 + i) * 0.15;
      } else if (gem.collectAnim > 0) {
        gem.collectAnim -= dt * 3;