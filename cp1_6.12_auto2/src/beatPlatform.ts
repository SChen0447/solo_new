import { BeatEngine, BeatEvent } from './beatEngine';

const PLATFORM_HUE_LIST = [0, 30, 60, 120, 180, 210, 270, 300];

const BASE_SPEED_PX_PER_MS = 3 / 16.67;

export class Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  beatIndex: number;
  hue: number;
  pulsePhase: number = 0;
  passed: boolean = false;

  constructor(x: number, y: number, width: number, height: number, beatIndex: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.beatIndex = beatIndex;
    this.hue = PLATFORM_HUE_LIST[beatIndex % PLATFORM_HUE_LIST.length];
  }

  draw(ctx: CanvasRenderingContext2D, beatPulse: number): void {
    const pulse = 1 + beatPulse * 0.15;
    const drawWidth = this.width * pulse;
    const drawHeight = this.height * pulse;
    const drawX = this.x - (drawWidth - this.width) / 2;
    const drawY = this.y - (drawHeight - this.height) / 2;

    const grad = ctx.createLinearGradient(drawX, drawY, drawX + drawWidth, drawY + drawHeight);
    const saturation = 80 + beatPulse * 20;
    const lightness = 55 + beatPulse * 15;
    grad.addColorStop(0, `hsl(${this.hue}, ${saturation}%, ${lightness}%)`);
    grad.addColorStop(1, `hsl(${(this.hue + 40) % 360}, ${saturation}%, ${lightness - 10}%)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    const r = 6;
    ctx.moveTo(drawX + r, drawY);
    ctx.lineTo(drawX + drawWidth - r, drawY);
    ctx.quadraticCurveTo(drawX + drawWidth, drawY, drawX + drawWidth, drawY + r);
    ctx.lineTo(drawX + drawWidth, drawY + drawHeight - r);
    ctx.quadraticCurveTo(drawX + drawWidth, drawY + drawHeight, drawX + drawWidth - r, drawY + drawHeight);
    ctx.lineTo(drawX + r, drawY + drawHeight);
    ctx.quadraticCurveTo(drawX, drawY + drawHeight, drawX, drawY + drawHeight - r);
    ctx.lineTo(drawX, drawY + r);
    ctx.quadraticCurveTo(drawX, drawY, drawX + r, drawY);
    ctx.closePath();
    ctx.fill();

    if (beatPulse > 0.3) {
      ctx.shadowColor = `hsl(${this.hue}, 100%, 70%)`;
      ctx.shadowBlur = 15 * beatPulse;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

export class BeatPlatformManager {
  private platforms: Platform[] = [];
  private beatEngine: BeatEngine;
  private canvasWidth: number;
  private canvasHeight: number;
  private scrollSpeedPxPerMs: number = BASE_SPEED_PX_PER_MS;
  private platformWidth: number = 80;
  private platformHeight: number = 16;
  private groundY: number;
  private nextBeatToSpawn: number = 0;
  private beatPulse: number = 0;
  private pulseRemainingMs: number = 0;
  private particles: LandingParticle[] = [];

  constructor(beatEngine: BeatEngine, canvasWidth: number, canvasHeight: number) {
    this.beatEngine = beatEngine;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight * 0.75;
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight * 0.75;
  }

  init(): void {
    this.platforms = [];
    this.nextBeatToSpawn = 0;
    this.scrollSpeedPxPerMs = BASE_SPEED_PX_PER_MS;
    this.particles = [];
    this.beatPulse = 0;
    this.pulseRemainingMs = 0;

    const startPlatform = new Platform(
      this.canvasWidth * 0.15,
      this.groundY,
      this.platformWidth * 1.5,
      this.platformHeight,
      -1
    );
    this.platforms.push(startPlatform);
  }

  update(dt: number): void {
    const currentInterval = this.beatEngine.getCurrentSpeed();
    const speedMultiplier = 500 / Math.max(currentInterval, 200);
    this.scrollSpeedPxPerMs = BASE_SPEED_PX_PER_MS * speedMultiplier;

    const beatEvents = this.beatEngine.update(dt);
    for (const event of beatEvents) {
      this.spawnPlatform(event);
      this.beatPulse = 1.0;
      this.pulseRemainingMs = 200;
    }

    const deltaX = this.scrollSpeedPxPerMs * dt;
    for (const p of this.platforms) {
      p.x -= deltaX;
    }

    this.platforms = this.platforms.filter(p => p.x + p.width > -50);

    if (this.pulseRemainingMs > 0) {
      this.pulseRemainingMs -= dt;
      if (this.pulseRemainingMs <= 0) {
        this.pulseRemainingMs = 0;
        this.beatPulse = 0;
      } else {
        this.beatPulse = this.pulseRemainingMs / 200;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      const dtFactor = dt / 16.67;
      part.x += part.vx * dtFactor;
      part.y += part.vy * dtFactor;
      part.vy += 0.15 * dtFactor;
      part.life -= dt / 600;
      if (part.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnPlatform(event: BeatEvent): void {
    if (event.index < this.nextBeatToSpawn) return;
    this.nextBeatToSpawn = event.index + 1;

    const interval = this.beatEngine.getCurrentSpeed();
    const speedMultiplier = 500 / Math.max(interval, 200);
    const scrollSpeedPxPerMs = BASE_SPEED_PX_PER_MS * speedMultiplier;

    const spacing = scrollSpeedPxPerMs * interval;

    const lastPlatform = this.platforms[this.platforms.length - 1];
    const newX = Math.max(this.canvasWidth + 20, lastPlatform.x + lastPlatform.width + spacing);

    const yOffset = (Math.random() - 0.5) * 40;
    const newY = Math.max(
      this.groundY - 60,
      Math.min(this.groundY + 40, this.groundY + yOffset)
    );

    this.platforms.push(new Platform(newX, newY, this.platformWidth, this.platformHeight, event.index));
  }

  getPlatforms(): Platform[] {
    return this.platforms;
  }

  getScrollSpeedPxPerMs(): number {
    return this.scrollSpeedPxPerMs;
  }

  getBeatPulse(): number {
    return this.beatPulse;
  }

  spawnLandingParticles(x: number, y: number, hue: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 1,
        hue: hue,
        size: 2 + Math.random() * 3,
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.platforms) {
      p.draw(ctx, this.beatPulse);
    }

    for (const part of this.particles) {
      ctx.globalAlpha = Math.max(0, part.life);
      ctx.fillStyle = `hsl(${part.hue}, 90%, 70%)`;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size * part.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

interface LandingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
  size: number;
}
