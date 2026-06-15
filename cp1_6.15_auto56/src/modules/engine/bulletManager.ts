import { BulletPattern, PATTERN_COLORS } from '../../store/gameStore';

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type: BulletPattern;
  life: number;
  trail: { x: number; y: number }[];
  angle?: number;
}

export class BulletManager {
  bullets: Bullet[] = [];
  private spiralAngle: number = 0;
  private spiralTimer: number = 0;
  private patternTimer: number = 0;
  private currentPattern: BulletPattern = 'fan';
  private speedMultiplier: number = 1;
  private readonly CANVAS_W = 800;
  private readonly CANVAS_H = 600;

  reset() {
    this.bullets = [];
    this.spiralAngle = 0;
    this.spiralTimer = 0;
    this.patternTimer = 0;
  }

  setPattern(pattern: BulletPattern) {
    this.currentPattern = pattern;
    this.patternTimer = 0;
  }

  setSpeedMultiplier(mult: number) {
    this.speedMultiplier = mult;
  }

  update(dt: number, bossX: number, bossY: number, playerX: number, playerY: number) {
    this.patternTimer += dt;
    this.spiralTimer += dt;

    if (this.spiralTimer >= 0.01) {
      this.spiralAngle += (90 * Math.PI / 180) * 0.01;
      this.spiralTimer = 0;
    }

    this.spawnBullets(dt, bossX, bossY, playerX, playerY);

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;

      if (b.type === 'homing') {
        const dx = playerX - b.x;
        const dy = playerY - b.y;
        const targetAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(b.vy, b.vx);
        let diff = targetAngle - currentAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const maxTurn = (2 * Math.PI / 180);
        const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
        const newAngle = currentAngle + turn;
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy) + 8 * dt;
        b.vx = Math.cos(newAngle) * speed;
        b.vy = Math.sin(newAngle) * speed;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.type === 'homing' || b.type === 'spiral') {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 12) b.trail.shift();
      }

      if (
        b.x < -50 || b.x > this.CANVAS_W + 50 ||
        b.y < -50 || b.y > this.CANVAS_H + 50 ||
        b.life <= 0
      ) {
        this.bullets.splice(i, 1);
      }
    }
  }

  private spawnBullets(dt: number, bossX: number, bossY: number, playerX: number, playerY: number) {
    const interval = 0.8 / this.speedMultiplier;

    switch (this.currentPattern) {
      case 'fan': {
        if (this.patternTimer >= interval) {
          this.patternTimer = 0;
          const baseAngle = Math.atan2(playerY - bossY, playerX - bossX);
          const spread = 60 * Math.PI / 180;
          const count = 12;
          for (let i = 0; i < count; i++) {
            const angle = baseAngle - spread / 2 + (spread * i) / (count - 1);
            const speed = 150;
            this.bullets.push({
              x: bossX,
              y: bossY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: 6,
              color: PATTERN_COLORS.fan,
              type: 'fan',
              life: 6,
              trail: []
            });
          }
        }
        break;
      }
      case 'spiral': {
        const spiralInterval = 0.05 / this.speedMultiplier;
        if (this.patternTimer >= spiralInterval) {
          this.patternTimer = 0;
          const speed = 140;
          for (let s = 0; s < 2; s++) {
            const a = this.spiralAngle + s * Math.PI;
            this.bullets.push({
              x: bossX,
              y: bossY,
              vx: Math.cos(a) * speed,
              vy: Math.sin(a) * speed,
              radius: 6,
              color: PATTERN_COLORS.spiral,
              type: 'spiral',
              life: 6,
              trail: []
            });
          }
        }
        break;
      }
      case 'homing': {
        if (this.patternTimer >= interval * 1.5) {
          this.patternTimer = 0;
          const count = 3;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI / 2) - 0.3 + (i * 0.3);
            const speed = 80;
            this.bullets.push({
              x: bossX,
              y: bossY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: 6,
              color: PATTERN_COLORS.homing,
              type: 'homing',
              life: 6,
              trail: []
            });
          }
        }
        break;
      }
      case 'random': {
        if (this.patternTimer >= interval * 0.8) {
          this.patternTimer = 0;
          const count = 20;
          const baseAngle = Math.PI / 2;
          const spread = 120 * Math.PI / 180;
          for (let i = 0; i < count; i++) {
            const angle = baseAngle - spread / 2 + Math.random() * spread;
            const speed = 100 + Math.random() * 120;
            this.bullets.push({
              x: bossX,
              y: bossY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: 6,
              color: PATTERN_COLORS.random,
              type: 'random',
              life: 6,
              trail: []
            });
          }
        }
        break;
      }
    }
  }

  checkCollision(playerX: number, playerY: number, playerRadius: number): boolean {
    for (const b of this.bullets) {
      const dx = b.x - playerX;
      const dy = b.y - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < b.radius + playerRadius) {
        return true;
      }
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D, bossX: number, bossY: number) {
    const useSimple = this.bullets.length > 200;

    for (const b of this.bullets) {
      if (!useSimple && b.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let i = 1; i < b.trail.length; i++) {
          ctx.lineTo(b.trail[i].x, b.trail[i].y);
        }
        ctx.strokeStyle = b.color + '60';
        ctx.lineWidth = b.radius;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(b.x, b.y, useSimple ? b.radius * 0.7 : b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();

      if (!useSimple) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = b.color + '30';
        ctx.fill();
      }
    }
  }
}
