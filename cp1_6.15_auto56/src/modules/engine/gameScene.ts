import { BulletManager } from './bulletManager';
import { BossManager } from './bossManager';
import { PlayerManager } from './playerManager';
import { useGameStore, BulletPattern } from '../../store/gameStore';

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  phase: number;
  speed: number;
}

export class GameScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private lastTime: number = 0;
  private running: boolean = false;

  private bulletManager: BulletManager;
  private bossManager: BossManager;
  private playerManager: PlayerManager;

  private stars: Star[] = [];
  private readonly CANVAS_W = 800;
  private readonly CANVAS_H = 600;

  private score: number = 0;
  private scoreAccumulator: number = 0;
  private patternDisplayTimer: number = 0;
  private flashRedTimer: number = 0;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundContextMenu: (e: Event) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bulletManager = new BulletManager();
    this.bossManager = new BossManager();
    this.playerManager = new PlayerManager();

    this.initStars();

    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundContextMenu = (e: Event) => e.preventDefault();

    this.bossManager.onPatternChange = (pattern: BulletPattern) => {
      useGameStore.getState().setCurrentPattern(pattern);
      this.patternDisplayTimer = 1.5;
    };

    this.playerManager.onDamage = () => {
      this.flashRedTimer = 0.1;
      useGameStore.getState().setFlashRed(0.3);
      useGameStore.getState().setLives(this.playerManager.lives);
    };
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * this.CANVAS_W,
        y: Math.random() * this.CANVAS_H,
        size: 1 + Math.random() * 1.5,
        baseOpacity: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.reset();
    this.attachEvents();
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.detachEvents();
  }

  private reset() {
    this.bulletManager.reset();
    this.bossManager.reset();
    this.playerManager.reset();
    this.score = 0;
    this.scoreAccumulator = 0;
    this.patternDisplayTimer = 1.5;
    this.flashRedTimer = 0;
    useGameStore.getState().reset();
  }

  private attachEvents() {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
    this.canvas.addEventListener('contextmenu', this.boundContextMenu);
  }

  private detachEvents() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mouseup', this.boundMouseUp);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
  }

  private onKeyDown(e: KeyboardEvent) {
    this.playerManager.keys[e.key.toLowerCase()] = true;
  }

  private onKeyUp(e: KeyboardEvent) {
    this.playerManager.keys[e.key.toLowerCase()] = false;
  }

  private onMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.playerManager.mouseX = (e.clientX - rect.left) * (this.CANVAS_W / rect.width);
    this.playerManager.mouseY = (e.clientY - rect.top) * (this.CANVAS_H / rect.height);
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button === 0) {
      this.playerManager.mouseDown = true;
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.playerManager.mouseDown = false;
    }
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    if (dt > 0.05) dt = 0.05;
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const status = useGameStore.getState().status;
    if (status !== 'playing') return;

    this.bossManager.update(dt);
    this.bulletManager.setPattern(this.bossManager.currentPattern);
    this.bulletManager.setSpeedMultiplier(this.bossManager.isEnraged() ? 1.2 : 1);
    this.bulletManager.update(dt, this.bossManager.x, this.bossManager.y, this.playerManager.x, this.playerManager.y);
    this.playerManager.update(dt);

    if (this.playerManager.isShooting) {
      const hit = this.checkLaserHitsBoss();
      this.playerManager.shootHitBoss = hit;
      if (hit) {
        this.bossManager.takeDamage(5 * dt);
        useGameStore.getState().setBossHp(this.bossManager.hp);
        if (this.bossManager.hp <= 0) {
          this.score += 100;
          useGameStore.getState().setScore(this.score);
          useGameStore.getState().setStatus('victory');
          return;
        }
      }
    } else {
      this.playerManager.shootHitBoss = false;
    }

    if (!this.playerManager.invincible) {
      if (this.bulletManager.checkCollision(this.playerManager.x, this.playerManager.y, this.playerManager.hitRadius)) {
        this.playerManager.takeDamage();
        if (!this.playerManager.isAlive()) {
          useGameStore.getState().setStatus('gameover');
          return;
        }
      }
    }

    this.scoreAccumulator += dt * 10;
    if (this.scoreAccumulator >= 1) {
      const add = Math.floor(this.scoreAccumulator);
      this.score += add;
      this.scoreAccumulator -= add;
      useGameStore.getState().setScore(this.score);
    }

    if (this.patternDisplayTimer > 0) {
      this.patternDisplayTimer -= dt;
      const opacity = this.patternDisplayTimer > 1.2
        ? (1.5 - this.patternDisplayTimer) / 0.3
        : this.patternDisplayTimer / 1.2;
      useGameStore.getState().setPatternDisplayOpacity(Math.max(0, Math.min(1, opacity)));
    } else {
      useGameStore.getState().setPatternDisplayOpacity(0);
    }

    if (this.flashRedTimer > 0) {
      this.flashRedTimer -= dt;
      if (this.flashRedTimer <= 0) {
        useGameStore.getState().setFlashRed(0);
      } else {
        useGameStore.getState().setFlashRed(0.3 * (this.flashRedTimer / 0.1));
      }
    }
  }

  private checkLaserHitsBoss(): boolean {
    const px = this.playerManager.x;
    const py = this.playerManager.y;
    const mx = this.playerManager.mouseX;
    const my = this.playerManager.mouseY;

    const half = this.bossManager.size / 2;
    const bx1 = this.bossManager.x - half;
    const bx2 = this.bossManager.x + half;
    const by1 = this.bossManager.y - half;
    const by2 = this.bossManager.y + half;

    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const tx = px + (mx - px) * t;
      const ty = py + (my - py) * t;
      if (tx >= bx1 && tx <= bx2 && ty >= by1 && ty <= by2) {
        return true;
      }
    }
    return false;
  }

  private render() {
    const ctx = this.ctx;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, this.CANVAS_W, this.CANVAS_H);

    this.renderStars();
    this.bulletManager.render(ctx, this.bossManager.x, this.bossManager.y);
    this.bossManager.render(ctx);
    this.playerManager.render(ctx);

    const flashRed = useGameStore.getState().flashRed;
    if (flashRed > 0) {
      ctx.fillStyle = `rgba(231, 76, 60, ${flashRed})`;
      ctx.fillRect(0, 0, this.CANVAS_W, this.CANVAS_H);
    }
  }

  private renderStars() {
    const ctx = this.ctx;
    const time = performance.now() / 1000;
    for (const s of this.stars) {
      const opacity = s.baseOpacity * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fill();
    }
  }
}
