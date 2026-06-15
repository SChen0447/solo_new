import {
  MONSTER_COUNT,
  MONSTER_PERCEIVE_RADIUS,
  MONSTER_PATROL_SPEED,
  MONSTER_CHASE_SPEED,
  MONSTER_STUN_TIME,
  MONSTER_COOLDOWN_TIME,
  MONSTER_DAZE_TIME,
  TILE_SIZE,
  Monster,
  Position,
  Tile
} from './types';

type LightChecker = (px: number, py: number, playerPos: Position) => boolean;

export class MonsterAI {
  private monsters: Monster[];
  private map: Tile[][];
  private gridW: number;
  private gridH: number;
  private lightChecker: LightChecker | null;

  constructor(map: Tile[][]) {
    this.map = map;
    this.gridW = map[0]?.length || 0;
    this.gridH = map.length;
    this.monsters = [];
    this.lightChecker = null;
    this.spawnMonsters();
  }

  setLightChecker(checker: LightChecker): void {
    this.lightChecker = checker;
  }

  private spawnMonsters(): void {
    const pathCells: Position[] = [];

    for (let y = 2; y < this.gridH - 2; y++) {
      for (let x = 2; x < this.gridW - 2; x++) {
        if (this.map[y][x].type === 'path') {
          const distFromStart = Math.abs(x - 1) + Math.abs(y - 1);
          const distFromEnd = Math.abs(x - (this.gridW - 2)) + Math.abs(y - (this.gridH - 2));
          if (distFromStart >= 4 && distFromEnd >= 2) {
            pathCells.push({ x, y });
          }
        }
      }
    }

    const shuffled = this.shuffle(pathCells);
    const count = Math.min(MONSTER_COUNT, shuffled.length);

    for (let i = 0; i < count; i++) {
      const cell = shuffled[i];
      const dir = this.getRandomDirection();
      this.monsters.push({
        id: `monster_${i}`,
        position: {
          x: cell.x * TILE_SIZE + TILE_SIZE / 2,
          y: cell.y * TILE_SIZE + TILE_SIZE / 2
        },
        state: 'patrol',
        direction: dir,
        perceiveRadius: MONSTER_PERCEIVE_RADIUS,
        patrolTimer: Math.random() * 2000 + 1000,
        stunTimer: 0,
        cooldownTimer: 0,
        dazeTimer: 0,
        pulsePhase: Math.random() * Math.PI * 2,
        homeDirection: { x: -dir.x, y: -dir.y }
      });
    }
  }

  private getRandomDirection(): Position {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  update(
    deltaTime: number,
    _player: unknown,
    _lightState: unknown,
    playerPos: Position
  ): { dead: boolean; monsters: Monster[] } {
    let playerDead = false;

    for (const monster of this.monsters) {
      monster.pulsePhase += deltaTime * 0.005;

      if (monster.cooldownTimer > 0) {
        monster.cooldownTimer = Math.max(0, monster.cooldownTimer - deltaTime);
      }

      if (monster.dazeTimer > 0) {
        monster.dazeTimer = Math.max(0, monster.dazeTimer - deltaTime);
        if (monster.dazeTimer === 0 && monster.state === 'dazed') {
          monster.state = 'stunned';
          monster.stunTimer = MONSTER_STUN_TIME;
        }
        continue;
      }

      if (monster.state === 'stunned') {
        monster.stunTimer = Math.max(0, monster.stunTimer - deltaTime);
        this.moveMonster(monster, deltaTime, MONSTER_PATROL_SPEED * 0.5);
        if (monster.stunTimer === 0) {
          monster.state = 'patrol';
          monster.patrolTimer = 2000;
        }
        continue;
      }

      const isInLight = this.lightChecker?.(monster.position.x, monster.position.y, playerPos) ?? false;
      const distToPlayer = this.distance(monster.position, playerPos);
      const inPerceiveRange = distToPlayer <= monster.perceiveRadius;

      if (isInLight && inPerceiveRange && monster.cooldownTimer === 0 && monster.state !== 'dazed') {
        monster.dazeTimer += deltaTime;
        if (monster.dazeTimer >= MONSTER_DAZE_TIME) {
          monster.state = 'dazed';
          monster.cooldownTimer = MONSTER_COOLDOWN_TIME;
          const awayX = monster.position.x - playerPos.x;
          const awayY = monster.position.y - playerPos.y;
          const awayLen = Math.sqrt(awayX * awayX + awayY * awayY) || 1;
          monster.homeDirection = {
            x: awayX / awayLen,
            y: awayY / awayLen
          };
          monster.direction = { ...monster.homeDirection };
        }
        continue;
      }

      if (!isInLight && inPerceiveRange) {
        monster.state = 'chase';
        this.updateChaseDirection(monster, playerPos);
        this.moveMonster(monster, deltaTime, MONSTER_CHASE_SPEED);
      } else {
        if (monster.state === 'chase') {
          monster.state = 'patrol';
          monster.patrolTimer = 2000;
        }
        this.updatePatrol(monster, deltaTime);
        this.moveMonster(monster, deltaTime, MONSTER_PATROL_SPEED);
      }

      const collisionDist = 16 + 12;
      if (this.distance(monster.position, playerPos) < collisionDist) {
        playerDead = true;
      }
    }

    return { dead: playerDead, monsters: [...this.monsters] };
  }

  private updatePatrol(monster: Monster, deltaTime: number): void {
    monster.patrolTimer -= deltaTime;
    if (monster.patrolTimer <= 0) {
      monster.patrolTimer = Math.random() * 2000 + 2000;
      const newDir = this.findValidDirection(monster);
      if (newDir) {
        monster.direction = newDir;
      }
    }
  }

  private findValidDirection(monster: Monster): Position | null {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    const validDirs: Position[] = [];

    for (const dir of dirs) {
      if (dir.x === -monster.direction.x && dir.y === -monster.direction.y) continue;
      if (this.canMoveInDirection(monster.position, dir)) {
        validDirs.push(dir);
      }
    }

    if (validDirs.length === 0) {
      const backDir = { x: -monster.direction.x, y: -monster.direction.y };
      if (this.canMoveInDirection(monster.position, backDir)) {
        return backDir;
      }
      return null;
    }

    return validDirs[Math.floor(Math.random() * validDirs.length)];
  }

  private canMoveInDirection(pos: Position, dir: Position): boolean {
    const checkX = pos.x + dir.x * TILE_SIZE * 0.6;
    const checkY = pos.y + dir.y * TILE_SIZE * 0.6;
    return this.isWalkable(checkX, checkY);
  }

  private updateChaseDirection(monster: Monster, playerPos: Position): void {
    const dx = playerPos.x - monster.position.x;
    const dy = playerPos.y - monster.position.y;

    const dirs: Position[] = [];
    if (Math.abs(dx) > Math.abs(dy)) {
      dirs.push({ x: Math.sign(dx), y: 0 });
      dirs.push({ x: 0, y: Math.sign(dy) });
    } else {
      dirs.push({ x: 0, y: Math.sign(dy) });
      dirs.push({ x: Math.sign(dx), y: 0 });
    }

    for (const dir of dirs) {
      if (dir.x === 0 && dir.y === 0) continue;
      if (this.canMoveInDirection(monster.position, dir) ||
          (Math.abs(dir.x - monster.direction.x) + Math.abs(dir.y - monster.direction.y) < 2)) {
        monster.direction = dir;
        return;
      }
    }
  }

  private moveMonster(monster: Monster, deltaTime: number, speed: number): void {
    const dt = deltaTime / 16.67;
    const moveAmount = speed * dt;

    const dir = monster.state === 'stunned' || monster.state === 'dazed'
      ? monster.homeDirection
      : monster.direction;

    const newX = monster.position.x + dir.x * moveAmount;
    const newY = monster.position.y + dir.y * moveAmount;

    if (this.isWalkable(newX, monster.position.y)) {
      monster.position.x = newX;
    } else if (monster.state === 'patrol') {
      const newDir = this.findValidDirection(monster);
      if (newDir) monster.direction = newDir;
    }

    if (this.isWalkable(monster.position.x, newY)) {
      monster.position.y = newY;
    } else if (monster.state === 'patrol') {
      const newDir = this.findValidDirection(monster);
      if (newDir) monster.direction = newDir;
    }

    monster.position.x = Math.max(TILE_SIZE * 0.5, Math.min(this.gridW * TILE_SIZE - TILE_SIZE * 0.5, monster.position.x));
    monster.position.y = Math.max(TILE_SIZE * 0.5, Math.min(this.gridH * TILE_SIZE - TILE_SIZE * 0.5, monster.position.y));
  }

  private isWalkable(px: number, py: number): boolean {
    const gx = Math.floor(px / TILE_SIZE);
    const gy = Math.floor(py / TILE_SIZE);
    if (gy < 0 || gy >= this.gridH || gx < 0 || gx >= this.gridW) {
      return false;
    }
    return this.map[gy][gx].type === 'path';
  }

  private distance(a: Position, b: Position): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getMonsters(): Monster[] {
    return [...this.monsters];
  }

  reset(): void {
    this.monsters = [];
    this.spawnMonsters();
  }
}
