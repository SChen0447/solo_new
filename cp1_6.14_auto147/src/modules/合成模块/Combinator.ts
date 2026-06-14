import { v4 as uuidv4 } from 'uuid';
import type { Rune, RuneType } from '@/types';

export const BASIC_RUNE_CONFIGS: Record<RuneType, { name: string; colors: [string, string]; damage: number; description: string; spell: string }> = {
  fire: {
    name: '烈焰符文',
    colors: ['#ff4d4d', '#ff8c00'],
    damage: 12,
    description: '燃烧一切的炽热符文',
    spell: '焚天之焰，化作灰烬',
  },
  water: {
    name: '潮汐符文',
    colors: ['#00b4d8', '#0077b6'],
    damage: 10,
    description: '涌动不息的深蓝之力',
    spell: '海潮翻涌，淹没万物',
  },
  wind: {
    name: '疾风符文',
    colors: ['#52b788', '#95d5b2'],
    damage: 8,
    description: '自由穿梭的旋风之力',
    spell: '狂风呼啸，撕裂长空',
  },
  earth: {
    name: '磐石符文',
    colors: ['#8b6914', '#a47148'],
    damage: 14,
    description: '坚不可摧的大地之力',
    spell: '山岳倾塌，地裂天崩',
  },
  light: {
    name: '圣光符文',
    colors: ['#ffd60a', '#ffc300'],
    damage: 11,
    description: '驱散黑暗的璀璨之光',
    spell: '圣光降临，黑暗退散',
  },
  dark: {
    name: '暗影符文',
    colors: ['#7209b7', '#560bad'],
    damage: 13,
    description: '吞噬光明的深渊之力',
    spell: '暗影蔓延，灵魂沉沦',
  },
};

export function createBasicRunes(): Rune[] {
  return (Object.keys(BASIC_RUNE_CONFIGS) as RuneType[]).map((type) => ({
    id: `basic-${type}`,
    type,
    name: BASIC_RUNE_CONFIGS[type].name,
    category: 'basic',
    damage: BASIC_RUNE_CONFIGS[type].damage,
    description: BASIC_RUNE_CONFIGS[type].description,
    spell: BASIC_RUNE_CONFIGS[type].spell,
    colors: BASIC_RUNE_CONFIGS[type].colors,
  }));
}

interface CombineRecipe {
  ingredients: [RuneType, RuneType];
  result: {
    name: string;
    type: string;
    damage: number;
    colors: [string, string];
    description: string;
    spell: string;
    weakness: string;
  };
}

export const COMBINE_RECIPES: CombineRecipe[] = [
  {
    ingredients: ['fire', 'wind'],
    result: {
      name: '炽焰风暴',
      type: 'firestorm',
      damage: 28,
      colors: ['#8b0000', '#ff6347'],
      description: '火与风的融合，毁灭性的燃烧风暴',
      spell: '风火交织，焚尽八荒',
      weakness: 'water',
    },
  },
  {
    ingredients: ['fire', 'earth'],
    result: {
      name: '熔岩之怒',
      type: 'lava',
      damage: 32,
      colors: ['#ff4500', '#8b4513'],
      description: '大地深处喷涌的炽热岩浆',
      spell: '熔岩沸腾，大地怒吼',
      weakness: 'water',
    },
  },
  {
    ingredients: ['fire', 'water'],
    result: {
      name: '蒸汽爆裂',
      type: 'steam',
      damage: 24,
      colors: ['#c0c0c0', '#87ceeb'],
      description: '水火交融产生的高压蒸汽',
      spell: '水火相激，蒸汽冲天',
      weakness: 'earth',
    },
  },
  {
    ingredients: ['fire', 'light'],
    result: {
      name: '太阳之怒',
      type: 'sunfire',
      damage: 35,
      colors: ['#ffa500', '#ffff00'],
      description: '如同恒星般灼热的神圣之火',
      spell: '烈阳焚空，光芒万丈',
      weakness: 'dark',
    },
  },
  {
    ingredients: ['fire', 'dark'],
    result: {
      name: '冥府业火',
      type: 'hellfire',
      damage: 30,
      colors: ['#4a0000', '#9d0208'],
      description: '来自深渊的永不熄灭之焰',
      spell: '地狱之火，焚烧灵魂',
      weakness: 'light',
    },
  },
  {
    ingredients: ['water', 'wind'],
    result: {
      name: '暴风雨',
      type: 'storm',
      damage: 26,
      colors: ['#4682b4', '#708090'],
      description: '狂风裹挟暴雨的自然之怒',
      spell: '风暴骤起，巨浪滔天',
      weakness: 'earth',
    },
  },
  {
    ingredients: ['water', 'earth'],
    result: {
      name: '泥沼陷阱',
      type: 'swamp',
      damage: 22,
      colors: ['#556b2f', '#6b4423'],
      description: '吞噬一切的深邃泥沼',
      spell: '泥沼涌动，深陷其中',
      weakness: 'wind',
    },
  },
  {
    ingredients: ['water', 'light'],
    result: {
      name: '治愈圣水',
      type: 'holywater',
      damage: 20,
      colors: ['#00ced1', '#e0ffff'],
      description: '蕴含神圣力量的治愈之泉',
      spell: '圣水降临，净化万物',
      weakness: 'dark',
    },
  },
  {
    ingredients: ['water', 'dark'],
    result: {
      name: '深渊潮汐',
      type: 'abyss',
      damage: 27,
      colors: ['#000080', '#191970'],
      description: '来自无尽深渊的冰冷潮水',
      spell: '深渊涌动，吞噬光明',
      weakness: 'light',
    },
  },
  {
    ingredients: ['wind', 'earth'],
    result: {
      name: '沙尘暴',
      type: 'sandstorm',
      damage: 25,
      colors: ['#daa520', '#d2b48c'],
      description: '狂风卷起漫天黄沙',
      spell: '沙尘蔽日，天地无色',
      weakness: 'water',
    },
  },
  {
    ingredients: ['wind', 'light'],
    result: {
      name: '圣光之翼',
      type: 'lightwing',
      damage: 23,
      colors: ['#fffacd', '#f0e68c'],
      description: '闪耀圣洁光芒的羽翼之风',
      spell: '光之羽翼，划破苍穹',
      weakness: 'dark',
    },
  },
  {
    ingredients: ['wind', 'dark'],
    result: {
      name: '虚空之刃',
      type: 'voidslash',
      damage: 29,
      colors: ['#2f0047', '#483d8b'],
      description: '撕裂空间的虚空风刃',
      spell: '虚空碎裂，空间崩解',
      weakness: 'light',
    },
  },
  {
    ingredients: ['earth', 'light'],
    result: {
      name: '水晶圣盾',
      type: 'crystal',
      damage: 18,
      colors: ['#e6e6fa', '#da70d6'],
      description: '坚不可摧的神圣水晶壁垒',
      spell: '水晶成盾，守护万灵',
      weakness: 'fire',
    },
  },
  {
    ingredients: ['earth', 'dark'],
    result: {
      name: '陨星坠落',
      type: 'meteor',
      damage: 34,
      colors: ['#2c2c54', '#474787'],
      description: '从天而降的黑暗陨石',
      spell: '星辰陨落，天地同悲',
      weakness: 'light',
    },
  },
  {
    ingredients: ['light', 'dark'],
    result: {
      name: '混沌本源',
      type: 'chaos',
      damage: 40,
      colors: ['#f0f0f0', '#1a1a1a'],
      description: '光暗交融诞生的原始之力',
      spell: '混沌初开，万物归一',
      weakness: 'chaos',
    },
  },
];

export interface CombineResult {
  success: boolean;
  rune?: Rune;
  failReason?: string;
}

export function combineRunes(rune1: Rune, rune2: Rune): CombineResult {
  const type1 = rune1.type as RuneType;
  const type2 = rune2.type as RuneType;

  const basicTypes: RuneType[] = ['fire', 'water', 'wind', 'earth', 'light', 'dark'];
  if (!basicTypes.includes(type1) || !basicTypes.includes(type2)) {
    return { success: false, failReason: '只能使用基础符文进行合成' };
  }

  const recipe = COMBINE_RECIPES.find(
    (r) =>
      (r.ingredients[0] === type1 && r.ingredients[1] === type2) ||
      (r.ingredients[0] === type2 && r.ingredients[1] === type1)
  );

  if (!recipe) {
    return { success: false, failReason: '配方不存在' };
  }

  const combinedRune: Rune = {
    id: `combined-${recipe.result.type}-${uuidv4().slice(0, 8)}`,
    type: recipe.result.type,
    name: recipe.result.name,
    category: 'combined',
    damage: recipe.result.damage,
    description: recipe.result.description,
    spell: recipe.result.spell,
    colors: recipe.result.colors,
    ingredients: [
      recipe.ingredients[0] === type1 ? type1 : type2,
      recipe.ingredients[0] === type1 ? type2 : type1,
    ],
    weakness: recipe.result.weakness,
  };

  return { success: true, rune: combinedRune };
}

export function getRecipeKey(type1: RuneType, type2: RuneType): string {
  return [type1, type2].sort().join('+');
}

export function getAllKnownCombinedRunes(): Rune[] {
  return COMBINE_RECIPES.map((recipe, idx) => ({
    id: `combined-${recipe.result.type}-ref-${idx}`,
    type: recipe.result.type,
    name: recipe.result.name,
    category: 'combined',
    damage: recipe.result.damage,
    description: recipe.result.description,
    spell: recipe.result.spell,
    colors: recipe.result.colors,
    ingredients: recipe.ingredients,
    weakness: recipe.result.weakness,
  }));
}
