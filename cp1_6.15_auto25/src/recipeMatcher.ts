export interface Ingredient {
  id: string;
  name: string;
  color: string;
  density: number;
  boilingPoint: number;
  isFireProperty: boolean;
  icon: string;
  description: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredientIds: string[];
  resultColor: string;
  effectType: string;
  description: string;
}

export interface MatchResult {
  matched: boolean;
  recipe: Recipe | null;
  resultColor: string | null;
  effectType: string | null;
}

export const INGREDIENTS: Ingredient[] = [
  {
    id: 'moon_mushroom',
    name: '月光菇',
    color: '#c8b6ff',
    density: 0.6,
    boilingPoint: 60,
    isFireProperty: false,
    icon: '🍄',
    description: '月光下生长的珍稀蘑菇，蕴含柔和的月光精华，常用于制作安神类药水',
  },
  {
    id: 'fire_flower',
    name: '火焰花',
    color: '#ff6b6b',
    density: 0.8,
    boilingPoint: 200,
    isFireProperty: true,
    icon: '🔥',
    description: '火山口附近绽放的花朵，花瓣如同跳动的火焰，是火属性药水的核心材料',
  },
  {
    id: 'deep_sea_algae',
    name: '深海藻',
    color: '#4ecdc4',
    density: 1.4,
    boilingPoint: 80,
    isFireProperty: false,
    icon: '🌊',
    description: '来自万米深海的神秘藻类，高密度使其迅速下沉，蕴含海洋之力',
  },
  {
    id: 'lightning_wood',
    name: '雷击木',
    color: '#ffe66d',
    density: 1.0,
    boilingPoint: 150,
    isFireProperty: true,
    icon: '⚡',
    description: '被雷电击中的古老树木，蕴含雷电之力，加入后会剧烈反应',
  },
  {
    id: 'shadow_stone',
    name: '暗影石',
    color: '#6c5ce7',
    density: 2.0,
    boilingPoint: 300,
    isFireProperty: false,
    icon: '💎',
    description: '来自暗影维度的结晶石，密度极大，沉入锅底后散发出神秘暗光',
  },
  {
    id: 'frost_crystal',
    name: '霜晶',
    color: '#74b9ff',
    density: 0.9,
    boilingPoint: 30,
    isFireProperty: false,
    icon: '❄️',
    description: '永冻之地采集的冰晶碎片，触碰即寒，能大幅降低药水温度',
  },
];

export const RECIPES: Recipe[] = [
  {
    id: 'healing_potion',
    name: '治愈药水',
    ingredientIds: ['moon_mushroom', 'frost_crystal'],
    resultColor: '#a8e6cf',
    effectType: 'heal',
    description: '散发着柔和绿光的治愈药水，能够修复伤口恢复活力',
  },
  {
    id: 'fire_shield',
    name: '烈焰护盾',
    ingredientIds: ['fire_flower', 'lightning_wood'],
    resultColor: '#ff9f43',
    effectType: 'shield',
    description: '在施法者周围形成火焰护盾，抵挡一切攻击',
  },
  {
    id: 'deep_dive',
    name: '深海呼吸',
    ingredientIds: ['deep_sea_algae', 'moon_mushroom'],
    resultColor: '#0abde3',
    effectType: 'breathe',
    description: '饮下后可在水下自由呼吸，持续两个时辰',
  },
  {
    id: 'shadow_stealth',
    name: '暗影潜行',
    ingredientIds: ['shadow_stone', 'frost_crystal'],
    resultColor: '#5f27cd',
    effectType: 'stealth',
    description: '身体融入暗影之中，在黑夜中完全隐身',
  },
  {
    id: 'thunder_strike',
    name: '雷霆一击',
    ingredientIds: ['lightning_wood', 'fire_flower', 'shadow_stone'],
    resultColor: '#feca57',
    effectType: 'thunder',
    description: '凝聚雷火暗三重之力，释放毁灭性的雷霆打击',
  },
  {
    id: 'frost_nova',
    name: '冰霜新星',
    ingredientIds: ['frost_crystal', 'deep_sea_algae', 'moon_mushroom'],
    resultColor: '#48dbfb',
    effectType: 'frost',
    description: '释放寒冰之力冻结周围一切，形成冰霜领域',
  },
  {
    id: 'phoenix_ember',
    name: '凤凰余烬',
    ingredientIds: ['fire_flower', 'moon_mushroom', 'lightning_wood'],
    resultColor: '#ff6348',
    effectType: 'phoenix',
    description: '蕴含凤凰涅槃之力，濒死时自动复活一次',
  },
  {
    id: 'void_elixir',
    name: '虚空灵药',
    ingredientIds: ['shadow_stone', 'deep_sea_algae', 'frost_crystal'],
    resultColor: '#2d3436',
    effectType: 'void',
    description: '连接虚空维度，短暂获得穿越空间的能力',
  },
  {
    id: 'arcane_fury',
    name: '奥术狂怒',
    ingredientIds: ['lightning_wood', 'fire_flower', 'shadow_stone', 'moon_mushroom'],
    resultColor: '#e056fd',
    effectType: 'arcane',
    description: '注入奥术能量，大幅提升施法速度和威力',
  },
  {
    id: 'tidal_force',
    name: '潮汐之力',
    ingredientIds: ['deep_sea_algae', 'frost_crystal', 'fire_flower'],
    resultColor: '#00d2d3',
    effectType: 'tidal',
    description: '掌控潮汐涨落，召唤海浪淹没敌人',
  },
];

export function matchRecipe(ingredientIds: string[]): MatchResult {
  const inputSet = new Set(ingredientIds);
  for (const recipe of RECIPES) {
    const recipeSet = new Set(recipe.ingredientIds);
    if (recipeSet.size === inputSet.size) {
      let allMatch = true;
      for (const id of inputSet) {
        if (!recipeSet.has(id)) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) {
        return {
          matched: true,
          recipe,
          resultColor: recipe.resultColor,
          effectType: recipe.effectType,
        };
      }
    }
  }
  return {
    matched: false,
    recipe: null,
    resultColor: null,
    effectType: null,
  };
}

export function getIngredientById(id: string): Ingredient | undefined {
  return INGREDIENTS.find(i => i.id === id);
}
