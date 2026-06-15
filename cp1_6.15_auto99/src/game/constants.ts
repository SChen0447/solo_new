export const TILE_SIZE = 20;
export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 40;

export const PLAYER_RADIUS = 12;
export const PLAYER_VIEW_RADIUS = 150;
export const PLAYER_SPEED = 3;

export const MONSTER_RADIUS = 10;
export const MONSTER_PATROL_SPEED = 0.5;
export const MONSTER_CHASE_SPEED = 1.2;
export const MONSTER_CHASE_RANGE = 10;
export const MONSTER_STOP_CHASE_RANGE = 12;
export const MONSTER_RESPAWN_TIME = 15;
export const MONSTER_COUNT = 3;

export const LOOT_SIZE = 10;
export const LOOT_ROTATION_SPEED = (2 * Math.PI) / 1.2;
export const LOOT_PICKUP_DISTANCE = 15;
export const LOOT_COUNT = 5;

export const KILL_CHARGES_REQUIRED = 3;
export const KILL_RANGE = 15;
export const KILL_BUTTON_SIZE = 40;

export const COLORS = {
  background: '#1a1a2e',
  floor: '#3e2723',
  wall: '#5d4037',
  wallBrick: '#4e342e',
  player: '#1a237e',
  playerHighlight: '#ffffff',
  monster: '#e53935',
  monsterChase: '#ff1744',
  monsterEye: '#ffffff',
  monsterEyeChase: '#ff1744',
  loot: '#ffd54f',
  fog: 'rgba(0, 0, 0, 0.9)',
  killButton: '#6a1b9a',
  killButtonHover: '#8e24aa',
  minimapBg: '#212121',
  minimapExplored: '#616161',
  minimapPlayer: '#ffffff',
  minimapMonster: '#e53935',
  minimapLoot: '#ffd54f',
  uiText: '#ffffff',
  warning: 'rgba(255, 0, 0, ',
};

export const ROOM_CONFIG = {
  minRooms: 6,
  maxRooms: 10,
  minRoomSize: 5,
  maxRoomSize: 10,
  corridorWidth: 2,
};

export const ANIMATION_DURATIONS = {
  screenFlash: 0.15,
  lootCollect: 0.2,
  lootCountBounce: 0.15,
  monsterDeath: 0.5,
  lootFly: 1.0,
  cameraSmooth: 0.2,
  warningPulse: 0.8,
};

export const MINIMAP_CONFIG = {
  size: 150,
  scale: 0.2,
  alpha: 0.7,
  hoverScale: 1.1,
  hoverAlpha: 1.0,
  transition: 0.2,
};

export const PERFORMANCE = {
  targetFPS: 60,
  maxFrameTime: 10,
  aiUpdateInterval: 2,
  minimapUpdateInterval: 5,
};
