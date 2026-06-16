export type PlayerId = 1 | 2;
export type UnitType = 'mage' | 'summon';
export type SkillType = 'fire' | 'ice' | 'thunder' | 'wind';
export type ActionType = 'move' | 'attack' | 'skill' | 'death' | 'turnEnd' | 'manaRegen';

export interface Position {
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  owner: PlayerId;
  position: Position;
  maxHp: number;
  hp: number;
  attack: number;
  moveRange: number;
  attackRange: number;
  slowedTurns: number;
  isAlive: boolean;
}

export interface Mage extends Unit {
  type: 'mage';
  maxMana: number;
  mana: number;
  skillCooldowns: Record<SkillType, number>;
}

export interface IceZone {
  position: Position;
  turnsRemaining: number;
}

export interface GameState {
  board: (Unit | null)[][];
  iceZones: IceZone[];
  units: Unit[];
  turn: number;
  currentPlayer: PlayerId;
  winner: PlayerId | null;
}

export interface ActionRecord {
  type: ActionType;
  player: PlayerId;
  unitId?: string;
  from?: Position;
  to?: Position;
  skillType?: SkillType;
  targetId?: string;
  targetPosition?: Position;
  damage?: number;
  manaCost?: number;
  pushDistance?: number;
  collisionDamage?: number;
  timestamp: number;
}

export interface SaveData {
  state: GameState;
  actions: ActionRecord[];
}

export const BOARD_SIZE = 8;
export const CELL_SIZE = 40;

export const SKILL_CONFIG: Record<SkillType, {
  manaCost: number;
  cooldown: number;
  damage?: number;
  duration?: number;
  pushDistance?: number;
  collisionDamage?: number;
}> = {
  fire: { manaCost: 15, cooldown: 2, damage: 25 },
  ice: { manaCost: 10, cooldown: 2, duration: 2 },
  thunder: { manaCost: 20, cooldown: 2, damage: 35 },
  wind: { manaCost: 10, cooldown: 2, pushDistance: 3, collisionDamage: 5 },
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export class GameEngine {
  private state: GameState;
  private actions: ActionRecord[];

  constructor() {
    this.state = this.createInitialState();
    this.actions = [];
  }

  private createInitialState(): GameState {
    const board: (Unit | null)[][] = Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill(null));

    const units: Unit[] = [];

    const mage1: Mage = {
      id: generateId(),
      type: 'mage',
      owner: 1,
      position: { x: 0, y: 0 },
      maxHp: 100,
      hp: 100,
      attack: 10,
      moveRange: 2,
      attackRange: 1,
      slowedTurns: 0,
      isAlive: true,
      maxMana: 50,
      mana: 50,
      skillCooldowns: { fire: 0, ice: 0, thunder: 0, wind: 0 },
    };

    const mage2: Mage = {
      id: generateId(),
      type: 'mage',
      owner: 2,
      position: { x: 7, y: 7 },
      maxHp: 100,
      hp: 100,
      attack: 10,
      moveRange: 2,
      attackRange: 1,
      slowedTurns: 0,
      isAlive: true,
      maxMana: 50,
      mana: 50,
      skillCooldowns: { fire: 0, ice: 0, thunder: 0, wind: 0 },
    };

    const summon1: Unit = {
      id: generateId(),
      type: 'summon',
      owner: 1,
      position: { x: 1, y: 0 },
      maxHp: 30,
      hp: 30,
      attack: 8,
      moveRange: 2,
      attackRange: 1,
      slowedTurns: 0,
      isAlive: true,
    };

    const summon2: Unit = {
      id: generateId(),
      type: 'summon',
      owner: 2,
      position: { x: 6, y: 7 },
      maxHp: 30,
      hp: 30,
      attack: 8,
      moveRange: 2,
      attackRange: 1,
      slowedTurns: 0,
      isAlive: true,
    };

    [mage1, summon1, mage2, summon2].forEach((unit) => {
      board[unit.position.y][unit.position.x] = unit;
      units.push(unit);
    });

    return {
      board,
      iceZones: [],
      units,
      turn: 1,
      currentPlayer: 1,
      winner: null,
    };
  }

  getState(): GameState {
    return this.state;
  }

  getActions(): ActionRecord[] {
    return [...this.actions];
  }

  getUnitById(id: string): Unit | undefined {
    return this.state.units.find((u) => u.id === id);
  }

  getMage(player: PlayerId): Mage | undefined {
    return this.state.units.find(
      (u) => u.owner === player && u.type === 'mage'
    ) as Mage | undefined;
  }

  getUnitsByPlayer(player: PlayerId): Unit[] {
    return this.state.units.filter((u) => u.owner === player && u.isAlive);
  }

  isValidPosition(pos: Position): boolean {
    return pos.x >= 0 && pos.x < BOARD_SIZE && pos.y >= 0 && pos.y < BOARD_SIZE;
  }

  getManhattanDistance(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  getMoveRange(unit: Unit): Position[] {
    const result: Position[] = [];
    const range = unit.slowedTurns > 0 ? Math.ceil(unit.moveRange / 2) : unit.moveRange;

    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (Math.abs(dx) + Math.abs(dy) <= range && (dx !== 0 || dy !== 0)) {
          const pos = { x: unit.position.x + dx, y: unit.position.y + dy };
          if (this.isValidPosition(pos) && !this.state.board[pos.y][pos.x]) {
            result.push(pos);
          }
        }
      }
    }
    return result;
  }

  getAttackTargets(unit: Unit): Unit[] {
    return this.state.units.filter(
      (u) =>
        u.isAlive &&
        u.owner !== unit.owner &&
        this.getManhattanDistance(unit.position, u.position) <= unit.attackRange
    );
  }

  getSkillTargets(skillType: SkillType, caster: Unit): Position[] {
    const range = skillType === 'wind' ? 3 : 4;
    const result: Position[] = [];

    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (Math.abs(dx) + Math.abs(dy) <= range) {
          const pos = { x: caster.position.x + dx, y: caster.position.y + dy };
          if (this.isValidPosition(pos)) {
            if (skillType === 'wind') {
              const target = this.state.board[pos.y][pos.x];
              if (target && target.owner !== caster.owner && target.isAlive) {
                result.push(pos);
              }
            } else {
              result.push(pos);
            }
          }
        }
      }
    }
    return result;
  }

  moveUnit(unit: Unit, to: Position): boolean {
    if (this.state.winner) return false;
    if (unit.owner !== this.state.currentPlayer) return false;

    const validMoves = this.getMoveRange(unit);
    if (!validMoves.some((p) => p.x === to.x && p.y === to.y)) {
      return false;
    }

    const from = { ...unit.position };
    this.state.board[from.y][from.x] = null;
    unit.position = to;
    this.state.board[to.y][to.x] = unit;

    this.actions.push({
      type: 'move',
      player: unit.owner,
      unitId: unit.id,
      from,
      to,
      timestamp: Date.now(),
    });

    this.checkIceZoneEffect(unit);
    return true;
  }

  attackUnit(attacker: Unit, target: Unit): boolean {
    if (this.state.winner) return false;
    if (attacker.owner !== this.state.currentPlayer) return false;

    const validTargets = this.getAttackTargets(attacker);
    if (!validTargets.some((t) => t.id === target.id)) {
      return false;
    }

    const damage = attacker.attack;
    target.hp -= damage;

    this.actions.push({
      type: 'attack',
      player: attacker.owner,
      unitId: attacker.id,
      targetId: target.id,
      from: { ...attacker.position },
      to: { ...target.position },
      damage,
      timestamp: Date.now(),
    });

    if (target.hp <= 0) {
      target.hp = 0;
      target.isAlive = false;
      this.state.board[target.position.y][target.position.x] = null;

      this.actions.push({
        type: 'death',
        player: target.owner,
        unitId: target.id,
        targetPosition: { ...target.position },
        timestamp: Date.now(),
      });
    }

    this.checkWinCondition();
    return true;
  }

  useSkill(caster: Mage, skillType: SkillType, targetPos: Position): boolean {
    if (this.state.winner) return false;
    if (caster.owner !== this.state.currentPlayer) return false;

    const config = SKILL_CONFIG[skillType];
    if (caster.mana < config.manaCost) return false;
    if (caster.skillCooldowns[skillType] > 0) return false;

    const validTargets = this.getSkillTargets(skillType, caster);
    if (!validTargets.some((p) => p.x === targetPos.x && p.y === targetPos.y)) {
      return false;
    }

    caster.mana -= config.manaCost;
    caster.skillCooldowns[skillType] = config.cooldown;

    const baseAction: Partial<ActionRecord> = {
      type: 'skill',
      player: caster.owner,
      unitId: caster.id,
      skillType,
      targetPosition: { ...targetPos },
      manaCost: config.manaCost,
      timestamp: Date.now(),
    };

    switch (skillType) {
      case 'fire':
      case 'thunder': {
        const target = this.state.board[targetPos.y][targetPos.x];
        if (target && target.owner !== caster.owner && target.isAlive) {
          const damage = config.damage!;
          target.hp -= damage;
          this.actions.push({
            ...baseAction,
            targetId: target.id,
            damage,
          } as ActionRecord);

          if (target.hp <= 0) {
            target.hp = 0;
            target.isAlive = false;
            this.state.board[target.position.y][target.position.x] = null;

            this.actions.push({
              type: 'death',
              player: target.owner,
              unitId: target.id,
              targetPosition: { ...target.position },
              timestamp: Date.now(),
            });
          }
        } else {
          this.actions.push(baseAction as ActionRecord);
        }
        break;
      }
      case 'ice': {
        this.state.iceZones.push({
          position: { ...targetPos },
          turnsRemaining: config.duration!,
        });

        const target = this.state.board[targetPos.y][targetPos.x];
        if (target && target.isAlive) {
          target.slowedTurns = Math.max(target.slowedTurns, config.duration!);
        }

        this.actions.push(baseAction as ActionRecord);
        break;
      }
      case 'wind': {
        const target = this.state.board[targetPos.y][targetPos.x];
        if (target && target.owner !== caster.owner && target.isAlive) {
          const dx = target.position.x - caster.position.x;
          const dy = target.position.y - caster.position.y;
          const dirX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
          const dirY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

          let pushed = 0;
          let collisionDamage = 0;
          const fromPos = { ...target.position };
          let currentPos = { ...target.position };

          for (let i = 0; i < config.pushDistance!; i++) {
            const nextPos = {
              x: currentPos.x + dirX,
              y: currentPos.y + dirY,
            };

            if (!this.isValidPosition(nextPos)) {
              collisionDamage = config.collisionDamage!;
              break;
            }

            const obstacle = this.state.board[nextPos.y][nextPos.x];
            if (obstacle && obstacle.isAlive) {
              collisionDamage = config.collisionDamage!;
              break;
            }

            currentPos = nextPos;
            pushed++;
          }

          if (pushed > 0) {
            this.state.board[fromPos.y][fromPos.x] = null;
            target.position = currentPos;
            this.state.board[currentPos.y][currentPos.x] = target;
          }

          if (collisionDamage > 0) {
            target.hp -= collisionDamage;
          }

          this.actions.push({
            ...baseAction,
            targetId: target.id,
            from: fromPos,
            to: { ...currentPos },
            pushDistance: pushed,
            collisionDamage: collisionDamage || undefined,
            damage: collisionDamage || undefined,
          } as ActionRecord);

          if (target.hp <= 0) {
            target.hp = 0;
            target.isAlive = false;
            this.state.board[target.position.y][target.position.x] = null;

            this.actions.push({
              type: 'death',
              player: target.owner,
              unitId: target.id,
              targetPosition: { ...target.position },
              timestamp: Date.now(),
            });
          }
        }
        break;
      }
    }

    this.checkWinCondition();
    return true;
  }

  private checkIceZoneEffect(unit: Unit): void {
    const inIceZone = this.state.iceZones.some(
      (zone) => zone.position.x === unit.position.x && zone.position.y === unit.position.y
    );
    if (inIceZone) {
      unit.slowedTurns = Math.max(unit.slowedTurns, 1);
    }
  }

  endTurn(): void {
    if (this.state.winner) return;

    const nextPlayer: PlayerId = this.state.currentPlayer === 1 ? 2 : 1;

    this.state.iceZones = this.state.iceZones
      .map((zone) => ({ ...zone, turnsRemaining: zone.turnsRemaining - 1 }))
      .filter((zone) => zone.turnsRemaining > 0);

    this.state.units.forEach((unit) => {
      if (unit.slowedTurns > 0) {
        unit.slowedTurns--;
      }
    });

    this.state.units.forEach((unit) => {
      if (unit.owner === nextPlayer && unit.type === 'mage') {
        const mage = unit as Mage;
        const oldMana = mage.mana;
        mage.mana = Math.min(mage.maxMana, mage.mana + 5);

        this.actions.push({
          type: 'manaRegen',
          player: nextPlayer,
          unitId: mage.id,
          manaCost: oldMana - mage.mana,
          timestamp: Date.now(),
        });

        (Object.keys(mage.skillCooldowns) as SkillType[]).forEach((skill) => {
          if (mage.skillCooldowns[skill] > 0) {
            mage.skillCooldowns[skill]--;
          }
        });
      }
    });

    this.actions.push({
      type: 'turnEnd',
      player: this.state.currentPlayer,
      timestamp: Date.now(),
    });

    this.state.currentPlayer = nextPlayer;
    if (nextPlayer === 1) {
      this.state.turn++;
    }
  }

  private checkWinCondition(): void {
    const p1Units = this.getUnitsByPlayer(1);
    const p2Units = this.getUnitsByPlayer(2);

    if (p1Units.length === 0) {
      this.state.winner = 2;
    } else if (p2Units.length === 0) {
      this.state.winner = 1;
    }
  }

  saveGame(): SaveData {
    return {
      state: JSON.parse(JSON.stringify(this.state)),
      actions: JSON.parse(JSON.stringify(this.actions)),
    };
  }

  loadGame(saveData: SaveData): void {
    this.state = JSON.parse(JSON.stringify(saveData.state));
    this.actions = JSON.parse(JSON.stringify(saveData.actions));
  }

  resetFromActions(actions: ActionRecord[]): GameState {
    const freshEngine = new GameEngine();
    for (const action of actions) {
      this.applyReplayAction(freshEngine, action);
    }
    return freshEngine.getState();
  }

  applyReplayAction(engine: GameEngine, action: ActionRecord): void {
    switch (action.type) {
      case 'move': {
        const unit = engine.getUnitById(action.unitId!);
        if (unit) {
          engine.state.board[unit.position.y][unit.position.x] = null;
          unit.position = { ...action.to! };
          engine.state.board[unit.position.y][unit.position.x] = unit;
        }
        break;
      }
      case 'attack': {
        const target = engine.getUnitById(action.targetId!);
        if (target) {
          target.hp -= action.damage || 0;
          if (target.hp <= 0) {
            target.hp = 0;
            target.isAlive = false;
            engine.state.board[target.position.y][target.position.x] = null;
          }
        }
        break;
      }
      case 'skill': {
        const caster = engine.getUnitById(action.unitId!) as Mage;
        if (caster) {
          caster.mana -= action.manaCost || 0;
          const skillType = action.skillType!;
          caster.skillCooldowns[skillType] = SKILL_CONFIG[skillType].cooldown;
        }

        if (action.skillType === 'ice' && action.targetPosition) {
          engine.state.iceZones.push({
            position: { ...action.targetPosition },
            turnsRemaining: SKILL_CONFIG.ice.duration!,
          });
        }

        if (action.targetId && action.damage) {
          const target = engine.getUnitById(action.targetId);
          if (target) {
            target.hp -= action.damage;
            if (target.hp <= 0) {
              target.hp = 0;
              target.isAlive = false;
              engine.state.board[target.position.y][target.position.x] = null;
            }
          }
        }

        if (action.skillType === 'wind' && action.targetId && action.to) {
          const target = engine.getUnitById(action.targetId);
          if (target) {
            engine.state.board[target.position.y][target.position.x] = null;
            target.position = { ...action.to };
            engine.state.board[target.position.y][target.position.x] = target;
          }
        }
        break;
      }
      case 'death': {
        const unit = engine.getUnitById(action.unitId!);
        if (unit) {
          unit.isAlive = false;
          unit.hp = 0;
          engine.state.board[unit.position.y][unit.position.x] = null;
        }
        break;
      }
      case 'manaRegen': {
        const mage = engine.getUnitById(action.unitId!) as Mage;
        if (mage) {
          mage.mana = Math.min(mage.maxMana, mage.mana + 5);
          (Object.keys(mage.skillCooldowns) as SkillType[]).forEach((skill) => {
            if (mage.skillCooldowns[skill] > 0) {
              mage.skillCooldowns[skill]--;
            }
          });
        }
        break;
      }
      case 'turnEnd': {
        const nextPlayer: PlayerId = engine.state.currentPlayer === 1 ? 2 : 1;
        engine.state.iceZones = engine.state.iceZones
          .map((zone) => ({ ...zone, turnsRemaining: zone.turnsRemaining - 1 }))
          .filter((zone) => zone.turnsRemaining > 0);
        engine.state.units.forEach((u) => {
          if (u.slowedTurns > 0) u.slowedTurns--;
        });
        engine.state.currentPlayer = nextPlayer;
        if (nextPlayer === 1) engine.state.turn++;
        break;
      }
    }
  }
}
