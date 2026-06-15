export type ResourceType = 'gold' | 'wood' | 'stone';

export interface Resource {
  type: ResourceType;
  amount: number;
  perSecond: number;
  color: string;
  glowColor: string;
  icon: string;
  name: string;
}

export interface ResourceCost {
  gold?: number;
  wood?: number;
  stone?: number;
}

export interface Production {
  produces?: Partial<Record<ResourceType, number>>;
  consumes?: Partial<Record<ResourceType, number>>;
  interval?: number;
}

export interface BuildingType {
  id: string;
  name: string;
  icon: string;
  description: string;
  baseCost: ResourceCost;
  baseProduction: Production;
  buildTime: number;
}

export interface Building {
  id: string;
  typeId: string;
  level: number;
  x: number;
  y: number;
  isBuilding: boolean;
  buildProgress: number;
  isUpgrading: boolean;
  upgradeProgress: number;
  lastProductionTime: number;
}

export interface GameState {
  resources: Record<ResourceType, Resource>;
  buildings: Building[];
  lastSaveTime: number;
  totalPlayTime: number;
}

export interface OfflineEarnings {
  duration: number;
  earnings: Record<ResourceType, number>;
}

export const INITIAL_RESOURCES: Record<ResourceType, Resource> = {
  gold: {
    type: 'gold',
    amount: 100,
    perSecond: 0,
    color: '#FFD700',
    glowColor: '#90EE90',
    icon: '💰',
    name: '金币'
  },
  wood: {
    type: 'wood',
    amount: 50,
    perSecond: 0,
    color: '#8B4513',
    glowColor: '#87CEEB',
    icon: '🪵',
    name: '木头'
  },
  stone: {
    type: 'stone',
    amount: 30,
    perSecond: 0,
    color: '#808080',
    glowColor: '#FFA500',
    icon: '🪨',
    name: '石头'
  }
};

export const BUILDING_TYPES: BuildingType[] = [
  {
    id: 'farm',
    name: '农田',
    icon: '🌾',
    description: '种植作物，稳定产出金币',
    baseCost: { gold: 50, wood: 20 },
    baseProduction: { produces: { gold: 2 } },
    buildTime: 1.5
  },
  {
    id: 'mine',
    name: '矿场',
    icon: '⛏️',
    description: '开采矿石，产出石头',
    baseCost: { gold: 80, wood: 30 },
    baseProduction: { produces: { stone: 1 } },
    buildTime: 1.5
  },
  {
    id: 'workshop',
    name: '工坊',
    icon: '🏭',
    description: '加工材料，消耗木头石头产出金币',
    baseCost: { gold: 150, wood: 50, stone: 30 },
    baseProduction: { produces: { gold: 5 }, consumes: { wood: 1, stone: 1 }, interval: 3 },
    buildTime: 1.5
  },
  {
    id: 'lumbermill',
    name: '伐木场',
    icon: '🪓',
    description: '砍伐树木，产出木头',
    baseCost: { gold: 60, stone: 15 },
    baseProduction: { produces: { wood: 1 } },
    buildTime: 1.5
  },
  {
    id: 'warehouse',
    name: '仓库',
    icon: '🏪',
    description: '提升所有建筑产量10%',
    baseCost: { gold: 200, wood: 80, stone: 50 },
    baseProduction: { produces: {} },
    buildTime: 1.5
  },
  {
    id: 'watchtower',
    name: '哨塔',
    icon: '🗼',
    description: '提供视野，提升离线收益20%',
    baseCost: { gold: 300, wood: 100, stone: 80 },
    baseProduction: { produces: {} },
    buildTime: 1.5
  }
];

export const UPGRADE_COST_MULTIPLIER = 1.5;
export const UPGRADE_PRODUCTION_MULTIPLIER = 2;
export const WAREHOUSE_BONUS = 0.1;
export const WATCHTOWER_OFFLINE_BONUS = 0.2;
export const MAX_OFFLINE_HOURS = 8;
export const TICK_RATE = 30;
export const GRID_SIZE = 12;
export const CELL_SIZE = 80;
export const SAVE_KEY = 'pixel_island_save';
