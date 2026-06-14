export type IngredientCategory = 'plant' | 'ore' | 'crystal';

export type ProductType = 'potion' | 'gem' | 'magic_material';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  basePrice: number;
  growTime: number;
  svgColor: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  productName: string;
  productQuantity: number;
  productType: ProductType;
  createdAt: number;
  synthesisCount: number;
}

export interface GardenPlot {
  index: number;
  ingredientId: string | null;
  progress: number;
  plantedAt: number | null;
  isMature: boolean;
  harvestRound: number;
  autoHarvested: boolean;
}

export interface Product {
  id: string;
  name: string;
  productType: ProductType;
  quantity: number;
  firstSynthesisAt: number;
  recipeId: string;
}

export type IngredientInventory = Record<string, number>;

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  plant: '植物',
  ore: '矿石',
  crystal: '水晶',
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  potion: '药水',
  gem: '宝石',
  magic_material: '魔法材料',
};

export const PRODUCT_TYPE_COLORS: Record<ProductType, string> = {
  potion: '#8e44ad',
  gem: '#f39c12',
  magic_material: '#2980b9',
};
