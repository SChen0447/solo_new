import { create } from 'zustand';
import {
  GameStore,
  Player,
  Monster,
  Loot,
  Tile,
  Room,
  Camera,
  ScreenFlash,
  LootCountBounce,
} from './types';
import {
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_VIEW_RADIUS,
  PLAYER_SPEED,
  KILL_CHARGES_REQUIRED,
  KILL_RANGE,
  ANIMATION_DURATIONS,
  MONSTER_CHASE_RANGE,
} from './constants';
import { generateDungeon, findRandomFloorPosition, getRoomAt } from './mapGenerator';
import { updatePlayer, updatePlayerRenderPosition } from './playerController';
import { createMonsters, updateMonsters, killMonster, findNearestMonster } from './aiModule';
import { createLoots, updateLoots, flyLootsToPlayer } from './lootModule';

const createInitialPlayer = (startX: number, startY: number): Player => ({
  x: startX,
  y: startY,
  renderX: startX,
  renderY: startY,
  radius: PLAYER_RADIUS / TILE_SIZE,
  viewRadius: PLAYER_VIEW_RADIUS,
  currentRoomId: 0,
  speed: PLAYER_SPEED,
});

const createInitialCamera = (x: number, y: number): Camera => ({
  x,
  y,
  targetX: x,
  targetY: y,
  smoothTime: ANIMATION_DURATIONS.cameraSmooth,
});

const createInitialScreenFlash = (): ScreenFlash => ({
  active: false,
  alpha: 0,
  duration: ANIMATION_DURATIONS.screenFlash,
  elapsed: 0,
});

const createInitialLootCountBounce = (): LootCountBounce => ({
  active: false,
  scale: 1,
  duration: ANIMATION_DURATIONS.lootCountBounce,
  elapsed: 0,
});

export const useGameStore = create<GameStore>((set, get) => ({
  grid: [],
  rooms: [],
  player: createInitialPlayer(0, 0),
  monsters: [],
  loots: [],
  lootCount: 0,
  killCharges: 0,
  screenFlash: createInitialScreenFlash(),
  lootCountBounce: createInitialLootCountBounce(),
  exploredTiles: new Set<string>(),
  camera: createInitialCamera(0, 0),
  tileSize: TILE_SIZE,
  mapWidth: MAP_WIDTH,
  mapHeight: MAP_HEIGHT,
  warningPulse: 0,
  isNearMonster: false,

  initGame: (seed?: number) => {
    const { grid, rooms } = generateDungeon(seed);

    const startPos = findRandomFloorPosition(grid, rooms, rooms[0]?.id);
    const startX = startPos ? startPos.x + 0.5 : rooms[0]?.centerX ?? 5;
    const startY = startPos ? startPos.y + 0.5 : rooms[0]?.centerY ?? 5;

    const player = createInitialPlayer(startX, startY);
    player.currentRoomId = startPos?.roomId ?? 0;

    const monsters = createMonsters(grid, rooms);
    const loots = createLoots(grid, rooms);
    const camera = createInitialCamera(startX, startY);
    const exploredTiles = new Set<string>();

    for (let dy = -8; dy <= 8; dy++) {
      for (let dx = -8; dx <= 8; dx++) {
        const tx = Math.floor(startX) + dx;
        const ty = Math.floor(startY) + dy;
        if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
          exploredTiles.add(`${tx},${ty}`);
        }
      }
    }

    set({
      grid,
      rooms,
      player,
      monsters,
      loots,
      lootCount: 0,
      killCharges: 0,
      screenFlash: createInitialScreenFlash(),
      lootCountBounce: createInitialLootCountBounce(),
      exploredTiles,
      camera,
      warningPulse: 0,
      isNearMonster: false,
    });
  },

  update: (deltaTime: number, keys: Set<string>) => {
    const state = get();
    let { player, monsters, loots, camera, screenFlash, lootCountBounce, exploredTiles } = state;
    let { lootCount, killCharges, warningPulse, isNearMonster } = state;
    const { grid, rooms } = state;

    if (grid.length === 0) return;

    player = { ...player };
    updatePlayer(player, grid, keys, deltaTime);
    updatePlayerRenderPosition(player, deltaTime);

    const playerRoomId = getRoomAt(grid, rooms, player.x, player.y);
    player.currentRoomId = playerRoomId;

    camera = { ...camera };
    camera.targetX = player.x;
    camera.targetY = player.y;

    const smoothFactor = Math.min(1, deltaTime / camera.smoothTime);
    camera.x += (camera.targetX - camera.x) * smoothFactor;
    camera.y += (camera.targetY - camera.y) * smoothFactor;

    monsters = monsters.map((m) => ({ ...m, deathAnimation: m.deathAnimation ? { ...m.deathAnimation, fragments: m.deathAnimation.fragments.map(f => ({ ...f })) } : null }));
    updateMonsters(monsters, grid, rooms, player, deltaTime, playerRoomId);

    isNearMonster = false;
    for (const monster of monsters) {
      if (monster.state === 'dead' || monster.state === 'dying') continue;
      const dist = Math.sqrt(
        Math.pow(monster.x - player.x, 2) + Math.pow(monster.y - player.y, 2)
      );
      if (dist < MONSTER_CHASE_RANGE) {
        isNearMonster = true;
        break;
      }
    }

    warningPulse += (2 * Math.PI * deltaTime) / ANIMATION_DURATIONS.warningPulse;

    const lootResult = updateLoots(loots, player, deltaTime);
    loots = lootResult.loots;

    if (lootResult.collectedIds.length > 0) {
      lootCount += lootResult.collectedIds.length;
      killCharges += lootResult.collectedIds.length;
      lootCountBounce = {
        active: true,
        scale: 1.2,
        duration: ANIMATION_DURATIONS.lootCountBounce,
        elapsed: 0,
      };
    }

    if (lootResult.triggerFlash) {
      screenFlash = {
        active: true,
        alpha: 0.8,
        duration: ANIMATION_DURATIONS.screenFlash,
        elapsed: 0,
      };
    }

    if (screenFlash.active) {
      screenFlash.elapsed += deltaTime;
      const progress = screenFlash.elapsed / screenFlash.duration;
      screenFlash.alpha = 0.8 * (1 - progress);
      if (screenFlash.elapsed >= screenFlash.duration) {
        screenFlash.active = false;
        screenFlash.alpha = 0;
      }
    }

    if (lootCountBounce.active) {
      lootCountBounce.elapsed += deltaTime;
      const progress = lootCountBounce.elapsed / lootCountBounce.duration;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      lootCountBounce.scale = 1 + 0.2 * (1 - easeOut);
      if (lootCountBounce.elapsed >= lootCountBounce.duration) {
        lootCountBounce.active = false;
        lootCountBounce.scale = 1;
      }
    }

    const tileRadius = Math.ceil(PLAYER_VIEW_RADIUS / TILE_SIZE);
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    for (let dy = -tileRadius; dy <= tileRadius; dy++) {
      for (let dx = -tileRadius; dx <= tileRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= tileRadius) {
          const tx = px + dx;
          const ty = py + dy;
          if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
            exploredTiles.add(`${tx},${ty}`);
          }
        }
      }
    }

    set({
      player,
      monsters,
      loots,
      camera,
      screenFlash,
      lootCountBounce,
      exploredTiles,
      lootCount,
      killCharges,
      warningPulse,
      isNearMonster,
    });
  },

  useKillSkill: () => {
    const state = get();
    if (state.killCharges < KILL_CHARGES_REQUIRED) return;

    const nearest = findNearestMonster(
      state.monsters,
      state.player.x,
      state.player.y,
      KILL_RANGE
    );

    if (!nearest) return;

    let { monsters, loots, killCharges } = state;

    monsters = monsters.map((m) =>
      m.id === nearest.id ? killMonster({ ...m }) : m
    );

    loots = flyLootsToPlayer(
      loots.map((l) => ({ ...l })),
      state.player.x,
      state.player.y,
      nearest.roomId
    );

    killCharges -= KILL_CHARGES_REQUIRED;

    set({ monsters, loots, killCharges });
  },
}));
