import type { ParticleSystem } from './effects';

export interface ResourceOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  collected: boolean;
  pulsePhase: number;
}

export class Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  health: number;
  maxHealth: number;
  rotation: number;
  rotationSpeed: number;
  vertices: number[];
  isMeteor: boolean;
  active: boolean;

  constructor(x: number, y: number, radius: number, isMeteor: boolean = false, targetX?: number, targetY?: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.isMeteor = isMeteor;
    this.active = true;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 2;

    const vertexCount = 8 + Math.floor(Math.random() * 5);
    this.vertices = [];
    for (let i = 0; i < vertexCount; i++) {
      const r = radius * (0.7 + Math.random() * 0.5);
      this.vertices.push(r);
    }

    if (isMeteor && targetX !== undefined && targetY !== undefined) {
      const angle = Math.atan2(targetY - y, targetX - x);
      const speed = 250 + Math.random() * 150;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.health = 1;
      this.maxHealth = 1;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.health = Math.floor(radius / 15);
      this.maxHealth = this.health;
    }
  }

  update(dt: number, width: number, height: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;

    if (this.isMeteor) return;

    const margin = this.radius + 50;
    if (this.x < -margin) this.x = width + margin;
    if (this.x > width + margin) this.x = -margin;
    if (this.y < -margin) this.y = height + margin;
    if (this.y > height + margin) this.y = -margin;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.isMeteor) {
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
      gradient.addColorStop(0, '#ff6600');
      gradient.addColorStop(0.5, '#ff3300');
      gradient.addColorStop(1, '#991100');

      ctx.fillStyle = gradient;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff4400';

      ctx.beginPath();
      for (let i = 0; i < this.vertices.length; i++) {
        const angle = (Math.PI * 2 * i) / this.vertices.length;
        const r = this.vertices[i];
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      const trailAngle = Math.atan2(this.vy, this.vx) + Math.PI;
      const trailLength = this.radius * 3;
      const trailGradient = ctx.createLinearGradient(
        Math.cos(trailAngle) * this.radius * 0.5,
        Math.sin(trailAngle) * this.radius * 0.5,
        Math.cos(trailAngle) * trailLength,
        Math.sin(trailAngle) * trailLength
      );
      trailGradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
      trailGradient.addColorStop(1, 'transparent');

      ctx.strokeStyle = trailGradient;
      ctx.lineWidth = this.radius * 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Math.cos(trailAngle) * this.radius * 0.3, Math.sin(trailAngle) * this.radius * 0.3);
      ctx.lineTo(Math.cos(trailAngle) * trailLength, Math.sin(trailAngle) * trailLength);
      ctx.stroke();
    } else {
      const gradient = ctx.createRadialGradient(-this.radius * 0.3, -this.radius * 0.3, 0, 0, 0, this.radius);
      gradient.addColorStop(0, '#666677');
      gradient.addColorStop(0.7, '#444455');
      gradient.addColorStop(1, '#222233');

      ctx.fillStyle = gradient;
      ctx.strokeStyle = '#555566';
      ctx.lineWidth = 2;

      ctx.beginPath();
      for (let i = 0; i < this.vertices.length; i++) {
        const angle = (Math.PI * 2 * i) / this.vertices.length;
        const r = this.vertices[i];
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#39ff14';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#39ff14';
      ctx.beginPath();
      ctx.arc(this.radius * 0.2, -this.radius * 0.1, this.radius * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(-this.radius * 0.3, this.radius * 0.2, this.radius * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  hit(damage: number = 1): boolean {
    this.health -= damage;
    return this.health <= 0;
  }

  explode(particles: ParticleSystem): ResourceOrb[] {
    const orbs: ResourceOrb[] = [];

    if (this.isMeteor) {
      particles.createExplosion(this.x, this.y, 15);
      particles.createDebris(this.x, this.y, 5);
    } else {
      const orbCount = Math.max(1, Math.floor(this.radius / 12));
      for (let i = 0; i < orbCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 80;
        orbs.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          value: Math.floor(5 + this.radius / 10),
          collected: false,
          pulsePhase: Math.random() * Math.PI * 2
        });
      }

      particles.createExplosion(this.x, this.y, Math.floor(this.radius / 2));
      particles.createDebris(this.x, this.y, Math.floor(this.radius / 8));
    }

    return orbs;
  }
}

export class AsteroidManager {
  asteroids: Asteroid[] = [];
  resources: ResourceOrb[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 1.5;

  private meteorState: 'idle' | 'warning' | 'active' = 'idle';
  private meteorIdleTimer: number = 0;
  private meteorIdleInterval: number = 30;
  private meteorWarningTimer: number = 0;
  private meteorWarningDuration: number = 2;
  private meteorActiveTimer: number = 0;
  private meteorActiveDuration: number = 5;
  private warningSoundTriggered: boolean = false;

  private width: number;
  private height: number;
  private particles: ParticleSystem;

  constructor(width: number, height: number, particles: ParticleSystem) {
    this.width = width;
    this.height = height;
    this.particles = particles;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(dt: number, playerX: number, playerY: number, _scoreMultiplier: number = 1): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnAsteroid();
    }

    switch (this.meteorState) {
      case 'idle':
        this.meteorIdleTimer += dt;
        if (this.meteorIdleTimer >= this.meteorIdleInterval) {
          this.meteorState = 'warning';
          this.meteorWarningTimer = 0;
          this.warningSoundTriggered = false;
        }
        break;

      case 'warning':
        this.meteorWarningTimer += dt;
        if (this.meteorWarningTimer >= this.meteorWarningDuration) {
          this.meteorState = 'active';
          this.meteorActiveTimer = 0;
        }
        break;

      case 'active':
        this.meteorActiveTimer += dt;
        if (this.meteorActiveTimer < this.meteorActiveDuration) {
          if (Math.random() < dt * 8) {
            this.spawnMeteor(playerX, playerY);
          }
        } else {
          this.clearMeteors();
          this.meteorState = 'idle';
          this.meteorIdleTimer = 0;
        }
        break;
    }

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      a.update(dt, this.width, this.height);

      if (a.isMeteor) {
        const margin = 100;
        if (a.x < -margin || a.x > this.width + margin ||
            a.y < -margin || a.y > this.height + margin) {
          if (a.x < -margin && a.vx < 0) continue;
          if (a.x > this.width + margin && a.vx > 0) continue;
          if (a.y < -margin && a.vy < 0) continue;
          if (a.y > this.height + margin && a.vy > 0) continue;
          this.asteroids.splice(i, 1);
        }
      }

      if (!a.active) {
        this.asteroids.splice(i, 1);
      }
    }

    for (let i = this.resources.length - 1; i >= 0; i--) {
      const orb = this.resources[i];
      if (orb.collected) {
        this.resources.splice(i, 1);
        continue;
      }

      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      orb.vx *= 0.98;
      orb.vy *= 0.98;
      orb.pulsePhase += dt * 4;

      const margin = 50;
      if (orb.x < -margin || orb.x > this.width + margin ||
          orb.y < -margin || orb.y > this.height + margin) {
        this.resources.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const a of this.asteroids) {
      a.draw(ctx);
    }

    for (const orb of this.resources) {
      if (orb.collected) continue;

      const pulse = 1 + Math.sin(orb.pulsePhase) * 0.2;
      const radius = 8 * pulse;

      ctx.save();
      ctx.fillStyle = '#39ff14';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#39ff14';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(orb.x - 2, orb.y - 2, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private spawnAsteroid(): void {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0: x = Math.random() * this.width; y = -50; break;
      case 1: x = this.width + 50; y = Math.random() * this.height; break;
      case 2: x = Math.random() * this.width; y = this.height + 50; break;
      default: x = -50; y = Math.random() * this.height; break;
    }

    const radius = 25 + Math.random() * 35;
    this.asteroids.push(new Asteroid(x, y, radius, false));
  }

  private spawnMeteor(targetX: number, targetY: number): void {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;
    const offset = 100;

    switch (side) {
      case 0:
        x = Math.random() * this.width;
        y = -offset;
        break;
      case 1:
        x = this.width + offset;
        y = Math.random() * this.height;
        break;
      case 2:
        x = Math.random() * this.width;
        y = this.height + offset;
        break;
      default:
        x = -offset;
        y = Math.random() * this.height;
        break;
    }

    const radius = 12 + Math.random() * 15;
    this.asteroids.push(new Asteroid(x, y, radius, true, targetX, targetY));
  }

  spawnInitial(count: number): void {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const radius = 25 + Math.random() * 35;
      this.asteroids.push(new Asteroid(x, y, radius, false));
    }
  }

  checkLaserCollision(
    laserX: number, laserY: number, laserAngle: number, laserLength: number
  ): { asteroid: Asteroid; hitX: number; hitY: number } | null {
    const lx1 = laserX;
    const ly1 = laserY;
    const lx2 = laserX + Math.cos(laserAngle) * laserLength;
    const ly2 = laserY + Math.sin(laserAngle) * laserLength;

    let closest: { asteroid: Asteroid; hitX: number; hitY: number; dist: number } | null = null;

    for (const asteroid of this.asteroids) {
      const dx = lx2 - lx1;
      const dy = ly2 - ly1;
      const fx = lx1 - asteroid.x;
      const fy = ly1 - asteroid.y;

      const a = dx * dx + dy * dy;
      const b = 2 * (fx * dx + fy * dy);
      const c = fx * fx + fy * fy - asteroid.radius * asteroid.radius;

      let discriminant = b * b - 4 * a * c;
      if (discriminant < 0) continue;

      discriminant = Math.sqrt(discriminant);
      const t1 = (-b - discriminant) / (2 * a);
      const t2 = (-b + discriminant) / (2 * a);

      let t = -1;
      if (t1 >= 0 && t1 <= 1) t = t1;
      else if (t2 >= 0 && t2 <= 1) t = t2;

      if (t >= 0 && t <= 1) {
        const hitX = lx1 + dx * t;
        const hitY = ly1 + dy * t;
        const dist = Math.sqrt((hitX - lx1) ** 2 + (hitY - ly1) ** 2);

        if (!closest || dist < closest.dist) {
          closest = { asteroid, hitX, hitY, dist };
        }
      }
    }

    if (closest) {
      return { asteroid: closest.asteroid, hitX: closest.hitX, hitY: closest.hitY };
    }
    return null;
  }

  destroyAsteroid(asteroid: Asteroid, scoreMultiplier: number = 1): number {
    const index = this.asteroids.indexOf(asteroid);
    if (index === -1) return 0;

    const orbs = asteroid.explode(this.particles);
    for (const orb of orbs) {
      orb.value = Math.floor(orb.value * scoreMultiplier);
      this.resources.push(orb);
    }

    this.asteroids.splice(index, 1);
    return Math.floor(asteroid.maxHealth * 10 * scoreMultiplier);
  }

  isMeteorRainActive(): boolean {
    return this.meteorState === 'active';
  }

  isMeteorRainWarning(): boolean {
    return this.meteorState === 'warning';
  }

  shouldPlayWarningSound(): boolean {
    if (this.meteorState === 'warning' && !this.warningSoundTriggered) {
      this.warningSoundTriggered = true;
      return true;
    }
    return false;
  }

  getMeteorRainProgress(): number {
    if (this.meteorState !== 'active') return 0;
    return 1 - this.meteorActiveTimer / this.meteorActiveDuration;
  }

  getMeteorTimerProgress(): number {
    if (this.meteorState === 'active') return 1;
    if (this.meteorState === 'warning') {
      return (this.meteorIdleInterval + this.meteorWarningTimer) / (this.meteorIdleInterval + this.meteorWarningDuration);
    }
    return this.meteorIdleTimer / (this.meteorIdleInterval + this.meteorWarningDuration);
  }

  setSpawnRate(rate: number): void {
    this.spawnInterval = Math.max(0.3, rate);
  }

  private clearMeteors(): void {
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      if (this.asteroids[i].isMeteor) {
        this.asteroids.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.asteroids = [];
    this.resources = [];
    this.spawnTimer = 0;
    this.meteorState = 'idle';
    this.meteorIdleTimer = 0;
    this.meteorWarningTimer = 0;
    this.meteorActiveTimer = 0;
    this.warningSoundTriggered = false;
  }

  collectResource(orb: ResourceOrb): void {
    orb.collected = true;
    this.particles.createPickup(orb.x, orb.y);
  }
}
