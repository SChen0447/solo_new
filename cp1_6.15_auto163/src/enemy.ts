import type { GameConfig, Enemy, EnemyState, EnemyConfig, Fireball, PlayerState, Dart } from './types';

export class EnemySystem {
  private config: GameConfig;
  public enemies: Enemy[] = [];
  public fireballs: Fireball[] = [];

  constructor(config: GameConfig) {
    this.config = config;
  }

  public loadRoom(enemiesCfg: EnemyConfig[]): void {
    this.enemies = [];
    this.fireballs = [];
    for (const cfg of enemiesCfg) {
      this.enemies.push({
        id: cfg.id,
        type: cfg.type,
        x: cfg.x,
        y: cfg.y,
        initialX: cfg.x,
        patrolStartX: cfg.patrolStartX,
        patrolEndX: cfg.patrolEndX,
        patrolDir: 1,
        state: 'patrol',
        prevState: 'patrol',
        stateIconScale: 0,
        alertFlashTimer: 0,
        lastFireballTime: 0,
        animTimer: Math.random() * Math.PI * 2,
        alive: true,
      });
    }
  }

  public update(dt: number, player: PlayerState): void {
    const ec = this.config.enemy;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      enemy.animTimer += dt * 3;
      if (enemy.alertFlashTimer > 0) {
        enemy.alertFlashTimer -= dt * 1000;
      }

      if (enemy.stateIconScale > 0) {
        enemy.stateIconScale -= dt * 1.5;
        if (enemy.stateIconScale < 0) enemy.stateIconScale = 0;
      }
      if (enemy.state !== enemy.prevState) {
        enemy.stateIconScale = 1.2;
        enemy.prevState = enemy.state;
        if (enemy.state === 'chase') {
          enemy.alertFlashTimer = 500;
        }
      }

      const playerCX = player.x + player.width / 2;
      const playerCY = player.y + player.height / 2;
      const enemyCX = enemy.type === 'slime' ? enemy.x : enemy.x + 12;
      const enemyCY = enemy.type === 'slime' ? enemy.y : enemy.y + 16;
      const distToPlayer = Math.hypot(playerCX - enemyCX, playerCY - enemyCY);

      switch (enemy.state) {
        case 'patrol':
          this.doPatrol(enemy, dt, ec.patrolSpeed);
          if (distToPlayer < ec.aggroDistance) {
            enemy.state = 'chase';
          }
          break;
        case 'chase':
          this.doChase(enemy, dt, ec.chaseSpeed, player);
          if (distToPlayer > ec.deAggroDistance) {
            enemy.state = 'return';
          }
          if (enemy.type === 'mage') {
            this.tryFireball(enemy, player, distToPlayer);
          }
          break;
        case 'return':
          this.doReturn(enemy, dt, ec.patrolSpeed);
          if (distToPlayer < ec.aggroDistance) {
            enemy.state = 'chase';
          }
          break;
      }
    }

    this.updateFireballs(dt);
  }

  private doPatrol(enemy: Enemy, dt: number, speed: number): void {
    enemy.x += enemy.patrolDir * speed * dt;
    if (enemy.x >= enemy.patrolEndX) {
      enemy.x = enemy.patrolEndX;
      enemy.patrolDir = -1;
    } else if (enemy.x <= enemy.patrolStartX) {
      enemy.x = enemy.patrolStartX;
      enemy.patrolDir = 1;
    }
  }

  private doChase(enemy: Enemy, dt: number, speed: number, player: PlayerState): void {
    const playerCX = player.x + player.width / 2;
    const enemyCX = enemy.type === 'slime' ? enemy.x : enemy.x + 12;
    const dir = playerCX > enemyCX ? 1 : -1;
    enemy.patrolDir = dir;
    enemy.x += dir * speed * dt;
  }

  private doReturn(enemy: Enemy, dt: number, speed: number): void {
    if (Math.abs(enemy.x - enemy.initialX) < 2) {
      enemy.x = enemy.initialX;
      enemy.state = 'patrol';
      enemy.patrolDir = 1;
      return;
    }
    const dir = enemy.x < enemy.initialX ? 1 : -1;
    enemy.patrolDir = dir;
    enemy.x += dir * speed * dt;
  }

  private tryFireball(enemy: Enemy, player: PlayerState, dist: number): void {
    const now = performance.now();
    if (now - enemy.lastFireballTime < this.config.enemy.fireballCooldown) return;
    if (dist > this.config.enemy.aggroDistance * 1.2) return;

    enemy.lastFireballTime = now;
    const playerCX = player.x + player.width / 2;
    const playerCY = player.y + player.height / 2;
    const startX = enemy.x + 12;
    const startY = enemy.y + 16;
    const dx = playerCX - startX;
    const dy = playerCY - startY;
    const len = Math.hypot(dx, dy) || 1;
    const speed = this.config.enemy.fireballSpeed;

    this.fireballs.push({
      id: `fb_${enemy.id}_${now}`,
      x: startX,
      y: startY,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      damage: this.config.enemy.fireballDamage,
      fromPlayer: false,
    });
  }

  private updateFireballs(dt: number): void {
    const roomW = this.config.room.width;
    const roomH = this.config.room.height;
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const f = this.fireballs[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < -20 || f.x > roomW + 20 || f.y < -20 || f.y > roomH + 20) {
        this.fireballs.splice(i, 1);
      }
    }
  }

  public checkPlayerFireballCollision(player: PlayerState): number {
    let totalDamage = 0;
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const f = this.fireballs[i];
      if (f.fromPlayer) continue;
      if (f.x >= player.x && f.x <= player.x + player.width &&
          f.y >= player.y && f.y <= player.y + player.height) {
        totalDamage += f.damage;
        this.fireballs.splice(i, 1);
      }
    }
    return totalDamage;
  }

  public checkPlayerEnemyCollision(player: PlayerState): boolean {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const ex = enemy.type === 'slime' ? enemy.x - 12 : enemy.x;
      const ey = enemy.type === 'slime' ? enemy.y - 12 : enemy.y;
      const ew = 24;
      const eh = enemy.type === 'slime' ? 24 : 32;
      if (player.x < ex + ew && player.x + player.width > ex &&
          player.y < ey + eh && player.y + player.height > ey) {
        return true;
      }
    }
    return false;
  }

  public checkDartEnemyCollision(darts: Dart[]): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const ex = enemy.type === 'slime' ? enemy.x - 12 : enemy.x;
      const ey = enemy.type === 'slime' ? enemy.y - 12 : enemy.y;
      const ew = 24;
      const eh = enemy.type === 'slime' ? 24 : 32;

      for (let i = darts.length - 1; i >= 0; i--) {
        const d = darts[i];
        if (d.x >= ex && d.x <= ex + ew && d.y >= ey && d.y <= ey + eh) {
          enemy.alive = false;
          darts.splice(i, 1);
          break;
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, scale: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      this.renderEnemy(ctx, enemy, scale);
      this.renderStateIcon(ctx, enemy, scale);
    }

    for (const fb of this.fireballs) {
      this.renderFireball(ctx, fb, scale);
    }
  }

  private renderEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, s: number): void {
    if (enemy.type === 'slime') {
      this.renderSlime(ctx, enemy, s);
    } else {
      this.renderMage(ctx, enemy, s);
    }
  }

  private renderSlime(ctx: CanvasRenderingContext2D, enemy: Enemy, s: number): void {
    const bob = Math.sin(enemy.animTimer) * 2 * s;
    const stretch = 1 + Math.sin(enemy.animTimer) * 0.12;
    const cx = enemy.x * s;
    const cy = enemy.y * s + bob;
    const r = 12 * s;

    ctx.save();
    if (enemy.state === 'chase' && (Math.floor(enemy.alertFlashTimer / 80) % 2 === 0)) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 12;
    } else if (enemy.state === 'return') {
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * (2 - stretch), r * stretch, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, cy - r * 0.4, r * 0.25, r * 0.15, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - 3 * s, cy - 2 * s, 2 * s, 0, Math.PI * 2);
    ctx.arc(cx + 3 * s, cy - 2 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    const eyeDir = enemy.patrolDir > 0 ? 0.8 : -0.8;
    ctx.beginPath();
    ctx.arc(cx - 3 * s + eyeDir * s, cy - 2 * s, 1 * s, 0, Math.PI * 2);
    ctx.arc(cx + 3 * s + eyeDir * s, cy - 2 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderMage(ctx: CanvasRenderingContext2D, enemy: Enemy, s: number): void {
    const x = enemy.x * s;
    const y = enemy.y * s;
    const w = 24 * s;
    const h = 32 * s;

    ctx.save();
    if (enemy.state === 'chase' && (Math.floor(enemy.alertFlashTimer / 80) % 2 === 0)) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 12;
    } else if (enemy.state === 'return') {
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = '#1976d2';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w * 0.1, y + h * 0.35);
    ctx.lineTo(x + w * 0.9, y + h * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#64b5f6';
    ctx.fillRect(x + 2 * s, y + h * 0.35, w - 4 * s, h * 0.45);

    ctx.fillStyle = '#f5d4a6';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.45, 4 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    const eyeDir = enemy.patrolDir > 0 ? 1 : -1;
    ctx.beginPath();
    ctx.arc(x + w / 2 - 1.5 * s + eyeDir * s, y + h * 0.44, 0.8 * s, 0, Math.PI * 2);
    ctx.arc(x + w / 2 + 1.5 * s + eyeDir * s, y + h * 0.44, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0d47a1';
    ctx.fillRect(x + 3 * s, y + h * 0.8, w - 6 * s, h * 0.2);

    const staffX = enemy.patrolDir > 0 ? x + w + 2 * s : x - 4 * s;
    ctx.strokeStyle = '#6d4c41';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(staffX, y + h);
    ctx.lineTo(staffX, y + h * 0.2);
    ctx.stroke();

    const orbPulse = 1 + Math.sin(enemy.animTimer * 2) * 0.2;
    ctx.fillStyle = '#e91e63';
    ctx.shadowColor = '#ff4081';
    ctx.shadowBlur = 6 * s;
    ctx.beginPath();
    ctx.arc(staffX, y + h * 0.18, 2.5 * s * orbPulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderStateIcon(ctx: CanvasRenderingContext2D, enemy: Enemy, s: number): void {
    if (enemy.stateIconScale <= 0.05) return;
    const scale = enemy.stateIconScale;
    const cx = (enemy.type === 'slime' ? enemy.x : enemy.x + 12) * s;
    const cy = (enemy.type === 'slime' ? enemy.y - 22 : enemy.y - 14) * s;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#ffd700';
    const size = 16 * s;
    ctx.beginPath();
    const r = size * 0.5;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -4 * s);
    ctx.lineTo(0, 2 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 5 * s, 1 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.restore();
  }

  private renderFireball(ctx: CanvasRenderingContext2D, fb: Fireball, s: number): void {
    const r = 4 * s;
    ctx.save();
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 8 * s;
    ctx.fillStyle = '#ff3300';
    ctx.beginPath();
    ctx.arc(fb.x * s, fb.y * s, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(fb.x * s, fb.y * s, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(fb.x * s, fb.y * s, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
