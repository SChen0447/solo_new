export enum PlantState {
  SEED = 'seed',
  SPROUT = 'sprout',
  MATURE = 'mature',
  FLOWERING = 'flowering',
  FRUITING = 'fruiting',
  WITHERED = 'withered'
}

export interface Environment {
  light: number;
  water: number;
  temperature: number;
}

export interface Leaf {
  id: number;
  positionY: number;
  side: 'left' | 'right';
  growthProgress: number;
  size: number;
  angle: number;
}

export interface Flower {
  id: number;
  petalCount: number;
  color: string;
  secondaryColor: string;
  size: number;
  growthProgress: number;
  angle: number;
}

export interface Fruit {
  id: number;
  size: number;
  color: string;
  growthProgress: number;
  positionY: number;
}

export interface SeedVariety {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseGrowthRate: number;
  maxHeight: number;
  leafInterval: number;
  stemColor: string;
  leafColorYoung: string;
  leafColorMature: string;
  flowerColor: string;
  flowerSecondaryColor: string;
  fruitColor: string;
  petalCount: number;
  leafSize: number;
  flowerSize: number;
  fruitSize: number;
}

export interface GrowthParams {
  state: PlantState;
  height: number;
  leaves: Leaf[];
  flowers: Flower[];
  fruits: Fruit[];
  growthDays: number;
  growthRate: number;
  stemSwayOffset: number;
  stateProgress: number;
}

export interface GrowthSnapshot {
  params: GrowthParams;
  variety: SeedVariety;
  growthRateHistory: number[];
  fps: number;
}

export interface GrowthInstruction {
  variety: SeedVariety;
  height: number;
  targetHeight: number;
  sway: number;
  leaves: Leaf[];
  flowers: Flower[];
  fruits: Fruit[];
  state: PlantState;
  stateColor: string;
  stemColor: string;
  leafColor: string;
}

export const STATE_COLORS: Record<PlantState, string> = {
  [PlantState.SEED]: '#8d6e63',
  [PlantState.SPROUT]: '#81c784',
  [PlantState.MATURE]: '#388e3c',
  [PlantState.FLOWERING]: '#ec407a',
  [PlantState.FRUITING]: '#ff8f00',
  [PlantState.WITHERED]: '#6d4c41'
};

export const STATE_NAMES: Record<PlantState, string> = {
  [PlantState.SEED]: '种子',
  [PlantState.SPROUT]: '幼苗',
  [PlantState.MATURE]: '成熟',
  [PlantState.FLOWERING]: '开花',
  [PlantState.FRUITING]: '结果',
  [PlantState.WITHERED]: '枯萎'
};

export const SEED_VARIETIES: SeedVariety[] = [
  {
    id: 'sunflower',
    name: '向日葵',
    description: '高大挺拔，金色花冠，追逐阳光而生',
    icon: '🌻',
    baseGrowthRate: 0.8,
    maxHeight: 320,
    leafInterval: 35,
    stemColor: '#5d4037',
    leafColorYoung: '#a5d6a7',
    leafColorMature: '#2e7d32',
    flowerColor: '#ffd54f',
    flowerSecondaryColor: '#ff6f00',
    fruitColor: '#795548',
    petalCount: 16,
    leafSize: 28,
    flowerSize: 60,
    fruitSize: 18
  },
  {
    id: 'rose',
    name: '玫瑰',
    description: '浪漫优雅，芬芳馥郁，花色娇艳',
    icon: '🌹',
    baseGrowthRate: 0.6,
    maxHeight: 260,
    leafInterval: 28,
    stemColor: '#4e342e',
    leafColorYoung: '#a5d6a7',
    leafColorMature: '#1b5e20',
    flowerColor: '#e53935',
    flowerSecondaryColor: '#c62828',
    fruitColor: '#ef5350',
    petalCount: 12,
    leafSize: 22,
    flowerSize: 50,
    fruitSize: 14
  },
  {
    id: 'cactus',
    name: '仙人掌',
    description: '耐旱耐热，造型独特，沙漠之花',
    icon: '🌵',
    baseGrowthRate: 0.4,
    maxHeight: 200,
    leafInterval: 25,
    stemColor: '#2e7d32',
    leafColorYoung: '#81c784',
    leafColorMature: '#1b5e20',
    flowerColor: '#f06292',
    flowerSecondaryColor: '#ec407a',
    fruitColor: '#d84315',
    petalCount: 8,
    leafSize: 10,
    flowerSize: 35,
    fruitSize: 12
  }
];
