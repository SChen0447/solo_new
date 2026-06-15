import { WaveRipple } from '../types';

export class WaveRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ripples: WaveRipple[] = [];
  private animationId: number | null = null;
  private rippleIdCounter = 0;
  private maxRipples = 8;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.resize();
    this.start();
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  public addRipple(x: number, y: number, frequency: number, amplitude: number = 1): void {
    const now = performance.now();
    
    const overlaps = this.ripples.some((r) => {
      const elapsed = (now - r.startTime) / 1000;
      const currentRadius = 10 + elapsed * 30;
      const dx = x - r.x;
      const dy = y - r.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < currentRadius + 150 && dist < 100;
    });

    const ripple: WaveRipple = {
      id: this.rippleIdCounter++,
      x,
      y,
      startTime: now,
      duration: 2000,
      amplitude: overlaps ? amplitude * 1.1 : amplitude,
      frequency,
    };

    if (this.ripples.length >= this.maxRipples) {
      this.ripples.shift();
    }
    
    this.ripples.push(ripple);
  }

  private start(): void {
    const animate = () => {
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, width, height);

    const now = performance.now();

    this.ripples = this.ripples.filter((ripple) => {
      const elapsed = now - ripple.startTime;
      if (elapsed > ripple.duration) {
        return false;
      }

      const progress = elapsed / ripple.duration;
      const baseAlpha = 0.6 * (1 - progress) * ripple.amplitude;
      
      const rings = 5;
      for (let i = 0; i < rings; i++) {
        const ringProgress = (progress * 2 - i * 0.15) % 1;
        if (ringProgress < 0 || ringProgress > 1) continue;
        
        const radius = 10 + ringProgress * 140 + i * 3;
        const lineWidth = 2 - i * 0.375;
        const alpha = baseAlpha * (1 - i * 0.15);
        
        if (lineWidth <= 0 || alpha <= 0) continue;

        const gradient = this.ctx.createRadialGradient(
          ripple.x, ripple.y, radius - 5,
          ripple.x, ripple.y, radius + 5
        );
        gradient.addColorStop(0, `rgba(255, 215, 0, 0)`);
        gradient.addColorStop(0.5, `rgba(255, 215, 0, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 215, 0, 0)`);

        this.ctx.beginPath();
        this.ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = Math.max(lineWidth, 0.5);
        this.ctx.stroke();
      }

      return true;
    });
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
