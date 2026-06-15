export enum GrowthStage {
  SEED = 'seed',
  SEEDLING = 'seedling',
  YOUNG_TREE = 'young_tree',
  MATURE_TREE = 'mature_tree',
}

export interface GrowthParams {
  light: number;
  water: number;
  co2: number;
}

export interface LogEntry {
  id: number;
  timestamp: number;
  message: string;
  paramKey: keyof GrowthParams;
  oldValue: number;
  newValue: number;
}

export interface PartInfo {
  visible: boolean;
  x: number;
  y: number;
  name: string;
  details: string;
}

export interface TreeNode {
  position: [number, number, number];
  direction: [number, number, number];
  length: number;
  radius: number;
  level: number;
  children: TreeNode[];
  hasLeaves: boolean;
  leafCount: number;
}

export const STAGE_DURATIONS: Record<GrowthStage, number> = {
  [GrowthStage.SEED]: 5000,
  [GrowthStage.SEEDLING]: 10000,
  [GrowthStage.YOUNG_TREE]: 20000,
  [GrowthStage.MATURE_TREE]: 30000,
};

export const STAGE_ORDER: GrowthStage[] = [
  GrowthStage.SEED,
  GrowthStage.SEEDLING,
  GrowthStage.YOUNG_TREE,
  GrowthStage.MATURE_TREE,
];
