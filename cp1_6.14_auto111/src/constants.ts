import type { Ingredient, GardenPlot } from './types';

export const INGREDIENTS: Ingredient[] = [
  { id: 'ing_01', name: '薰衣草', category: 'plant', basePrice: 5, growTime: 120, svgColor: '#9b59b6' },
  { id: 'ing_02', name: '月光花', category: 'plant', basePrice: 8, growTime: 120, svgColor: '#f1c40f' },
  { id: 'ing_03', name: '铁矿石', category: 'ore', basePrice: 10, growTime: 180, svgColor: '#7f8c8d' },
  { id: 'ing_04', name: '铜矿石', category: 'ore', basePrice: 8, growTime: 180, svgColor: '#e67e22' },
  { id: 'ing_05', name: '紫水晶', category: 'crystal', basePrice: 20, growTime: 240, svgColor: '#8e44ad' },
  { id: 'ing_06', name: '蓝宝石', category: 'crystal', basePrice: 25, growTime: 240, svgColor: '#2980b9' },
  { id: 'ing_07', name: '薄荷叶', category: 'plant', basePrice: 3, growTime: 120, svgColor: '#27ae60' },
  { id: 'ing_08', name: '金矿石', category: 'ore', basePrice: 30, growTime: 180, svgColor: '#f39c12' },
  { id: 'ing_09', name: '红宝石', category: 'crystal', basePrice: 30, growTime: 240, svgColor: '#c0392b' },
  { id: 'ing_10', name: '曼德拉草', category: 'plant', basePrice: 12, growTime: 120, svgColor: '#2ecc71' },
];

export const INGREDIENT_MAP: Record<string, Ingredient> = Object.fromEntries(
  INGREDIENTS.map((ing) => [ing.id, ing])
);

export const INITIAL_PLOTS: GardenPlot[] = Array.from({ length: 16 }, (_, i) => ({
  index: i,
  ingredientId: null,
  progress: 0,
  plantedAt: null,
  isMature: false,
  harvestRound: 0,
  autoHarvested: false,
}));

export const AUTO_HARVEST_INTERVAL = 30000;

export const PRODUCT_BASE_PRICES: Record<string, number> = {
  potion: 50,
  gem: 80,
  magic_material: 100,
};
