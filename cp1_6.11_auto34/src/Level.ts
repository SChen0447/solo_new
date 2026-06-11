import type { Rect } from './Player';
import { Player } from './Player';

export interface Platform extends Rect {
  type: 'normal' | 'ground';
}

export type GemColor = 'blue' | 'red' | 'yellow';

export interface Gem {
  x: number;
  y: number;
  width: number;
  height: number;
  color: GemColor;
  collected: boolean;
  baseScale: number;
  scale: number;
  collectAnim: number;
  flashIntensity: number;
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
  active: boolean;
}

export interface Goal {
  x: number;
  y: number;
  poleWidth: number;
  poleHeight: number;
  flagWidth: number;
  flagHeight: number;
  flagWave: number;
  flagWaveSpeed: number;
  flagWaveAmount: number;
}

export interface LevelData {
  platforms: Platform[];
  gems: Gem[];
  particles: Particle[];
  goal: Goal;
  spawnX: number;
  spawnY: number;
  levelWidth: number;
  levelHeight: number;
}

export class Level {
  public platforms: Platform[] = [];
  public gems: Gem[] = [];
  public particles: Particle[] = [];
  public goal: Goal = {
    x: 0, y: 0,
    poleWidth: 6, poleHeight: 80,
    flagWidth: 40, flagHeight: 28,
    flagWave: 0, flagWaveSpeed: 3, flagWaveAmount: 5
  };
  public spawnX: number = 80;
  public spawnY: number = 500;
  public levelWidth: number = 5000;
  public levelHeight: number = 900;

  private seed: number = 0;
  private readonly GEM_COLORS: GemColor[] = ['blue', 'red', 'yellow'];
  private readonly PARTICLE_POOL_SIZE: number = 60;
  private readonly GEM_HEX_COLORS: Record<GemColor, string> = {
    blue: '#4ec9ff',
    red: '#ff5566',
    yellow: '#ffdd55'
  };

  constructor() {
    this.initParticlePool();
  }

  private initParticlePool(): void {
    this.particles = [];
    for (let i = 0; i < this.PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1, color: '#fff', size: 4, active: false
      });
    }
  }

  public generate(seed?: number): void {
    this.seed = seed ?? Math.floor(Math.random() * 1000000);
    this.platforms = [];
    this.gems = [];
    for (const p of this.particles) p.active = false;

    const groundY = this.levelHeight - 80;
    const maxJumpUp = Player.MAX_JUMP_HEIGHT - 10;
    const maxJumpDown = 260;
    const maxHorizontalGap = Player.MAX_HORIZONTAL_REACH - 20;

    this.platforms.push({
      x: 0, y: groundY, width: 260, height: 80, type: 'ground'
    });
    this.spawnX = 80;
    this.spawnY = groundY - 40;

    const platformCount = 18 + Math.floor(this.nextRand() * 5);
    let lastRight = 260;
    let lastTop = groundY;

    for (let i = 0; i < platformCount; i++) {
      const minGap = 70;
      const maxGap = Math.min(maxHorizontalGap, 220);
      const gap = minGap + Math.floor(this.nextRand() * (maxGap - minGap));

      const minWidth = 90;
      const maxWidth = 220;
      const width = minWidth + Math.floor(this.nextRand() * (maxWidth - minWidth));

      const minY = 220;
      const maxY = groundY;
      let newY = lastTop + (this.nextRand() - 0.5) * 280;
      newY = Math.max(minY, Math.min(maxY, newY));

      const upDiff = lastTop - newY;
      const downDiff = newY - lastTop;
      if (upDiff > maxJumpUp) {
        newY = lastTop - maxJumpUp;
      }
      if (downDiff > maxJumpDown) {
        newY = lastTop + maxJumpDown;
      }

      const newX = lastRight + gap;

      this.platforms.push({
        x: newX, y: newY, width: width, height: 32, type: 'normal'
      });

      if (this.nextRand() > 0.3 && this.gems.length < 5) {
        this.tryPlaceGem(newX, width, newY);
      }

      lastRight = newX + width;
      lastTop = newY;
    }

    while (this.gems.length < 3) {
      const midIdx = 3 + Math.floor(this.nextRand() * (this.platforms.length - 6));
      const p = this.platforms[midIdx];
      if (p && p.type === 'normal') {
        this.tryPlaceGem(p.x, p.width, p.y, true);
      }
    }

    const endPlatform = this.platforms[this.platforms.length - 1];
    if (endPlatform) {
      this.goal.x = endPlatform.x + endPlatform.width / 2 - 3;
      this.goal.y = endPlatform.y - this.goal.poleHeight;
      this.levelWidth = endPlatform.x + endPlatform.width + 400;
    }

    this.platforms.push({
      x: this.levelWidth - 280, y: groundY, width: 280, height: 80, type: 'ground'
    });

    this.goal.flagWave = 0;
  }

  private tryPlaceGem(px: number, pw: number, py: number, force: boolean = false): void {
    const gemOffsetX = 20 + Math.floor(this.nextRand() * (pw - 60));
    const gemX = px + Math.max(10, gemOffsetX);
    const gemY = py - 48 - Math.floor(this.nextRand() * 70);
    const color = this.GEM_COLORS[Math.floor(this.nextRand() * this.GEM_COLORS.length)];

    const newRect = { x: gemX, y: gemY, width: 24, height: 24 };
    for (const g of this.gems) {
      if (this.rectsOverlap(newRect, { x: g.x, y: g.y, width: g.width, height: g.height })) {
        return;
      }
    }
    if (!force) {
      const dx = gemX - (px + pw / 2);
      if (Math.abs(dx) > pw * 0.6 && this.nextRand() > 0.5) return;
    }

    this.gems.push({
      x: gemX, y: gemY, width: 24, height: 24,
      color: color, collected: false,
      baseScale: 1, scale: 1,
      collectAnim: 0, flashIntensity: 0
    });
  }

  private rectsOverlap(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private nextRand(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  public update(dt: number, time: number, playerRect: Rect): { collected: boolean } {
    let result = { collected: false };

    for (let i = 0; i < this.gems.length; i++) {
      const gem = this.gems[i];
      if (!gem.collected) {
        gem.scale = 0.85 + Math.sin(time * 3 + i) * 0.15;
        if (this.rectsOverlap(playerRect, gem)) {
          gem.collected = true;
          gem.collectAnim = 1;
          gem.flashIntensity = 1;
          result.collected = true;
          this.spawnGemParticles(gem);
        }
      } else if (gem.collectAnim > 0) {
        gem.collectAnim -= dt * 2.5;
        gem.scale = Math.max(0, gem.collectAnim * 1.8);
        gem.flashIntensity = Math.max(0, gem.collectAnim);
        if (gem.collectAnim < 0) gem.collectAnim = 0;
      }
    }

    this.goal.flagWave += dt * this.goal.flagWaveSpeed;

    this.updateParticles(dt);

    return result;
  }

  private spawnGemParticles(gem: Gem): void {
    const color = this.GEM_HEX_COLORS[gem.color];
    const cx = gem.x + gem.width / 2;
    const cy = gem.y + gem.height / 2;

    for (let i = 0; i < 2; i++) {
      const p = this.getInactiveParticle();
      if (!p) break;
      const angle = (-Math.PI * 0.25) + (i === 0 ? -0.5 : 0.5);
      const speed = 120 + Math.random() * 80;
      p.x = cx;
      p.y = cy;
      p.vx = Math.cos(angle) * speed * (i === 0 ? -1 : 1);
      p.vy = Math.sin(angle) * speed - 60;
      p.life = 0.6;
      p.maxLife = 0.6;
      p.color = color;
      p.size = 4;
      p.active = true;
    }
  }

  private getInactiveParticle(): Particle | null {
    for (let i = 0; i < this.particles.length; i++) {
      if (!this.particles[i]!.active) return this.particles[i]!;
    }
    return null;
  }

  private updateParticles(dt: number): void {
    const gravity = 500;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p || !p.active) continue;
      p.vy += gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
      }
    }
  }

  public checkGoal(playerRect: Rect): boolean {
    const gx = this.goal.x;
    const gy = this.goal.y;
    const gw = this.goal.poleWidth + this.goal.flagWidth;
    const gh = this.goal.poleHeight;
    const goalRect: Rect = { x: gx - 5, y: gy - 5, width: gw + 10, height: gh + 10 };
    return this.rectsOverlap(playerRect, goalRect);
  }

  public getPlatforms(): Rect[] {
    return this.platforms as Rect[];
  }

  public isBelowScreen(y: number): boolean {
    return y > this.levelHeight + 200;
  }

  public gemHexColor(color: GemColor): string {
    return this.GEM_HEX_COLORS[color];
  }
}
