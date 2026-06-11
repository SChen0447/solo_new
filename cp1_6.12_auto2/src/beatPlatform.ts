import { BeatEngine, BeatEvent } from './beatEngine';

const PLATFORM_HUE_LIST = [0, 30, 60, 120, 180, 210, 270, 300];

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
  private baseSpeed: number = 3;
  private scrollSpeed: number = 3;
  private platformWidth: number = 80;
  private platformHeight: number = 16;
  private groundY: number;
  private nextBeatToSpawn: number = 0;
  private lastPulseTime: number = 0;
  private beatPulse: number = 0;
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
    this.scrollSpeed = this.baseSpeed;
    this.particles = [];

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
    this.scrollSpeed = this.baseSpeed * speedMultiplier;

    const beatEvents = this.beatEngine.pollBeats();
    for (const event of beatEvents) {
      this.spawnPlatform(event);
      this.beatPulse = 1.0;
      this.lastPulseTime = performance.now();
    }

    for (const p of this.platforms) {
      p.x -= this.scrollSpeed * (dt / 16.67);
    }

    this.platforms = this.platforms.filter(p => p.x + p.width > -50);

    const now = performance.now();
    const pulseElapsed = now - this.lastPulseTime;
    if (pulseElapsed < 200) {
      this.beatPulse = 1.0 - pulseElapsed / 200;
    } else {
      this.beatPulse = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.x += part.vx * (dt / 16.67);
      part.y += part.vy * (dt / 16.67);
      part.vy += 0.15 * (dt / 16.67);
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
    const currentSpeed = this.baseSpeed * speedMultiplier;

    const spacing = currentSpeed * (interval / 16.67);

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

  getScrollSpeed(): number {
    return this.scrollSpeed;
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
