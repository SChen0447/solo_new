import { Monster, Tile, Room, MonsterFragment, Player } from './types';
import {
  MONSTER_CHASE_RANGE,
  MONSTER_STOP_CHASE_RANGE,
  MONSTER_PATROL_SPEED,
  MONSTER_CHASE_SPEED,
  MONSTER_RESPAWN_TIME,
  MONSTER_COUNT,
  MONSTER_RADIUS,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  ANIMATION_DURATIONS,
  COLORS,
} from './constants';
import { bfsPath, findRandomFloorPosition, isWalkable } from './mapGenerator';

export function createMonsters(grid: Tile[][], rooms: Room[]): Monster[] {
  const monsters: Monster[] = [];
  const usedRooms = new Set<number>();

  for (let i = 0; i < MONSTER_COUNT && i < rooms.length; i++) {
    let roomIndex = Math.floor(Math.random() * rooms.length);
    let attempts = 0;
    while (usedRooms.has(roomIndex) && attempts < rooms.length * 2) {
      roomIndex = (roomIndex + 1) % rooms.length;
      attempts++;
    }
    usedRooms.add(roomIndex);

    const room = rooms[roomIndex];
    const pos = findRandomFloorPosition(grid, rooms, room.id);
    if (!pos) continue;

    const patrolPoints = generatePatrolPoints(grid, room, 5);

    monsters.push({
      id: i,
      x: pos.x + 0.5,
      y: pos.y + 0.5,
      radius: MONSTER_RADIUS / TILE_SIZE,
      state: 'patrol',
      patrolPoints,
      currentPatrolIndex: 0,
      patrolSpeed: MONSTER_PATROL_SPEED,
      chaseSpeed: MONSTER_CHASE_SPEED,
      roomId: room.id,
      respawnTimer: 0,
      deathAnimation: null,
    });
  }

  return monsters;
}

function generatePatrolPoints(
  grid: Tile[][],
  room: Room,
  count: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const centerX = room.centerX + 0.5;
  const centerY = room.centerY + 0.5;
  points.push({ x: centerX, y: centerY });

  for (let i = 1; i < count; i++) {
    let attempts = 0;
    while (attempts < 20) {
      const offsetX = (Math.random() - 0.5) * (room.width - 4);
      const offsetY = (Math.random() - 0.5) * (room.height - 4);
      const px = Math.floor(centerX + offsetX);
      const py = Math.floor(centerY + offsetY);

      if (isWalkable(grid, px, py)) {
        points.push({ x: px + 0.5, y: py + 0.5 });
        break;
      }
      attempts++;
    }
    if (points.length <= i) {
      points.push({ x: centerX, y: centerY });
    }
  }

  return points;
}

export function updateMonsters(
  monsters: Monster[],
  grid: Tile[][],
  rooms: Room[],
  player: Player,
  deltaTime: number,
  playerRoomId: number
): Monster[] {
  return monsters.map((monster) => {
    if (monster.state === 'dead') {
      monster.respawnTimer -= deltaTime;
      if (monster.respawnTimer <= 0) {
        const pos = findRandomFloorPosition(grid, rooms, monster.roomId);
        if (pos) {
          monster.x = pos.x + 0.5;
          monster.y = pos.y + 0.5;
          monster.state = 'patrol';
          monster.patrolPoints = generatePatrolPoints(
            grid,
            rooms.find((r) => r.id === monster.roomId)!,
            5
          );
          monster.currentPatrolIndex = 0;
        }
      }
      return monster;
    }

    if (monster.state === 'dying') {
      if (monster.deathAnimation) {
        monster.deathAnimation.progress += deltaTime / ANIMATION_DURATIONS.monsterDeath;
        for (const fragment of monster.deathAnimation.fragments) {
          fragment.x += fragment.vx * deltaTime;
          fragment.y += fragment.vy * deltaTime;
          fragment.vy += 3 * deltaTime;
        }
        if (monster.deathAnimation.progress >= 1) {
          monster.state = 'dead';
          monster.respawnTimer = MONSTER_RESPAWN_TIME;
          monster.deathAnimation = null;
        }
      }
      return monster;
    }

    const distToPlayer = Math.sqrt(
      Math.pow(monster.x - player.x, 2) + Math.pow(monster.y - player.y, 2)
    );

    if (monster.state === 'patrol' && distToPlayer < MONSTER_CHASE_RANGE) {
      monster.state = 'chase';
    } else if (
      monster.state === 'chase' &&
      (distToPlayer > MONSTER_STOP_CHASE_RANGE || playerRoomId !== monster.roomId)
    ) {
      monster.state = 'patrol';
    }

    if (monster.state === 'patrol') {
      const target = monster.patrolPoints[monster.currentPatrolIndex];
      moveTowardsTarget(monster, target.x, target.y, monster.patrolSpeed, deltaTime, grid);

      const distToTarget = Math.sqrt(
        Math.pow(monster.x - target.x, 2) + Math.pow(monster.y - target.y, 2)
      );
      if (distToTarget < 0.3) {
        monster.currentPatrolIndex = (monster.currentPatrolIndex + 1) % monster.patrolPoints.length;
      }
    } else if (monster.state === 'chase') {
      moveTowardsTarget(monster, player.x, player.y, monster.chaseSpeed, deltaTime, grid);
    }

    return monster;
  });
}

function moveTowardsTarget(
  monster: Monster,
  targetX: number,
  targetY: number,
  speed: number,
  deltaTime: number,
  grid: Tile[][]
): void {
  const dx = targetX - monster.x;
  const dy = targetY - monster.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.01) return;

  const moveX = (dx / dist) * speed * deltaTime;
  const moveY = (dy / dist) * speed * deltaTime;

  const newX = monster.x + moveX;
  const newY = monster.y + moveY;

  if (canMonsterMoveTo(grid, newX, monster.y, monster.radius)) {
    monster.x = newX;
  }
  if (canMonsterMoveTo(grid, monster.x, newY, monster.radius)) {
    monster.y = newY;
  }
}

function canMonsterMoveTo(grid: Tile[][], x: number, y: number, radius: number): boolean {
  const corners = [
    { x: x - radius, y: y - radius },
    { x: x + radius, y: y - radius },
    { x: x - radius, y: y + radius },
    { x: x + radius, y: y + radius },
  ];

  for (const corner of corners) {
    const tileX = Math.floor(corner.x);
    const tileY = Math.floor(corner.y);
    if (
      tileX < 0 ||
      tileX >= MAP_WIDTH ||
      tileY < 0 ||
      tileY >= MAP_HEIGHT ||
      grid[tileY][tileX].type === 0
    ) {
      return false;
    }
  }
  return true;
}

export function killMonster(monster: Monster): Monster {
  monster.state = 'dying';
  monster.deathAnimation = {
    progress: 0,
    fragments: createDeathFragments(monster),
  };
  return monster;
}

function createDeathFragments(monster: Monster): MonsterFragment[] {
  const fragments: MonsterFragment[] = [];
  const fragmentCount = 8;

  for (let i = 0; i < fragmentCount; i++) {
    const angle = (i / fragmentCount) * Math.PI * 2;
    const speed = 2 + Math.random() * 2;
    fragments.push({
      x: monster.x,
      y: monster.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 3 + Math.random() * 4,
      color: i % 2 === 0 ? COLORS.monster : '#ffffff',
    });
  }

  return fragments;
}

export function findNearestMonster(
  monsters: Monster[],
  playerX: number,
  playerY: number,
  maxRange: number
): Monster | null {
  let nearest: Monster | null = null;
  let nearestDist = maxRange;

  for (const monster of monsters) {
    if (monster.state === 'dead' || monster.state === 'dying') continue;

    const dist = Math.sqrt(
      Math.pow(monster.x - playerX, 2) + Math.pow(monster.y - playerY, 2)
    );
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = monster;
    }
  }

  return nearest;
}
