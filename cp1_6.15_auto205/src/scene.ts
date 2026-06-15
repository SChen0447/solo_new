import { eventBus } from './eventBus';
import type { NebulaParticle, Debris, EnergyCore, Asteroid, GravityTrap, Vec2, GameData } from './types';

let nextId = 1;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function lerpColor(t: number): string {
  const r = Math.round(142 + (41 - 142) * t);
  const g = Math.round(68 + (128 - 68) * t);
  const b = Math.round(173 + (185 - 173) * t);
  return `rgb(${r},${g},${b})`;
}

function generateDebrisVertices(): Vec2[] {
  const count = Math.floor(rand(4, 7));
  const verts: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + rand(-0.3, 0.3);
    const dist = rand(10, 22);
    verts.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
  }
  return verts;
}

function createNebulaParticles(w: number, h: number): NebulaParticle[] {
  const particles: NebulaParticle[] = [];
  const count = Math.floor(rand(300, 501));
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const dist = rand(0, Math.max(w, h) * 0.7);
    const t = Math.random();
    particles.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      size: rand(2, 6),
      color: lerpColor(t),
      angle,
      dist,
      speed: rand(0.002, 0.008),
      alpha: rand(0.15, 0.5),
    });
  }
  return particles;
}

function spawnDebris(w: number, h: number): Debris {
  const side = Math.floor(rand(0, 4));
  let x: number, y: number, vx: number, vy: number;
  if (side === 0) { x = -30; y = rand(0, h); vx = rand(20, 60); vy = rand(-30, 30); }
  else if (side === 1) { x = w + 30; y = rand(0, h); vx = rand(-60, -20); vy = rand(-30, 30); }
  else if (side === 2) { x = rand(0, w); y = -30; vx = rand(-30, 30); vy = rand(20, 60); }
  else { x = rand(0, w); y = h + 30; vx = rand(-30, 30); vy = rand(-60, -20); }
  const gray = Math.floor(rand(0x55, 0xab));
  return {
    id: nextId++,
    pos: { x, y },
    vel: { x: vx, y: vy },
    rotation: rand(0, Math.PI * 2),
    rotSpeed: rand(0.3, 1.5),
    vertices: generateDebrisVertices(),
    color: `rgb(${gray},${gray},${gray})`,
    captured: false,
    captureProgress: 0,
  };
}

function spawnCore(w: number, h: number): EnergyCore {
  const side = Math.floor(rand(0, 4));
  let x: number, y: number, vx: number, vy: number;
  if (side === 0) { x = -20; y = rand(0, h); vx = rand(15, 45); vy = rand(-20, 20); }
  else if (side === 1) { x = w + 20; y = rand(0, h); vx = rand(-45, -15); vy = rand(-20, 20); }
  else if (side === 2) { x = rand(0, w); y = -20; vx = rand(-20, 20); vy = rand(15, 45); }
  else { x = rand(0, w); y = h + 20; vx = rand(-20, 20); vy = rand(-45, -15); }
  return {
    id: nextId++,
    pos: { x, y },
    vel: { x: vx, y: vy },
    radius: 12,
    color: '#f1c40f',
    pulsePhase: rand(0, Math.PI * 2),
    captured: false,
    captureProgress: 0,
  };
}

function spawnAsteroid(w: number, h: number): Asteroid {
  const side = Math.floor(rand(0, 4));
  let x: number, y: number, vx: number, vy: number;
  const speed = rand(40, 90);
  if (side === 0) { x = -50; y = rand(0, h); vx = speed; vy = rand(-speed * 0.5, speed * 0.5); }
  else if (side === 1) { x = w + 50; y = rand(0, h); vx = -speed; vy = rand(-speed * 0.5, speed * 0.5); }
  else if (side === 2) { x = rand(0, w); y = -50; vx = rand(-speed * 0.5, speed * 0.5); vy = speed; }
  else { x = rand(0, w); y = h + 50; vx = rand(-speed * 0.5, speed * 0.5); vy = -speed; }
  const radius = rand(12, 25);
  const grayT = Math.random();
  const color = grayT < 0.5 ? '#7f8c8d' : '#95a5a6';
  const bumpCount = Math.floor(rand(6, 12));
  const bumps: number[] = [];
  for (let i = 0; i < bumpCount; i++) {
    bumps.push(rand(0.7, 1.3));
  }
  return {
    id: nextId++,
    pos: { x, y },
    vel: { x: vx, y: vy },
    radius,
    color,
    rotation: rand(0, Math.PI * 2),
    rotSpeed: rand(0.5, 2),
    bumps,
  };
}

function spawnTrap(w: number, h: number): GravityTrap {
  return {
    id: nextId++,
    pos: { x: rand(100, w - 100), y: rand(100, h - 100) },
    baseRadius: 20,
    pulsePhase: rand(0, Math.PI * 2),
  };
}

export class Scene {
  private particles: NebulaParticle[] = [];
  private debrisList: Debris[] = [];
  private coreList: EnergyCore[] = [];
  private asteroidList: Asteroid[] = [];
  private trapList: GravityTrap[] = [];
  private debrisTimer = 0;
  private coreTimer = 0;
  private asteroidTimer = 0;
  private trapTimer = 0;

  init(w: number, h: number): void {
    this.particles = createNebulaParticles(w, h);
    this.debrisList = [];
    this.coreList = [];
    this.asteroidList = [];
    this.trapList = [];
    this.debrisTimer = 0;
    this.coreTimer = 0;
    this.asteroidTimer = 0;
    this.trapTimer = 0;
    for (let i = 0; i < 8; i++) {
      this.debrisList.push(spawnDebris(w, h));
    }
    for (let i = 0; i < 3; i++) {
      this.coreList.push(spawnCore(w, h));
    }
    for (let i = 0; i < 5; i++) {
      this.asteroidList.push(spawnAsteroid(w, h));
    }
    for (let i = 0; i < 2; i++) {
      this.trapList.push(spawnTrap(w, h));
    }
  }

  update(dt: number, w: number, h: number): void {
    const cx = w / 2;
    const cy = h / 2;
    for (const p of this.particles) {
      p.angle += p.speed * dt;
      p.x = cx + Math.cos(p.angle) * p.dist;
      p.y = cy + Math.sin(p.angle) * p.dist;
    }

    this.debrisTimer += dt;
    if (this.debrisTimer > 2.0 && this.debrisList.filter(d => !d.captured).length + this.coreList.filter(c => !c.captured).length < 120) {
      this.debrisTimer = 0;
      this.debrisList.push(spawnDebris(w, h));
    }

    this.coreTimer += dt;
    if (this.coreTimer > 4.0 && this.coreList.filter(c => !c.captured).length < 20) {
      this.coreTimer = 0;
      this.coreList.push(spawnCore(w, h));
    }

    this.asteroidTimer += dt;
    if (this.asteroidTimer > 1.5 && this.asteroidList.length < 15) {
      this.asteroidTimer = 0;
      this.asteroidList.push(spawnAsteroid(w, h));
    }

    this.trapTimer += dt;
    if (this.trapTimer > 12.0 && this.trapList.length < 5) {
      this.trapTimer = 0;
      this.trapList.push(spawnTrap(w, h));
    }

    for (const d of this.debrisList) {
      if (!d.captured) {
        d.pos.x += d.vel.x * dt;
        d.pos.y += d.vel.y * dt;
        d.rotation += d.rotSpeed * dt;
      }
    }
    for (const c of this.coreList) {
      if (!c.captured) {
        c.pos.x += c.vel.x * dt;
        c.pos.y += c.vel.y * dt;
        c.pulsePhase += dt;
      }
    }
    for (const a of this.asteroidList) {
      a.pos.x += a.vel.x * dt;
      a.pos.y += a.vel.y * dt;
      a.rotation += a.rotSpeed * dt;
    }
    for (const t of this.trapList) {
      t.pulsePhase += dt;
    }

    this.debrisList = this.debrisList.filter(d => {
      if (d.captured) return true;
      return d.pos.x > -100 && d.pos.x < w + 100 && d.pos.y > -100 && d.pos.y < h + 100;
    });
    this.coreList = this.coreList.filter(c => {
      if (c.captured) return true;
      return c.pos.x > -100 && c.pos.x < w + 100 && c.pos.y > -100 && c.pos.y < h + 100;
    });
    this.asteroidList = this.asteroidList.filter(a => {
      return a.pos.x > -100 && a.pos.x < w + 100 && a.pos.y > -100 && a.pos.y < h + 100;
    });
  }

  drawNebula(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawDebris(ctx: CanvasRenderingContext2D): void {
    for (const d of this.debrisList) {
      if (d.captured) continue;
      ctx.save();
      ctx.translate(d.pos.x, d.pos.y);
      ctx.rotate(d.rotation);
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.moveTo(d.vertices[0].x, d.vertices[0].y);
      for (let i = 1; i < d.vertices.length; i++) {
        ctx.lineTo(d.vertices[i].x, d.vertices[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (d.captureProgress > 0 && d.captureProgress < 1) {
        const barW = 80;
        const barH = 8;
        const bx = d.pos.x - barW / 2;
        const by = d.pos.y - 30;
        ctx.fillStyle = '#34495e';
        ctx.fillRect(bx, by, barW, barH);
        const t = d.captureProgress;
        const r = Math.round(231 + (46 - 231) * t);
        const g = Math.round(76 + (204 - 76) * t);
        const b = Math.round(60 + (113 - 60) * t);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(bx, by, barW * t, barH);
      }
    }
  }

  drawCores(ctx: CanvasRenderingContext2D): void {
    for (const c of this.coreList) {
      if (c.captured) continue;
      const pulse = Math.sin(c.pulsePhase / 1.5 * Math.PI * 2) * 0.3 + 0.7;
      const glowR = c.radius + 8 * pulse;
      const gradient = ctx.createRadialGradient(c.pos.x, c.pos.y, c.radius * 0.3, c.pos.x, c.pos.y, glowR);
      gradient.addColorStop(0, 'rgba(241,196,15,0.9)');
      gradient.addColorStop(0.5, 'rgba(241,196,15,0.4)');
      gradient.addColorStop(1, 'rgba(241,196,15,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(c.pos.x, c.pos.y, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.pos.x, c.pos.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
      if (c.captureProgress > 0 && c.captureProgress < 1) {
        const barW = 80;
        const barH = 8;
        const bx = c.pos.x - barW / 2;
        const by = c.pos.y - 35;
        ctx.fillStyle = '#34495e';
        ctx.fillRect(bx, by, barW, barH);
        const t = c.captureProgress;
        const r = Math.round(231 + (46 - 231) * t);
        const g = Math.round(76 + (204 - 76) * t);
        const b = Math.round(60 + (113 - 60) * t);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(bx, by, barW * t, barH);
      }
    }
  }

  drawAsteroids(ctx: CanvasRenderingContext2D): void {
    for (const a of this.asteroidList) {
      ctx.save();
      ctx.translate(a.pos.x, a.pos.y);
      ctx.rotate(a.rotation);
      ctx.fillStyle = a.color;
      ctx.beginPath();
      const bumpCount = a.bumps.length;
      for (let i = 0; i <= bumpCount; i++) {
        const angle = (Math.PI * 2 * i) / bumpCount;
        const bumpMul = a.bumps[i % bumpCount];
        const rx = Math.cos(angle) * a.radius * bumpMul;
        const ry = Math.sin(angle) * a.radius * bumpMul;
        if (i === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawTraps(ctx: CanvasRenderingContext2D): void {
    for (const t of this.trapList) {
      const pulse = Math.sin(t.pulsePhase / 0.8 * Math.PI * 2);
      const radius = t.baseRadius + 15 * (0.5 + 0.5 * pulse);
      const gradient = ctx.createRadialGradient(t.pos.x, t.pos.y, 0, t.pos.x, t.pos.y, radius);
      gradient.addColorStop(0, 'rgba(142,68,173,0.5)');
      gradient.addColorStop(0.6, 'rgba(142,68,173,0.2)');
      gradient.addColorStop(1, 'rgba(142,68,173,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(t.pos.x, t.pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(142,68,173,0.4)';
      ctx.lineWidth = 1.5;
      const spiralTurns = 3;
      ctx.beginPath();
      for (let i = 0; i < 100; i++) {
        const frac = i / 100;
        const a = frac * Math.PI * 2 * spiralTurns + t.pulsePhase * 2;
        const r = frac * radius;
        const sx = t.pos.x + Math.cos(a) * r;
        const sy = t.pos.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
  }

  getDebris(): Debris[] { return this.debrisList; }
  getCores(): EnergyCore[] { return this.coreList; }
  getAsteroids(): Asteroid[] { return this.asteroidList; }
  getTraps(): GravityTrap[] { return this.trapList; }

  removeDebris(id: number): void {
    this.debrisList = this.debrisList.filter(d => d.id !== id);
  }
  removeCore(id: number): void {
    this.coreList = this.coreList.filter(c => c.id !== id);
  }
}
