import { AsteroidSize, Crack, ASTEROID_CONFIGS, GAME_CONFIG } from './types';
import { Ship } from './ship';

export class Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: AsteroidSize;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  health: number;
  maxHealth: number;
  cracks: Crack[];
  containsFragment: boolean;
  active: boolean;
  vertices: { x: number; y: number }[];
  color: string;
  hitByWave: boolean;

  constructor(x: number, y: number, vx: number, vy: number, size: AsteroidSize, containsFragment: boolean = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.containsFragment = containsFragment;
    this.active = true;
    this.hitByWave = false;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 2;

    const config = ASTEROID_CONFIGS[size];
    this.radius = config.radius;
    this.health = config.health;
    this.maxHealth = config.health;
    this.color = config.color;

    this.vertices = this.generateVertices();
    this.cracks = [];
  }

  private generateVertices(): { x: number; y: number }[] {
    const vertices: { x: number; y: number }[] = [];
    const numVertices = 8 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const variance = 0.7 + Math.random() * 0.5;
      const r = this.radius * variance;
      vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }
    
    return vertices;
  }

  addCrack(): void {
    if (this.cracks.length < 5) {
      const angle = Math.random() * Math.PI * 2;
      const startDist = this.radius * (0.2 + Math.random() * 0.3);
      this.cracks.push({
        x: Math.cos(angle) * startDist,
        y: Math.sin(angle) * startDist,
        length: this.radius * (0.4 + Math.random() * 0.4),
        angle: angle + (Math.random() - 0.5) * 0.5
      });
    }
  }

  update(dt: number, _shipX: number, _shipY: number, width: number, height: number): void {
    if (!this.active) return;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;
    this.hitByWave = false;

    const margin = this.radius * 3;
    if (
      this.x < -margin ||
      this.x > width + margin ||
      this.y < -margin ||
      this.y > height + margin
    ) {
      this.active = false;
    }
  }

  applyGravityWave(ship: Ship): boolean {
    if (this.hitByWave || !ship.gravityWaveActive) return false;

    const dx = this.x - ship.x;
    const dy = this.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= ship.gravityWaveRadius && dist > ship.gravityWaveRadius - GAME_CONFIG.GRAVITY_WAVE_SPEED * 0.03) {
      this.hitByWave = true;
      
      const force = GAME_CONFIG.GRAVITY_WAVE_FORCE * (1 - dist / ship.gravityWaveMaxRadius);
      const nx = dx / dist;
      const ny = dy / dist;
      
      this.vx += nx * force;
      this.vy += ny * force;
      
      this.health--;
      this.addCrack();
      
      if (this.health <= 0) {
        this.active = false;
        return true;
      }
    }
    
    return false;
  }

  checkShipCollision(ship: Ship): boolean {
    const dx = this.x - ship.x;
    const dy = this.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.radius + GAME_CONFIG.SHIP_RADIUS - 5;
  }

  split(): Asteroid[] {
    if (this.size === 'small') return [];
    
    const newSize: AsteroidSize = this.size === 'large' ? 'medium' : 'small';
    const newAsteroids: Asteroid[] = [];
    const numPieces = this.size === 'large' ? 3 : 2;
    
    for (let i = 0; i < numPieces; i++) {
      const angle = (i / numPieces) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 60;
      const vx = Math.cos(angle) * speed + this.vx * 0.3;
      const vy = Math.sin(angle) * speed + this.vy * 0.3;
      
      const asteroid = new Asteroid(
        this.x,
        this.y,
        vx,
        vy,
        newSize,
        this.containsFragment && i === 0
      );
      newAsteroids.push(asteroid);
    }
    
    return newAsteroids;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();

    const gradient = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.3, 0,
      0, 0, this.radius
    );
    gradient.addColorStop(0, this.lightenColor(this.color, 20));
    gradient.addColorStop(0.7, this.color);
    gradient.addColorStop(1, this.darkenColor(this.color, 30));
    
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = this.darkenColor(this.color, 50);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (const crack of this.cracks) {
      ctx.beginPath();
      ctx.moveTo(crack.x, crack.y);
      ctx.lineTo(
        crack.x + Math.cos(crack.angle) * crack.length,
        crack.y + Math.sin(crack.angle) * crack.length
      );
      ctx.stroke();
    }

    if (this.containsFragment) {
      const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 255, ${pulse * 0.6})`;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 255, ${pulse * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }
}

export class AsteroidManager {
  asteroids: Asteroid[];
  private spawnTimer: number;
  private spawnInterval: number;

  constructor() {
    this.asteroids = [];
    this.spawnTimer = 0;
    this.spawnInterval = GAME_CONFIG.ASTEROID_SPAWN_BASE_INTERVAL;
  }

  reset(): void {
    this.asteroids = [];
    this.spawnTimer = 0;
    this.spawnInterval = GAME_CONFIG.ASTEROID_SPAWN_BASE_INTERVAL;
  }

  update(dt: number, ship: Ship, gameTime: number, width: number, height: number): { destroyed: number; score: number; newFragments: { x: number; y: number }[] } {
    let destroyed = 0;
    let score = 0;
    const newFragments: { x: number; y: number }[] = [];

    this.spawnInterval = GAME_CONFIG.ASTEROID_SPAWN_BASE_INTERVAL / (1 + gameTime * GAME_CONFIG.ASTEROID_DIFFICULTY_FACTOR);
    this.spawnTimer += dt * 1000;

    if (this.spawnTimer >= this.spawnInterval && this.asteroids.length < GAME_CONFIG.MAX_ASTEROIDS) {
      this.spawnTimer = 0;
      this.spawnAsteroid(ship.x, ship.y, gameTime, width, height);
    }

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      asteroid.update(dt, ship.x, ship.y, width, height);

      if (ship.gravityWaveActive) {
        if (asteroid.applyGravityWave(ship)) {
          destroyed++;
          score += ASTEROID_CONFIGS[asteroid.size].score;
          
          if (asteroid.containsFragment) {
            newFragments.push({ x: asteroid.x, y: asteroid.y });
          }
          
          const fragments = asteroid.split();
          this.asteroids.push(...fragments);
        }
      }

      if (!asteroid.active) {
        this.asteroids.splice(i, 1);
      }
    }

    return { destroyed, score, newFragments };
  }

  private spawnAsteroid(shipX: number, shipY: number, gameTime: number, width: number, height: number): void {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;
    const margin = 60;

    switch (side) {
      case 0:
        x = Math.random() * width;
        y = -margin;
        break;
      case 1:
        x = width + margin;
        y = Math.random() * height;
        break;
      case 2:
        x = Math.random() * width;
        y = height + margin;
        break;
      default:
        x = -margin;
        y = Math.random() * height;
        break;
    }

    const rand = Math.random();
    let size: AsteroidSize;
    if (rand < 0.2) size = 'large';
    else if (rand < 0.7) size = 'medium';
    else size = 'small';

    const angleOffset = (Math.random() - 0.5) * 0.8;
    const dx = shipX - x;
    const dy = shipY - y;
    const baseAngle = Math.atan2(dy, dx);
    const angle = baseAngle + angleOffset;

    const speedIncrease = gameTime * 0.5;
    const baseSpeed = ASTEROID_CONFIGS[size].speed;
    const speed = baseSpeed + speedIncrease;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    let containsFragment = false;
    if (size === 'large') {
      containsFragment = Math.random() < GAME_CONFIG.FRAGMENT_HIDDEN_CHANCE_LARGE;
    } else if (size === 'medium') {
      containsFragment = Math.random() < GAME_CONFIG.FRAGMENT_HIDDEN_CHANCE_MEDIUM;
    }

    const asteroid = new Asteroid(x, y, vx, vy, size, containsFragment);
    this.asteroids.push(asteroid);
  }

  checkShipCollision(ship: Ship): boolean {
    for (const asteroid of this.asteroids) {
      if (asteroid.active && asteroid.checkShipCollision(ship)) {
        return true;
      }
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const asteroid of this.asteroids) {
      asteroid.draw(ctx);
    }
  }
}
