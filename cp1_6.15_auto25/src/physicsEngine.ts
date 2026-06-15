import { v4 as uuidv4 } from 'uuid';

export interface Particle {
  id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  density: number;
  ingredientId: string;
  alpha: number;
  life: number;
}

export interface Bubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
  wobble: number;
  wobbleSpeed: number;
}

export interface StirState {
  isStirring: boolean;
  mouseX: number;
  mouseY: number;
  prevMouseX: number;
  prevMouseY: number;
}

const GRAVITY = 0.15;
const DAMPING = 0.98;
const REPULSION = 0.8;
const REPULSION_DIST = 18;
const DENSITY_FORCE = 0.03;
const STIR_RADIUS = 80;
const STIR_FORCE = 2.5;
const MAX_PARTICLES = 800;
const BOUNDARY_PADDING = 10;
const BUBBLE_SPAWN_RATE = 0.3;
const COLOR_BLEND_SPEED = 0.005;

export class PhysicsEngine {
  private particles: Particle[] = [];
  private bubbles: Bubble[] = [];
  private canvasWidth: number = 400;
  private canvasHeight: number = 400;
  private animFrameId: number | null = null;
  private stirState: StirState = {
    isStirring: false,
    mouseX: 0,
    mouseY: 0,
    prevMouseX: 0,
    prevMouseY: 0,
  };
  private onUpdate: ((particles: Particle[], bubbles: Bubble[]) => void) | null = null;
  private targetColor: string | null = null;
  private blendingColor: boolean = false;
  private temperature: number = 0;
  private stirAccum: number = 0;
  private lastTime: number = 0;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setOnUpdate(cb: (particles: Particle[], bubbles: Bubble[]) => void) {
    this.onUpdate = cb;
  }

  setCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  getStirAccum(): number {
    return this.stirAccum;
  }

  setStirAccum(v: number) {
    this.stirAccum = Math.max(0, Math.min(100, v));
  }

  decayStirAccum(dt: number) {
    this.stirAccum = Math.max(0, this.stirAccum - 5 * dt);
  }

  setTemperature(t: number) {
    this.temperature = t;
  }

  startBlendColor(targetColor: string) {
    this.targetColor = targetColor;
    this.blendingColor = true;
  }

  addParticles(centerX: number, centerY: number, count: number, color: string, density: number, ingredientId: string) {
    const toAdd = Math.min(count, MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < toAdd; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 20;
      const x = centerX + Math.cos(angle) * dist;
      const y = centerY + Math.sin(angle) * dist;
      this.particles.push({
        id: uuidv4(),
        x: this.clampX(x),
        y: this.clampY(y),
        prevX: this.clampX(x),
        prevY: this.clampY(y),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: 4 + Math.random() * 3,
        color,
        density,
        ingredientId,
        alpha: 0.85,
        life: 1.0,
      });
    }
  }

  startStir(x: number, y: number) {
    this.stirState.isStirring = true;
    this.stirState.mouseX = x;
    this.stirState.mouseY = y;
    this.stirState.prevMouseX = x;
    this.stirState.prevMouseY = y;
  }

  updateStir(x: number, y: number) {
    if (!this.stirState.isStirring) return;
    this.stirState.prevMouseX = this.stirState.mouseX;
    this.stirState.prevMouseY = this.stirState.mouseY;
    this.stirState.mouseX = x;
    this.stirState.mouseY = y;
    const dx = x - this.stirState.prevMouseX;
    const dy = y - this.stirState.prevMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.stirAccum = Math.min(100, this.stirAccum + dist * 0.15);
  }

  stopStir() {
    this.stirState.isStirring = false;
  }

  start() {
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  clear() {
    this.particles = [];
    this.bubbles = [];
    this.stirAccum = 0;
    this.temperature = 0;
    this.targetColor = null;
    this.blendingColor = false;
  }

  removeParticlesByIngredient(ingredientId: string) {
    this.particles = this.particles.filter(p => p.ingredientId !== ingredientId);
  }

  private loop = () => {
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.033);
    this.lastTime = now;

    this.update(dt);
    if (this.onUpdate) {
      this.onUpdate(this.particles, this.bubbles);
    }
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.decayStirAccum(dt);
    this.applyGravity();
    this.applyDensityForces();
    this.applyStirForce();
    this.applyParticleRepulsion();
    this.applyColorBlend(dt);
    this.integrate(dt);
    this.enforceBoundaries();
    this.updateBubbles(dt);
    this.spawnBubbles();
  }

  private applyGravity() {
    for (const p of this.particles) {
      p.vy += GRAVITY * p.density * 0.01;
    }
  }

  private applyDensityForces() {
    const avgDensity = this.particles.length > 0
      ? this.particles.reduce((s, p) => s + p.density, 0) / this.particles.length
      : 1;
    for (const p of this.particles) {
      const diff = p.density - avgDensity;
      p.vy += diff * DENSITY_FORCE * -1;
    }
  }

  private applyStirForce() {
    if (!this.stirState.isStirring) return;
    const cx = this.stirState.mouseX;
    const cy = this.stirState.mouseY;
    const dx = this.stirState.mouseX - this.stirState.prevMouseX;
    const dy = this.stirState.mouseY - this.stirState.prevMouseY;

    for (const p of this.particles) {
      const px = p.x - cx;
      const py = p.y - cy;
      const dist = Math.sqrt(px * px + py * py);
      if (dist < STIR_RADIUS && dist > 1) {
        const factor = (1 - dist / STIR_RADIUS) * STIR_FORCE;
        const perpX = -py / dist;
        const perpY = px / dist;
        const moveLen = Math.sqrt(dx * dx + dy * dy);
        const dir = (dx * perpX + dy * perpY) >= 0 ? 1 : -1;
        p.vx += perpX * factor * dir * 0.5 + dx * factor * 0.02;
        p.vy += perpY * factor * dir * 0.5 + dy * factor * 0.02;
        const stirMix = moveLen * 0.001;
        p.vx += (Math.random() - 0.5) * stirMix;
        p.vy += (Math.random() - 0.5) * stirMix;
      }
    }
  }

  private applyParticleRepulsion() {
    const len = this.particles.length;
    if (len > 500) {
      this.applySpatialRepulsion();
      return;
    }
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const a = this.particles[i];
        const b = this.particles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = REPULSION_DIST;
        if (distSq < minDist * minDist && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const force = (minDist - dist) / dist * REPULSION * 0.5;
          const fx = dx * force;
          const fy = dy * force;
          a.vx -= fx * 0.5;
          a.vy -= fy * 0.5;
          b.vx += fx * 0.5;
          b.vy += fy * 0.5;
        }
      }
    }
  }

  private applySpatialRepulsion() {
    const cellSize = REPULSION_DIST * 2;
    const grid = new Map<string, Particle[]>();
    for (const p of this.particles) {
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);
      const key = `${cx},${cy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(p);
    }
    for (const p of this.particles) {
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const key = `${cx + ox},${cy + oy}`;
          const neighbors = grid.get(key);
          if (!neighbors) continue;
          for (const n of neighbors) {
            if (n.id === p.id) continue;
            const dx = n.x - p.x;
            const dy = n.y - p.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < REPULSION_DIST * REPULSION_DIST && distSq > 0.01) {
              const dist = Math.sqrt(distSq);
              const force = (REPULSION_DIST - dist) / dist * REPULSION * 0.3;
              p.vx -= dx * force * 0.5;
              p.vy -= dy * force * 0.5;
            }
          }
        }
      }
    }
  }

  private applyColorBlend(dt: number) {
    if (!this.blendingColor || !this.targetColor) return;
    const tc = this.hexToRgb(this.targetColor);
    if (!tc) return;
    let allDone = true;
    for (const p of this.particles) {
      const pc = this.hexToRgb(p.color);
      if (!pc) continue;
      const dr = tc.r - pc.r;
      const dg = tc.g - pc.g;
      const db = tc.b - pc.b;
      if (Math.abs(dr) > 1 || Math.abs(dg) > 1 || Math.abs(db) > 1) {
        allDone = false;
        const speed = COLOR_BLEND_SPEED * dt * 60;
        p.color = this.rgbToHex(
          Math.round(pc.r + dr * speed),
          Math.round(pc.g + dg * speed),
          Math.round(pc.b + db * speed)
        );
      }
    }
    if (allDone) {
      this.blendingColor = false;
    }
  }

  private integrate(dt: number) {
    for (const p of this.particles) {
      p.prevX = p.x;
      p.prevY = p.y;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
    }
  }

  private enforceBoundaries() {
    for (const p of this.particles) {
      const r = p.radius;
      if (p.x - r < BOUNDARY_PADDING) {
        p.x = BOUNDARY_PADDING + r;
        p.vx *= -0.5;
      }
      if (p.x + r > this.canvasWidth - BOUNDARY_PADDING) {
        p.x = this.canvasWidth - BOUNDARY_PADDING - r;
        p.vx *= -0.5;
      }
      if (p.y - r < BOUNDARY_PADDING) {
        p.y = BOUNDARY_PADDING + r;
        p.vy *= -0.5;
      }
      if (p.y + r > this.canvasHeight - BOUNDARY_PADDING) {
        p.y = this.canvasHeight - BOUNDARY_PADDING - r;
        p.vy *= -0.5;
      }
    }
  }

  private spawnBubbles() {
    if (this.temperature < 80) return;
    if (this.particles.length === 0) return;
    if (Math.random() < BUBBLE_SPAWN_RATE * (this.temperature / 100)) {
      const baseParticle = this.particles[Math.floor(Math.random() * this.particles.length)];
      this.bubbles.push({
        x: baseParticle.x + (Math.random() - 0.5) * 30,
        y: this.canvasHeight - 20 - Math.random() * 40,
        radius: 3 + Math.random() * 3,
        speed: 0.8 + Math.random() * 1.5,
        alpha: 0.4 + Math.random() * 0.3,
        wobble: 0,
        wobbleSpeed: 0.05 + Math.random() * 0.1,
      });
    }
  }

  private updateBubbles(dt: number) {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.y -= b.speed * dt * 60;
      b.wobble += b.wobbleSpeed;
      b.x += Math.sin(b.wobble) * 0.5;
      b.alpha -= 0.003 * dt * 60;
      if (b.y < 0 || b.alpha <= 0) {
        this.bubbles.splice(i, 1);
      }
    }
  }

  private clampX(x: number): number {
    return Math.max(BOUNDARY_PADDING, Math.min(this.canvasWidth - BOUNDARY_PADDING, x));
  }

  private clampY(y: number): number {
    return Math.max(BOUNDARY_PADDING, Math.min(this.canvasHeight - BOUNDARY_PADDING, y));
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, x)).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
}
