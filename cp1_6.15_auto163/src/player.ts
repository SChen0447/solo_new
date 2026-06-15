import type { GameConfig, PlayerState, Rect, Dart, Particle } from './types';

export class Player {
  state: PlayerState;
  private keys_pressed: Set<string> = new Set();
  private config: GameConfig;
  private gravity: number;
  private jumpForce: number;
  private moveSpeed: number;
  private shortJumpMultiplier: number;
  private lastAttackTime: number = 0;
  private attackCooldown: number = 400;
  public darts: Dart[] = [];
  public particles: Particle[] = [];

  constructor(config: GameConfig) {
    this.config = config;
    const p = config.player;
    this.gravity = p.gravity;
    this.jumpForce = p.jumpForce;
    this.moveSpeed = p.moveSpeed;
    this.shortJumpMultiplier = p.shortJumpMultiplier;

    this.state = {
      x: p.startX,
      y: p.startY,
      vx: 0,
      vy: 0,
      width: p.width,
      height: p.height,
      facingDir: 1,
      onGround: false,
      health: p.maxHealth,
      maxHealth: p.maxHealth,
      keys: 0,
      hasWeapon: false,
      invincibleTimer: 0,
      flashTimer: 0,
      jumpHeld: false,
      runAnimFrame: 0,
      runAnimTimer: 0,
    };

    this.setupInputListeners();
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys_pressed.add(e.key.toLowerCase());
      if (e.key === ' ') {
        e.preventDefault();
      }
      if (e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'k') {
        this.tryAttack();
      }
    });
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys_pressed.delete(e.key.toLowerCase());
      if (e.key === ' ') {
        this.state.jumpHeld = false;
      }
    });
  }

  public isKeyDown(key: string): boolean {
    return this.keys_pressed.has(key);
  }

  public isInteractPressed(): boolean {
    return this.keys_pressed.has('e');
  }

  public update(dt: number, platforms: Rect[], walls: Rect[]): void {
    const p = this.state;

    if (p.invincibleTimer > 0) {
      p.invincibleTimer -= dt * 1000;
    }
    if (p.flashTimer > 0) {
      p.flashTimer -= dt * 1000;
    }

    let moveX = 0;
    if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) {
      moveX = -1;
      p.facingDir = -1;
    }
    if (this.isKeyDown('d') || this.isKeyDown('arrowright')) {
      moveX = 1;
      p.facingDir = 1;
    }
    p.vx = moveX * this.moveSpeed * 60 * dt;

    if (moveX !== 0 && p.onGround) {
      p.runAnimTimer += dt * 1000;
      if (p.runAnimTimer > 100) {
        p.runAnimTimer = 0;
        p.runAnimFrame = (p.runAnimFrame + 1) % 4;
      }
    } else {
      p.runAnimFrame = 0;
      p.runAnimTimer = 0;
    }

    const jumpKeyDown = this.isKeyDown(' ');
    if (jumpKeyDown && p.onGround) {
      p.vy = this.jumpForce;
      p.onGround = false;
      p.jumpHeld = true;
      this.spawnJumpParticles(p.x + p.width / 2, p.y + p.height);
    }

    if (!jumpKeyDown && p.jumpHeld && p.vy > 0) {
      p.vy *= this.shortJumpMultiplier;
      p.jumpHeld = false;
    }

    p.vy += this.gravity * 60 * dt;
    if (p.vy < -15) p.vy = -15;

    const wasOnGround = p.onGround;
    p.onGround = false;

    p.x += p.vx;
    this.resolveCollisions(p, platforms, walls, true);

    p.y += p.vy;
    this.resolveCollisions(p, platforms, walls, false);

    if (!wasOnGround && p.onGround) {
      this.spawnJumpParticles(p.x + p.width / 2, p.y + p.height);
    }

    this.updateDarts(dt);
    this.updateParticles(dt);
  }

  private resolveCollisions(p: PlayerState, platforms: Rect[], walls: Rect[], horizontal: boolean): void {
    const allSolids: Rect[] = [...platforms, ...walls];
    for (const rect of allSolids) {
      if (this.rectsOverlap(p.x, p.y, p.width, p.height, rect.x, rect.y, rect.w, rect.h)) {
        if (horizontal) {
          if (p.vx > 0) {
            p.x = rect.x - p.width;
          } else if (p.vx < 0) {
            p.x = rect.x + rect.w;
          }
          p.vx = 0;
        } else {
          if (p.vy < 0) {
            p.y = rect.y + rect.h;
            p.vy = 0;
          } else if (p.vy > 0) {
            p.y = rect.y - p.height;
            p.vy = 0;
            p.onGround = true;
          }
        }
      }
    }
  }

  private rectsOverlap(x1: number, y1: number, w1: number, h1: number,
                       x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private spawnJumpParticles(x: number, y: number): void {
    const cfg = this.config.particle;
    for (let i = 0; i < cfg.jumpParticleCount; i++) {
      const angle = Math.random() * Math.PI;
      const speed = 20 + Math.random() * 30;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
        vy: -Math.sin(angle) * speed * 0.5,
        life: cfg.jumpParticleLifetime,
        maxLife: cfg.jumpParticleLifetime,
        radius: cfg.jumpParticleRadius,
        color: '#808080',
      });
    }
  }

  private updateDarts(dt: number): void {
    const speed = this.config.item.dartSpeed;
    for (let i = this.darts.length - 1; i >= 0; i--) {
      const d = this.darts[i];
      d.x += d.vx * dt;
      if (d.x < -50 || d.x > 350) {
        this.darts.splice(i, 1);
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private tryAttack(): void {
    if (!this.state.hasWeapon) return;
    const now = performance.now();
    if (now - this.lastAttackTime < this.attackCooldown) return;
    this.lastAttackTime = now;
    const cfg = this.config.item;
    this.darts.push({
      x: this.state.x + this.state.width / 2,
      y: this.state.y + this.state.height / 2,
      vx: this.state.facingDir * cfg.dartSpeed,
    });
  }

  public takeDamage(amount: number): void {
    if (this.state.invincibleTimer > 0) return;
    this.state.health = Math.max(0, this.state.health - amount);
    this.state.invincibleTimer = 1000;
    this.state.flashTimer = 200;
  }

  public heal(amount: number): void {
    this.state.health = Math.min(this.state.maxHealth, this.state.health + amount);
  }

  public addKey(): void {
    this.state.keys += 1;
  }

  public giveWeapon(): void {
    this.state.hasWeapon = true;
  }

  public render(ctx: CanvasRenderingContext2D, scale: number): void {
    const p = this.state;
    ctx.save();
    ctx.translate(p.x * scale, p.y * scale);

    if (p.flashTimer > 0) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, p.width * scale, p.height * scale);
      ctx.restore();
      return;
    }

    if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    const s = scale;
    const w = p.width * s;
    const h = p.height * s;

    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    const capeW = 10 * s;
    const capeH = 18 * s;
    if (p.facingDir > 0) {
      ctx.moveTo(2 * s, 8 * s);
      ctx.quadraticCurveTo(-capeW * 0.5, 12 * s, -capeW * 0.3, 8 * s + capeH);
      ctx.lineTo(4 * s, 8 * s + capeH * 0.9);
      ctx.closePath();
    } else {
      ctx.moveTo(w - 2 * s, 8 * s);
      ctx.quadraticCurveTo(w + capeW * 0.5, 12 * s, w + capeW * 0.3, 8 * s + capeH);
      ctx.lineTo(w - 4 * s, 8 * s + capeH * 0.9);
      ctx.closePath();
    }
    ctx.fill();

    ctx.fillStyle = '#f5d4a6';
    ctx.fillRect(3 * s, 2 * s, (w - 6 * s), 8 * s);

    ctx.fillStyle = '#333';
    if (p.facingDir > 0) {
      ctx.fillRect(w - 7 * s, 5 * s, 2 * s, 2 * s);
    } else {
      ctx.fillRect(5 * s, 5 * s, 2 * s, 2 * s);
    }

    ctx.fillStyle = '#2e86ab';
    ctx.fillRect(2 * s, 10 * s, (w - 4 * s), 12 * s);

    const legOffset = p.onGround ? Math.sin(p.runAnimFrame * Math.PI / 2) * 2 * s : 0;
    ctx.fillStyle = '#444';
    ctx.fillRect(3 * s, 22 * s, 4 * s, (8 * s + legOffset));
    ctx.fillRect(w - 7 * s, 22 * s, 4 * s, (8 * s - legOffset));

    ctx.restore();
  }
}
