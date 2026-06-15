export interface GameConfig {
  player: {
    startRoomId: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
    maxHealth: number;
    gravity: number;
    jumpForce: number;
    moveSpeed: number;
    shortJumpMultiplier: number;
  };
  enemy: {
    patrolSpeed: number;
    chaseSpeed: number;
    aggroDistance: number;
    deAggroDistance: number;
    patrolRange: number;
    fireballCooldown: number;
    fireballSpeed: number;
    fireballDamage: number;
  };
  room: {
    width: number;
    height: number;
    backgroundColor: string;
    platformColor: string;
    wallColor: string;
    borderRadius: number;
  };
  portal: {
    radius: number;
    pulsePeriod: number;
    transitionDuration: number;
  };
  ui: {
    heartSize: number;
    minimapSize: number;
    minimapRoomSize: number;
  };
  particle: {
    jumpParticleCount: number;
    jumpParticleRadius: number;
    jumpParticleLifetime: number;
  };
  item: {
    keySize: number;
    keyRotationPeriod: number;
    heartSize: number;
    heartPulsePeriod: number;
    weaponSize: number;
    dartSpeed: number;
    dartWidth: number;
    dartHeight: number;
    unlockTextDuration: number;
  };
  rooms: RoomConfig[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PortalConfig {
  x: number;
  y: number;
  targetRoomId: number;
  targetX: number;
  targetY: number;
  requiredKey: boolean;
}

export interface EnemyConfig {
  id: string;
  type: 'slime' | 'mage';
  x: number;
  y: number;
  patrolStartX: number;
  patrolEndX: number;
}

export interface ItemConfig {
  id: string;
  type: 'key' | 'heart' | 'weapon';
  x: number;
  y: number;
}

export interface RoomConfig {
  id: number;
  name: string;
  platforms: Rect[];
  walls: Rect[];
  portals: PortalConfig[];
  enemies: EnemyConfig[];
  items: ItemConfig[];
  minimapX: number;
  minimapY: number;
}

export type EnemyState = 'patrol' | 'chase' | 'return';

export interface Enemy {
  id: string;
  type: 'slime' | 'mage';
  x: number;
  y: number;
  initialX: number;
  patrolStartX: number;
  patrolEndX: number;
  patrolDir: number;
  state: EnemyState;
  prevState: EnemyState;
  stateIconScale: number;
  alertFlashTimer: number;
  lastFireballTime: number;
  animTimer: number;
  alive: boolean;
}

export interface Fireball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  fromPlayer: boolean;
}

export interface Dart {
  x: number;
  y: number;
  vx: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

export interface ItemState {
  id: string;
  type: 'key' | 'heart' | 'weapon';
  x: number;
  y: number;
  collected: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facingDir: number;
  onGround: boolean;
  health: number;
  maxHealth: number;
  keys: number;
  hasWeapon: boolean;
  invincibleTimer: number;
  flashTimer: number;
  jumpHeld: boolean;
  runAnimFrame: number;
  runAnimTimer: number;
}
