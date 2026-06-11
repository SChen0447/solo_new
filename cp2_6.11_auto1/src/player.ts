import type { ParticleSystem } from './effects';
import type { AsteroidManager, Asteroid } from './asteroid';

export interface PlayerState {
  x: number;
  y: number;
  angle: number;
  health: number;
  maxHealth: number;
  invincible: boolean;
  invincibleTimer: number;
}

export class Player {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  angle: number = -Math.PI / 2;
  targetAngle: number = -Math.PI / 2;
  health: number = 3;
  maxHealth: number = 3;
  speed: number = 300;
  friction: number = 0.95;
  size: number = 20;
  invincible: boolean = false;
  invincibleTimer: number = 0;
  pickupRadius: number = 60;

  private width: number;
  private height: number;
  private particles: ParticleSystem;
  private thrustTimer: number = 0;

  constructor(x: number, y: number, width: number, height: number, particles: ParticleSystem) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.particles = particles;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(dt: number, keys: Set<string>, mouseX: number, mouseY: number): void {
    const angleToMouse = Math.atan2(mouseY - this.y, mouseX - this.x);
    this.targetAngle = angleToMouse;

    let angleDiff = this.targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.angle += angleDiff * Math.min(1, dt * 10);

    let ax = 0;
    let ay = 0;
    const acceleration = this.speed * 4;

    if (keys.has('KeyW') || keys.has('ArrowUp')) ay -= acceleration;
    if (keys.has('KeyS') || keys.has('ArrowDown')) ay += acceleration;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ax -= acceleration;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ax += acceleration;

    this.vx += ax * dt;
    this.vy += ay * dt;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.speed) {
      this.vx = (this.vx / speed) * this.speed;
      this.vy = (this.vy / speed) * this.speed;
    }

    this.vx *= Math.pow(this.friction, dt * 60);
    this.vy *= Math.pow(this.friction, dt * 60);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const margin = this.size;
    this.x = Math.max(margin, Math.min(this.width - margin, this.x));
    this.y = Math.max(margin, Math.min(this.height - margin, this.y));

    this.thrustTimer += dt;
    if ((ax !== 0 || ay !== 0) && this.thrustTimer > 0.02) {
      this.thrustTimer = 0;
      const thrustAngle = this.angle + Math.PI;
      const offsetX = Math.cos(thrustAngle) * this.size * 0.7;
      const offsetY = Math.sin(thrustAngle) * this.size * 0.7;
      this.particles.createThrust(this.x + offsetX, this.y + offsetY, this.angle);
    }

    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.invincible && Math.floor(this.invincibleTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    ctx.fillStyle = '#2a2a4a';
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#39ff14';

    ctx.beginPath();
    ctx.moveTo(this.size, 0);
    ctx.lineTo(-this.size * 0.6, -this.size * 0.6);
    ctx.lineTo(-this.size * 0.3, 0);
    ctx.lineTo(-this.size * 0.6, this.size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff8c00';
    ctx.shadowColor = '#ff8c00';
    ctx.beginPath();
    ctx.arc(this.size * 0.1, 0, this.size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(this.size * 0.15, -this.size * 0.08, this.size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  checkCollision(asteroidManager: AsteroidManager): Asteroid | null {
    if (this.invincible) return null;

    for (const asteroid of asteroidManager.asteroids) {
      const dx = this.x - asteroid.x;
      const dy = this.y - asteroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.size * 0.7 + asteroid.radius * 0.8) {
        return asteroid;
      }
    }
    return null;
  }

  checkResourcePickup(asteroidManager: AsteroidManager): number {
    let totalValue = 0;

    for (const orb of asteroidManager.resources) {
      if (orb.collected) continue;

      const dx = this.x - orb.x;
      const dy = this.y - orb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.pickupRadius) {
        const attractSpeed = 300;
        const attractAngle = Math.atan2(dy, dx);
        orb.vx += Math.cos(attractAngle) * attractSpeed * 0.1;
        orb.vy += Math.sin(attractAngle) * attractSpeed * 0.1;
      }

      if (dist < this.size * 0.8) {
        asteroidManager.collectResource(orb);
        totalValue += orb.value;
      }
    }

    return totalValue;
  }

  takeDamage(damage: number = 1): boolean {
    if (this.invincible) return false;

    this.health -= damage;
    this.invincible = true;
    this.invincibleTimer = 2;

    return this.health <= 0;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.health = this.maxHealth;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.angle = -Math.PI / 2;
  }

  getState(): PlayerState {
    return {
      x: this.x,
      y: this.y,
      angle: this.angle,
      health: this.health,
      maxHealth: this.maxHealth,
      invincible: this.invincible,
      invincibleTimer: this.invincibleTimer
    };
  }
}

export interface Laser {
  x: number;
  y: number;
  angle: number;
  length: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export class LaserManager {
  lasers: Laser[] = [];
  cooldown: number = 0.25;
  private lastShot: number = 0;
  private particles: ParticleSystem;

  constructor(particles: ParticleSystem) {
    this.particles = particles;
  }

  update(dt: number): void {
    this.lastShot -= dt;

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.life -= dt;
      if (laser.life <= 0 || !laser.active) {
        this.lasers.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const laser of this.lasers) {
      const alpha = laser.life / laser.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#39ff14';
      ctx.lineCap = 'round';

      const endX = laser.x + Math.cos(laser.angle) * laser.length;
      const endY = laser.y + Math.sin(laser.angle) * laser.length;

      ctx.beginPath();
      ctx.moveTo(laser.x, laser.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(laser.x, laser.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.restore();
    }
  }

  shoot(x: number, y: number, angle: number): Laser | null {
    if (this.lastShot > 0) return null;

    this.lastShot = this.cooldown;
    const laser: Laser = {
      x,
      y,
      angle,
      length: 600,
      life: 0.15,
      maxLife: 0.15,
      active: true
    };
    this.lasers.push(laser);

    for (let i = 0; i < 3; i++) {
      this.particles.addParticle({
        x: x + Math.cos(angle) * 10,
        y: y + Math.sin(angle) * 10,
        vx: Math.cos(angle) * 200 + (Math.random() - 0.5) * 50,
        vy: Math.sin(angle) * 200 + (Math.random() - 0.5) * 50,
        life: 0.2,
        maxLife: 0.2,
        size: 2,
        color: '#39ff14',
        type: 'thrust'
      });
    }

    return laser;
  }

  clear(): void {
    this.lasers = [];
    this.lastShot = 0;
  }
}
