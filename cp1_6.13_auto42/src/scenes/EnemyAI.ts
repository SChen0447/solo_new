import Phaser from 'phaser';

export interface ShipState {
  id: number;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  isAlive: boolean;
  team: 'player' | 'enemy';
  isMothership: boolean;
  targetId: number | null;
}

export interface BattlefieldState {
  playerShips: ShipState[];
  enemyShips: ShipState[];
  playerMothership: ShipState | null;
  enemyMothership: ShipState | null;
}

export type AIDecisionType = 'move' | 'attack' | 'retreat' | 'flank' | 'hold';

export interface AIDecision {
  type: AIDecisionType;
  targetPosition?: { x: number; y: number };
  targetShipId?: number;
  affectedShipIds: number[];
  timestamp: number;
  priority: number;
}

export class EnemyAI {
  private scene: Phaser.Scene;
  private battlefieldWidth: number;
  private battlefieldHeight: number;
  private baseDecisionInterval: number;
  private lastDecisionTime: number;
  private lastDamageTime: number;
  private damageCooldown: number;
  private decisionQueue: AIDecision[];
  private lastPlayerShipCount: number;
  private lastEnemyShipCount: number;

  constructor(
    scene: Phaser.Scene,
    battlefieldWidth: number,
    battlefieldHeight: number
  ) {
    this.scene = scene;
    this.battlefieldWidth = battlefieldWidth;
    this.battlefieldHeight = battlefieldHeight;
    this.baseDecisionInterval = 3000;
    this.lastDecisionTime = 0;
    this.lastDamageTime = 0;
    this.damageCooldown = 800;
    this.decisionQueue = [];
    this.lastPlayerShipCount = 5;
    this.lastEnemyShipCount = 5;
  }

  getAdaptiveDecisionInterval(state: BattlefieldState): number {
    const aliveEnemyShips = state.enemyShips.filter(s => s.isAlive).length;
    const alivePlayerShips = state.playerShips.filter(s => s.isAlive).length;

    const forceRatio = aliveEnemyShips / Math.max(1, alivePlayerShips);
    const anyUnderAttack = state.enemyShips.some(s => s.isAlive && s.health < s.maxHealth * 0.9);
    const lowHealth = state.enemyShips.some(s => s.isAlive && s.health < s.maxHealth * 0.4);

    let interval = this.baseDecisionInterval;

    if (forceRatio < 1.0) {
      interval *= 0.55;
    } else if (forceRatio < 1.3) {
      interval *= 0.75;
    }

    if (anyUnderAttack) {
      interval *= 0.65;
    }

    if (lowHealth) {
      interval *= 0.45;
    }

    return Math.max(interval, 600);
  }

  makeDecision(state: BattlefieldState, currentTime: number): AIDecision[] {
    const decisions: AIDecision[] = [];
    const aliveEnemyShips = state.enemyShips.filter(s => s.isAlive && !s.isMothership);
    const alivePlayerShips = state.playerShips.filter(s => s.isAlive);

    if (aliveEnemyShips.length === 0 || alivePlayerShips.length === 0) {
      return decisions;
    }

    const adaptiveInterval = this.getAdaptiveDecisionInterval(state);
    const timeSinceLastDecision = currentTime - this.lastDecisionTime;

    const anyShipDamaged = this.detectNewDamage(state);
    const shouldReactToDamage = anyShipDamaged && (currentTime - this.lastDamageTime) > this.damageCooldown;

    if (shouldReactToDamage) {
      this.lastDamageTime = currentTime;
      const emergencyDecision = this.generateEmergencyDecision(state, aliveEnemyShips, alivePlayerShips, currentTime);
      if (emergencyDecision) {
        decisions.push(emergencyDecision);
      }
    }

    if (timeSinceLastDecision >= adaptiveInterval || shouldReactToDamage) {
      this.lastDecisionTime = currentTime;
      this.updateShipCount(state);

      const periodicDecision = this.generatePeriodicDecision(state, aliveEnemyShips, alivePlayerShips, currentTime);
      if (periodicDecision) {
        decisions.push(periodicDecision);
      }
    }

    while (this.decisionQueue.length > 0) {
      const queued = this.decisionQueue.shift();
      if (queued) {
        decisions.push(queued);
      }
    }

    return decisions;
  }

  private detectNewDamage(state: BattlefieldState): boolean {
    let damaged = false;
    for (const ship of state.enemyShips) {
      if (ship.isAlive && ship.health < ship.maxHealth) {
        const prevHealth = (ship as unknown as { _prevHealth?: number })._prevHealth ?? ship.maxHealth;
        if (ship.health < prevHealth - 15) {
          damaged = true;
        }
        (ship as unknown as { _prevHealth?: number })._prevHealth = ship.health;
      }
    }

    const currentEnemyCount = state.enemyShips.filter(s => s.isAlive).length;
    if (currentEnemyCount < this.lastEnemyShipCount) {
      damaged = true;
    }

    return damaged;
  }

  private updateShipCount(state: BattlefieldState): void {
    this.lastPlayerShipCount = state.playerShips.filter(s => s.isAlive).length;
    this.lastEnemyShipCount = state.enemyShips.filter(s => s.isAlive).length;
  }

  private generateEmergencyDecision(
    state: BattlefieldState,
    aliveEnemy: ShipState[],
    alivePlayer: ShipState[],
    time: number
  ): AIDecision | null {
    const criticallyLow = aliveEnemy.filter(s => s.health < s.maxHealth * 0.3);
    const avgEnemyHealth = aliveEnemy.reduce((a, s) => a + s.health, 0) / aliveEnemy.length;
    const avgPlayerHealth = alivePlayer.reduce((a, s) => a + s.health, 0) / alivePlayer.length;

    if (criticallyLow.length > 0) {
      const centerX = this.battlefieldWidth * 0.82;
      const centerY = this.battlefieldHeight * 0.15;
      const angle = Phaser.Math.FloatBetween(-0.4, 0.4);
      const dist = 80;

      return {
        type: 'retreat',
        targetPosition: {
          x: centerX + Math.cos(angle) * dist,
          y: centerY + Math.sin(angle) * dist
        },
        affectedShipIds: criticallyLow.map(s => s.id),
        timestamp: time,
        priority: 100
      };
    }

    if (avgEnemyHealth < avgPlayerHealth * 0.7 && aliveEnemy.length <= alivePlayer.length) {
      const weakestPlayer = [...alivePlayer].sort((a, b) => a.health - b.health)[0];
      if (weakestPlayer && state.enemyMothership?.isAlive) {
        return {
          type: 'attack',
          targetShipId: weakestPlayer.id,
          affectedShipIds: aliveEnemy.slice(0, Math.ceil(aliveEnemy.length * 0.6)).map(s => s.id),
          timestamp: time,
          priority: 90
        };
      }
    }

    const nearestPlayer = this.findNearestEnemy(aliveEnemy[0], alivePlayer);
    const centerEnemy = this.calculateCenter(aliveEnemy);
    const dist = nearestPlayer
      ? Phaser.Math.Distance.Between(centerEnemy.x, centerEnemy.y, nearestPlayer.x, nearestPlayer.y)
      : Infinity;

    if (dist < 180 && avgEnemyHealth < avgPlayerHealth) {
      const flank = {
        x: centerEnemy.x + Phaser.Math.FloatBetween(-120, 120),
        y: Math.max(60, centerEnemy.y - 140)
      };
      return {
        type: 'flank',
        targetPosition: flank,
        affectedShipIds: aliveEnemy.map(s => s.id),
        timestamp: time,
        priority: 80
      };
    }

    return null;
  }

  private generatePeriodicDecision(
    state: BattlefieldState,
    aliveEnemy: ShipState[],
    alivePlayer: ShipState[],
    time: number
  ): AIDecision | null {
    const forceRatio = aliveEnemy.length / Math.max(1, alivePlayer.length);
    const centerEnemy = this.calculateCenter(aliveEnemy);
    const centerPlayer = this.calculateCenter(alivePlayer);
    const distance = Phaser.Math.Distance.Between(centerEnemy.x, centerEnemy.y, centerPlayer.x, centerPlayer.y);

    const roll = Math.random();

    if (forceRatio >= 1.3 && distance > 220) {
      const target = this.findNearestEnemy(centerEnemy as unknown as ShipState, alivePlayer);
      return {
        type: 'attack',
        targetShipId: target?.id,
        targetPosition: target ? { x: target.x, y: target.y } : undefined,
        affectedShipIds: aliveEnemy.map(s => s.id),
        timestamp: time,
        priority: 70
      };
    }

    if (forceRatio >= 1.0 && roll < 0.55) {
      const weakest = [...alivePlayer].sort((a, b) => a.health - b.health)[0];
      const shipsToSend = aliveEnemy.slice(0, Math.min(3, aliveEnemy.length));
      return {
        type: 'attack',
        targetShipId: weakest?.id,
        affectedShipIds: shipsToSend.map(s => s.id),
        timestamp: time,
        priority: 65
      };
    }

    if (distance > 350) {
      const approachPoint = {
        x: centerEnemy.x + (centerPlayer.x - centerEnemy.x) * 0.5,
        y: centerEnemy.y + (centerPlayer.y - centerEnemy.y) * 0.5
      };
      return {
        type: 'move',
        targetPosition: approachPoint,
        affectedShipIds: aliveEnemy.map(s => s.id),
        timestamp: time,
        priority: 50
      };
    }

    if (roll < 0.35 && distance < 300) {
      const flankSide = Math.random() > 0.5 ? 1 : -1;
      const flankPoint = {
        x: Phaser.Math.Clamp(centerPlayer.x + flankSide * 180, 80, this.battlefieldWidth - 80),
        y: Phaser.Math.Clamp(centerPlayer.y - 80, 80, this.battlefieldHeight - 80)
      };
      const flankShips = aliveEnemy.filter((_, i) => i % 2 === 0);
      if (flankShips.length > 0) {
        return {
          type: 'flank',
          targetPosition: flankPoint,
          affectedShipIds: flankShips.map(s => s.id),
          timestamp: time,
          priority: 55
        };
      }
    }

    if (roll < 0.15) {
      const patrolX = Phaser.Math.FloatBetween(this.battlefieldWidth * 0.4, this.battlefieldWidth * 0.9);
      const patrolY = Phaser.Math.FloatBetween(60, this.battlefieldHeight * 0.55);
      return {
        type: 'move',
        targetPosition: { x: patrolX, y: patrolY },
        affectedShipIds: aliveEnemy.map(s => s.id),
        timestamp: time,
        priority: 30
      };
    }

    return null;
  }

  private findNearestEnemy(ship: ShipState, enemies: ShipState[]): ShipState | null {
    if (enemies.length === 0) return null;
    let nearest = enemies[0];
    let minDist = Phaser.Math.Distance.Between(ship.x, ship.y, nearest.x, nearest.y);
    for (const enemy of enemies) {
      const dist = Phaser.Math.Distance.Between(ship.x, ship.y, enemy.x, enemy.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }

  private calculateCenter(ships: ShipState[]): { x: number; y: number } {
    if (ships.length === 0) {
      return { x: this.battlefieldWidth / 2, y: this.battlefieldHeight / 2 };
    }
    let sumX = 0, sumY = 0;
    for (const ship of ships) {
      sumX += ship.x;
      sumY += ship.y;
    }
    return { x: sumX / ships.length, y: sumY / ships.length };
  }

  reset(): void {
    this.lastDecisionTime = 0;
    this.lastDamageTime = 0;
    this.decisionQueue.length = 0;
    this.lastPlayerShipCount = 5;
    this.lastEnemyShipCount = 5;
  }

  queueDecision(decision: AIDecision): void {
    this.decisionQueue.push(decision);
  }
}
