import { Bullet, Player } from './Player';
import { GameState, SHIELD_DAMAGE } from './store';

const W = 800;
const H = 600;
const ENEMY_SIZE = 25;
const ENEMY_BASE_SPEED = 1.5;
const ENEMY_BOOST_SPEED = 2;
const BULLET_RADIUS = 4;
const ENEMY_BULLET_SPEED = 3;
const ENEMY_FIRE_INTERVAL = 800;
const FORMATION_SWITCH_BASE = 3000;
const FORMATION_SWITCH_MIN = 1500;
const MAX_PARTICLES = 200;
const MAX_ENEMY_BULLETS = 50;

type FormationType = 'v' | 'line' | 'circle';

interface Enemy {
  x: number;
  y: number;
  alive: boolean;
  isLeader: boolean;
  formationType: FormationType;
  formationOffsetX: number;
  formationOffsetY: number;
  looseAngle: number;
  circleAngle: number;
  fireTimer: number;
  speed: number;
  looseMode: boolean;
  formationCenterX: number;
  formationCenterY: number;
}

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

export class EnemyManager {
  enemies: Enemy[] = [];
  particles: ExplosionParticle[] = [];
  enemyBullets: EnemyBullet[] = [];
  waveTimer = 2000;
  formationTimer = FORMATION_SWITCH_BASE;
  currentFormation: FormationType = 'v';
  waveCount = 3;

  update(dt: number, player: Player, getState: () => GameState): void {
    const state = getState();
    const dtFactor = dt / 16.667;
    const difficulty = state.difficulty;

    this.waveCount = Math.min(7, 3 + difficulty - 1);
    const speed = Math.min(3, ENEMY_BASE_SPEED + (difficulty - 1) * 0.3);
    const switchInterval = Math.max(FORMATION_SWITCH_MIN, FORMATION_SWITCH_BASE - (difficulty - 1) * 300);

    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.spawnWave(this.waveCount, speed);
      this.waveTimer = 3000;
    }

    this.formationTimer -= dt;
    if (this.formationTimer <= 0) {
      this.currentFormation = this.randomFormation();
      this.formationTimer = switchInterval;
      this.reassignFormation();
    }

    for (const e of this.enemies) {
      if (!e.alive) continue;

      if (e.looseMode) {
        e.x += Math.cos(e.looseAngle) * e.speed * dtFactor;
        e.y += Math.sin(e.looseAngle) * e.speed * dtFactor;

        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.fireTimer = ENEMY_FIRE_INTERVAL;
          this.fireAtPlayer(e, player);
        }
      } else {
        e.formationCenterY += speed * dtFactor;
        const target = this.getFormationPosition(e, speed);
        e.x += (target.x - e.x) * 0.1 * dtFactor;
        e.y += (target.y - e.y) * 0.2 * dtFactor;
      }

      if (e.y > H + ENEMY_SIZE) {
        e.y = -ENEMY_SIZE;
        e.formationCenterY = e.y;
      }
      if (e.x < -ENEMY_SIZE) e.x = W + ENEMY_SIZE;
      if (e.x > W + ENEMY_SIZE) e.x = -ENEMY_SIZE;
    }

    for (const b of this.enemyBullets) {
      if (!b.active) continue;
      b.x += b.vx * dtFactor;
      b.y += b.vy * dtFactor;
      if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) {
        b.active = false;
      }
    }
    this.enemyBullets = this.enemyBullets.filter((b) => b.active);
    if (this.enemyBullets.length > MAX_ENEMY_BULLETS) {
      this.enemyBullets = this.enemyBullets.slice(-MAX_ENEMY_BULLETS);
    }

    for (const p of this.particles) {
      p.x += p.vx * dtFactor;
      p.y += p.vy * dtFactor;
      p.life -= dt / 1000;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    this.checkCollisions(player, getState);
  }

  private spawnWave(count: number, speed: number): void {
    const formation = this.randomFormation();
    this.currentFormation = formation;
    const centerX = W / 2;
    const startY = -50;

    for (let i = 0; i < count; i++) {
      const isLeader = i === 0;
      let offsetX = 0;
      let offsetY = 0;
      let circleAngle = 0;

      if (formation === 'v') {
        if (i === 0) {
          offsetX = 0;
          offsetY = 0;
        } else {
          const side = i % 2 === 1 ? -1 : 1;
          const rank = Math.ceil(i / 2);
          offsetX = side * rank * 30;
          offsetY = rank * 30;
        }
      } else if (formation === 'line') {
        offsetX = (Math.random() - 0.5) * 20;
        offsetY = i * 30;
      } else {
        circleAngle = (Math.PI * 2 * i) / count;
        offsetX = Math.cos(circleAngle) * 60;
        offsetY = Math.sin(circleAngle) * 60;
      }

      this.enemies.push({
        x: centerX + offsetX,
        y: startY + offsetY,
        alive: true,
        isLeader,
        formationType: formation,
        formationOffsetX: offsetX,
        formationOffsetY: offsetY,
        looseAngle: 0,
        circleAngle,
        fireTimer: ENEMY_FIRE_INTERVAL,
        speed,
        looseMode: false,
        formationCenterX: centerX,
        formationCenterY: startY,
      });
    }
  }

  private randomFormation(): FormationType {
    const r = Math.random();
    if (r < 0.33) return 'v';
    if (r < 0.66) return 'line';
    return 'circle';
  }

  private reassignFormation(): void {
    for (const e of this.enemies) {
      if (!e.alive || e.looseMode) continue;
      e.formationType = this.currentFormation;
      const idx = this.enemies.filter((en) => en.alive && !en.looseMode).indexOf(e);
      const count = this.enemies.filter((en) => en.alive && !en.looseMode).length;

      if (this.currentFormation === 'v') {
        if (idx === 0) {
          e.formationOffsetX = 0;
          e.formationOffsetY = 0;
        } else {
          const side = idx % 2 === 1 ? -1 : 1;
          const rank = Math.ceil(idx / 2);
          e.formationOffsetX = side * rank * 30;
          e.formationOffsetY = rank * 30;
        }
      } else if (this.currentFormation === 'line') {
        e.formationOffsetX = (Math.random() - 0.5) * 20;
        e.formationOffsetY = idx * 30;
      } else {
        e.circleAngle = (Math.PI * 2 * idx) / Math.max(1, count);
        e.formationOffsetX = Math.cos(e.circleAngle) * 60;
        e.formationOffsetY = Math.sin(e.circleAngle) * 60;
      }
    }
  }

  private getFormationPosition(e: Enemy, speed: number): { x: number; y: number } {
    if (e.formationType === 'circle') {
      e.circleAngle += 0.02 * (speed / ENEMY_BASE_SPEED);
      const cx = e.formationCenterX;
      const cy = e.formationCenterY;
      return {
        x: cx + Math.cos(e.circleAngle) * 60,
        y: cy + Math.sin(e.circleAngle) * 60,
      };
    }
    return {
      x: e.formationCenterX + e.formationOffsetX,
      y: e.formationCenterY + e.formationOffsetY,
    };
  }

  private fireAtPlayer(e: Enemy, player: Player): void {
    if (this.enemyBullets.length >= MAX_ENEMY_BULLETS) return;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;
    this.enemyBullets.push({
      x: e.x,
      y: e.y,
      vx: (dx / dist) * ENEMY_BULLET_SPEED,
      vy: (dy / dist) * ENEMY_BULLET_SPEED,
      active: true,
    });
  }

  private checkCollisions(player: Player, getState: () => GameState): void {
    const state = getState();

    for (const bullet of player.bullets) {
      if (!bullet.active) continue;
      const bAABB = {
        x: bullet.x - 4,
        y: bullet.y - 6,
        w: 8,
        h: 12,
      };

      for (const e of this.enemies) {
        if (!e.alive) continue;
        const eAABB = {
          x: e.x - ENEMY_SIZE / 2,
          y: e.y - ENEMY_SIZE / 2,
          w: ENEMY_SIZE,
          h: ENEMY_SIZE,
        };

        if (aabbOverlap(bAABB, eAABB)) {
          bullet.active = false;
          e.alive = false;
          this.spawnExplosion(e.x, e.y);

          if (e.isLeader) {
            this.onLeaderDestroyed(e, state.difficulty);
          }

          state.addScore(100);
          break;
        }
      }
    }

    for (const eb of this.enemyBullets) {
      if (!eb.active) continue;

      const ebAABB = {
        x: eb.x - BULLET_RADIUS,
        y: eb.y - BULLET_RADIUS,
        w: BULLET_RADIUS * 2,
        h: BULLET_RADIUS * 2,
      };

      if (state.shield.visible && state.shield.energy > 0) {
        const sAABB = player.getShieldAABB();
        if (sAABB && aabbOverlap(ebAABB, sAABB)) {
          eb.active = false;
          state.damageShield(SHIELD_DAMAGE);
          player.addShieldHitEffect(state.shield.attribute);
          continue;
        }
      }

      const pAABB = player.getAABB();
      if (aabbOverlap(ebAABB, pAABB)) {
        eb.active = false;
        if (!state.shield.visible || state.shield.energy <= 0) {
          state.setGameOver(true);
          state.setGameOverTimer(1000);
        }
      }
    }

    for (const e of this.enemies) {
      if (!e.alive) continue;
      const eAABB = {
        x: e.x - ENEMY_SIZE / 2,
        y: e.y - ENEMY_SIZE / 2,
        w: ENEMY_SIZE,
        h: ENEMY_SIZE,
      };

      if (state.shield.visible && state.shield.energy > 0) {
        const sAABB = player.getShieldAABB();
        if (sAABB && aabbOverlap(eAABB, sAABB)) {
          state.damageShield(SHIELD_DAMAGE);
          player.addShieldHitEffect(state.shield.attribute);
          e.alive = false;
          this.spawnExplosion(e.x, e.y);
          continue;
        }
      }

      const pAABB = player.getAABB();
      if (aabbOverlap(eAABB, pAABB)) {
        if (!state.shield.visible || state.shield.energy <= 0) {
          state.setGameOver(true);
          state.setGameOverTimer(1000);
        }
      }
    }

    this.enemies = this.enemies.filter((e) => e.alive);
  }

  private onLeaderDestroyed(leader: Enemy, difficulty: number): void {
    for (const e of this.enemies) {
      if (!e.alive || e === leader) continue;
      e.looseMode = true;
      e.speed = Math.min(3, ENEMY_BOOST_SPEED + (difficulty - 1) * 0.3);
      const baseAngle = Math.atan2(1, 0);
      e.looseAngle = baseAngle + (Math.random() - 0.5) * (Math.PI / 3);
      e.fireTimer = ENEMY_FIRE_INTERVAL * Math.random();
    }
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 40 / 0.3;
      const radius = 2 + Math.random() * 2;
      const t = Math.random();
      const r1 = 255;
      const g1 = Math.round(235 + (152 - 235) * t);
      const b1 = Math.round(59 + (0 - 59) * t);
      const color = `rgb(${r1},${g1},${b1})`;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed * (0.5 + Math.random() * 0.5),
        vy: Math.sin(angle) * speed * (0.5 + Math.random() * 0.5),
        radius,
        color,
        life: 0.3,
        maxLife: 0.3,
      });
    }
    if (this.particles.length > MAX_PARTICLES) {
      this.particles = this.particles.slice(-MAX_PARTICLES);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    for (const e of this.enemies) {
      if (!e.alive) continue;
      ctx.save();
      ctx.translate(e.x, e.y);

      ctx.beginPath();
      ctx.moveTo(0, -ENEMY_SIZE / 2);
      ctx.lineTo(ENEMY_SIZE / 2, 0);
      ctx.lineTo(0, ENEMY_SIZE / 2);
      ctx.lineTo(-ENEMY_SIZE / 2, 0);
      ctx.closePath();

      ctx.fillStyle = '#e53935';
      ctx.fill();

      if (e.isLeader) {
        ctx.strokeStyle = '#ff8a80';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    }

    for (const eb of this.enemyBullets) {
      if (!eb.active) continue;
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#ff5722';
      ctx.fill();
    }

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  reset(): void {
    this.enemies = [];
    this.particles = [];
    this.enemyBullets = [];
    this.waveTimer = 2000;
    this.formationTimer = FORMATION_SWITCH_BASE;
    this.currentFormation = 'v';
  }
}

function aabbOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
