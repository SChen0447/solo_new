export type Category = 'sulfide' | 'oxide' | 'silicate' | 'carbonate' | 'halide' | 'native' | 'phosphate';

export interface Specimen {
  id: string;
  name: string;
  category: Category;
  origin: string;
  hardness: [number, number];
  crystalSystem: string;
  color: string;
  description: string;
  count: number;
}

export interface Symbiosis {
  mineralA: string;
  mineralB: string;
  frequency: number;
}

export interface FilterState {
  categories: Category[];
  origins: string[];
  hardnessRange: [number, number];
}

export type ViewMode = 'specimen' | 'relation';
export type GraphMode = 'top' | 'fly';

export interface ForceParams {
  repulsion: number;
  attraction: number;
}

export interface NodeData {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  specimen: Specimen;
}

export interface LinkData {
  source: string;
  target: string;
  frequency: number;
}

export interface OriginCluster {
  name: string;
  mineralIds: string[];
  centerX: number;
  centerY: number;
  centerZ: number;
  radius: number;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  sulfide: '硫化物',
  oxide: '氧化物',
  silicate: '硅酸盐',
  carbonate: '碳酸盐',
  halide: '卤化物',
  native: '自然元素',
  phosphate: '磷酸盐',
};

export const ALL_CATEGORIES: Category[] = [
  'sulfide', 'oxide', 'silicate', 'carbonate', 'halide', 'native', 'phosphate'
];

export const ALL_ORIGINS = ['中国', '巴西', '刚果', '澳大利亚', '美国', '墨西哥', '南非', '俄罗斯'];
