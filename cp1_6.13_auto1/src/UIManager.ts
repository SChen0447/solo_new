import * as PIXI from 'pixi.js';

export interface PaintingInfo {
  name: string;
  artist: string;
  year: string;
}

interface Particle {
  sprite: PIXI.Sprite;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  active: boolean;
  size: number;
  rotationSpeed: number;
}

export class UIManager {
  private app: PIXI.Application;
  private container: HTMLElement;
  private toolbarEl: HTMLElement | null = null;
  private timerEl: HTMLElement | null = null;
  private movesEl: HTMLElement | null = null;
  private completionEl: HTMLElement | null = null;
  private particlesContainer: PIXI.Container;
  private particlePool: Particle[] = [];
  private activeParticles: Particle[] = [];
  private rafId: number = 0;
  private celebrationActive: boolean = false;
  private toolbarHeight: number = 60;
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  constructor(app: PIXI.Application, container: HTMLElement) {
    this.app = app;
    this.container = container;
    this.particlesContainer = new PIXI.Container();
    this.app.stage.addChild(this.particlesContainer);
    this.initParticlePool(80);
    this.startParticleLoop();
  }

  private initParticlePool(count: number): void {
    for (let i = 0; i < count; i++) {
      const tex = this.createParticleTexture();
      const sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.particlesContainer.addChild(sprite);
      this.particlePool.push({
        sprite,
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 0,
        active: false,
        size: 0,
        rotationSpeed: 0
      });
    }
  }

  private createParticleTexture(): PIXI.Texture {
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      const colors = ['#FFD700', '#FFA500', '#FF6347', '#FF69B4', '#00CED1'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.4, color + 'AA');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
    return PIXI.Texture.from(canvas);
  }

  private startParticleLoop(): void {
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      if (this.activeParticles.length > 0) {
        this.updateParticles(1000 / 60);
      }
      if (this.celebrationActive) {
        if (Math.random() < 0.3) {
          this.spawnFirework();
        }
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private updateParticles(dt: number): void {
    const toRemove: number[] = [];
    for (let i = 0; i < this.activeParticles.length; i++) {
      const p = this.activeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.sprite.visible = false;
        toRemove.push(i);
        this.particlePool.push(p);
        continue;
      }
      p.vy += p.gravity * dt * 0.001;
      p.sprite.x += p.vx * dt * 0.06;
      p.sprite.y += p.vy * dt * 0.06;
      p.sprite.rotation += p.rotationSpeed * dt * 0.005;
      const lifeRatio = p.life / p.maxLife;
      p.sprite.alpha = Math.min(1, lifeRatio * 2);
      p.sprite.scale.set(p.size * lifeRatio);
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.activeParticles.splice(toRemove[i], 1);
    }
  }

  private spawnFirework(): void {
    const centerX = Math.random() * this.screenWidth;
    const centerY = Math.random() * this.screenHeight * 0.6 + 50;
    const particleCount = 20 + Math.floor(Math.random() * 20);
    const hue = Math.floor(Math.random() * 360);
    for (let i = 0; i < particleCount; i++) {
      const p = this.particlePool.pop();
      if (!p) break;
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 5;
      p.sprite.x = centerX;
      p.sprite.y = centerY;
      p.sprite.visible = true;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.gravity = 0.15;
      p.life = 800 + Math.random() * 600;
      p.maxLife = p.life;
      p.active = true;
      p.size = 0.5 + Math.random() * 0.8;
      p.rotationSpeed = (Math.random() - 0.5) * 2;
      const color = new PIXI.Color({ h: (hue + Math.random() * 40 - 20) / 360, s: 1, v: 1 });
      p.sprite.tint = color;
      this.activeParticles.push(p);
    }
  }

  public createToolbar(): void {
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: ${this.toolbarHeight}px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      background: rgba(255, 255, 255, 0.25);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.3);
      z-index: 100;
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
    `;
    const title = document.createElement('div');
    title.textContent = '名画拼图';
    title.style.cssText = `
      font-family: 'Georgia', serif;
      font-size: 20px;
      font-weight: bold;
      color: #5D4037;
      letter-spacing: 2px;
    `;
    toolbar.appendChild(title);
    const stats = document.createElement('div');
    stats.style.cssText = 'display: flex; gap: 32px;';
    const timerWrap = document.createElement('div');
    timerWrap.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    const timerLabel = document.createElement('span');
    timerLabel.textContent = '⏱';
    timerLabel.style.fontSize = '18px';
    const timerVal = document.createElement('span');
    timerVal.textContent = '00:00';
    timerVal.style.cssText = `
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 18px;
      font-weight: 600;
      color: #3E2723;
      min-width: 60px;
      text-align: right;
    `;
    this.timerEl = timerVal;
    timerWrap.appendChild(timerLabel);
    timerWrap.appendChild(timerVal);
    const movesWrap = document.createElement('div');
    movesWrap.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    const movesLabel = document.createElement('span');
    movesLabel.textContent = '🧩';
    movesLabel.style.fontSize = '18px';
    const movesVal = document.createElement('span');
    movesVal.textContent = '0';
    movesVal.style.cssText = `
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 18px;
      font-weight: 600;
      color: #3E2723;
      min-width: 30px;
      text-align: right;
    `;
    this.movesEl = movesVal;
    movesWrap.appendChild(movesLabel);
    movesWrap.appendChild(movesVal);
    stats.appendChild(timerWrap);
    stats.appendChild(movesWrap);
    toolbar.appendChild(stats);
    this.container.appendChild(toolbar);
    this.toolbarEl = toolbar;
  }

  public updateTimer(seconds: number): void {
    if (!this.timerEl) return;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    this.timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  public updateMoveCount(count: number): void {
    if (this.movesEl) {
      this.movesEl.textContent = String(count);
    }
  }

  public getToolbarHeight(): number {
    return this.toolbarHeight;
  }

  public resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    if (window.innerWidth < 600) {
      this.toolbarHeight = 50;
      if (this.toolbarEl) {
        this.toolbarEl.style.height = '50px';
        this.toolbarEl.style.padding = '0 16px';
      }
    } else {
      this.toolbarHeight = 60;
      if (this.toolbarEl) {
        this.toolbarEl.style.height = '60px';
        this.toolbarEl.style.padding = '0 24px';
      }
    }
  }

  public triggerCelebration(): void {
    this.celebrationActive = true;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.spawnFirework(), i * 200);
    }
    setTimeout(() => {
      this.celebrationActive = false;
    }, 5000);
  }

  public showCompletion(painting: PaintingInfo, timeSeconds: number, moves: number): void {
    if (this.completionEl) {
      this.completionEl.remove();
    }
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
      animation: fadeIn 0.5s ease-out;
    `;
    const card = document.createElement('div');
    card.style.cssText = `
      background: #F5F0E6;
      border: 8px solid #8B5A2B;
      border-radius: 16px;
      padding: 40px 48px;
      text-align: center;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      animation: slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;
    const title = document.createElement('div');
    title.textContent = '🎉 恭喜完成！';
    title.style.cssText = `
      font-size: 28px;
      font-weight: bold;
      color: #5D4037;
      margin-bottom: 24px;
      font-family: 'Georgia', serif;
    `;
    const paintingName = document.createElement('div');
    paintingName.textContent = painting.name;
    paintingName.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      color: #3E2723;
      margin-bottom: 8px;
      font-family: 'Georgia', serif;
      font-style: italic;
    `;
    const paintingArtist = document.createElement('div');
    paintingArtist.textContent = painting.artist;
    paintingArtist.style.cssText = `
      font-size: 18px;
      color: #5D4037;
      margin-bottom: 4px;
    `;
    const paintingYear = document.createElement('div');
    paintingYear.textContent = painting.year;
    paintingYear.style.cssText = `
      font-size: 16px;
      color: #8D6E63;
      margin-bottom: 24px;
    `;
    const statsRow = document.createElement('div');
    statsRow.style.cssText = 'display: flex; justify-content: center; gap: 48px; margin-bottom: 28px;';
    const timeStat = document.createElement('div');
    timeStat.innerHTML = `
      <div style="font-size: 14px; color: #8D6E63; margin-bottom: 4px;">完成时间</div>
      <div style="font-size: 24px; font-weight: bold; color: #3E2723; font-family: 'Monaco', monospace;">${this.formatTime(timeSeconds)}</div>
    `;
    const movesStat = document.createElement('div');
    movesStat.innerHTML = `
      <div style="font-size: 14px; color: #8D6E63; margin-bottom: 4px;">移动步数</div>
      <div style="font-size: 24px; font-weight: bold; color: #3E2723; font-family: 'Monaco', monospace;">${moves}</div>
    `;
    statsRow.appendChild(timeStat);
    statsRow.appendChild(movesStat);
    const btn = document.createElement('button');
    btn.textContent = '再玩一次';
    btn.style.cssText = `
      background: linear-gradient(135deg, #8B5A2B, #6B4423);
      color: #F5F0E6;
      border: none;
      padding: 14px 40px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 30px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 12px rgba(139, 90, 43, 0.3);
      font-family: inherit;
    `;
    btn.onmouseenter = () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 6px 20px rgba(139, 90, 43, 0.4)';
    };
    btn.onmouseleave = () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 12px rgba(139, 90, 43, 0.3)';
    };
    btn.onclick = () => {
      overlay.remove();
      this.completionEl = null;
      this.onRestart?.();
    };
    card.appendChild(title);
    card.appendChild(paintingName);
    card.appendChild(paintingArtist);
    card.appendChild(paintingYear);
    card.appendChild(statsRow);
    card.appendChild(btn);
    overlay.appendChild(card);
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
    this.container.appendChild(overlay);
    this.completionEl = overlay;
    this.triggerCelebration();
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  public onRestart: (() => void) | null = null;

  public showError(message: string): void {
    const errorEl = document.createElement('div');
    errorEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 100, 100, 0.95);
      color: white;
      padding: 20px 40px;
      border-radius: 12px;
      font-size: 16px;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    errorEl.textContent = message;
    this.container.appendChild(errorEl);
    setTimeout(() => errorEl.remove(), 3000);
  }

  public hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  public destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.toolbarEl) {
      this.toolbarEl.remove();
    }
    if (this.completionEl) {
      this.completionEl.remove();
    }
    for (const p of this.particlePool) {
      p.sprite.destroy();
    }
    for (const p of this.activeParticles) {
      p.sprite.destroy();
    }
    this.particlePool = [];
    this.activeParticles = [];
  }
}
