import { Loot, Player, Tile, Room } from './types';
import {
  LOOT_SIZE,
  LOOT_ROTATION_SPEED,
  LOOT_PICKUP_DISTANCE,
  LOOT_COUNT,
  TILE_SIZE,
  ANIMATION_DURATIONS,
} from './constants';
import { findRandomFloorPosition } from './mapGenerator';

export function createLoots(grid: Tile[][], rooms: Room[]): Loot[] {
  const loots: Loot[] = [];
  const usedPositions = new Set<string>();

  for (let i = 0; i < LOOT_COUNT; i++) {
    let attempts = 0;
    while (attempts < 50) {
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      const pos = findRandomFloorPosition(grid, rooms, room.id);

      if (pos) {
        const key = `${pos.x},${pos.y}`;
        if (!usedPositions.has(key)) {
          usedPositions.add(key);
          loots.push({
            id: i,
            x: pos.x + 0.5,
            y: pos.y + 0.5,
            size: LOOT_SIZE,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: LOOT_ROTATION_SPEED,
            collected: false,
            collectAnimation: null,
            flyingToPlayer: null,
            roomId: pos.roomId,
          });
          break;
        }
      }
      attempts++;
    }
  }

  return loots;
}

export interface LootUpdateResult {
  loots: Loot[];
  collectedIds: number[];
  triggerFlash: boolean;
}

export function updateLoots(
  loots: Loot[],
  player: Player,
  deltaTime: number
): LootUpdateResult {
  const collectedIds: number[] = [];
  let triggerFlash = false;

  const updatedLoots = loots.map((loot) => {
    if (loot.collected && !loot.collectAnimation && !loot.flyingToPlayer) {
      return loot;
    }

    loot.rotation += loot.rotationSpeed * deltaTime;

    if (loot.flyingToPlayer) {
      loot.flyingToPlayer.progress += deltaTime / loot.flyingToPlayer.duration;

      const t = loot.flyingToPlayer.progress;
      const startX = loot.flyingToPlayer.startX;
      const startY = loot.flyingToPlayer.startY;

      const midX = (startX + player.x) / 2 + (Math.random() - 0.5) * 2;
      const midY = (startY + player.y) / 2 - 3;

      const mt = 1 - t;
      loot.x = mt * mt * startX + 2 * mt * t * midX + t * t * player.x;
      loot.y = mt * mt * startY + 2 * mt * t * midY + t * t * player.y;

      if (loot.flyingToPlayer.progress >= 1) {
        loot.collected = true;
        loot.collectAnimation = { progress: 0 };
        loot.flyingToPlayer = null;
        collectedIds.push(loot.id);
        triggerFlash = true;
      }
    } else if (loot.collectAnimation) {
      loot.collectAnimation.progress += deltaTime / ANIMATION_DURATIONS.lootCollect;
      if (loot.collectAnimation.progress >= 1) {
        loot.collectAnimation = null;
      }
    } else if (!loot.collected) {
      const dist = Math.sqrt(
        Math.pow(loot.x - player.x, 2) + Math.pow(loot.y - player.y, 2)
      );

      if (dist * TILE_SIZE < LOOT_PICKUP_DISTANCE) {
        loot.collected = true;
        loot.collectAnimation = { progress: 0 };
        collectedIds.push(loot.id);
        triggerFlash = true;
      }
    }

    return loot;
  });

  return { loots: updatedLoots, collectedIds, triggerFlash };
}

export function flyLootsToPlayer(
  loots: Loot[],
  playerX: number,
  playerY: number,
  roomId: number
): Loot[] {
  return loots.map((loot) => {
    if (!loot.collected && loot.roomId === roomId && !loot.flyingToPlayer) {
      loot.flyingToPlayer = {
        progress: 0,
        startX: loot.x,
        startY: loot.y,
        duration: ANIMATION_DURATIONS.lootFly,
      };
    }
    return loot;
  });
}

export function getActiveLoots(loots: Loot[]): Loot[] {
  return loots.filter(
    (loot) => !loot.collected || loot.collectAnimation || loot.flyingToPlayer
  );
}
