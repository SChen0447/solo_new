import { Player, Bullet } from './player';
import { Zombie, SpawnCorner } from './zombie';
import {
  circleCollision,
  randomRange,
  randomInt,
  randomChoice,
  AnimationTimer,
  Particle,
  clamp,
} from './utils';

export type PickupType = 'shotgun' | 'speedBoost' | 'medkit';

export interface Pickup {
  type: PickupType;
  x: number;
  y: number;
  radius: number;
  alive: boolean;
  spawnTime: number;
  lifetime: number;
  bobPhase: number;
}

export interface ScoreFloat {
  id: number;
  value: number;
  x: number;
  y: number;
  startTime: number;
}

export class Game {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public width: number;
  public height: number;

  public player: Player;
  public zombies: Zombie[] = [];
  public pickups: Pickup[] = [];

  public score: number = 0;
  public combo: number = 0;
  public comboTimer: AnimationTimer = new AnimationTimer(2);
  public lastKillTime: number = 0;
  public scoreFloats: ScoreFloat[] = [];
  private scoreFloatId: number = 0;

  public waveTimer: AnimationTimer = new AnimationTimer(2.5, true);
  public waveNumber: number = 0;
  public maxZombies: number = 50;

  public pickupTimer: AnimationTimer = new AnimationTimer(8);
  public minPickupInterval: number = 6;
  public maxPickupInterval: number = 12;

  public running: boolean = false;
  public gameOver: boolean = false;

  public fps: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  private onScoreUpdate?: (score: number, combo: number) => void;
  private onLivesUpdate?: (lives: number, maxLives: number) => void;
  private onWeaponUpdate?: (
    weaponName: string,
    ammo: number,
    isInfinite: boolean,
    fireRate: string
  ) => void;
  private onGameOver?: (finalScore: number) => void;
  private onScoreFloat?: (value: number, x: number, y: number) => void;
  private onBuffUpdate?: (speedBoost: number) => void;
  private onReviveStart?: () => void;
  private onReviveEnd?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;

    this.player = new Player(
      this.width / 2,
      this.height / 2,
      this.width,
      this.height
    );
  }

  setCallbacks(callbacks: {
    onScoreUpdate?: (score: number, combo: number) => void;
    onLivesUpdate?: (lives: number, maxLives: number) => void;
    onWeaponUpdate?: (
      weaponName: string,
      ammo: number,
      isInfinite: boolean,
      fireRate: string
    ) => void;
    onGameOver?: (finalScore: number) => void;
    onScoreFloat?: (value: number, x: number, y: number) => void;
    onBuffUpdate?: (speedBoost: number) => void;
    onReviveStart?: () => void;
    onReviveEnd?: () => void;
  }): void {
    this.onScoreUpdate = callbacks.onScoreUpdate;
    this.onLivesUpdate = callbacks.onLivesUpdate;
    this.onWeaponUpdate = callbacks.onWeaponUpdate;
    this.onGameOver = callbacks.onGameOver;
    this.onScoreFloat = callbacks.onScoreFloat;
    this.onBuffUpdate = callbacks.onBuffUpdate;
    this.onReviveStart = callbacks.onReviveStart;
    this.onReviveEnd = callbacks.onReviveEnd;
  }

  start(): void {
    this.running = true;
    this.gameOver = false;
    this.notifyAll();
  }

  reset(): void {
    this.player.reset(this.width / 2, this.height / 2);
    this.zombies = [];
    this.pickups = [];
    this.scoreFloats = [];
    this.score = 0;
    this.combo = 0;
    this.waveNumber = 0;
    this.waveTimer.reset();
    this.waveTimer.start();
    this.pickupTimer.reset();
    this.pickupTimer.start();
    this.comboTimer.reset();
    this.gameOver = false;
    this.running = true;
    this.notifyAll();
  }

  private notifyAll(): void {
    if (this.onScoreUpdate) this.onScoreUpdate(this.score, this.combo);
    if (this.onLivesUpdate)
      this.onLivesUpdate(this.player.lives, this.player.maxLives);
    this.notifyWeaponUpdate();
    this.notifyBuffUpdate();
  }

  private notifyWeaponUpdate(): void {
    if (!this.onWeaponUpdate) return;
    const config = this.player.getWeaponConfig();
    const fireRateDesc = config.name === '霰弹枪' ? '慢速' : '正常';
    this.onWeaponUpdate(
      config.name,
      this.player.weaponAmmo,
      config.infiniteAmmo,
      fireRateDesc
    );
  }

  private notifyBuffUpdate(): void {
    if (!this.onBuffUpdate) return;
    const speedBoost = this.player.getSpeedBoostRemaining();
    this.onBuffUpdate(speedBoost);
  }

  update(dt: number): void {
    if (!this.running || this.gameOver) return;

    this.updateFPS(dt);

    const wasReviving = this.player.isReviving();
    this.player.update(dt);
    const nowReviving = this.player.isReviving();

    if (!wasReviving && nowReviving && this.onReviveStart) {
      this.onReviveStart();
    }
    if (wasReviving && !nowReviving && this.onReviveEnd) {
      this.onReviveEnd();
    }

    if (this.player.hasSpeedBoost() || this.player.getSpeedBoostRemaining() > 0) {
      this.notifyBuffUpdate();
    }

    this.updateWaves(dt);
    this.updateZombies(dt);
    this.updatePickups(dt);
    this.checkCollisions();
    this.updateCombo(dt);
  }

  private updateFPS(dt: number): void {
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
  }

  private updateWaves(dt: number): void {
    this.waveTimer.update(dt);
    if (this.waveTimer.isComplete() && this.zombies.filter((z) => z.alive).length < this.maxZombies) {
      this.spawnWave();
      this.waveTimer.reset();
      this.waveTimer.start();
    }
  }

  private spawnWave(): void {
    this.waveNumber++;
    const count = randomInt(2, 4);

    for (let i = 0; i < count; i++) {
      const corner = randomInt(0, 3) as SpawnCorner;
      const speedMultiplier = 1 + this.waveNumber * 0.02;
      const zombie = Zombie.spawnAtCorner(
        corner,
        this.width,
        this.height,
        Math.min(speedMultiplier, 1.8)
      );
      this.zombies.push(zombie);
    }
  }

  private updateZombies(dt: number): void {
    for (const zombie of this.zombies) {
      zombie.update(dt, this.player.x, this.player.y, this.zombies);
    }

    for (let i = 0; i < this.zombies.length; i++) {
      for (let j = i + 1; j < this.zombies.length; j++) {
        this.zombies[i].resolveCollisionWith(this.zombies[j]);
      }
    }

    this.zombies = this.zombies.filter((z) => z.alive || z.deathParticles.length > 0);
  }

  private updatePickups(dt: number): void {
    this.pickupTimer.update(dt);
    if (this.pickupTimer.isComplete()) {
      this.spawnPickup();
      const interval = randomRange(this.minPickupInterval, this.maxPickupInterval);
      this.pickupTimer = new AnimationTimer(interval, true);
    }

    const now = Date.now();
    this.pickups = this.pickups.filter((p) => {
      if (!p.alive) return false;
      const age = now - p.spawnTime;
      if (age > p.lifetime) return false;
      p.bobPhase += dt * 3;
      return true;
    });
  }

  private spawnPickup(): void {
    const types: PickupType[] = ['shotgun', 'speedBoost', 'medkit'];
    const type = randomChoice(types);
    const margin = 60;

    let attempts = 0;
    while (attempts < 20) {
      const x = randomRange(margin, this.width - margin);
      const y = randomRange(margin, this.height - margin);
      const dx = x - this.player.x;
      const dy = y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 80) {
        this.pickups.push({
          type,
          x,
          y,
          radius: 14,
          alive: true,
          spawnTime: Date.now(),
          lifetime: 15000,
          bobPhase: Math.random() * Math.PI * 2,
        });
        break;
      }
      attempts++;
    }
  }

  private updateCombo(dt: number): void {
    if (this.combo > 0) {
      this.comboTimer.update(dt);
      if (this.comboTimer.isComplete()) {
        this.combo = 0;
        if (this.onScoreUpdate) this.onScoreUpdate(this.score, this.combo);
      }
    }
  }

  private checkCollisions(): void {
    this.checkBulletZombieCollisions();
    this.checkPlayerZombieCollisions();
    this.checkPlayerPickupCollisions();
  }

  private checkBulletZombieCollisions(): void {
    const bullets = this.player.bullets;

    for (const bullet of bullets) {
      if (!bullet.alive) continue;

      for (const zombie of this.zombies) {
        if (!zombie.alive || zombie.dying) continue;

        if (circleCollision(
          { x: bullet.x, y: bullet.y, radius: bullet.radius },
          zombie.getCircle()
        )) {
          this.player.hitBullet(bullet);
          zombie.kill();
          this.onZombieKilled(zombie);
          break;
        }
      }
    }
  }

  private onZombieKilled(zombie: Zombie): void {
    this.combo++;
    this.lastKillTime = Date.now();
    this.comboTimer.reset();
    this.comboTimer.start();

    let points = 10;
    if (this.combo >= 5) {
      points += 5;
    }
    this.score += points;

    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score, this.combo);
    }
    if (this.onScoreFloat) {
      this.onScoreFloat(points, zombie.x, zombie.y);
    }
  }

  private checkPlayerZombieCollisions(): void {
    if (this.player.dead || this.player.isReviving()) return;

    for (const zombie of this.zombies) {
      if (!zombie.alive || zombie.dying) continue;
      if (!zombie.isFullySpawned()) continue;

      if (circleCollision(this.player.getCircle(), zombie.getCircle())) {
        this.onPlayerHit();
        break;
      }
    }
  }

  private onPlayerHit(): void {
    const isGameOver = this.player.takeDamage();

    if (this.onLivesUpdate) {
      this.onLivesUpdate(this.player.lives, this.player.maxLives);
    }

    if (isGameOver) {
      this.triggerGameOver();
    }
  }

  private triggerGameOver(): void {
    this.gameOver = true;
    this.running = false;
    if (this.onGameOver) {
      this.onGameOver(this.score);
    }
  }

  private checkPlayerPickupCollisions(): void {
    for (const pickup of this.pickups) {
      if (!pickup.alive) continue;

      if (circleCollision(this.player.getCircle(), pickup)) {
        this.collectPickup(pickup);
      }
    }
  }

  private collectPickup(pickup: Pickup): void {
    pickup.alive = false;

    switch (pickup.type) {
      case 'shotgun':
        this.player.pickupShotgun();
        this.notifyWeaponUpdate();
        break;
      case 'speedBoost':
        this.player.applySpeedBoost();
        this.notifyBuffUpdate();
        break;
      case 'medkit':
        this.player.pickupMedkit();
        if (this.onLivesUpdate) {
          this.onLivesUpdate(this.player.lives, this.player.maxLives);
        }
        break;
    }
  }

  render(): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#2d4a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawGrid();

    for (const pickup of this.pickups) {
      if (pickup.alive) this.drawPickup(pickup);
    }

    for (const zombie of this.zombies) {
      zombie.draw(ctx);
    }

    this.player.draw(ctx);

    this.drawFPS();
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;

    const gridSize = 40;
    for (let x = 0; x <= this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPickup(pickup: Pickup): void {
    const ctx = this.ctx;
    const bobOffset = Math.sin(pickup.bobPhase) * 3;
    const age = Date.now() - pickup.spawnTime;
    const lifeRatio = age / pickup.lifetime;
    const flashing = lifeRatio > 0.7;
    const flashAlpha = flashing ? 0.4 + 0.6 * Math.abs(Math.sin(age / 100)) : 1;

    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.translate(pickup.x, pickup.y + bobOffset);

    switch (pickup.type) {
      case 'shotgun':
        this.drawShotgunPickup(ctx, pickup.radius);
        break;
      case 'speedBoost':
        this.drawSpeedBoostPickup(ctx, pickup.radius);
        break;
      case 'medkit':
        this.drawMedkitPickup(ctx, pickup.radius);
        break;
    }

    ctx.restore();
  }

  private drawShotgunPickup(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.fillStyle = '#e67e22';
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const x = Math.cos(angle) * (r * 0.7);
      const y = Math.sin(angle) * (r * 0.7);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', 0, 0);
  }

  private drawSpeedBoostPickup(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.fillStyle = '#2ecc71';
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 2;
    const size = r * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.8);
    ctx.lineTo(size * 0.7, size * 0.6);
    ctx.lineTo(-size * 0.7, size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, 2);
  }

  private drawMedkitPickup(ctx: CanvasRenderingContext2D, r: number): void {
    const size = r * 0.8;
    ctx.fillStyle = '#ecf0f1';
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 2;
    ctx.fillRect(-size * 0.8, -size * 0.8, size * 1.6, size * 1.6);
    ctx.strokeRect(-size * 0.8, -size * 0.8, size * 1.6, size * 1.6);

    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(-size * 0.15, -size * 0.6, size * 0.3, size * 1.2);
    ctx.fillRect(-size * 0.6, -size * 0.15, size * 1.2, size * 0.3);
  }

  private drawFPS(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(this.width - 70, this.height - 24, 60, 18);
    ctx.fillStyle = this.fps >= 30 ? '#2ecc71' : this.fps >= 20 ? '#f39c12' : '#e74c3c';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`FPS: ${this.fps}`, this.width - 12, this.height - 15);
    ctx.restore();
  }
}
