import { useGameStore, MemoryFragment } from '../store/gameStore';

interface SceneParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  angle: number;
  drift: number;
}

interface GlowAnimation {
  fragmentId: string;
  startTime: number;
  x: number;
  y: number;
  color: string;
}

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: SceneParticle[] = [];
  private glowAnimations: GlowAnimation[] = [];
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private unsubscribe: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;
    this.initParticles();
  }

  private initParticles() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 2 + Math.random() * 3,
        speed: 0.3 + Math.random() * 0.4,
        opacity: 0.1 + Math.random() * 0.3,
        angle: Math.random() * Math.PI * 2,
        drift: (Math.random() - 0.5) * 0.002,
      });
    }
  }

  start() {
    const state = useGameStore.getState();
    state.initScene(this.canvas.width, this.canvas.height);

    this.unsubscribe = useGameStore.subscribe((state) => {
      const now = Date.now();
      const activeAnims = state.collectingAnimations;
      for (const anim of activeAnims) {
        const existing = this.glowAnimations.find(g => g.fragmentId === anim.fragmentId);
        if (!existing) {
          const frag = state.fragments.find(f => f.id === anim.fragmentId);
          this.glowAnimations.push({
            fragmentId: anim.fragmentId,
            startTime: anim.startTime,
            x: anim.fromX,
            y: anim.fromY,
            color: frag?.color || '#c0c0c0',
          });
        }
      }
    });

    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.loop(this.lastTime);
  }

  stop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.unsubscribe) this.unsubscribe();
  }

  private loop = (timestamp: number) => {
    const delta = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.frameCount++;
    if (timestamp - this.fpsTime >= 1000) {
      useGameStore.getState().setFps(this.frameCount);
      this.frameCount = 0;
      this.fpsTime = timestamp;
    }

    this.render(delta);
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private render(delta: number) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const state = useGameStore.getState();

    ctx.clearRect(0, 0, w, h);

    this.drawBackground(ctx, w, h);
    this.updateAndDrawParticles(ctx, w, h, delta);
    this.drawFragments(ctx, state);
    this.drawGlowAnimations(ctx, state);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    gradient.addColorStop(0, '#302b63');
    gradient.addColorStop(1, '#0f0c29');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  private updateAndDrawParticles(ctx: CanvasRenderingContext2D, w: number, h: number, delta: number) {
    const dt = delta / 1000;
    for (const p of this.particles) {
      p.angle += p.drift;
      p.x += Math.cos(p.angle) * p.speed;
      p.y += Math.sin(p.angle) * p.speed;
      p.opacity += (Math.random() - 0.5) * 0.005;
      p.opacity = Math.max(0.05, Math.min(0.4, p.opacity));

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.fill();
    }
  }

  private drawFragments(ctx: CanvasRenderingContext2D, state: ReturnType<typeof useGameStore.getState>) {
    for (const pos of state.fragmentsOnScene) {
      const frag = state.fragments.find(f => f.id === pos.id);
      if (!frag) continue;
      this.drawHexagonFragment(ctx, pos.x, pos.y, frag);
    }
  }

  private drawHexagonFragment(ctx: CanvasRenderingContext2D, x: number, y: number, frag: MemoryFragment, scale: number = 1) {
    const size = 30 * scale;
    ctx.save();
    ctx.translate(x, y);

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = size * Math.cos(angle);
      const py = size * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    grad.addColorStop(0, 'rgba(30, 25, 50, 0.85)');
    grad.addColorStop(1, 'rgba(15, 12, 41, 0.95)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = frag.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `${16 * scale}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(frag.icon, 0, 0);

    ctx.font = `bold ${9 * scale}px Cinzel, sans-serif`;
    ctx.fillStyle = frag.color;
    ctx.fillText(`${frag.order}`, 0, size * 0.55);

    ctx.restore();
  }

  private drawGlowAnimations(ctx: CanvasRenderingContext2D, state: ReturnType<typeof useGameStore.getState>) {
    const now = Date.now();
    const remaining: GlowAnimation[] = [];

    for (const glow of this.glowAnimations) {
      const elapsed = now - glow.startTime;
      const duration = 300;
      if (elapsed > duration) {
        state.removeCollectingAnimation(glow.fragmentId);
        continue;
      }

      remaining.push(glow);
      const progress = elapsed / duration;
      const scale = 1 + 0.2 * progress;
      const opacity = 1 - progress;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(glow.x, glow.y);
      ctx.scale(scale, scale);

      const glowSize = 35;
      const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
      glowGrad.addColorStop(0, glow.color);
      glowGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      ctx.restore();
    }

    this.glowAnimations = remaining;
  }

  hitTest(canvasX: number, canvasY: number): string | null {
    const state = useGameStore.getState();
    for (const pos of state.fragmentsOnScene) {
      const dx = canvasX - pos.x;
      const dy = canvasY - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        const frag = state.fragments.find(f => f.id === pos.id);
        if (frag && !frag.collected) return pos.id;
      }
    }
    return null;
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.particles = [];
    this.initParticles();
    useGameStore.getState().initScene(width, height);
  }
}
