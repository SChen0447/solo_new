import { GAME_CONFIG } from './types';
import { Ship } from './ship';

export class Fragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  pulsePhase: number;
  rotation: number;
  collected: boolean;
  collectProgress: number;

  constructor(x: number, y: number, vx: number = 0, vy: number = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.active = true;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.rotation = Math.random() * Math.PI * 2;
    this.collected = false;
    this.collectProgress = 0;
  }

  update(dt: number, ship: Ship, width: number, height: number): boolean {
    if (!this.active) return false;

    this.pulsePhase += dt * 3;
    this.rotation += dt * 2;

    if (this.collected) {
      this.collectProgress += dt * 3;
      const t = this.collectProgress;
      this.x = this.x + (ship.x - this.x) * t * 0.3;
      this.y = this.y + (ship.y - this.y) * t * 0.3;
      
      if (this.collectProgress >= 1) {
        this.active = false;
        return true;
      }
      return false;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.99;
    this.vy *= 0.99;

    const dx = ship.x - this.x;
    const dy = ship.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < GAME_CONFIG.FRAGMENT_COLLECT_RADIUS) {
      const attractSpeed = GAME_CONFIG.FRAGMENT_SPEED * (1 - dist / GAME_CONFIG.FRAGMENT_COLLECT_RADIUS);
      this.vx += (dx / dist) * attractSpeed * dt * 5;
      this.vy += (dy / dist) * attractSpeed * dt * 5;
    }

    if (dist < GAME_CONFIG.SHIP_RADIUS + 10) {
      this.collected = true;
    }

    const margin = 100;
    if (
      this.x < -margin ||
      this.x > width + margin ||
      this.y < -margin ||
      this.y > height + margin
    ) {
      this.active = false;
    }

    return false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const pulse = 0.7 + Math.sin(this.pulsePhase) * 0.3;
    const size = 12 * pulse;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.5);
    glowGradient.addColorStop(0, `rgba(0, 255, 255, ${0.4 * pulse})`);
    glowGradient.addColorStop(0.5, `rgba(0, 200, 255, ${0.2 * pulse})`);
    glowGradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
    ctx.beginPath();
    ctx.arc(0, 0, size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.6, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.6, 0);
    ctx.closePath();

    const fragmentGradient = ctx.createLinearGradient(-size, -size, size, size);
    fragmentGradient.addColorStop(0, '#ffffff');
    fragmentGradient.addColorStop(0.3, '#80ffff');
    fragmentGradient.addColorStop(0.7, '#00ffff');
    fragmentGradient.addColorStop(1, '#00cccc');
    ctx.fillStyle = fragmentGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(size * 0.3, 0);
    ctx.lineTo(0, size * 0.5);
    ctx.lineTo(-size * 0.3, 0);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * pulse})`;
    ctx.fill();

    ctx.restore();

    if (this.collected) {
      const collectAlpha = 1 - this.collectProgress;
      ctx.beginPath();
      ctx.arc(this.x, this.y, size * (1 + this.collectProgress), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 255, ${collectAlpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

export class FragmentManager {
  fragments: Fragment[];

  constructor() {
    this.fragments = [];
  }

  reset(): void {
    this.fragments = [];
  }

  spawn(x: number, y: number, vx: number = 0, vy: number = 0): void {
    if (this.fragments.length >= GAME_CONFIG.MAX_FRAGMENTS) return;
    const fragment = new Fragment(x, y, vx, vy);
    this.fragments.push(fragment);
  }

  update(dt: number, ship: Ship, width: number, height: number): number {
    let collected = 0;

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const fragment = this.fragments[i];
      if (fragment.update(dt, ship, width, height)) {
        collected++;
      }
      if (!fragment.active) {
        this.fragments.splice(i, 1);
      }
    }

    return collected;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const fragment of this.fragments) {
      fragment.draw(ctx);
    }
  }
}
