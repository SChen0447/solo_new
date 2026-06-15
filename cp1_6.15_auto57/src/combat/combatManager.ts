import type { Enemy, EnemyType, TrackType, JudgmentType } from '../types/game';
import { GAME_CONFIG, ENEMY_CONFIG } from '../utils/constants';

export class CombatManager {
  private enemies: Enemy[] = [];
  private playerHp: number;
  private maxPlayerHp: number;
  private consecutiveMisses: number = 0;
  private missDamageThreshold: number;
  private missDamage: number;
  private enemyIdCounter: number = 0;
  private lastLeftSpawnBeat: number = -1;
  private lastRightSpawnBeat: number = -1;
  private bossSpawned: boolean = false;
  private beatDuration: number;
  private barDuration: number;

  constructor() {
    this.maxPlayerHp = GAME_CONFIG.maxPlayerHp;
    this.playerHp = GAME_CONFIG.maxPlayerHp;
    this.missDamageThreshold = GAME_CONFIG.missDamageThreshold;
    this.missDamage = GAME_CONFIG.missDamage;
    this.beatDuration = 60000 / GAME_CONFIG.bpm;
    this.barDuration = this.beatDuration * GAME_CONFIG.beatsPerBar;
  }

  reset(): void {
    this.enemies = [];
    this.playerHp = this.maxPlayerHp;
    this.consecutiveMisses = 0;
    this.enemyIdCounter = 0;
    this.lastLeftSpawnBeat = -1;
    this.lastRightSpawnBeat = -1;
    this.bossSpawned = false;
  }

  update(currentTime: number, deltaTime: number): void {
    this.updateEnemySpawns(currentTime);
    this.updateEnemyPositions(currentTime, deltaTime);
    this.cleanupDeadEnemies(currentTime);
  }

  private updateEnemySpawns(currentTime: number): void {
    const currentBeat = Math.floor(currentTime / this.beatDuration);
    const currentBar = Math.floor(currentTime / this.barDuration);

    if (currentBeat >= 0 && currentBeat % ENEMY_CONFIG.normal.spawnIntervalBeats === 0 && currentBeat !== this.lastLeftSpawnBeat) {
      if (currentBar < ENEMY_CONFIG.boss.spawnBar || currentBar >= ENEMY_CONFIG.boss.spawnBar + 4) {
        this.spawnEnemy('normal', 'left', currentTime);
        this.lastLeftSpawnBeat = currentBeat;
      }
    }

    if (currentBeat >= 0 && currentBeat % ENEMY_CONFIG.shield.spawnIntervalBeats === 0 && currentBeat !== this.lastRightSpawnBeat) {
      if (currentBar < ENEMY_CONFIG.boss.spawnBar || currentBar >= ENEMY_CONFIG.boss.spawnBar + 4) {
        this.spawnEnemy('shield', 'right', currentTime);
        this.lastRightSpawnBeat = currentBeat;
      }
    }

    if (currentBar === ENEMY_CONFIG.boss.spawnBar && !this.bossSpawned) {
      this.spawnEnemy('boss', 'left', currentTime);
      this.bossSpawned = true;
    }
  }

  private spawnEnemy(type: EnemyType, track: TrackType, currentTime: number): void {
    const config = ENEMY_CONFIG[type];
    const canvasHeight = GAME_CONFIG.canvasHeight;
    const centerY = canvasHeight / 2;

    let startY: number;
    if (type === 'boss') {
      startY = canvasHeight * 0.3;
    } else {
      startY = track === 'left' ? canvasHeight * 0.35 : canvasHeight * 0.65;
    }

    const enemy: Enemy = {
      id: `enemy-${this.enemyIdCounter++}`,
      type,
      hp: config.hp,
      maxHp: config.hp,
      track,
      spawnTime: currentTime,
      y: startY,
      targetY: centerY,
      alive: true,
      hitCount: 0,
    };

    this.enemies.push(enemy);
  }

  private updateEnemyPositions(currentTime: number, deltaTime: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      if (enemy.type === 'boss') {
        const timeSinceSpawn = currentTime - enemy.spawnTime;
        const amplitude = GAME_CONFIG.canvasHeight * 0.2;
        const frequency = 0.002;
        const centerY = GAME_CONFIG.canvasHeight / 2;
        enemy.y = centerY + Math.sin(timeSinceSpawn * frequency) * amplitude;
      } else {
        const moveSpeed = 30;
        const dy = enemy.targetY - enemy.y;
        if (Math.abs(dy) > 1) {
          enemy.y += Math.sign(dy) * moveSpeed * (deltaTime / 1000);
        }
      }
    }
  }

  private cleanupDeadEnemies(currentTime: number): void {
    this.enemies = this.enemies.filter((enemy) => {
      if (!enemy.alive && enemy.deathTime) {
        return currentTime - enemy.deathTime < 300;
      }
      return true;
    });
  }

  handleHit(judgment: JudgmentType, track: TrackType, currentTime: number): { hit: boolean; enemyId?: string; killed?: boolean } {
    this.consecutiveMisses = 0;

    if (judgment === 'miss') {
      return { hit: false };
    }

    const targetEnemy = this.findTargetEnemy(track);
    if (!targetEnemy) {
      return { hit: false };
    }

    const damage = judgment === 'perfect' ? 40 : 25;
    targetEnemy.hp -= damage;
    targetEnemy.hitCount++;

    const config = ENEMY_CONFIG[targetEnemy.type];
    if (targetEnemy.hp <= 0 || targetEnemy.hitCount >= config.hitsToKill) {
      targetEnemy.alive = false;
      targetEnemy.deathTime = currentTime;
      return { hit: true, enemyId: targetEnemy.id, killed: true };
    }

    return { hit: true, enemyId: targetEnemy.id, killed: false };
  }

  private findTargetEnemy(track: TrackType): Enemy | null {
    const aliveEnemies = this.enemies.filter((e) => e.alive && e.track === track);
    if (aliveEnemies.length === 0) return null;

    const centerY = GAME_CONFIG.judgmentLineY;
    let closest: Enemy | null = null;
    let minDist = Infinity;

    for (const enemy of aliveEnemies) {
      const dist = Math.abs(enemy.y - centerY);
      if (dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }

    return closest;
  }

  handleMiss(): boolean {
    this.consecutiveMisses++;
    
    if (this.consecutiveMisses >= this.missDamageThreshold) {
      this.playerHp = Math.max(0, this.playerHp - this.missDamage);
      this.consecutiveMisses = 0;
      return true;
    }
    
    return false;
  }

  getEnemies(): Enemy[] {
    return [...this.enemies];
  }

  getPlayerHp(): number {
    return this.playerHp;
  }

  getMaxPlayerHp(): number {
    return this.maxPlayerHp;
  }

  getConsecutiveMisses(): number {
    return this.consecutiveMisses;
  }

  isPlayerDead(): boolean {
    return this.playerHp <= 0;
  }

  getAliveEnemyCount(track?: TrackType): number {
    return this.enemies.filter((e) => e.alive && (track ? e.track === track : true)).length;
  }

  hasBoss(): boolean {
    return this.enemies.some((e) => e.type === 'boss' && e.alive);
  }
}
