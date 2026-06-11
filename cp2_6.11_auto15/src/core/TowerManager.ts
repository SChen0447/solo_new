
import type { Tower, TowerType, TowerLevel, TowerStats, Enemy } from '../shared/types';
import { TOWER_CONFIGS } from '../shared/types';
import { eventBus } from '../shared/EventBus';
import { ObjectPool, createProjectileFactory, createParticleFactory } from './ObjectPool';
import type { Projectile, Particle } from '../shared/types';
import type { EnemyManager } from './EnemyManager';

export class TowerManager {
  private towers: Map<string, Tower> = new Map();
  private towerIdCounter: number = 0;
  private projectilePool: ObjectPool<Projectile>;
  private particlePool: ObjectPool<Particle>;
  private selectedTowerType: TowerType | null = null;
  private selectedTowerId: string | null = null;
  private enemyManager: EnemyManager | null = null;
  private cellSize: number = 40;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private chainEffectPoints: { x: number; y: number; life: number }[] = [];

  constructor() {
    this.projectilePool = new ObjectPool<Projectile>(createProjectileFactory(), 100, 500);
    this.particlePool = new ObjectPool<Particle>(createParticleFactory(), 200, 1000);
  }

  setEnemyManager(em: EnemyManager): void {
    this.enemyManager = em;
  }

  setMapDimensions(offsetX: number, offsetY: number, cellSize: number): void {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.cellSize = cellSize;
  }

  setSelectedTowerType(type: TowerType | null): void {
    this.selectedTowerType = type;
    this.selectedTowerId = null;
  }

  getSelectedTowerType(): TowerType | null {
    return this.selectedTowerType;
  }

  setSelectedTowerId(id: string | null): void {
    this.selectedTowerId = id;
    this.selectedTowerType = null;
  }

  getSelectedTowerId(): string | null {
    return this.selectedTowerId;
  }

  canPlaceTower(gridX: number, gridY: number): boolean {
    for (const t of this.towers.values()) {
      if (t.gridX === gridX && t.gridY === gridY) return false;
    }
    return true;
  }

  buildTower(gridX: number, gridY: number, type: TowerType, gold: number): { tower: Tower | null; cost: number } {
    const cfg = TOWER_CONFIGS[type];
    const cost = cfg.levels[1].cost;
    if (gold < cost) return { tower: null, cost: 0 };
    if (!this.canPlaceTower(gridX, gridY)) return { tower: null, cost: 0 };

    const newTower: Tower = {
      id: `t_${++this.towerIdCounter}`,
      type,
      level: 1,
      gridX,
      gridY,
      x: this.offsetX + gridX * this.cellSize + this.cellSize / 2,
      y: this.offsetY + gridY * this.cellSize + this.cellSize / 2,
      cooldown: 0,
      stats: { ...cfg.levels[1] },
      totalInvested: cost,
      animScale: 0,
      animTime: 0.5,
      rotation: 0,
      targetId: null,
    };
    this.towers.set(newTower.id, newTower);
    this.spawnBuildParticles(newTower.x, newTower.y, cfg.color);
    eventBus.emit('Core:TowerBuilt', { tower: newTower });
    return { tower: newTower, cost };
  }

  upgradeTower(towerId: string, gold: number): { tower: Tower | null; cost: number } {
    const tower = this.towers.get(towerId);
    if (!tower) return { tower: null, cost: 0 };
    if (tower.level >= 3) return { tower: null, cost: 0 };
    const nextLevel = (tower.level + 1) as TowerLevel;
    const cost = TOWER_CONFIGS[tower.type].levels[nextLevel].cost;
    if (gold < cost) return { tower: null, cost: 0 };

    tower.level = nextLevel;
    tower.stats = { ...TOWER_CONFIGS[tower.type].levels[nextLevel] };
    tower.totalInvested += cost;
    tower.animTime = 0.4;
    tower.animScale = 1.3;
    this.spawnBuildParticles(tower.x, tower.y, TOWER_CONFIGS[tower.type].color);
    eventBus.emit('Core:TowerUpgraded', { tower });
    return { tower, cost };
  }

  sellTower(towerId: string): { tower: Tower | null; refund: number } {
    const tower = this.towers.get(towerId);
    if (!tower) return { tower: null, refund: 0 };
    const refund = Math.floor(tower.totalInvested * 0.7);
    this.towers.delete(towerId);
    this.spawnBuildParticles(tower.x, tower.y, '#ff8888');
    eventBus.emit('Core:TowerSold', { tower, refund });
    return { tower, refund };
  }

  getTower(towerId: string): Tower | undefined {
    return this.towers.get(towerId);
  }

  getTowers(): Tower[] {
    return Array.from(this.towers.values());
  }

  getTowerCount(): number {
    return this.towers.size;
  }

  getTowerByGrid(gridX: number, gridY: number): Tower | undefined {
    for (const t of this.towers.values()) {
      if (t.gridX === gridX && t.gridY === gridY) return t;
    }
    return undefined;
  }

  private spawnBuildParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 20; i++) {
      const p = this.particlePool.acquire();
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
      const speed = 50 + Math.random() * 100;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.6;
      p.maxLife = 0.6;
      p.color = color;
      p.size = 2 + Math.random() * 2;
    }
  }

  spawnHitParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 8; i++) {
      const p = this.particlePool.acquire();
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.4;
      p.maxLife = 0.4;
      p.color = color;
      p.size = 1.5 + Math.random() * 1.5;
    }
  }

  update(dt: number): void {
    for (const tower of this.towers.values()) {
      if (tower.animTime > 0) {
        tower.animTime -= dt;
        tower.animScale = Math.max(1, 1 + tower.animTime * 1.5);
      } else {
        tower.animScale = 1;
      }
      if (tower.cooldown > 0) tower.cooldown -= dt;

      if (this.enemyManager && tower.cooldown <= 0) {
        const target = this.findTarget(tower);
        if (target) {
          tower.targetId = target.id;
          const dx = target.x - tower.x;
          const dy = target.y - tower.y;
          tower.rotation = Math.atan2(dy, dx);
          this.fireTower(tower, target);
          tower.cooldown = tower.stats.fireRate;
        } else {
          tower.targetId = null;
        }
      }
    }

    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updateChainEffects(dt);
  }

  private findTarget(tower: Tower): Enemy | null {
    if (!this.enemyManager) return null;
    const enemies = this.enemyManager.getEnemies();
    let best: Enemy | null = null;
    let bestProgress = -1;
    for (const e of enemies) {
      const dist = Math.hypot(e.x - tower.x, e.y - tower.y);
      if (dist <= tower.stats.range) {
        if (e.pathIndex > bestProgress) {
          bestProgress = e.pathIndex;
          best = e;
        }
      }
    }
    return best;
  }

  private fireTower(tower: Tower, target: Enemy): void {
    const cfg = TOWER_CONFIGS[tower.type];
    if (tower.type === 'electric') {
      this.handleChainLightning(tower, target);
      return;
    }
    const proj = this.projectilePool.acquire();
    proj.x = tower.x;
    proj.y = tower.y;
    proj.targetId = target.id;
    proj.targetX = target.x;
    proj.targetY = target.y;
    proj.damage = tower.stats.damage;
    proj.type = tower.type;
    proj.speed = tower.type === 'cannon' ? 250 : tower.type === 'ice' ? 350 : tower.type === 'poison' ? 300 : 450;
    proj.splashRadius = tower.stats.splashRadius;
    proj.slowPercent = tower.stats.slowPercent;
    proj.slowDuration = tower.stats.slowDuration;
    proj.poisonDamage = tower.stats.poisonDamage;
    proj.poisonDuration = tower.stats.poisonDuration;
    proj.chainedIds = [];
    void cfg;
  }

  private handleChainLightning(tower: Tower, firstTarget: Enemy): void {
    if (!this.enemyManager) return;
    const chainCount = tower.stats.chainCount ?? 3;
    const hit: Set<string> = new Set();
    let current = firstTarget;
    let damage = tower.stats.damage;
    const points: { x: number; y: number }[] = [{ x: tower.x, y: tower.y }];

    for (let i = 0; i < chainCount; i++) {
      if (!current || hit.has(current.id)) break;
      hit.add(current.id);
      points.push({ x: current.x, y: current.y });
      this.enemyManager.applyDamage(current.id, damage);
      this.spawnHitParticles(current.x, current.y, TOWER_CONFIGS.electric.color);
      damage *= 0.7;

      let next: Enemy | null = null;
      let nearestDist = Infinity;
      for (const e of this.enemyManager.getEnemies()) {
        if (hit.has(e.id)) continue;
        const d = Math.hypot(e.x - current.x, e.y - current.y);
        if (d < 100 && d < nearestDist) {
          nearestDist = d;
          next = e;
        }
      }
      if (!next) break;
      current = next;
    }

    for (let i = 0; i < points.length - 1; i++) {
      this.chainEffectPoints.push({ x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2, life: 0.2 });
    }
    this.chainEffectPoints.push(...points.map((p) => ({ x: p.x, y: p.y, life: 0.2 })));
  }

  private updateProjectiles(dt: number): void {
    if (!this.enemyManager) return;
    const toRelease: Projectile[] = [];

    this.projectilePool.forEachActive((proj) => {
      let target: Enemy | undefined;
      if (proj.targetId) {
        target = this.enemyManager!.getEnemy(proj.targetId);
      }
      if (target) {
        proj.targetX = target.x;
        proj.targetY = target.y;
      }

      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const dist = Math.hypot(dx, dy);
      const move = proj.speed * dt;

      if (dist <= move || dist < 6) {
        this.onProjectileHit(proj);
        toRelease.push(proj);
      } else {
        proj.x += (dx / dist) * move;
        proj.y += (dy / dist) * move;
      }
    });

    for (const p of toRelease) {
      this.projectilePool.release(p);
    }
  }

  private onProjectileHit(proj: Projectile): void {
    if (!this.enemyManager) return;
    const color = TOWER_CONFIGS[proj.type].color;

    if (proj.splashRadius && proj.splashRadius > 0) {
      for (const e of this.enemyManager.getEnemies()) {
        const d = Math.hypot(e.x - proj.targetX, e.y - proj.targetY);
        if (d <= proj.splashRadius) {
          const falloff = 1 - (d / proj.splashRadius) * 0.5;
          this.enemyManager.applyDamage(e.id, proj.damage * falloff);
          this.spawnHitParticles(e.x, e.y, color);
        }
      }
      for (let i = 0; i < 15; i++) {
        const p = this.particlePool.acquire();
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;
        p.x = proj.targetX;
        p.y = proj.targetY;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = 0.5;
        p.maxLife = 0.5;
        p.color = color;
        p.size = 2 + Math.random() * 3;
      }
    } else if (proj.targetId) {
      this.enemyManager.applyDamage(proj.targetId, proj.damage);
      if (proj.slowPercent && proj.slowDuration) {
        this.enemyManager.applySlow(proj.targetId, proj.slowPercent, proj.slowDuration);
      }
      if (proj.poisonDamage && proj.poisonDuration) {
        this.enemyManager.applyPoison(proj.targetId, proj.poisonDamage, proj.poisonDuration);
      }
      this.spawnHitParticles(proj.targetX, proj.targetY, color);
    }
  }

  private updateParticles(dt: number): void {
    this.particlePool.forEachActive((p) => {
      p.life -= dt;
      if (p.life <= 0) {
        this.particlePool.release(p);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
    });
  }

  private updateChainEffects(dt: number): void {
    for (let i = this.chainEffectPoints.length - 1; i >= 0; i--) {
      this.chainEffectPoints[i].life -= dt;
      if (this.chainEffectPoints[i].life <= 0) {
        this.chainEffectPoints.splice(i, 1);
      }
    }
  }

  getProjectiles(): Projectile[] {
    return this.projectilePool.getActive();
  }

  getParticles(): Particle[] {
    return this.particlePool.getActive();
  }

  getChainEffects(): { x: number; y: number; life: number }[] {
    return this.chainEffectPoints;
  }

  clearAll(): void {
    this.towers.clear();
    this.projectilePool.clearAll();
    this.particlePool.clearAll();
    this.chainEffectPoints = [];
  }
}
