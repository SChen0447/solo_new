import { ShieldAttribute } from './store';

const W = 800;
const H = 600;
const SHIP_BASE = 40;
const SHIP_HEIGHT = 50;
const MOVE_SPEED = 4;
const SHIELD_RADIUS = 70;
const BULLET_SPEED = 8;
const BULLET_W = 8;
const BULLET_H = 12;
const FIRE_INTERVAL = 120;

const SHIELD_COLORS: Record<ShieldAttribute, string> = {
  energy: '#ffea00',
  frost: '#00e5ff',
  fire: '#ff6d00',
};

export interface Bullet {
  x: number;
  y: number;
  active: boolean;
}

export class Player {
  x = W / 2;
  y = H - 80;
  keys = { w: false, a: false, s: false, d: false };
  mouseDown = false;
  bullets: Bullet[] = [];
  fireTimer = 0;
  shieldColorCurrent = '#ffea00';
  shieldColorTarget = '#ffea00';
  shieldColorLerp = 1;
  shieldHitEffects: ShieldHitEffect[] = [];

  update(dt: number, shieldAttr: ShieldAttribute, shieldVisible: boolean): void {
    const dtFactor = dt / 16.667;

    if (this.keys.a) this.x -= MOVE_SPEED * dtFactor;
    if (this.keys.d) this.x += MOVE_SPEED * dtFactor;
    if (this.keys.w) this.y -= MOVE_SPEED * dtFactor;
    if (this.keys.s) this.y += MOVE_SPEED * dtFactor;

    this.x = Math.max(10 + SHIP_BASE / 2, Math.min(W - 10 - SHIP_BASE / 2, this.x));
    this.y = Math.max(20 + SHIP_HEIGHT / 2, Math.min(H - 20 - SHIP_HEIGHT / 2, this.y));

    const targetColor = SHIELD_COLORS[shieldAttr];
    if (this.shieldColorTarget !== targetColor) {
      this.shieldColorTarget = targetColor;
      this.shieldColorLerp = 0;
    }
    if (this.shieldColorLerp < 1) {
      this.shieldColorLerp = Math.min(1, this.shieldColorLerp + (dt / 1000) / 0.3);
      this.shieldColorCurrent = lerpColor(this.shieldColorCurrent, targetColor, this.shieldColorLerp);
    }

    if (this.mouseDown) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer = FIRE_INTERVAL;
        this.bullets.push({ x: this.x, y: this.y - SHIP_HEIGHT / 2, active: true });
      }
    }

    for (const b of this.bullets) {
      if (!b.active) continue;
      b.y -= BULLET_SPEED * dtFactor;
      if (b.y < -BULLET_H) b.active = false;
    }
    this.bullets = this.bullets.filter((b) => b.active);

    for (const e of this.shieldHitEffects) {
      e.timer -= dt / 1000;
    }
    this.shieldHitEffects = this.shieldHitEffects.filter((e) => e.timer > 0);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    shieldAttr: ShieldAttribute,
    shieldEnergy: number,
    shieldMaxEnergy: number,
    shieldFlickering: boolean,
    shieldVisible: boolean,
    shieldSwitchAnim: number,
  ): void {
    ctx.save();

    this.drawShield(ctx, shieldAttr, shieldEnergy, shieldMaxEnergy, shieldFlickering, shieldVisible, shieldSwitchAnim);
    this.drawShip(ctx);
    this.drawBullets(ctx);

    ctx.restore();
  }

  private drawShip(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.beginPath();
    ctx.moveTo(0, -SHIP_HEIGHT / 2);
    ctx.lineTo(-SHIP_BASE / 2, SHIP_HEIGHT / 2);
    ctx.lineTo(SHIP_BASE / 2, SHIP_HEIGHT / 2);
    ctx.closePath();

    ctx.fillStyle = '#00e5ff';
    ctx.fill();
    ctx.strokeStyle = '#b2ebf2';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
  }

  private drawShield(
    ctx: CanvasRenderingContext2D,
    shieldAttr: ShieldAttribute,
    shieldEnergy: number,
    shieldMaxEnergy: number,
    shieldFlickering: boolean,
    shieldVisible: boolean,
    shieldSwitchAnim: number,
  ): void {
    if (!shieldVisible && shieldEnergy <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    let fillAlpha = 0.08;
    if (shieldEnergy < shieldMaxEnergy && shieldEnergy > 0 && shieldFlickering) {
      fillAlpha = 0.3;
    } else if (shieldEnergy < shieldMaxEnergy && shieldEnergy > 0) {
      fillAlpha = 0.8;
    }

    const strokeColor = this.shieldColorCurrent;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = Math.cos(angle) * SHIELD_RADIUS;
      const py = Math.sin(angle) * SHIELD_RADIUS;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = `rgba(0,229,255,${fillAlpha})`;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (shieldSwitchAnim > 0) {
      const scale = 1 + (1 - shieldSwitchAnim) * 0.3;
      const swAlpha = shieldSwitchAnim;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = Math.cos(angle) * SHIELD_RADIUS * scale;
        const py = Math.sin(angle) * SHIELD_RADIUS * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = swAlpha;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const effect of this.shieldHitEffects) {
      this.drawShieldHitEffect(ctx, effect, shieldAttr);
    }

    ctx.restore();
  }

  private drawShieldHitEffect(ctx: CanvasRenderingContext2D, effect: ShieldHitEffect, attr: ShieldAttribute): void {
    const progress = 1 - effect.timer / effect.duration;
    ctx.save();
    ctx.globalAlpha = 1 - progress;

    if (attr === 'energy') {
      const rippleRadius = SHIELD_RADIUS + progress * 30;
      ctx.beginPath();
      ctx.arc(0, 0, rippleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffea00';
      ctx.lineWidth = 3 * (1 - progress);
      ctx.stroke();
    } else if (attr === 'frost') {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const dist = progress * 40;
        const px = Math.cos(angle) * (SHIELD_RADIUS + dist);
        const py = Math.sin(angle) * (SHIELD_RADIUS + dist);
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    } else if (attr === 'fire') {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + progress * 0.5;
        const dist = progress * 35;
        const px = Math.cos(angle) * (SHIELD_RADIUS + dist);
        const py = Math.sin(angle) * (SHIELD_RADIUS + dist);
        ctx.beginPath();
        ctx.arc(px, py, 2 * (1 - progress), 0, Math.PI * 2);
        ctx.fillStyle = '#ff6d00';
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawBullets(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = '#fff';
    for (const b of this.bullets) {
      if (!b.active) continue;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - BULLET_H / 2);
      ctx.lineTo(b.x - BULLET_W / 2, b.y + BULLET_H / 2);
      ctx.lineTo(b.x + BULLET_W / 2, b.y + BULLET_H / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  addShieldHitEffect(attr: ShieldAttribute): void {
    this.shieldHitEffects.push({
      timer: 0.3,
      duration: 0.3,
      attribute: attr,
    });
  }

  getAABB(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.x - SHIP_BASE / 2,
      y: this.y - SHIP_HEIGHT / 2,
      w: SHIP_BASE,
      h: SHIP_HEIGHT,
    };
  }

  getShieldAABB(): { x: number; y: number; w: number; h: number } | null {
    return {
      x: this.x - SHIELD_RADIUS,
      y: this.y - SHIELD_RADIUS,
      w: SHIELD_RADIUS * 2,
      h: SHIELD_RADIUS * 2,
    };
  }

  reset(): void {
    this.x = W / 2;
    this.y = H - 80;
    this.bullets = [];
    this.fireTimer = 0;
    this.shieldColorCurrent = '#ffea00';
    this.shieldColorTarget = '#ffea00';
    this.shieldColorLerp = 1;
    this.shieldHitEffects = [];
  }
}

interface ShieldHitEffect {
  timer: number;
  duration: number;
  attribute: ShieldAttribute;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function lerpColor(from: string, to: string, t: number): string {
  const f = hexToRgb(from);
  const toRgb = hexToRgb(to);
  if (!f || !toRgb) return to;
  const r = Math.round(f.r + (toRgb.r - f.r) * t);
  const g = Math.round(f.g + (toRgb.g - f.g) * t);
  const b = Math.round(f.b + (toRgb.b - f.b) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
