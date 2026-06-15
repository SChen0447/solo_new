export type Vec3 = [number, number, number];

export type PlayerRole = 'hunter' | 'stalker' | 'ai';

export type PropType = 'cloak' | 'voiceChanger' | 'smoke' | 'speedBoost';

export type AIState = 'patrol' | 'alert' | 'chase';

export type GamePhase = 'waiting' | 'playing' | 'ended';

export interface PropInstance {
  id: string;
  type: PropType;
  position?: Vec3;
  cooldownEnd: number;
  isActive: boolean;
  isFragment?: boolean;
}

export interface PlayerState {
  id: string;
  role: PlayerRole;
  position: Vec3;
  rotation: Vec3;
  health: number;
  isMarked: boolean;
  isInvisible: boolean;
  speedMultiplier: number;
  inventory: PropInstance[];
  name: string;
  markProgress: number;
  isPointerLocked: boolean;
}

export interface AIPatrolState {
  id: string;
  state: AIState;
  position: Vec3;
  rotation: Vec3;
  pathIndex: number;
  path: Vec3[];
  detectedTargetId?: string;
  alertEndTime: number;
  chaseEndTime: number;
  showExclamation: boolean;
  exclamationEndTime: number;
}

export interface GameStats {
  hunter: {
    marks: number;
    alertsReceived: number;
    playTime: number;
  };
  stalker: {
    survivedTime: number;
    propsUsed: number;
    fragmentsCollected: number;
  };
}

export interface GameState {
  phase: GamePhase;
  timeRemaining: number;
  players: Record<string, PlayerState>;
  aiUnits: Record<string, AIPatrolState>;
  props: Record<string, PropInstance>;
  markedCount: number;
  totalStalkers: number;
  keyFragments: number;
  alertLevel: number;
  winner?: 'hunter' | 'stalker';
  stats: GameStats;
  smokeZones: Record<string, { position: Vec3; radius: number; endTime: number }>;
  fakeFootsteps: Record<string, { position: Vec3; endTime: number }>;
}

export type GameEventType =
  | 'prop_picked'
  | 'prop_used'
  | 'ai_detected'
  | 'ai_alert'
  | 'player_marked'
  | 'key_synthesized'
  | 'game_end'
  | 'player_move'
  | 'smoke_created'
  | 'fake_footstep'
  | 'role_changed';

export interface GameEvent<T = unknown> {
  type: GameEventType;
  payload: T;
  timestamp: number;
}

export interface Settings {
  mouseSensitivity: number;
  cameraPitch: number;
  isMobile: boolean;
}

export interface PropConfig {
  name: string;
  duration: number;
  cooldown: number;
  description: string;
  color: string;
}

export const PROP_CONFIGS: Record<PropType, PropConfig> = {
  cloak: {
    name: '隐身斗篷',
    duration: 10000,
    cooldown: 30000,
    description: '持续10秒隐身',
    color: '#8b5cf6',
  },
  voiceChanger: {
    name: '变声器',
    duration: 0,
    cooldown: 15000,
    description: '发射假脚步声',
    color: '#f59e0b',
  },
  smoke: {
    name: '烟雾弹',
    duration: 5000,
    cooldown: 20000,
    description: '半径4单位遮蔽视野5秒',
    color: '#6b7280',
  },
  speedBoost: {
    name: '加速药剂',
    duration: 8000,
    cooldown: 25000,
    description: '移速+50%持续8秒',
    color: '#10b981',
  },
};

export const MAP_SIZE = 100;
export const GRID_SIZE = 1;
export const GAME_DURATION = 15 * 60 * 1000;
export const PROP_SPAWN_INTERVAL = 30000;
export const PROPS_PER_SPAWN = 3;
export const AI_PATROL_SPEED = 1.5;
export const AI_CHASE_SPEED = 3;
export const AI_FOV_ANGLE = Math.PI / 3;
export const AI_FOV_DISTANCE = 8;
export const MARK_DURATION = 2000;
export const KEY_FRAGMENTS_REQUIRED = 5;
export const SYNTHESIZE_DURATION = 3000;
export const PROP_USE_CAST_TIME = 500;
