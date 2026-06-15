export type TimePhase = 'day' | 'dusk' | 'night';

export type NPCType = 'merchant' | 'guard' | 'villager';

export type NPCBehavior =
  | 'merchant_standing'
  | 'merchant_entering'
  | 'merchant_hidden'
  | 'guard_patrolling'
  | 'guard_stationary'
  | 'villager_wandering'
  | 'villager_walking_home'
  | 'villager_sitting';

export interface Vec2 {
  x: number;
  y: number;
}

export interface NPC {
  id: string;
  type: NPCType;
  name: string;
  color: string;
  position: Vec2;
  targetPosition: Vec2;
  previousPosition: Vec2;
  width: number;
  height: number;
  scale: number;
  targetScale: number;
  speed: number;
  currentSpeed: number;
  behavior: NPCBehavior;
  behaviorDescription: string;
  facing: 'north' | 'south' | 'east' | 'west';
  wanderTimer: number;
  patrolDirection: 1 | -1;
  transitionProgress: number;
  transitionDuration: number;
  visible: boolean;
}

export interface Shop {
  position: Vec2;
  width: number;
  height: number;
  signColor: string;
  signText: string;
  signBlinking: boolean;
  signAlpha: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  period: number;
}

export interface InfoPanel {
  visible: boolean;
  position: Vec2;
  content: string[];
  timer: number;
  totalDuration: number;
  fadeDuration: number;
  alpha: number;
}

export interface SceneState {
  worldTime: number;
  timeSpeed: number;
  phase: TimePhase;
  backgroundColor: string;
  targetBackgroundColor: string;
  sunMoonPosition: Vec2;
  isSun: boolean;
  stars: Star[];
  npcs: NPC[];
  shop: Shop;
  infoPanel: InfoPanel;
  shopMessagePanel: InfoPanel;
}

export const SHOP_POSITION: Vec2 = { x: 200, y: 100 };
export const SHOP_SIZE = { width: 80, height: 60 };

export const MERCHANT_COLOR = '#e53935';
export const GUARD_COLOR = '#1e88e5';
export const VILLAGER_COLOR = '#8e24aa';

export const COLOR_DAY = '#87ceeb';
export const COLOR_DUSK = '#ff7f50';
export const COLOR_NIGHT = '#0a0a2e';

export const COLOR_SUN = '#ffd700';
export const COLOR_MOON = '#e0e0e0';

export const NPC_WIDTH = 16;
export const NPC_HEIGHT = 32;

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const DAY_START = 6;
export const DUSK_START = 18;
export const NIGHT_START = 20;
export const CYCLE_HOURS = 24;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getTimePhase(hours: number): TimePhase {
  if (hours >= DAY_START && hours < DUSK_START) return 'day';
  if (hours >= DUSK_START && hours < NIGHT_START) return 'dusk';
  return 'night';
}

export function formatTime(hours: number): string {
  const h = Math.floor(hours) % CYCLE_HOURS;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function phaseName(phase: TimePhase): string {
  switch (phase) {
    case 'day': return '白天';
    case 'dusk': return '黄昏';
    case 'night': return '夜晚';
  }
}

export function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * (CANVAS_HEIGHT * 0.7),
      size: 1 + Math.random() * 2,
      baseAlpha: 0.2 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      period: 1 + Math.random() * 2,
    });
  }
  return stars;
}

export function createInitialNPCs(): NPC[] {
  return [
    {
      id: 'merchant',
      type: 'merchant',
      name: '商人',
      color: MERCHANT_COLOR,
      position: { x: SHOP_POSITION.x + 10, y: SHOP_POSITION.y + SHOP_SIZE.height },
      targetPosition: { x: SHOP_POSITION.x + 10, y: SHOP_POSITION.y + SHOP_SIZE.height },
      previousPosition: { x: SHOP_POSITION.x + 10, y: SHOP_POSITION.y + SHOP_SIZE.height },
      width: NPC_WIDTH,
      height: NPC_HEIGHT,
      scale: 1,
      targetScale: 1,
      speed: 50,
      currentSpeed: 50,
      behavior: 'merchant_standing',
      behaviorDescription: '在商店门口招揽顾客',
      facing: 'south',
      wanderTimer: 0,
      patrolDirection: 1,
      transitionProgress: 0,
      transitionDuration: 0,
      visible: true,
    },
    {
      id: 'guard',
      type: 'guard',
      name: '守卫',
      color: GUARD_COLOR,
      position: { x: 300, y: 200 },
      targetPosition: { x: 400, y: 200 },
      previousPosition: { x: 300, y: 200 },
      width: NPC_WIDTH,
      height: NPC_HEIGHT,
      scale: 1,
      targetScale: 1,
      speed: 60,
      currentSpeed: 60,
      behavior: 'guard_patrolling',
      behaviorDescription: '沿街道巡逻中',
      facing: 'east',
      wanderTimer: 0,
      patrolDirection: 1,
      transitionProgress: 0,
      transitionDuration: 0,
      visible: true,
    },
    {
      id: 'villager',
      type: 'villager',
      name: '村民',
      color: VILLAGER_COLOR,
      position: { x: 400, y: 300 },
      targetPosition: { x: 420, y: 310 },
      previousPosition: { x: 400, y: 300 },
      width: NPC_WIDTH,
      height: NPC_HEIGHT,
      scale: 1,
      targetScale: 1,
      speed: 35,
      currentSpeed: 35,
      behavior: 'villager_wandering',
      behaviorDescription: '在镇中心闲逛',
      facing: 'south',
      wanderTimer: 0,
      patrolDirection: 1,
      transitionProgress: 0,
      transitionDuration: 0,
      visible: true,
    },
  ];
}

export function createInitialShop(): Shop {
  return {
    position: { ...SHOP_POSITION },
    width: SHOP_SIZE.width,
    height: SHOP_SIZE.height,
    signColor: '#4caf50',
    signText: 'OPEN',
    signBlinking: false,
    signAlpha: 1,
  };
}

export function createInitialInfoPanel(): InfoPanel {
  return {
    visible: false,
    position: { x: 0, y: 0 },
    content: [],
    timer: 0,
    totalDuration: 3,
    fadeDuration: 0.5,
    alpha: 0,
  };
}

export function updateNPCBehaviorForPhase(
  npc: NPC,
  phase: TimePhase,
  previousPhase: TimePhase,
): NPC {
  const updated = { ...npc };

  if (phase === previousPhase) return updated;

  switch (npc.type) {
    case 'merchant':
      if (phase === 'dusk') {
        updated.behavior = 'merchant_entering';
        updated.behaviorDescription = '正在收摊返回店内';
        updated.previousPosition = { ...npc.position };
        updated.targetPosition = {
          x: SHOP_POSITION.x + SHOP_SIZE.width / 2,
          y: SHOP_POSITION.y + SHOP_SIZE.height - 5,
        };
        updated.transitionProgress = 0;
        updated.transitionDuration = 2;
        updated.currentSpeed = npc.speed;
      } else if (phase === 'night') {
        updated.behavior = 'merchant_hidden';
        updated.behaviorDescription = '已关门休息';
        updated.visible = false;
      } else if (phase === 'day') {
        updated.behavior = 'merchant_standing';
        updated.behaviorDescription = '在商店门口招揽顾客';
        updated.visible = true;
        updated.position = {
          x: SHOP_POSITION.x + 10,
          y: SHOP_POSITION.y + SHOP_SIZE.height,
        };
        updated.previousPosition = { ...updated.position };
        updated.targetPosition = { ...updated.position };
      }
      break;

    case 'guard':
      if (phase === 'dusk') {
        updated.behavior = 'guard_patrolling';
        updated.behaviorDescription = '放慢速度巡逻中';
        updated.currentSpeed = npc.speed * 0.5;
      } else if (phase === 'night') {
        updated.behavior = 'guard_stationary';
        updated.behaviorDescription = '在岗位站岗';
        updated.currentSpeed = 0;
        updated.previousPosition = { ...npc.position };
        updated.targetPosition = { x: 350, y: 200 };
        updated.transitionProgress = 0;
        updated.transitionDuration = 1;
        updated.facing = 'south';
      } else if (phase === 'day') {
        updated.behavior = 'guard_patrolling';
        updated.behaviorDescription = '沿街道巡逻中';
        updated.currentSpeed = npc.speed;
      }
      break;

    case 'villager':
      if (phase === 'dusk') {
        updated.behavior = 'villager_walking_home';
        updated.behaviorDescription = '赶回家中';
        updated.previousPosition = { ...npc.position };
        updated.targetPosition = { x: 100, y: 450 };
        updated.transitionProgress = 0;
        updated.transitionDuration = 4;
        updated.currentSpeed = npc.speed * 1.2;
      } else if (phase === 'night') {
        updated.behavior = 'villager_sitting';
        updated.behaviorDescription = '在家中休息';
        updated.targetScale = 0.625;
        updated.position = { x: 100, y: 450 };
        updated.previousPosition = { ...updated.position };
        updated.targetPosition = { ...updated.position };
      } else if (phase === 'day') {
        updated.behavior = 'villager_wandering';
        updated.behaviorDescription = '在镇中心闲逛';
        updated.targetScale = 1;
        updated.currentSpeed = npc.speed;
        updated.position = { x: 400, y: 300 };
        updated.previousPosition = { ...updated.position };
        updated.targetPosition = { x: 420, y: 310 };
        updated.wanderTimer = 0;
      }
      break;
  }

  return updated;
}
