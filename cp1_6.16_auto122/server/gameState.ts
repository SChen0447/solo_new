import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  PlayerSide,
  Tower,
  Monster,
  Particle,
  TowerType,
  MonsterType,
  TOWER_CONFIGS,
  MONSTER_CONFIGS,
  UPGRADE_MULTIPLIER,
  GRID_SIZE,
  BASE_SIZE,
  INITIAL_HP,
  INITIAL_RESOURCES,
  RESOURCE_PER_SECOND,
  KILL_REWARD,
  TOWER_DESTROY_REWARD,
  MONSTER_BASE_DAMAGE,
  AUTO_SPAWN_INTERVAL,
  REBUILD_DELAY,
  Position,
  PlaceTowerAction,
  UpgradeTowerAction,
  SpawnMonsterAction,
  cellKey,
  isBaseArea,
  getBaseCenter,
} from '../shared/types.js';

const TOWER_HP: Record<TowerType, number> = {
  [TowerType.Arrow]: 30,
  [TowerType.Cannon]: 40,
  [TowerType.Freeze]: 25,
};

const MONSTER_ATTACK_COOLDOWN = 1000;

export class GameStateManager {
  state: GameState;
  private autoSpawnTimers: Record<PlayerSide, number> = { [PlayerSide.Left]: 0, [PlayerSide.Right]: 0 };
  private resourceTimers: Record<PlayerSide, number> = { [PlayerSide.Left]: 0, [PlayerSide.Right]: 0 };
  private onUpdate: (state: GameState) => void;

  constructor(onUpdate: (state: GameState) => void) {
    this.onUpdate = onUpdate;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      players: {
        [PlayerSide.Left]: { side: PlayerSide.Left, hp: INITIAL_HP, resources: INITIAL_RESOURCES },
        [PlayerSide.Right]: { side: PlayerSide.Right, hp: INITIAL_HP, resources: INITIAL_RESOURCES },
      },
      towers: [],
      monsters: [],
      particles: [],
      gameOver: false,
      winner: null,
      lastUpdateTime: Date.now(),
    };
  }

  reset() {
    this.state = this.createInitialState();
    this.autoSpawnTimers = { [PlayerSide.Left]: 0, [PlayerSide.Right]: 0 };
    this.resourceTimers = { [PlayerSide.Left]: 0, [PlayerSide.Right]: 0 };
    this.onUpdate(this.state);
  }

  update(deltaTime: number) {
    if (this.state.gameOver) return;

    const now = Date.now();

    for (const side of [PlayerSide.Left, PlayerSide.Right]) {
      this.resourceTimers[side] += deltaTime;
      if (this.resourceTimers[side] >= 1000) {
        this.state.players[side].resources += RESOURCE_PER_SECOND;
        this.resourceTimers[side] -= 1000;
      }

      this.autoSpawnTimers[side] += deltaTime;
      if (this.autoSpawnTimers[side] >= AUTO_SPAWN_INTERVAL) {
        this.spawnMonsterInternal(side, MonsterType.Basic);
        this.autoSpawnTimers[side] -= AUTO_SPAWN_INTERVAL;
      }
    }

    this.updateTowers(now);
    this.updateMonsters(deltaTime, now);
    this.updateParticles(deltaTime);
    this.checkRebuildTowers(now);
    this.checkGameOver();

    this.state.lastUpdateTime = now;
    this.onUpdate(this.state);
  }

  placeTower(side: PlayerSide, action: PlaceTowerAction): boolean {
    const player = this.state.players[side];
    const config = TOWER_CONFIGS[action.towerType];

    if (player.resources < config.cost) return false;
    if (action.gridX < 0 || action.gridX >= GRID_SIZE || action.gridY < 0 || action.gridY >= GRID_SIZE) return false;

    if (isBaseArea(PlayerSide.Left, action.gridX, action.gridY) || isBaseArea(PlayerSide.Right, action.gridX, action.gridY)) return false;

    const occupied = this.state.towers.some(
      t => t.gridX === action.gridX && t.gridY === action.gridY && !t.destroyed
    );
    if (occupied) return false;

    player.resources -= config.cost;

    const tower: Tower = {
      id: uuidv4(),
      type: action.towerType,
      gridX: action.gridX,
      gridY: action.gridY,
      owner: side,
      level: 1,
      lastAttackTime: 0,
      destroyed: false,
      destroyTime: 0,
      hp: TOWER_HP[action.towerType],
      maxHp: TOWER_HP[action.towerType],
    };

    this.state.towers.push(tower);
    return true;
  }

  upgradeTower(side: PlayerSide, action: UpgradeTowerAction): boolean {
    const tower = this.state.towers.find(t => t.id === action.towerId && t.owner === side);
    if (!tower || tower.destroyed || tower.level >= 2) return false;

    const player = this.state.players[side];
    const config = TOWER_CONFIGS[tower.type];
    const upgradeCost = Math.floor(config.cost * 0.6);

    if (player.resources < upgradeCost) return false;

    player.resources -= upgradeCost;
    tower.level = 2;
    tower.hp = Math.floor(tower.hp * UPGRADE_MULTIPLIER);
    tower.maxHp = Math.floor(tower.maxHp * UPGRADE_MULTIPLIER);
    return true;
  }

  spawnMonster(side: PlayerSide, action: SpawnMonsterAction): boolean {
    const player = this.state.players[side];
    const config = MONSTER_CONFIGS[action.monsterType];

    if (action.monsterType !== MonsterType.Basic && player.resources < config.cost) return false;

    if (action.monsterType !== MonsterType.Basic) {
      player.resources -= config.cost;
    }

    this.spawnMonsterInternal(side, action.monsterType);
    return true;
  }

  private spawnMonsterInternal(side: PlayerSide, type: MonsterType) {
    const config = MONSTER_CONFIGS[type];
    const baseCenter = getBaseCenter(side);
    const startX = side === PlayerSide.Left ? 0.5 : GRID_SIZE - 0.5;
    const startY = baseCenter.y + (Math.random() - 0.5) * 1.5;

    const enemySide = side === PlayerSide.Left ? PlayerSide.Right : PlayerSide.Left;
    const targetBase = getBaseCenter(enemySide);
    const path = this.calculatePath(startX, startY, targetBase.x + 0.5, targetBase.y, side);

    const monster: Monster = {
      id: uuidv4(),
      type,
      owner: side,
      x: startX,
      y: startY,
      hp: config.hp,
      maxHp: config.hp,
      speed: config.speed,
      baseSpeed: config.speed,
      slowUntil: 0,
      pathIndex: 0,
      path,
      targetBase: { x: targetBase.x + 0.5, y: targetBase.y },
      attackCooldown: 0,
      attackingTowerId: null,
    };

    this.state.monsters.push(monster);
  }

  private calculatePath(startX: number, startY: number, endX: number, endY: number, side: PlayerSide): Position[] {
    const path: Position[] = [];
    const steps = 20;
    const dx = endX - startX;
    const dy = endY - startY;
    const midX = (startX + endX) / 2;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let x: number;
      let y: number;

      if (t < 0.3) {
        const lt = t / 0.3;
        x = startX + (midX - startX) * lt;
        y = startY;
      } else if (t < 0.7) {
        const lt = (t - 0.3) / 0.4;
        x = midX;
        y = startY + (endY - startY) * lt;
      } else {
        const lt = (t - 0.7) / 0.3;
        x = midX + (endX - midX) * lt;
        y = endY;
      }

      path.push({ x, y });
    }

    return path;
  }

  private updateTowers(now: number) {
    for (const tower of this.state.towers) {
      if (tower.destroyed) continue;

      const config = TOWER_CONFIGS[tower.type];
      const cooldown = tower.level === 2 ? config.cooldown / UPGRADE_MULTIPLIER : config.cooldown;

      if (now - tower.lastAttackTime < cooldown) continue;

      const range = config.range;
      const towerCenterX = tower.gridX + 0.5;
      const towerCenterY = tower.gridY + 0.5;

      let target: Monster | null = null;
      let minDist = Infinity;

      for (const monster of this.state.monsters) {
        if (monster.owner === tower.owner) continue;
        const dx = monster.x - towerCenterX;
        const dy = monster.y - towerCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= range && dist < minDist) {
          minDist = dist;
          target = monster;
        }
      }

      if (target) {
        tower.lastAttackTime = now;
        const damage = tower.level === 2 ? Math.floor(config.damage * UPGRADE_MULTIPLIER) : config.damage;
        target.hp -= damage;

        if (tower.type === TowerType.Freeze) {
          target.slowUntil = now + 2000;
        }

        this.state.particles.push({
          x: towerCenterX,
          y: towerCenterY,
          targetX: target.x,
          targetY: target.y,
          progress: 0,
          type: tower.type,
        });

        if (target.hp <= 0) {
          this.state.players[tower.owner].resources += KILL_REWARD;
          this.state.monsters = this.state.monsters.filter(m => m.id !== target.id);
        }
      }
    }
  }

  private updateMonsters(deltaTime: number, now: number) {
    const toRemove: string[] = [];

    for (const monster of this.state.monsters) {
      const effectiveSpeed = now < monster.slowUntil
        ? monster.baseSpeed * 0.5
        : monster.baseSpeed;

      monster.speed = effectiveSpeed;

      if (monster.attackingTowerId) {
        const tower = this.state.towers.find(t => t.id === monster.attackingTowerId);
        if (!tower || tower.destroyed) {
          monster.attackingTowerId = null;
          monster.attackCooldown = 0;
          continue;
        }

        monster.attackCooldown -= deltaTime;
        if (monster.attackCooldown <= 0) {
          tower.hp -= 5;
          monster.attackCooldown = MONSTER_ATTACK_COOLDOWN;

          if (tower.hp <= 0) {
            tower.destroyed = true;
            tower.destroyTime = now;
            monster.attackingTowerId = null;
            this.state.players[monster.owner].resources += TOWER_DESTROY_REWARD;
          }
        }
        continue;
      }

      const moveAmount = (effectiveSpeed * deltaTime) / 1000;

      while (moveAmount > 0 && monster.pathIndex < monster.path.length - 1) {
        const current = monster.path[monster.pathIndex];
        const next = monster.path[monster.pathIndex + 1];
        const dx = next.x - monster.x;
        const dy = next.y - monster.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= moveAmount) {
          monster.x = next.x;
          monster.y = next.y;
          monster.pathIndex++;
          moveAmount -= dist;
        } else {
          const ratio = moveAmount / dist;
          monster.x += dx * ratio;
          monster.y += dy * ratio;
          break;
        }
      }

      const towerInRange = this.findTowerInPath(monster);
      if (towerInRange) {
        monster.attackingTowerId = towerInRange.id;
        monster.attackCooldown = MONSTER_ATTACK_COOLDOWN;
        continue;
      }

      const enemySide = monster.owner === PlayerSide.Left ? PlayerSide.Right : PlayerSide.Left;
      const targetBase = getBaseCenter(enemySide);
      const distToBase = Math.sqrt(
        Math.pow(monster.x - (targetBase.x + 0.5), 2) +
        Math.pow(monster.y - targetBase.y, 2)
      );

      if (distToBase < 1.5) {
        this.state.players[enemySide].hp -= MONSTER_BASE_DAMAGE;
        toRemove.push(monster.id);
      }
    }

    this.state.monsters = this.state.monsters.filter(m => !toRemove.includes(m.id));
  }

  private findTowerInPath(monster: Monster): Tower | null {
    const checkDist = 0.8;
    for (const tower of this.state.towers) {
      if (tower.destroyed || tower.owner === monster.owner) continue;
      const centerX = tower.gridX + 0.5;
      const centerY = tower.gridY + 0.5;
      const dx = monster.x - centerX;
      const dy = monster.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < checkDist) {
        return tower;
      }
    }
    return null;
  }

  private checkRebuildTowers(now: number) {
    for (const tower of this.state.towers) {
      if (tower.destroyed && now - tower.destroyTime >= REBUILD_DELAY) {
        tower.destroyed = false;
        tower.hp = Math.floor(tower.maxHp * 0.5);
        tower.destroyTime = 0;
      }
    }
  }

  private updateParticles(deltaTime: number) {
    this.state.particles = this.state.particles.filter(p => {
      p.progress += deltaTime / 300;
      return p.progress < 1;
    });
  }

  private checkGameOver() {
    for (const side of [PlayerSide.Left, PlayerSide.Right] as PlayerSide[]) {
      if (this.state.players[side].hp <= 0) {
        this.state.gameOver = true;
        this.state.winner = side === PlayerSide.Left ? PlayerSide.Right : PlayerSide.Left;
        break;
      }
    }
  }

  getTowerUpgradeCost(tower: Tower): number {
    return Math.floor(TOWER_CONFIGS[tower.type].cost * 0.6);
  }
}
