import { Ship, type ShipConfig, type Faction, type Formation } from './Ship';
import type { Projectile } from './Weapon';

export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface BattleReport {
  winner: Faction | 'draw';
  duration: number;
  playerKills: number;
  enemyKills: number;
  playerRemaining: number;
  enemyRemaining: number;
  shipStats: Array<{
    id: string;
    name: string;
    faction: Faction;
    kills: number;
    damageDealt: number;
    survived: boolean;
  }>;
}

export interface FrameState {
  timestamp: number;
  ships: Array<ReturnType<Ship['toJSON']>>;
  projectiles: Projectile[];
  explosions: ExplosionParticle[];
}

export interface EngineEvents {
  onBattleStart?: () => void;
  onBattleEnd?: (report: BattleReport) => void;
  onShipDestroyed?: (ship: Ship, killer: Ship | null) => void;
  onFrame?: (state: FrameState) => void;
}

export class GameEngine {
  private ships: Ship[] = [];
  private projectiles: Projectile[] = [];
  private explosions: ExplosionParticle[] = [];
  private frameHistory: FrameState[] = [];
  private damageMap: Map<string, number> = new Map();

  private isRunning = false;
  private isPaused = false;
  private isReplaying = false;
  private battleStartTime = 0;
  private battleDuration = 0;
  private lastFrameTime = 0;
  private animationFrameId: number | null = null;
  private replayIndex = 0;
  private replaySpeed = 1;

  private readonly maxHistoryFrames = 10000;

  private events: EngineEvents = {};
  private battlefieldWidth = 900;
  private battlefieldHeight = 600;

  constructor(battlefieldWidth = 900, battlefieldHeight = 600) {
    this.battlefieldWidth = battlefieldWidth;
    this.battlefieldHeight = battlefieldHeight;
  }

  public setEvents(events: EngineEvents): void {
    this.events = events;
  }

  public initFleet(playerConfigs: ShipConfig[], enemyConfigs: ShipConfig[]): void {
    this.ships = [];
    this.projectiles = [];
    this.explosions = [];
    this.frameHistory = [];
    this.damageMap.clear();

    playerConfigs.forEach(config => {
      const ship = new Ship(config);
      this.ships.push(ship);
      this.damageMap.set(ship.state.id, 0);
    });

    enemyConfigs.forEach(config => {
      const ship = new Ship(config);
      this.ships.push(ship);
      this.damageMap.set(ship.state.id, 0);
    });
  }

  public applyFormation(faction: Faction, formation: Formation): void {
    const factionShips = this.ships.filter(s => s.state.faction === faction && !s.state.isDestroyed);
    if (factionShips.length === 0) return;

    const centerX = faction === 'player' ? 150 : this.battlefieldWidth - 150;
    const centerY = this.battlefieldHeight / 2;
    const spacing = 50;

    factionShips.forEach((ship, index) => {
      let x = centerX;
      let y = centerY;

      switch (formation) {
        case 'line':
          y = centerY - ((factionShips.length - 1) * spacing) / 2 + index * spacing;
          x = centerX;
          break;
        case 'circle':
          const angle = (index / factionShips.length) * Math.PI * 2;
          const radius = Math.min(80, factionShips.length * 15);
          x = centerX + Math.cos(angle) * radius;
          y = centerY + Math.sin(angle) * radius;
          break;
        case 'triangle':
          const row = Math.floor((-1 + Math.sqrt(1 + 8 * index)) / 2);
          const col = index - row * (row + 1) / 2;
          x = centerX + row * (spacing * 0.8);
          y = centerY - (row * spacing) / 2 + col * spacing;
          if (faction === 'enemy') {
            x = this.battlefieldWidth - x;
          }
          break;
      }

      x = Math.max(30, Math.min(this.battlefieldWidth - 30, x));
      y = Math.max(30, Math.min(this.battlefieldHeight - 30, y));

      ship.setPosition(x, y);
      ship.setTarget(x, y);
    });
  }

  public startBattle(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.isReplaying = false;
    this.battleStartTime = performance.now();
    this.battleDuration = 0;
    this.frameHistory = [];
    this.lastFrameTime = performance.now();

    this.events.onBattleStart?.();
    this.gameLoop();
  }

  public pauseBattle(): void {
    this.isPaused = true;
  }

  public resumeBattle(): void {
    if (!this.isRunning || this.isReplaying) return;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
  }

  public stopBattle(): BattleReport {
    this.isRunning = false;
    this.isPaused = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    return this.generateReport();
  }

  public reset(): void {
    this.stopBattle();
    this.ships = [];
    this.projectiles = [];
    this.explosions = [];
    this.frameHistory = [];
    this.damageMap.clear();
    this.battleDuration = 0;
    this.isReplaying = false;
    this.replayIndex = 0;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getIsReplaying(): boolean {
    return this.isReplaying;
  }

  public getShips(): Ship[] {
    return this.ships;
  }

  public getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  public getExplosions(): ExplosionParticle[] {
    return this.explosions;
  }

  public getFrameHistory(): FrameState[] {
    return this.frameHistory;
  }

  public updateShipPosition(shipId: string, x: number, y: number): void {
    const ship = this.ships.find(s => s.state.id === shipId);
    if (ship) {
      ship.setPosition(x, y);
      ship.setTarget(x, y);
    }
  }

  public updateShipHealth(shipId: string, health: number): void {
    const ship = this.ships.find(s => s.state.id === shipId);
    if (ship) {
      ship.setHealth(health);
    }
  }

  public updateShipShield(shipId: string, shield: number): void {
    const ship = this.ships.find(s => s.state.id === shipId);
    if (ship) {
      ship.setShield(shield);
    }
  }

  public startReplay(): void {
    if (this.frameHistory.length === 0) return;
    this.stopBattle();
    this.isReplaying = true;
    this.replayIndex = 0;
    this.replayLoop();
  }

  public stopReplay(): void {
    this.isReplaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public stepReplay(forward: boolean): void {
    if (!this.isReplaying || this.frameHistory.length === 0) return;

    const step = forward ? 1 : -1;
    this.replayIndex = Math.max(0, Math.min(this.frameHistory.length - 1, this.replayIndex + step));
    this.applyFrameState(this.frameHistory[this.replayIndex]);
  }

  public seekReplay(time: number): void {
    if (!this.isReplaying || this.frameHistory.length === 0) return;

    const targetIndex = Math.floor(time / 100);
    this.replayIndex = Math.max(0, Math.min(this.frameHistory.length - 1, targetIndex));
    this.applyFrameState(this.frameHistory[this.replayIndex]);
  }

  public getReplayTime(): number {
    return this.replayIndex * 100;
  }

  public getReplayDuration(): number {
    return this.frameHistory.length * 100;
  }

  public setReplaySpeed(speed: number): void {
    this.replaySpeed = Math.max(0.25, Math.min(4, speed));
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    if (!this.isPaused) {
      this.update(deltaTime);
      this.battleDuration = now - this.battleStartTime;
      this.recordFrame();
      this.checkBattleEnd();
    }

    this.events.onFrame?.(this.getCurrentFrameState());
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private replayLoop = (): void => {
    if (!this.isReplaying) return;

    if (this.replayIndex < this.frameHistory.length - 1) {
      this.replayIndex = Math.min(
        this.frameHistory.length - 1,
        this.replayIndex + this.replaySpeed
      );
      this.applyFrameState(this.frameHistory[Math.floor(this.replayIndex)]);
      this.events.onFrame?.(this.frameHistory[Math.floor(this.replayIndex)]);
    }

    this.animationFrameId = requestAnimationFrame(this.replayLoop);
  };

  private update(deltaTime: number): void {
    this.updateAI(deltaTime);
    this.updateShips(deltaTime);
    this.updateProjectiles(deltaTime);
    this.updateExplosions(deltaTime);
    this.checkCollisions();
  }

  private updateAI(deltaTime: number): void {
    const aliveShips = this.ships.filter(s => !s.state.isDestroyed);
    const playerShips = aliveShips.filter(s => s.state.faction === 'player');
    const enemyShips = aliveShips.filter(s => s.state.faction === 'enemy');

    aliveShips.forEach(ship => {
      const enemies = ship.state.faction === 'player' ? enemyShips : playerShips;
      if (enemies.length === 0) return;

      let nearestEnemy: Ship | null = null;
      let nearestDistance = Infinity;

      for (const enemy of enemies) {
        const distance = ship.getDistanceTo({ x: enemy.state.x, y: enemy.state.y });
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = enemy;
        }
      }

      if (nearestEnemy) {
        const weaponRange = ship.state.weapon.state.range;
        const enemy = nearestEnemy;

        if (nearestDistance > weaponRange * 0.8) {
          ship.setTarget(enemy.state.x, enemy.state.y);
        } else if (nearestDistance < weaponRange * 0.4) {
          const dx = ship.state.x - enemy.state.x;
          const dy = ship.state.y - enemy.state.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          ship.setTarget(
            ship.state.x + (dx / dist) * 50,
            ship.state.y + (dy / dist) * 50
          );
        } else {
          ship.setTarget(ship.state.x, ship.state.y);
        }

        if (nearestDistance <= weaponRange && ship.canFire()) {
          const projectile = ship.fire({ x: enemy.state.x, y: enemy.state.y });
          if (projectile) {
            this.projectiles.push(projectile);
          }
        }
      }

      ship.updateWeapon(deltaTime);
    });
  }

  private updateShips(deltaTime: number): void {
    this.ships.forEach(ship => {
      ship.move(deltaTime);

      ship.state.x = Math.max(15, Math.min(this.battlefieldWidth - 15, ship.state.x));
      ship.state.y = Math.max(15, Math.min(this.battlefieldHeight - 15, ship.state.y));
    });
  }

  private updateProjectiles(deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx * deltaTime;
      proj.y += proj.vy * deltaTime;
      proj.life -= deltaTime;

      if (proj.life <= 0 ||
          proj.x < 0 || proj.x > this.battlefieldWidth ||
          proj.y < 0 || proj.y > this.battlefieldHeight) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateExplosions(deltaTime: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.x += exp.vx * deltaTime;
      exp.y += exp.vy * deltaTime;
      exp.life -= deltaTime;
      exp.vx *= 0.98;
      exp.vy *= 0.98;

      if (exp.life <= 0) {
        this.explosions.splice(i, 1);
      }
    }
  }

  private checkCollisions(): void {
    const aliveShips = this.ships.filter(s => !s.state.isDestroyed);

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      for (const ship of aliveShips) {
        if (ship.state.faction === proj.faction || ship.state.isDestroyed) continue;

        const dx = proj.x - ship.state.x;
        const dy = proj.y - ship.state.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 15) {
          const shooter = this.ships.find(s =>
            s.state.weapon.state.faction === proj.faction &&
            s.state.weapon.state.damage === proj.damage
          );

          const currentDamage = this.damageMap.get(shooter?.state.id || '') || 0;
          this.damageMap.set(shooter?.state.id || '', currentDamage + proj.damage);

          const wasDestroyed = ship.takeDamage(proj.damage);

          if (wasDestroyed) {
            this.createExplosion(ship.state.x, ship.state.y);
            if (shooter) {
              shooter.addKill();
            }
            this.events.onShipDestroyed?.(ship, shooter || null);
          }

          this.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }

  private createExplosion(x: number, y: number): void {
    const particleCount = 15;
    const duration = 0.5;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;

      this.explosions.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: duration,
        maxLife: duration,
        color: '#ffaa00',
        size: 2 + Math.random() * 3
      });
    }
  }

  private checkBattleEnd(): void {
    const playerAlive = this.ships.some(s => s.state.faction === 'player' && !s.state.isDestroyed);
    const enemyAlive = this.ships.some(s => s.state.faction === 'enemy' && !s.state.isDestroyed);

    if (!playerAlive || !enemyAlive) {
      const report = this.stopBattle();
      this.events.onBattleEnd?.(report);
    }
  }

  private recordFrame(): void {
    if (this.frameHistory.length >= this.maxHistoryFrames) {
      this.frameHistory.shift();
    }

    const state = this.getCurrentFrameState();
    this.frameHistory.push(state);
  }

  private getCurrentFrameState(): FrameState {
    return {
      timestamp: this.battleDuration,
      ships: this.ships.map(s => s.toJSON()),
      projectiles: [...this.projectiles],
      explosions: [...this.explosions]
    };
  }

  private applyFrameState(state: FrameState): void {
    this.ships = state.ships.map(s => Ship.fromJSON(s));
    this.projectiles = [...state.projectiles];
    this.explosions = [...state.explosions];
  }

  private generateReport(): BattleReport {
    const playerShips = this.ships.filter(s => s.state.faction === 'player');
    const enemyShips = this.ships.filter(s => s.state.faction === 'enemy');

    const playerAlive = playerShips.filter(s => !s.state.isDestroyed).length;
    const enemyAlive = enemyShips.filter(s => !s.state.isDestroyed).length;

    let winner: Faction | 'draw' = 'draw';
    if (playerAlive > 0 && enemyAlive === 0) winner = 'player';
    if (enemyAlive > 0 && playerAlive === 0) winner = 'enemy';

    const playerKills = playerShips.reduce((sum, s) => sum + s.state.kills, 0);
    const enemyKills = enemyShips.reduce((sum, s) => sum + s.state.kills, 0);

    const shipStats = this.ships.map(s => ({
      id: s.state.id,
      name: s.state.name,
      faction: s.state.faction,
      kills: s.state.kills,
      damageDealt: this.damageMap.get(s.state.id) || 0,
      survived: !s.state.isDestroyed
    }));

    return {
      winner,
      duration: this.battleDuration,
      playerKills,
      enemyKills,
      playerRemaining: playerAlive,
      enemyRemaining: enemyAlive,
      shipStats
    };
  }
}
