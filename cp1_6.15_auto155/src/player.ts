import {
  Vec2,
  Circle,
  vec2,
  vec2Add,
  vec2Mul,
  vec2Normalize,
  vec2Length,
  vec2Clamp,
  circleCollision,
  clamp,
  AnimationTimer,
  Particle,
  randomRange,
} from './utils';

export type WeaponType = 'pistol' | 'shotgun';

export interface WeaponConfig {
  name: string;
  fireRate: number;
  bulletSpeed: number;
  pellets: number;
  spreadAngle: number;
  infiniteAmmo: boolean;
  ammo: number;
  icon: string;
}

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  pistol: {
    name: '手枪',
    fireRate: 0.4,
    bulletSpeed: 600,
    pellets: 1,
    spreadAngle: 0,
    infiniteAmmo: true,
    ammo: -1,
    icon: 'pistol',
  },
  shotgun: {
    name: '霰弹枪',
    fireRate: 0.8,
    bulletSpeed: 600,
    pellets: 3,
    spreadAngle: 30,
    infiniteAmmo: false,
    ammo: 20,
    icon: 'shotgun',
  },
};

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alive: boolean;
  fadeTimer: AnimationTimer;
  fromPlayer: boolean;
}

export class Player {
  public x: number;
  public y: number;
  public radius: number = 12;
  public baseSpeed: number = 200;
  public lives: number = 3;
  public maxLives: number = 3;
  public dead: boolean = false;
  public reviving: boolean = false;
  public alive: boolean = true;

  private velocity: Vec2 = vec2(0, 0);
  private keys: Set<string> = new Set();
  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseDown: boolean = false;

  private fireCooldown: number = 0;
  private reviveTimer: AnimationTimer = new AnimationTimer(3);
  private speedBoostTimer: AnimationTimer = new AnimationTimer(5);

  public weapon: WeaponType = 'pistol';
  public weaponAmmo: number = -1;

  private trailTimer: number = 0;
  private trailInterval: number = 0.02;

  public particles: Particle[] = [];
  public bullets: Bullet[] = [];

  private mapWidth: number;
  private mapHeight: number;

  constructor(x: number, y: number, mapWidth: number, mapHeight: number) {
    this.x = x;
    this.y = y;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
  }

  setKey(key: string, pressed: boolean): void {
    if (pressed) {
      this.keys.add(key.toLowerCase());
    } else {
      this.keys.delete(key.toLowerCase());
    }
  }

  setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  setMouseDown(down: boolean): void {
    this.mouseDown = down;
  }

  getWeaponConfig(): WeaponConfig {
    return WEAPONS[this.weapon];
  }

  getCurrentSpeed(): number {
    if (this.speedBoostTimer.isRunning()) {
      return this.baseSpeed * 1.5;
    }
    return this.baseSpeed;
  }

  hasSpeedBoost(): boolean {
    return this.speedBoostTimer.isRunning();
  }

  getSpeedBoostRemaining(): number {
    if (!this.speedBoostTimer.isRunning()) return 0;
    return 5 - this.speedBoostTimer.getElapsed();
  }

  applySpeedBoost(): void {
    this.speedBoostTimer.start();
  }

  pickupShotgun(): void {
    this.weapon = 'shotgun';
    this.weaponAmmo = WEAPONS.shotgun.ammo;
    this.fireCooldown = 0;
  }

  pickupMedkit(): boolean {
    if (this.lives < this.maxLives) {
      this.lives++;
      return true;
    }
    return false;
  }

  takeDamage(): boolean {
    this.lives--;
    if (this.lives <= 0) {
      this.dead = true;
      this.alive = false;
      return true;
    }
    this.startRevive();
    return false;
  }

  private startRevive(): void {
    this.reviving = true;
    this.reviveTimer.start();
  }

  isReviving(): boolean {
    return this.reviving;
  }

  getReviveProgress(): number {
    return this.reviveTimer.progress();
  }

  getCircle(): Circle {
    return { x: this.x, y: this.y, radius: this.radius };
  }

  update(dt: number): void {
    if (this.dead) return;

    if (this.reviving) {
      this.reviveTimer.update(dt);
      if (this.reviveTimer.isComplete()) {
        this.reviving = false;
      }
    }

    this.speedBoostTimer.update(dt);

    this.updateMovement(dt);
    this.updateShooting(dt);
    this.updateBullets(dt);
    this.updateParticles(dt);
    this.updateTrail(dt);
  }

  private updateMovement(dt: number): void {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    const speed = this.getCurrentSpeed();
    this.x += dx * speed * dt;
    this.y += dy * speed * dt;

    this.x = clamp(this.x, this.radius, this.mapWidth - this.radius);
    this.y = clamp(this.y, this.radius, this.mapHeight - this.radius);
  }

  private updateShooting(dt: number): void {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    if (this.mouseDown && this.fireCooldown <= 0 && !this.reviving) {
      this.fire();
    }
  }

  private fire(): void {
    const config = this.getWeaponConfig();
    
    if (!config.infiniteAmmo && this.weaponAmmo <= 0) {
      this.weapon = 'pistol';
      this.weaponAmmo = -1;
      return;
    }

    this.fireCooldown = config.fireRate;

    if (!config.infiniteAmmo) {
      this.weaponAmmo--;
      if (this.weaponAmmo <= 0) {
        this.weapon = 'pistol';
        this.weaponAmmo = -1;
      }
    }

    const baseAngle = Math.atan2(this.mouseY - this.y, this.mouseX - this.x);
    const spreadRad = (config.spreadAngle * Math.PI) / 180;

    for (let i = 0; i < config.pellets; i++) {
      let angle = baseAngle;
      if (config.pellets > 1) {
        const t = config.pellets === 1 ? 0 : i / (config.pellets - 1);
        angle = baseAngle - spreadRad / 2 + spreadRad * t;
      }

      const bullet: Bullet = {
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * config.bulletSpeed,
        vy: Math.sin(angle) * config.bulletSpeed,
        radius: 3,
        alive: true,
        fadeTimer: new AnimationTimer(0.1),
        fromPlayer: true,
      };
      this.bullets.push(bullet);
    }
  }

  private updateBullets(dt: number): void {
    for (const bullet of this.bullets) {
      if (!bullet.alive) {
        bullet.fadeTimer.update(dt);
        continue;
      }

      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (
        bullet.x < -50 ||
        bullet.x > this.mapWidth + 50 ||
        bullet.y < -50 ||
        bullet.y > this.mapHeight + 50
      ) {
        bullet.alive = false;
        bullet.fadeTimer.start();
      }
    }

    this.bullets = this.bullets.filter(
      (b) => b.alive || !b.fadeTimer.isComplete()
    );
  }

  public hitBullet(bullet: Bullet): void {
    if (bullet.alive) {
      bullet.alive = false;
      bullet.fadeTimer.start();
    }
  }

  private updateTrail(dt: number): void {
    this.trailTimer += dt;
    const moving = this.keys.size > 0;

    if (moving && this.trailTimer >= this.trailInterval) {
      this.trailTimer = 0;
      const particle = new Particle(
        this.x + randomRange(-2, 2),
        this.y + randomRange(-2, 2),
        randomRange(-10, 10),
        randomRange(-10, 10),
        randomRange(2, 4),
        '#00bfff',
        0.3
      );
      this.particles.push(particle);
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.update(dt);
    }
    this.particles = this.particles.filter((p) => p.alive);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      p.draw(ctx);
    }

    for (const bullet of this.bullets) {
      this.drawBullet(ctx, bullet);
    }

    if (this.dead) return;

    this.drawPlayer(ctx);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    if (this.reviving) {
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(Date.now() / 80);
    }

    if (this.speedBoostTimer.isRunning()) {
      ctx.shadowColor = '#2ecc71';
      ctx.shadowBlur = 15;
    }

    ctx.fillStyle = '#4169e1';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00bfff';
    ctx.lineWidth = 2;
    ctx.stroke();

    const angle = Math.atan2(this.mouseY - this.y, this.mouseX - this.x);
    const gunLength = this.radius + 8;
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(
      this.x + Math.cos(angle) * gunLength,
      this.y + Math.sin(angle) * gunLength
    );
    ctx.stroke();

    ctx.restore();
  }

  private drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
    ctx.save();

    let alpha = 1;
    if (!bullet.alive) {
      alpha = 1 - bullet.fadeTimer.progress();
    }
    ctx.globalAlpha = Math.max(0, alpha);

    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.lives = this.maxLives;
    this.dead = false;
    this.alive = true;
    this.reviving = false;
    this.weapon = 'pistol';
    this.weaponAmmo = -1;
    this.bullets = [];
    this.particles = [];
    this.fireCooldown = 0;
    this.speedBoostTimer.reset();
    this.reviveTimer.reset();
    this.keys.clear();
  }
}
