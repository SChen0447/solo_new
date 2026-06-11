import { BeatEngine, TRACKS } from './beatEngine';
import { BeatPlatformManager } from './beatPlatform';
import { Player } from './player';
import { ScoreManager } from './score';

type GameState = 'menu' | 'playing' | 'gameover';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 600;
  private height: number = 800;
  private dpr: number = 1;

  private state: GameState = 'menu';
  private selectedTrack: number = 0;

  private beatEngine: BeatEngine | null = null;
  private platformManager: BeatPlatformManager | null = null;
  private player: Player;
  private scoreManager: ScoreManager;

  private lastTime: number = 0;
  private rafId: number = 0;

  private menuAnimTime: number = 0;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.player = new Player(this.height);
    this.scoreManager = new ScoreManager();

    this.resize();
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onTap(e);
    }, { passive: false });
    this.canvas.addEventListener('click', (e) => this.onClick(e));

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private resize(): void {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.platformManager) {
      this.platformManager.resize(this.width, this.height);
    }
    this.player.canvasHeight = this.height;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      this.handleAction();
    }
    if (this.state === 'menu') {
      if (e.code === 'ArrowLeft') {
        this.selectedTrack = (this.selectedTrack - 1 + TRACKS.length) % TRACKS.length;
      }
      if (e.code === 'ArrowRight') {
        this.selectedTrack = (this.selectedTrack + 1) % TRACKS.length;
      }
    }
  }

  private onTap(e: TouchEvent): void {
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (this.state === 'menu') {
      this.handleMenuTap(x, y);
    } else if (this.state === 'gameover') {
      const btn = this.scoreManager.getGameOverButtonBounds(this.width, this.height);
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        this.startGame();
      }
    } else if (this.state === 'playing') {
      this.handleAction();
    }
  }

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.state === 'menu') {
      this.handleMenuTap(x, y);
    } else if (this.state === 'gameover') {
      const btn = this.scoreManager.getGameOverButtonBounds(this.width, this.height);
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        this.startGame();
      }
    } else if (this.state === 'playing') {
      this.handleAction();
    }
  }

  private handleMenuTap(x: number, y: number): void {
    const trackBtnY = this.height / 2 + 10;
    const btnH = 56;
    const btnGap = 16;
    const btnW = Math.min(300, this.width * 0.7);
    const startX = this.width / 2 - btnW / 2;

    for (let i = 0; i < TRACKS.length; i++) {
      const by = trackBtnY + i * (btnH + btnGap);
      if (x >= startX && x <= startX + btnW && y >= by && y <= by + btnH) {
        this.selectedTrack = i;
        this.startGame();
        return;
      }
    }
  }

  private handleAction(): void {
    if (this.state === 'playing') {
      this.player.requestJump();
    }
  }

  private startGame(): void {
    this.beatEngine = new BeatEngine(this.selectedTrack);
    this.platformManager = new BeatPlatformManager(this.beatEngine, this.width, this.height);
    this.platformManager.init();

    this.player.reset(this.height);
    this.player.x = this.width * 0.15;
    const startPlatform = this.platformManager.getPlatforms()[0];
    this.player.y = startPlatform.y - this.player.height;
    this.player.currentPlatform = startPlatform;
    this.player.isOnGround = true;

    this.scoreManager.reset();

    this.beatEngine.start();
    this.state = 'playing';
  }

  private loop(timestamp: number): void {
    const dt = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    if (this.state === 'menu') {
      this.menuAnimTime += dt;
      return;
    }

    if (this.state !== 'playing') return;
    if (!this.beatEngine || !this.platformManager) return;

    this.platformManager.update(dt);

    const platforms = this.platformManager.getPlatforms();
    const scrollSpeed = this.platformManager.getScrollSpeed();
    const result = this.player.update(dt, platforms, scrollSpeed);

    if (result.landed) {
      this.scoreManager.onSuccessfulLand();
      this.platformManager.spawnLandingParticles(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height,
        result.platformHue
      );
    }

    this.scoreManager.update(dt);

    if (this.player.isDead) {
      this.scoreManager.onMiss();
      if (this.scoreManager.isGameOver()) {
        this.state = 'gameover';
        this.beatEngine.stop();
      } else {
        this.respawnPlayer();
      }
    }
  }

  private respawnPlayer(): void {
    if (!this.platformManager) return;
    const platforms = this.platformManager.getPlatforms();

    let bestPlatform = platforms[0];
    for (const p of platforms) {
      if (p.x >= 0 && p.x <= this.width * 0.5) {
        bestPlatform = p;
        break;
      }
    }

    this.player.reset(this.height);
    this.player.x = bestPlatform.x + bestPlatform.width / 2 - this.player.width / 2;
    this.player.y = bestPlatform.y - this.player.height;
    this.player.currentPlatform = bestPlatform;
    this.player.isOnGround = true;
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx);

    if (this.state === 'menu') {
      this.drawMenu(ctx);
    } else if (this.state === 'playing') {
      this.drawGame(ctx);
    } else if (this.state === 'gameover') {
      this.drawGame(ctx);
      this.scoreManager.drawGameOver(ctx, this.width, this.height);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(0.5, '#1a0a3e');
    grad.addColorStop(1, '#2d1b69');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137.5 + this.menuAnimTime * 0.02) % (this.width + 20)) - 10;
      const sy = ((i * 97.3) % this.height);
      const sr = 0.5 + (i % 3) * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMenu(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const pulse = 1 + Math.sin(this.menuAnimTime * 0.003) * 0.05;
    ctx.font = `bold ${42 * pulse}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(120, 80, 255, 0.6)';
    ctx.shadowBlur = 20;
    ctx.fillText('RHYTHM JUMP', this.width / 2, this.height * 0.25);
    ctx.shadowBlur = 0;

    ctx.font = '16px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('Select a track to begin', this.width / 2, this.height * 0.37);

    const btnW = Math.min(300, this.width * 0.7);
    const btnH = 56;
    const btnGap = 16;
    const trackBtnY = this.height / 2 + 10;
    const startX = this.width / 2 - btnW / 2;

    for (let i = 0; i < TRACKS.length; i++) {
      const by = trackBtnY + i * (btnH + btnGap);
      const isSelected = i === this.selectedTrack;
      const hoverPulse = isSelected ? 1 + Math.sin(this.menuAnimTime * 0.005) * 0.03 : 1;

      const grad = ctx.createLinearGradient(startX, by, startX + btnW, by + btnH);
      if (isSelected) {
        grad.addColorStop(0, '#7c3aed');
        grad.addColorStop(1, '#4f46e5');
      } else {
        grad.addColorStop(0, 'rgba(120, 80, 255, 0.3)');
        grad.addColorStop(1, 'rgba(80, 60, 200, 0.3)');
      }

      ctx.fillStyle = grad;
      const r = 12;
      const bw = btnW * hoverPulse;
      const bx = this.width / 2 - bw / 2;
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + bw - r, by);
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
      ctx.lineTo(bx + bw, by + btnH - r);
      ctx.quadraticCurveTo(bx + bw, by + btnH, bx + bw - r, by + btnH);
      ctx.lineTo(bx + r, by + btnH);
      ctx.quadraticCurveTo(bx, by + btnH, bx, by + btnH - r);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.closePath();
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = 'rgba(180, 140, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
      ctx.font = `bold 18px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText(TRACKS[i].name, this.width / 2, by + btnH / 2 - 8);

      ctx.font = '12px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
      ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`${TRACKS[i].sequence.length} beats · BPM ≈ ${Math.round(60000 / TRACKS[i].sequence[0])}`, this.width / 2, by + btnH / 2 + 12);
    }

    ctx.font = '14px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('← → select · Space / Tap to start', this.width / 2, this.height * 0.82);

    ctx.restore();
  }

  private drawGame(ctx: CanvasRenderingContext2D): void {
    if (this.platformManager) {
      this.platformManager.draw(ctx);
    }
    this.player.draw(ctx);
    this.scoreManager.draw(ctx, this.width);
  }
}

new Game();
